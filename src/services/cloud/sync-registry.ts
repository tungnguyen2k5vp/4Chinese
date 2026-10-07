import { selectSyncWinner, type SyncEntityType } from '@/services/cloud/sync-policy';

export type SyncSnapshot = Record<string, unknown> & {
  id: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type SyncEntityAdapter<T extends SyncSnapshot = SyncSnapshot> = {
  readonly entityType: SyncEntityType;
  serializeLocal(value: T): string;
  deserializeRemote(payloadJson: string): T;
  merge(local: T, remote: T, localDeviceId: string, remoteDeviceId: string): T;
  getUpdatedAt(value: T): string;
  getDeletedAt(value: T): string | null;
  validate(value: unknown): asserts value is T;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isEntityId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9:_-]{1,160}$/u.test(value);
}

function assertBaseSnapshot(value: unknown): asserts value is SyncSnapshot {
  if (!isRecord(value) || !isEntityId(value.id) || !isTimestamp(value.updatedAt) ||
    (value.deletedAt !== undefined && value.deletedAt !== null && !isTimestamp(value.deletedAt))) {
    throw new Error('INVALID_SYNC_SNAPSHOT');
  }
}

function isNewerOrEqual(left: string, right: string): boolean {
  return Date.parse(left) >= Date.parse(right);
}

function createAdapter<T extends SyncSnapshot>(
  entityType: SyncEntityType,
  validator: (value: unknown) => asserts value is T,
): SyncEntityAdapter<T> {
  return {
    entityType,
    serializeLocal(value) {
      validator(value);
      const serialized = JSON.stringify(value);
      if (new TextEncoder().encode(serialized).length > 64 * 1024) throw new Error('SYNC_PAYLOAD_TOO_LARGE');
      return serialized;
    },
    deserializeRemote(payloadJson) {
      let parsed: unknown;
      try { parsed = JSON.parse(payloadJson); } catch { throw new Error('INVALID_SYNC_PAYLOAD'); }
      validator(parsed);
      return parsed;
    },
    merge(local, remote, localDeviceId, remoteDeviceId) {
      validator(local);
      validator(remote);
      const localDeleted = local.deletedAt;
      const remoteDeleted = remote.deletedAt;
      // A newer tombstone wins over an older non-deleted replica, preventing resurrection.
      if (localDeleted && !remoteDeleted && isNewerOrEqual(localDeleted, remote.updatedAt)) return local;
      if (remoteDeleted && !localDeleted && isNewerOrEqual(remoteDeleted, local.updatedAt)) return remote;
      return selectSyncWinner(
        { updatedAt: local.updatedAt, deviceId: localDeviceId },
        { updatedAt: remote.updatedAt, deviceId: remoteDeviceId },
      ) === 'local' ? local : remote;
    },
    getUpdatedAt(value) { validator(value); return value.updatedAt; },
    getDeletedAt(value) { validator(value); return value.deletedAt ?? null; },
    validate: validator,
  };
}

function assertSettings(value: unknown): asserts value is SyncSnapshot {
  assertBaseSnapshot(value);
  if (value.id !== 'settings' || typeof value.value !== 'string' || value.deletedAt) throw new Error('INVALID_SETTINGS_SYNC');
}

function assertDeck(value: unknown): asserts value is SyncSnapshot {
  assertBaseSnapshot(value);
  if (typeof value.name !== 'string' || typeof value.color !== 'string' || !isTimestamp(value.createdAt)) {
    throw new Error('INVALID_DECK_SYNC');
  }
}

function assertVocabulary(value: unknown): asserts value is SyncSnapshot {
  assertBaseSnapshot(value);
  if (value.isCustom !== true || typeof value.simplified !== 'string' || typeof value.pinyinNumeric !== 'string') {
    throw new Error('INVALID_VOCABULARY_SYNC');
  }
}

function assertProgress(value: unknown): asserts value is SyncSnapshot {
  assertBaseSnapshot(value);
  if (typeof value.vocabularyId !== 'string' || !isTimestamp(value.lastReviewAt) ||
    !Number.isInteger(value.reviewCount)) throw new Error('INVALID_PROGRESS_SYNC');
}

function assertReading(value: unknown): asserts value is SyncSnapshot {
  assertBaseSnapshot(value);
  if (typeof value.title !== 'string' || typeof value.content !== 'string' || !isTimestamp(value.createdAt)) {
    throw new Error('INVALID_READING_SYNC');
  }
}

/**
 * One adapter per entity: callers never route data through a sprawling
 * entity-type conditional. SRS progress is validated here but must be merged
 * from review events before it is enabled for production transport.
 */
export const SYNCABLE_ENTITIES: ReadonlyMap<SyncEntityType, SyncEntityAdapter> = new Map([
  ['SETTINGS', createAdapter('SETTINGS', assertSettings)],
  ['DECK', createAdapter('DECK', assertDeck)],
  ['VOCABULARY', createAdapter('VOCABULARY', assertVocabulary)],
  ['PROGRESS', createAdapter('PROGRESS', assertProgress)],
  ['READING', createAdapter('READING', assertReading)],
]);

export function getSyncEntityAdapter(entityType: SyncEntityType): SyncEntityAdapter {
  const adapter = SYNCABLE_ENTITIES.get(entityType);
  if (!adapter) throw new Error('SYNC_ENTITY_NOT_REGISTERED');
  return adapter;
}
