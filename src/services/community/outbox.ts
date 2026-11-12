import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { messageSchema, sendMessage, type SocialMessage, type SocialAttachment } from './api';

import { getCommunityClient } from '@/services/cloud/client';

export type PendingMessage = { client_id: string; sender_id: string; recipient_id: string; body: string; created_at: string; reply_to?: number | null; attachments?: SocialAttachment[] };
let database: Promise<SQLiteDatabase> | null = null;
export const outboxSchema = `CREATE TABLE IF NOT EXISTS pending_messages (
  client_id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, recipient_id TEXT NOT NULL,
  body TEXT NOT NULL, created_at TEXT NOT NULL, reply_to INTEGER, attachments TEXT NOT NULL DEFAULT '[]');`;
async function db() {
  // Separate file; never open hanzi30.db or use its migrations/backup/sync.
  if (!database) database = openDatabaseAsync('4chinese-social-outbox.db').then(async next => {
    await next.execAsync(outboxSchema);
    const columns = await next.getAllAsync<{ name: string }>('PRAGMA table_info(pending_messages)');
    if (!columns.some(c => c.name === 'reply_to')) await next.execAsync('ALTER TABLE pending_messages ADD COLUMN reply_to INTEGER');
    if (!columns.some(c => c.name === 'attachments')) await next.execAsync("ALTER TABLE pending_messages ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'");
    return next;
  }).catch(e => { database = null; throw e; });
  return database;
}
export async function pendingMessages(sender: string, peer: string) {
  const rows = await (await db()).getAllAsync<Omit<PendingMessage, 'attachments'> & { attachments: string }>('SELECT * FROM pending_messages WHERE sender_id=? AND recipient_id=? ORDER BY created_at,client_id', sender, peer);
  return rows.map(({ attachments, ...row }) => { const files = messageSchema.shape.attachments.parse(JSON.parse(attachments)); return { ...row, ...(files?.length ? { attachments: files } : {}) }; });
}
export async function queueMessage(item: PendingMessage) {
  messageSchema.omit({ id: true }).extend({ body: messageSchema.shape.body.trim().min(1), created_at: messageSchema.shape.created_at.datetime() }).parse(item);
  const store = await db();
  await store.runAsync(`INSERT OR IGNORE INTO pending_messages(client_id,sender_id,recipient_id,body,created_at,reply_to,attachments)
    SELECT ?,?,?,?,?,?,? WHERE (SELECT count(*) FROM pending_messages WHERE sender_id=?) < 100`,
    item.client_id, item.sender_id, item.recipient_id, item.body, item.created_at, item.reply_to ?? null, JSON.stringify(item.attachments ?? []), item.sender_id);
  const existing = await store.getFirstAsync<Omit<PendingMessage, 'attachments'> & { attachments: string }>('SELECT * FROM pending_messages WHERE client_id=?', item.client_id);
  if (!existing) throw new Error('SOCIAL_OUTBOX_FULL');
  if (existing && (existing.sender_id !== item.sender_id || existing.recipient_id !== item.recipient_id || existing.body !== item.body || (existing.reply_to ?? null) !== (item.reply_to ?? null) || existing.attachments !== JSON.stringify(item.attachments ?? []))) throw new Error('SOCIAL_IDEMPOTENCY_CONFLICT');
}
export async function discardPending(sender: string, id: string) {
  await (await db()).runAsync('DELETE FROM pending_messages WHERE sender_id=? AND client_id=?', sender, id);
}
export async function deliverPending(item: PendingMessage): Promise<SocialMessage> {
  const current = await getCommunityClient()?.auth.getSession();
  if (current?.data.session?.user.id !== item.sender_id) throw new Error('SOCIAL_AUTH_REQUIRED');
  const message = item.attachments?.length ? await sendMessage(item.recipient_id, item.client_id, item.body, item.reply_to, item.attachments.map(f => f.id)) : item.reply_to == null ? await sendMessage(item.recipient_id, item.client_id, item.body) : await sendMessage(item.recipient_id, item.client_id, item.body, item.reply_to);
  if (message.sender_id !== item.sender_id || message.client_id !== item.client_id || message.recipient_id !== item.recipient_id || (!message.withdrawn_at && message.body !== item.body.trim()) || (message.reply_to ?? null) !== (item.reply_to ?? null)) throw new Error('SOCIAL_IDEMPOTENCY_CONFLICT');
  if (!message.withdrawn_at && JSON.stringify((message.attachments ?? []).map(f => f.id).sort()) !== JSON.stringify((item.attachments ?? []).map(f => f.id).sort())) throw new Error('SOCIAL_IDEMPOTENCY_CONFLICT');
  await discardPending(item.sender_id, item.client_id);
  return message;
}
export function mergeMessages(previous: SocialMessage[], incoming: SocialMessage[]): SocialMessage[] {
  const byId = new Map(previous.map(item => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
