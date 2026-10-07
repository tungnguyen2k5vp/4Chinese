export type SyncEntityType = 'SETTINGS' | 'DECK' | 'VOCABULARY' | 'PROGRESS' | 'READING';
export type SyncOperationKind = 'UPSERT' | 'DELETE';

export type SyncOperation = {
  id: string;
  accountId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperationKind;
  payloadJson: string;
  attemptCount: number;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const retryScheduleMs = [
  1 * 60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
] as const;

/** Bounded battery-friendly retry schedule with no random value: reproducible and testable offline. */
export function syncRetryDelayMs(attemptCount: number): number {
  const normalized = Math.max(0, Math.trunc(Number.isFinite(attemptCount) ? attemptCount : 0));
  return retryScheduleMs[Math.min(normalized, retryScheduleMs.length - 1)]!;
}

/**
 * Last-write-wins is only deterministic when timestamps tie-break by device ID.
 * The caller must surface a conflict before replacing an edited local document.
 */
export function selectSyncWinner<T extends { updatedAt: string; deviceId: string }>(
  local: T,
  remote: T,
): 'local' | 'remote' {
  const localTime = Date.parse(local.updatedAt);
  const remoteTime = Date.parse(remote.updatedAt);
  if (!Number.isFinite(localTime) || !Number.isFinite(remoteTime)) throw new Error('INVALID_SYNC_TIMESTAMP');
  if (localTime !== remoteTime) return localTime > remoteTime ? 'local' : 'remote';
  return local.deviceId.localeCompare(remote.deviceId) >= 0 ? 'local' : 'remote';
}

