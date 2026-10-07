import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { enqueueSyncOperation, listDueSyncOperations, markSyncOperationCompleted, markSyncOperationRetry } from './sync-outbox';

describe('durable local sync outbox', () => {
  it('keeps work account-scoped, retries at a known time, and completes idempotently', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await enqueueSyncOperation(db, {
        id: 'op-1', accountId: '11111111-1111-1111-1111-111111111111', entityType: 'PROGRESS',
        entityId: 'hsk-1-ni', operation: 'UPSERT', payloadJson: JSON.stringify({ updatedAt: '2026-09-29T00:00:00.000Z' }),
        now: '2026-09-29T00:00:00.000Z',
      });

      expect(await listDueSyncOperations(db, '11111111-1111-1111-1111-111111111111', '2026-09-29T00:00:00.000Z')).toHaveLength(1);
      await markSyncOperationRetry(db, 'op-1', '2026-09-29T01:00:00.000Z', 'SYNC_TIMEOUT', '2026-09-29T00:01:00.000Z');
      expect(await listDueSyncOperations(db, '11111111-1111-1111-1111-111111111111', '2026-09-29T00:30:00.000Z')).toHaveLength(0);
      expect(sqlite.prepare('SELECT last_error,last_attempt_at FROM sync_outbox WHERE id=?').get('op-1'))
        .toEqual({ last_error: 'SYNC_TIMEOUT', last_attempt_at: '2026-09-29T00:01:00.000Z' });
      await markSyncOperationCompleted(db, 'op-1');
      expect(await listDueSyncOperations(db, '11111111-1111-1111-1111-111111111111', '2026-09-29T02:00:00.000Z')).toEqual([]);
      expect(sqlite.prepare('SELECT last_error FROM sync_outbox WHERE id=?').get('op-1')).toEqual({ last_error: null });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});

