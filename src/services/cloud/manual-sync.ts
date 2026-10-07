import type { SupabaseClient } from '@supabase/supabase-js';
import type { SQLiteDatabase } from 'expo-sqlite';

import { enqueueSyncOperation } from '@/db/sync-outbox';
import { getSyncCursorState, getSyncEntityState, saveSyncCursorState, saveSyncEntityState } from '@/db/sync-state';
import { createSupabaseSyncTransport } from '@/services/cloud/supabase-sync-transport';
import { flushSyncOutbox, type SyncFlushResult } from '@/services/cloud/sync-engine';
import type { SyncEntityType } from '@/services/cloud/sync-policy';
import { getSyncEntityAdapter, type SyncEntityAdapter, type SyncSnapshot } from '@/services/cloud/sync-registry';

type RemoteChange = { cursor_id: number; entity_type: SyncEntityType; entity_id: string; payload: unknown;
  deleted_at: string | null; updated_at: string; device_id: string };
type SettingsSnapshot = SyncSnapshot & { id: 'settings'; value: string };
type DeckSnapshot = SyncSnapshot & { name: string; color: string; createdAt: string };

export type InitialSyncMode = 'PREFER_REMOTE' | 'PREFER_LOCAL';

export type ManualSyncResult = {
  accountId: string;
  pushed: SyncFlushResult;
  pulled: number;
  applied: number;
  skipped: number;
};

function operationId(deviceId: string, entityType: SyncEntityType, entityId: string): string {
  return `${deviceId}:${entityType}:${entityId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function json(value: SyncSnapshot): string {
  return JSON.stringify(value);
}

async function readSettings(db: SQLiteDatabase): Promise<SettingsSnapshot | null> {
  const row = await db.getFirstAsync<{ value: string; updated_at: string }>('SELECT value,updated_at FROM user_settings WHERE id=1');
  return row ? { id: 'settings', value: row.value, updatedAt: row.updated_at } : null;
}

async function readDecks(db: SQLiteDatabase): Promise<DeckSnapshot[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; color: string; created_at: string; updated_at: string;
    deleted_at: string | null }>('SELECT id,name,color,created_at,updated_at,deleted_at FROM personal_deck');
  return rows.map((row) => ({ id: row.id, name: row.name, color: row.color, createdAt: row.created_at,
    updatedAt: row.updated_at, deletedAt: row.deleted_at }));
}

async function queueIfChanged(db: SQLiteDatabase, accountId: string, deviceId: string, entityType: SyncEntityType,
  snapshot: SyncSnapshot): Promise<void> {
  const adapter = getSyncEntityAdapter(entityType);
  const payloadJson = adapter.serializeLocal(snapshot);
  if (await getSyncEntityState(db, accountId, entityType, snapshot.id) === payloadJson) return;
  await enqueueSyncOperation(db, {
    id: operationId(deviceId, entityType, snapshot.id), accountId, entityType, entityId: snapshot.id,
    operation: adapter.getDeletedAt(snapshot) ? 'DELETE' : 'UPSERT', payloadJson,
  });
  await saveSyncEntityState(db, accountId, entityType, snapshot.id, payloadJson, adapter.getUpdatedAt(snapshot));
}

async function applySettingsChange(db: SQLiteDatabase, accountId: string, localDeviceId: string,
  remoteDeviceId: string, remote: SettingsSnapshot, preferRemote = false): Promise<boolean> {
  const adapter = getSyncEntityAdapter('SETTINGS');
  const local = await readSettings(db);
  const winner = preferRemote || !local ? remote : adapter.merge(local, remote, localDeviceId, remoteDeviceId);
  if (winner === remote) await db.runAsync(`INSERT INTO user_settings(id,value,updated_at) VALUES(1,?,?)
    ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`, remote.value, remote.updatedAt);
  if (winner === remote) await saveSyncEntityState(db, accountId, 'SETTINGS', 'settings', json(remote), remote.updatedAt);
  return winner === remote;
}

async function applyDeckChange(db: SQLiteDatabase, accountId: string, localDeviceId: string,
  remoteDeviceId: string, remote: DeckSnapshot, preferRemote = false): Promise<boolean> {
  const adapter = getSyncEntityAdapter('DECK');
  const localRow = await db.getFirstAsync<{ id: string; name: string; color: string; created_at: string; updated_at: string;
    deleted_at: string | null }>('SELECT id,name,color,created_at,updated_at,deleted_at FROM personal_deck WHERE id=?', remote.id);
  const local: DeckSnapshot | null = localRow ? { id: localRow.id, name: localRow.name, color: localRow.color,
    createdAt: localRow.created_at, updatedAt: localRow.updated_at, deletedAt: localRow.deleted_at } : null;
  const winner = preferRemote || !local ? remote : adapter.merge(local, remote, localDeviceId, remoteDeviceId);
  if (winner === remote) {
    await db.runAsync(`INSERT INTO personal_deck(id,name,color,created_at,updated_at,deleted_at) VALUES(?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,color=excluded.color,updated_at=excluded.updated_at,
      deleted_at=excluded.deleted_at`, remote.id, remote.name, remote.color, remote.createdAt, remote.updatedAt,
    remote.deletedAt ?? null);
    await saveSyncEntityState(db, accountId, 'DECK', remote.id, json(remote), remote.updatedAt);
  }
  return winner === remote;
}

async function applyRemoteChange(db: SQLiteDatabase, accountId: string, deviceId: string, change: RemoteChange, preferRemote: boolean): Promise<boolean> {
  if (change.entity_type !== 'SETTINGS' && change.entity_type !== 'DECK') return false;
  const adapter: SyncEntityAdapter = getSyncEntityAdapter(change.entity_type);
  const payload = { ...(change.payload as Record<string, unknown>), id: change.entity_id, updatedAt: change.updated_at,
    deletedAt: change.deleted_at };
  adapter.validate(payload);
  return change.entity_type === 'SETTINGS'
    ? applySettingsChange(db, accountId, deviceId, change.device_id, payload as SettingsSnapshot, preferRemote)
    : applyDeckChange(db, accountId, deviceId, change.device_id, payload as DeckSnapshot, preferRemote);
}

async function pullAll(db: SQLiteDatabase, client: SupabaseClient, accountId: string, deviceId: string, initialMode: InitialSyncMode): Promise<{ pulled: number; applied: number; skipped: number }> {
  const cursor = await getSyncCursorState(db, accountId);
  const preferRemote = !cursor.initialSyncCompletedAt && initialMode === 'PREFER_REMOTE';
  let after = cursor.remoteCursor;
  let pulled = 0; let applied = 0; let skipped = 0;
  for (let page = 0; page < 20; page += 1) {
    const { data, error } = await client.rpc('sync_pull_v1', { p_after_cursor: after, p_limit: 100 });
    if (error) throw Object.assign(new Error('SYNC_PULL_FAILED'), { code: error.code ?? 'PULL_FAILED' });
    if (!Array.isArray(data)) throw Object.assign(new Error('SYNC_PULL_INVALID_RESPONSE'), { code: 'PULL_INVALID_RESPONSE' });
    const rows = data as RemoteChange[];
    for (const row of rows) {
      if (!Number.isInteger(row.cursor_id) || row.cursor_id <= after) throw new Error('SYNC_PULL_INVALID_CURSOR');
      if (await applyRemoteChange(db, accountId, deviceId, row, preferRemote)) applied += 1;
      else skipped += 1;
      pulled += 1;
      after = row.cursor_id;
    }
    if (rows.length < 100) break;
  }
  await saveSyncCursorState(db, accountId, { remoteCursor: after, initialCompleted: true });
  return { pulled, applied, skipped };
}

async function queueLocalSnapshot(db: SQLiteDatabase, accountId: string, deviceId: string): Promise<void> {
  const settings = await readSettings(db);
  if (settings) await queueIfChanged(db, accountId, deviceId, 'SETTINGS', settings);
  for (const deck of await readDecks(db)) await queueIfChanged(db, accountId, deviceId, 'DECK', deck);
}

/** Manual, local-first sync for settings and soft-deleted decks. SRS is intentionally excluded. */
export async function runManualSync(db: SQLiteDatabase, client: SupabaseClient, deviceId: string, initialMode: InitialSyncMode): Promise<ManualSyncResult> {
  const { data, error } = await client.auth.getUser();
  const accountId = data.user?.id;
  if (error || !accountId) throw Object.assign(new Error('SYNC_AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' });
  if (!/^[a-zA-Z0-9-]{8,120}$/u.test(accountId) || !/^[A-Za-z0-9:_-]{8,160}$/u.test(deviceId)) {
    throw new Error('INVALID_SYNC_IDENTITY');
  }
  const before = await pullAll(db, client, accountId, deviceId, initialMode);
  await queueLocalSnapshot(db, accountId, deviceId);
  const pushed = await flushSyncOutbox(db, accountId, createSupabaseSyncTransport(client, deviceId));
  const after = await pullAll(db, client, accountId, deviceId, initialMode);
  return { accountId, pushed, pulled: before.pulled + after.pulled, applied: before.applied + after.applied,
    skipped: before.skipped + after.skipped };
}
