import type { SQLiteDatabase } from 'expo-sqlite';

import type { SyncEntityType } from '@/services/cloud/sync-policy';

export type SyncCursorState = {
  remoteCursor: number;
  initialSyncCompletedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

export async function getSyncCursorState(db: SQLiteDatabase, accountId: string): Promise<SyncCursorState> {
  const row = await db.getFirstAsync<{ remote_cursor: string | null; initial_sync_completed_at: string | null;
    last_sync_at: string | null; last_error: string | null }>(`SELECT remote_cursor,initial_sync_completed_at,last_sync_at,last_error
    FROM sync_cursor WHERE account_id=?`, accountId);
  return {
    remoteCursor: Math.max(0, Number(row?.remote_cursor ?? 0) || 0),
    initialSyncCompletedAt: row?.initial_sync_completed_at ?? null,
    lastSyncAt: row?.last_sync_at ?? null,
    lastError: row?.last_error ?? null,
  };
}

export async function saveSyncCursorState(db: SQLiteDatabase, accountId: string, input: {
  remoteCursor: number; initialCompleted?: boolean; error?: string | null; now?: string;
}): Promise<void> {
  const now = input.now ?? new Date().toISOString();
  await db.runAsync(`INSERT INTO sync_cursor(account_id,remote_cursor,initial_sync_completed_at,last_sync_at,last_error,updated_at)
    VALUES(?,?,CASE WHEN ? THEN ? ELSE NULL END,?,?,?)
    ON CONFLICT(account_id) DO UPDATE SET remote_cursor=excluded.remote_cursor,
      initial_sync_completed_at=COALESCE(sync_cursor.initial_sync_completed_at,excluded.initial_sync_completed_at),
      last_sync_at=excluded.last_sync_at,last_error=excluded.last_error,updated_at=excluded.updated_at`,
  accountId, String(Math.max(0, Math.trunc(input.remoteCursor))), input.initialCompleted ? 1 : 0, now,
  now, input.error ?? null, now);
}

export async function getSyncEntityState(db: SQLiteDatabase, accountId: string, entityType: SyncEntityType,
  entityId: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ payload_json: string }>(`SELECT payload_json FROM sync_entity_state
    WHERE account_id=? AND entity_type=? AND entity_id=?`, accountId, entityType, entityId);
  return row?.payload_json ?? null;
}

export async function saveSyncEntityState(db: SQLiteDatabase, accountId: string, entityType: SyncEntityType,
  entityId: string, payloadJson: string, updatedAt: string): Promise<void> {
  await db.runAsync(`INSERT INTO sync_entity_state(account_id,entity_type,entity_id,payload_json,updated_at)
    VALUES(?,?,?,?,?) ON CONFLICT(account_id,entity_type,entity_id) DO UPDATE SET
      payload_json=excluded.payload_json,updated_at=excluded.updated_at`,
  accountId, entityType, entityId, payloadJson, updatedAt);
}
