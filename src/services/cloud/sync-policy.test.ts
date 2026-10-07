import { describe, expect, it } from 'vitest';

import { selectSyncWinner, syncRetryDelayMs } from './sync-policy';

describe('sync policy', () => {
  it('uses bounded exponential retry', () => {
    expect(syncRetryDelayMs(0)).toBe(60_000);
    expect(syncRetryDelayMs(2)).toBe(15 * 60_000);
    expect(syncRetryDelayMs(100)).toBe(6 * 60 * 60 * 1000);
  });

  it('resolves equal timestamps deterministically by device id', () => {
    const local = { updatedAt: '2026-09-29T00:00:00.000Z', deviceId: 'z-phone' };
    const remote = { updatedAt: '2026-09-29T00:00:00.000Z', deviceId: 'a-tablet' };
    expect(selectSyncWinner(local, remote)).toBe('local');
    expect(selectSyncWinner({ ...local, updatedAt: '2026-09-28T00:00:00.000Z' }, remote)).toBe('remote');
  });
});

