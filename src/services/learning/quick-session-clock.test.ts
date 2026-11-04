import { describe, expect, it } from 'vitest';

import { formatSessionClock, QuickSessionClock } from './quick-session-clock';

describe('quick-session foreground clock', () => {
  it('counts active time, pauses, resumes and expires once without drift', () => {
    let now = 0;
    const clock = new QuickSessionClock(180, () => now);
    expect(clock.snapshot()).toEqual({ elapsedSeconds: 0, remainingSeconds: 180, expired: false });
    clock.setActive(true);
    now = 10_750;
    expect(clock.snapshot()).toEqual({ elapsedSeconds: 10, remainingSeconds: 170, expired: false });
    clock.setActive(false);
    now += 600_000;
    expect(clock.snapshot().elapsedSeconds).toBe(10);
    clock.setActive(true);
    now += 169_250;
    expect(clock.snapshot()).toEqual({ elapsedSeconds: 180, remainingSeconds: 0, expired: true });
    now += 600_000;
    clock.setActive(true);
    expect(clock.snapshot()).toEqual({ elapsedSeconds: 180, remainingSeconds: 0, expired: true });
  });

  it('handles subsecond pauses and delayed ticks, without counting the background', () => {
    let now = 0;
    const clock = new QuickSessionClock(300, () => now);
    clock.setActive(true);
    now += 400;
    clock.setActive(false);
    now += 50_000;
    clock.setActive(true);
    now += 600;
    expect(clock.snapshot().elapsedSeconds).toBe(1);
    now += 1_000_000;
    expect(clock.snapshot().expired).toBe(true);
  });

  it('rejects invalid budgets and formats visible minutes', () => {
    for (const invalid of [0, -1, NaN, Infinity]) expect(() => new QuickSessionClock(invalid, () => 0)).toThrow();
    expect(formatSessionClock(180)).toBe('3:00');
    expect(formatSessionClock(599)).toBe('9:59');
    expect(formatSessionClock(0)).toBe('0:00');
    expect(formatSessionClock(NaN)).toBe('0:00');
  });
});
