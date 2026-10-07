import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, expoAdapter } from '@/db/fixtures/legacy_database';
import { migrateDatabaseSchema } from '@/db/migrations';
import { enqueueSyncOperation, listDueSyncOperations } from '@/db/sync-outbox';
import { flushSyncOutbox } from '@/services/cloud/sync-engine';
import { syncRetryDelayMs } from '@/services/cloud/sync-policy';

const accountId = '11111111-1111-1111-1111-111111111111';
const now = '2026-09-29T00:00:00.000Z';

describe('sync outbox engine', () => {
  it('uses operation ids as idempotency keys and only completes acknowledged work', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await enqueueSyncOperation(db, {
        id: 'operation-1', accountId, entityType: 'SETTINGS', entityId: 'settings', operation: 'UPSERT',
        payloadJson: JSON.stringify({ updatedAt: now }), now,
      });
      const result = await flushSyncOutbox(db, accountId, {
        push: async (operations) => ({ acceptedOperationIds: operations.map((operation) => operation.id) }),
      }, now);
      expect(result).toEqual({ attempted: 1, completed: 1, deferred: 0, errorCode: null });
      expect(await listDueSyncOperations(db, accountId, '2026-10-01T00:00:00.000Z')).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('keeps unacknowledged work in the outbox with the first bounded retry delay', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await enqueueSyncOperation(db, {
        id: 'operation-2', accountId, entityType: 'DECK', entityId: 'deck-1', operation: 'UPSERT',
        payloadJson: JSON.stringify({ updatedAt: now }), now,
      });
      const result = await flushSyncOutbox(db, accountId, { push: async () => ({ acceptedOperationIds: [] }) }, now);
      expect(result).toEqual({ attempted: 1, completed: 0, deferred: 1, errorCode: 'SYNC_UNACKNOWLEDGED' });
      expect(await listDueSyncOperations(db, accountId, '2026-09-29T00:00:59.999Z')).toEqual([]);
      expect(await listDueSyncOperations(db, accountId, '2026-09-29T00:01:00.000Z')).toHaveLength(1);
    } finally {
      sqlite.close();
    }
  });

  it('follows the requested battery-safe retry schedule', () => {
    expect([0, 1, 2, 3, 4, 99].map(syncRetryDelayMs)).toEqual([
      60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000, 6 * 60 * 60_000,
    ]);
  });
});
