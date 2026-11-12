import { DatabaseSync } from 'node:sqlite';

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { deliverPending, discardPending, mergeMessages, outboxSchema, pendingMessages, queueMessage, type PendingMessage } from './outbox';

import { expoAdapter } from '@/db/fixtures/legacy_database';

const mocks = vi.hoisted(() => ({ open: vi.fn(), send: vi.fn(), session: vi.fn() }));
vi.mock('expo-sqlite', () => ({ openDatabaseAsync: mocks.open }));
vi.mock('@/services/cloud/client', () => ({ getCommunityClient: () => ({ auth: { getSession: mocks.session } }) }));
vi.mock('./api', async importOriginal => ({ ...await importOriginal<object>(), sendMessage: mocks.send }));

const sqlite = new DatabaseSync(':memory:'), adapter = expoAdapter(sqlite);
const actor = '11111111-1111-4111-8111-111111111111', peer = '22222222-2222-4222-8222-222222222222';
const item: PendingMessage = { client_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', sender_id: actor, recipient_id: peer, body: '你好', created_at: '2026-11-06T00:00:00.000Z' };
beforeEach(() => {
  vi.clearAllMocks(); sqlite.exec(outboxSchema); sqlite.exec('DELETE FROM pending_messages');
  mocks.open.mockResolvedValue(adapter); mocks.session.mockResolvedValue({ data: { session: { user: { id: actor } } } });
  mocks.send.mockResolvedValue({ ...item, id: 1 });
});
afterAll(() => sqlite.close());
describe('separate durable chat outbox', () => {
  it('opens only the social file, validates input and scopes work to sender/recipient', async () => {
    await queueMessage(item); expect(mocks.open).toHaveBeenCalledWith('4chinese-social-outbox.db');
    expect(await pendingMessages(actor, peer)).toEqual([{ ...item, reply_to: null }]); expect(await pendingMessages(peer, actor)).toEqual([]);
    await discardPending(peer, item.client_id); expect(await pendingMessages(actor, peer)).toHaveLength(1);
    await expect(queueMessage({ ...item, body: ' ' })).rejects.toThrow();
    expect(sqlite.prepare("select name from sqlite_master where type='table'").all()).toEqual([{ name: 'pending_messages' }]);
  });
  it('survives a lost response and retries exactly the same nonce before removing the pending row', async () => {
    await queueMessage(item); mocks.send.mockRejectedValueOnce(new Error('lost response'));
    await expect(deliverPending(item)).rejects.toThrow('lost response');
    expect(await pendingMessages(actor, peer)).toHaveLength(1);
    await deliverPending((await pendingMessages(actor, peer))[0]!);
    expect(mocks.send.mock.calls).toEqual([[peer, item.client_id, item.body], [peer, item.client_id, item.body]]);
    expect(await pendingMessages(actor, peer)).toEqual([]);
  });
  it('retains work on account change or a mismatched server acknowledgement', async () => {
    await queueMessage(item); mocks.session.mockResolvedValueOnce({ data: { session: { user: { id: peer } } } });
    await expect(deliverPending(item)).rejects.toThrow('SOCIAL_AUTH_REQUIRED'); expect(mocks.send).not.toHaveBeenCalled();
    mocks.send.mockResolvedValueOnce({ ...item, id: 1, recipient_id: actor });
    await expect(deliverPending(item)).rejects.toThrow('SOCIAL_IDEMPOTENCY_CONFLICT'); expect(await pendingMessages(actor, peer)).toHaveLength(1);
  });
  it('atomically caps the queue and refuses a reused nonce with changed content', async () => {
    await queueMessage(item); await queueMessage(item);
    await expect(queueMessage({ ...item, body: 'changed' })).rejects.toThrow('SOCIAL_IDEMPOTENCY_CONFLICT');
    await Promise.all(Array.from({ length: 99 }, (_, i) => queueMessage({ ...item, client_id: `bbbbbbbb-bbbb-4bbb-8bbb-${i.toString().padStart(12, '0')}` })));
    await expect(queueMessage({ ...item, client_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' })).rejects.toThrow('SOCIAL_OUTBOX_FULL');
    await queueMessage(item); expect(await pendingMessages(actor, peer)).toHaveLength(100);
  });
  it('merges duplicate, reordered durable events by server sequence', () => {
    const one = { ...item, id: 1 }, two = { ...item, id: 2 };
    expect(mergeMessages([two], [one, two, one])).toEqual([one, two]);
  });
  it('durably keeps reply targets and rejects a retry with a changed quote', async () => {
    const quoted = { ...item, reply_to: 31 };
    await queueMessage(quoted);
    expect((await pendingMessages(actor, peer))[0]?.reply_to).toBe(31);
    await expect(queueMessage({ ...quoted, reply_to: 32 })).rejects.toThrow('SOCIAL_IDEMPOTENCY_CONFLICT');
    mocks.send.mockResolvedValueOnce({ ...quoted, id: 50 });
    await deliverPending(quoted);
    expect(mocks.send).toHaveBeenCalledWith(peer, item.client_id, item.body, 31);
    expect(await pendingMessages(actor, peer)).toEqual([]);
  });
  it('keeps uploaded file metadata on reconnect and validates the acknowledgement', async () => {
    const file = { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', path: `${actor}/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.pdf`, name: 'lesson.pdf', mime: 'application/pdf', bytes: 100 };
    const attached = { ...item, attachments: [file] };
    await queueMessage(attached);
    expect((await pendingMessages(actor, peer))[0]?.attachments).toEqual([file]);
    await expect(deliverPending(attached)).rejects.toThrow('SOCIAL_IDEMPOTENCY_CONFLICT');
    expect(await pendingMessages(actor, peer)).toHaveLength(1);
    mocks.send.mockResolvedValueOnce({ ...attached, id: 50 });
    await deliverPending(attached);
    expect(mocks.send).toHaveBeenLastCalledWith(peer, item.client_id, item.body, undefined, [file.id]);
    expect(await pendingMessages(actor, peer)).toEqual([]);
  });
});
