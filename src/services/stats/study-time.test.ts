import { describe, expect, it } from 'vitest';

import { splitStudySeconds, StudyTimeTracker } from './study-time';

describe('foreground study time', () => {
  it('splits at local midnight, preserving all completed seconds', () => {
    const start = new Date(2026, 8, 27, 23, 59, 55).getTime();
    expect(splitStudySeconds(start, start + 15000)).toEqual([
      { date: '2026-09-27', seconds: 5 }, { date: '2026-09-28', seconds: 10 },
    ]);
    expect(splitStudySeconds(start, start - 1000)).toEqual([]);
  });
  it('pauses on blur/background and carries fractional seconds between flushes', async () => {
    let now = new Date(2026, 8, 27, 12).getTime();
    const rows: [string, number][] = [];
    const tracker = new StudyTimeTracker(() => now, async (day, seconds) => { rows.push([day, seconds]); });
    tracker.setActive(true);
    now += 1500; await tracker.flush();
    now += 500; tracker.setActive(false); await tracker.flush();
    now += 60000; await tracker.flush();
    expect(rows).toEqual([['2026-09-27', 1], ['2026-09-27', 1]]);
    tracker.setActive(true); now += 3000; tracker.setActive(false); await tracker.flush();
    expect(rows.at(-1)).toEqual(['2026-09-27', 3]);
  });
  it('retries only on another flush and restores exactly failed/unwritten buckets', async () => {
    let now = new Date(2026, 8, 27, 23, 59, 55).getTime();
    let calls = 0;
    const rows: [string, number][] = [];
    const tracker = new StudyTimeTracker(() => now, async (day, seconds) => {
      calls++; if (calls === 2) throw new Error('SQLITE_BUSY'); rows.push([day, seconds]);
    });
    tracker.setActive(true); now += 15000; tracker.setActive(false);
    await tracker.flush(); expect(calls).toBe(2);
    await tracker.flush(); expect(calls).toBe(3);
    expect(rows).toEqual([['2026-09-27', 5], ['2026-09-28', 10]]);
    await tracker.flush(); expect(calls).toBe(3);
  });
  it('serializes overlapping flushes without counting twice', async () => {
    let now = new Date(2026, 8, 27).getTime();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const rows: number[] = [];
    const tracker = new StudyTimeTracker(() => now, async (_day, seconds) => { await gate; rows.push(seconds); });
    tracker.setActive(true); now += 5000;
    const first = tracker.flush(); now += 2000; await tracker.flush();
    release(); await first; tracker.setActive(false); await tracker.flush();
    expect(rows).toEqual([5, 2]);
  });
});
