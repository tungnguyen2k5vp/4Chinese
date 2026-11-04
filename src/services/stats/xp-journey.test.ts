import { describe, expect, it } from 'vitest';

import { getXpJourney, xpMilestones } from './xp-journey';

describe('XP journey is derived recognition, never additional awarded points', () => {
  it('keeps existing totals and shows a reachable next level', () => {
    expect(getXpJourney(7320, 0)).toMatchObject({ totalXp: 7320, level: 15, nextLevelXp: 7500, remainingXp: 180, dailyTarget: 50 });
    expect(getXpJourney(7320).title.title).toBe('Vững bước');
  });
  it('unlocks titles exactly at each milestone and continues after the last one', () => {
    for (const item of xpMilestones) expect(getXpJourney(item.xp).title).toEqual(item);
    expect(getXpJourney(20000)).toMatchObject({ level: 41, nextTitle: null, remainingXp: 500, levelProgress: 0 });
    expect(getXpJourney(499).remainingXp).toBe(1);
    expect(getXpJourney(500).level).toBe(2);
  });
  it('offers capped daily milestones without pressure to chase indefinitely', () => {
    expect(getXpJourney(500, 50)).toMatchObject({ dailyTarget: 100, dailyProgress: 0.5 });
    expect(getXpJourney(500, 100).dailyTarget).toBe(200);
    expect(getXpJourney(500, 400)).toMatchObject({ dailyTarget: 200, dailyDone: true, dailyProgress: 1 });
  });
  it('handles empty and invalid values without NaN or negative progress', () => {
    for (const value of [0, -1, NaN, Infinity]) expect(getXpJourney(value, value)).toMatchObject({ totalXp: 0, todayXp: 0, level: 1, levelProgress: 0, remainingXp: 500 });
  });
});
