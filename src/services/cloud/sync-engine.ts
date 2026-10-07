import type { SQLiteDatabase } from 'expo-sqlite';

import {
  listDueSyncOperations,
  markSyncOperationCompleted,
  markSyncOperationRetry,
} from '@/db/sync-outbox';
import { syncRetryDelayMs, type SyncOperation } from '@/services/cloud/sync-policy';

export type SyncPushResponse = { acceptedOperationIds: readonly string[] };

/** The network boundary is injected, so retry and duplicate-delivery behaviour is testable offline. */
export type SyncTransport = {
  push(operations: readonly SyncOperation[]): Promise<SyncPushResponse>;
};

export type SyncFlushResult = {
  attempted: number;
  completed: number;
  deferred: number;
  errorCode: string | null;
};

function retryAt(now: string, attemptCount: number): string {
  const epoch = Date.parse(now);
  if (!Number.isFinite(epoch)) throw new Error('INVALID_SYNC_CLOCK');
  return new Date(epoch + syncRetryDelayMs(attemptCount)).toISOString();
}

/** Never persist transport/server text into learner-visible local state. */
function safeSyncError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return `SYNC_${error.code.replace(/[^A-Z0-9_]/giu, '_').slice(0, 80)}`;
  }
  return 'SYNC_TRANSPORT_FAILED';
}

/**
 * Flushes one bounded outbox batch. The remote contract must treat the
 * operation id as an idempotency key: a timeout may deliver a request twice.
 */
export async function flushSyncOutbox(
  db: SQLiteDatabase,
  accountId: string,
  transport: SyncTransport,
  now = new Date().toISOString(),
): Promise<SyncFlushResult> {
  const operations = await listDueSyncOperations(db, accountId, now);
  if (!operations.length) return { attempted: 0, completed: 0, deferred: 0, errorCode: null };

  try {
    const response = await transport.push(operations);
    const accepted = new Set(response.acceptedOperationIds);
    let completed = 0;
    let deferred = 0;
    await db.withTransactionAsync(async () => {
      for (const operation of operations) {
        if (accepted.has(operation.id)) {
          await markSyncOperationCompleted(db, operation.id, now);
          completed += 1;
        } else {
          await markSyncOperationRetry(db, operation.id, retryAt(now, operation.attemptCount), 'SYNC_UNACKNOWLEDGED', now);
          deferred += 1;
        }
      }
    });
    return { attempted: operations.length, completed, deferred, errorCode: deferred ? 'SYNC_UNACKNOWLEDGED' : null };
  } catch (error) {
    const errorCode = safeSyncError(error);
    await db.withTransactionAsync(async () => {
      for (const operation of operations) {
        await markSyncOperationRetry(db, operation.id, retryAt(now, operation.attemptCount), errorCode, now);
      }
    });
    return { attempted: operations.length, completed: 0, deferred: operations.length, errorCode };
  }
}
