import { describe, expect, it } from 'vitest';

import { getSyncEntityAdapter, SYNCABLE_ENTITIES } from './sync-registry';

describe('sync entity registry', () => {
  it('registers every currently supported outbox entity without a routing branch', () => {
    expect([...SYNCABLE_ENTITIES.keys()]).toEqual(['SETTINGS', 'DECK', 'VOCABULARY', 'PROGRESS', 'READING']);
  });

  it('prevents an older replica from resurrecting a soft-deleted deck', () => {
    const deck = getSyncEntityAdapter('DECK');
    const local = { id: 'deck-1', name: 'Đã xoá', color: '#2457D6', createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-03T00:00:00.000Z', deletedAt: '2026-09-03T00:00:00.000Z' };
    const remote = { id: 'deck-1', name: 'Bộ từ cũ', color: '#2457D6', createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z', deletedAt: null };
    expect(deck.merge(local, remote, 'device-a', 'device-b')).toEqual(local);
  });

  it('rejects an invalid remote payload before it can reach a local repository', () => {
    expect(() => getSyncEntityAdapter('SETTINGS').deserializeRemote('{"id":"settings"}'))
      .toThrow('INVALID_SYNC_SNAPSHOT');
  });
});
