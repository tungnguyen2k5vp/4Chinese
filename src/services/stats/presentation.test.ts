import { describe, expect, it } from 'vitest';

import { buildVisibleStatsMetrics, hasMeaningfulStatsData } from './presentation';

import type { DashboardStats } from '@/types/models';

const emptyStats: DashboardStats = {
  learned: 0,
  known: 0,
  skipped: 0,
  mastered: 0,
  due: 0,
  reviewedToday: 0,
  correctToday: 0,
  newToday: 0,
  streak: 0,
  lastStudyDate: null,
  studySeconds: 0,
  mastery: [0, 0, 0, 0, 0, 0, 0],
};

describe('stats presentation', () => {
  it('recognizes a genuinely empty learner profile', () => {
    expect(hasMeaningfulStatsData(emptyStats, 0)).toBe(false);
  });

  it('shows actionable due cards or recorded study, not database inventory', () => {
    expect(hasMeaningfulStatsData({ ...emptyStats, due: 2 }, 0)).toBe(true);
    expect(hasMeaningfulStatsData(emptyStats, 1)).toBe(true);
  });

  it('hides zero metrics and accuracy without a review denominator', () => {
    expect(buildVisibleStatsMetrics({ ...emptyStats, learned: 3 }, 0)).toEqual([
      { label: 'Đã học', value: 3, unit: 'từ' },
    ]);
  });

  it('shows accuracy only when at least one review was recorded', () => {
    expect(buildVisibleStatsMetrics({ ...emptyStats, reviewedToday: 4, correctToday: 3 }, 75)).toEqual([
      { label: 'Chính xác', value: 75, unit: '%' },
    ]);
  });

  it('keeps a real 0% accuracy result visible when reviews were recorded', () => {
    expect(buildVisibleStatsMetrics({ ...emptyStats, reviewedToday: 2 }, 0)).toEqual([
      { label: 'Chính xác', value: 0, unit: '%' },
    ]);
  });
});
