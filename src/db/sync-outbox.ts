import type { SQLiteDatabase } from 'expo-sqlite';

import type { SyncEntityType, SyncOperation, SyncOperationKind } from '@/services/cloud/sync-policy';

export type PendingSyncOperation = SyncOperation & { state: 'PENDING' | 'RETRY' };

const entityTypes = new Set<SyncEntityType>(['SETTINGS', 'DECK', 'VOCABULARY', 'PROGRESS', 'READING']);
const operationKinds = new Set<SyncOperationKind>(['UPSERT', 'DELETE']);
const maxPayloadBytes = 64 * 1024;

function assertQueueInput(value: {
  id: string; accountId: string; entityType: SyncEntityType; entityId: string;
  operation: SyncOperationKind; payloadJson: string;
}): void {
  if (!/^[a-zA-Z0-9:_-]{1,160}$/.test(value.id) || !/^[a-zA-Z0-9-]{8,120}$/.test(value.accountId) ||
    !entityTypes.has(value.entityType) || !/^[a-zA-Z0-9:_-]{1,160}$/.test(value.entityId) ||
    !operationKinds.has(value.operation) || new TextEncoder().encode(value.payloadJson).length > maxPayloadBytes) {
    throw new Error('INVALID_SYNC_OPERATION');
  }
  JSON.parse(value.payloadJson);
}

export async function enqueueSyncOperation(db: SQLiteDatabase, input: {
  id: string; accountId: string; entityType: SyncEntityType; entityId: string;
  operation: SyncOperationKind; payloadJson: string; now?: string;
}): Promise<void> {
  assertQueueInput(input);
  const now = input.now ?? new Date().toISOString();
  await db.runAsync(`INSERT INTO sync_outbox(id,account_id,entity_type,entity_id,operation,payload_json,state,
    attempt_count,next_retry_at,created_at,updated_at)
    VALUES(?,?,?,?,?,?,'PENDING',0,NULL,?,?)
    ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,operation=excluded.operation,
      state='PENDING',attempt_count=0,next_retry_at=NULL,updated_at=excluded.updated_at`,
  input.id, input.accountId, input.entityType, input.entityId, input.operation, input.payloadJson, now, now);
}

export async function listDueSyncOperations(
  db: SQLiteDatabase,
  accountId: string,
  now = new Date().toISOString(),
  limit = 50,
): Promise<PendingSyncOperation[]> {
  if (!/^[a-zA-Z0-9-]{8,120}$/.test(accountId)) throw new Error('INVALID_SYNC_ACCOUNT');
  return db.getAllAsync<PendingSyncOperation>(`SELECT id,account_id AS accountId,entity_type AS entityType,
    entity_id AS entityId,operation,payload_json AS payloadJson,attempt_count AS attemptCount,
    next_retry_at AS nextRetryAt,created_at AS createdAt,updated_at AS updatedAt,state
    FROM sync_outbox WHERE account_id=? AND state IN ('PENDING','RETRY')
    AND (next_retry_at IS NULL OR next_retry_at<=?) ORDER BY created_at ASC LIMIT ?`,
  accountId, now, Math.max(1, Math.min(100, Math.trunc(limit))));
}

export async function markSyncOperationRetry(
  db: SQLiteDatabase,
  id: string,
  nextRetryAt: string,
  errorCode: string | null = null,
  now = new Date().toISOString(),
): Promise<void> {
  await db.runAsync(`UPDATE sync_outbox SET state='RETRY',attempt_count=attempt_count+1,next_retry_at=?,
    last_error=?,last_attempt_at=?,updated_at=? WHERE id=? AND state IN ('PENDING','RETRY')`,
  nextRetryAt, errorCode, now, now, id);
}

export async function markSyncOperationCompleted(db: SQLiteDatabase, id: string, now = new Date().toISOString()): Promise<void> {
  await db.runAsync(`UPDATE sync_outbox SET state='COMPLETED',next_retry_at=NULL,last_error=NULL,last_attempt_at=?,updated_at=?
    WHERE id=? AND state IN ('PENDING','RETRY')`, now, now, id);
}

