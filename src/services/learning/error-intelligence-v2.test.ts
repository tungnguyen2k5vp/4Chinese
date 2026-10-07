import { describe, expect, it } from 'vitest';

import { clusterObservedMistakesV2 } from './error-intelligence-v2';

import type { Mistake } from '@/db/mistakes';

const mistake = (id: string, wrongCount = 1): Mistake => ({
  id,
  vocabulary_id: id,
  grammar_id: null,
  skill_type: 'MEANING',
  exercise_type: 'choice',
  wrong_count: wrongCount,
  correct_streak: 0,
  last_wrong_at: null,
  resolved: 0,
  title: id,
  pinyin: null,
});

describe('error intelligence v2', () => {
  it('keeps a small sample visible without diagnosing or recommending a lesson', () => {
    const result = clusterObservedMistakesV2([mistake('a'), mistake('b')]);
    expect(result[0]).toMatchObject({ eligible: false, microLesson: null });
    expect(result[0]?.thresholdReason).toContain('Chưa đủ mẫu');
  });

  it('creates an offline remedial micro-lesson only after both thresholds pass', () => {
    const result = clusterObservedMistakesV2([
      mistake('a', 3),
      mistake('b', 2),
    ]);
    expect(result[0]).toMatchObject({ eligible: true, wrongAttempts: 5, openItems: 2 });
    expect(result[0]?.microLesson?.source).toBe('OFFLINE_OBSERVED_ERRORS');
    expect(result[0]?.microLesson?.steps.length).toBeGreaterThanOrEqual(2);
  });

  it('does not infer a semantic diagnosis from unrelated exercise labels', () => {
    const result = clusterObservedMistakesV2([
      { ...mistake('a', 5), exercise_type: 'unknown_custom_exercise' },
      { ...mistake('b', 5), exercise_type: 'unknown_custom_exercise' },
    ]);
    expect(result[0]?.key).toBe('MEANING');
    expect(result[0]?.exerciseTypes).toEqual(['unknown_custom_exercise']);
  });
});
