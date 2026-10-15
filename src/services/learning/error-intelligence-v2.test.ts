import { describe, expect, it } from 'vitest';

import { clusterObservedMistakesV2 } from './error-intelligence-v2';

import type { Mistake } from '@/db/mistakes';

const mistake = (id: string, wrongCount = 1, attempts30d = 1, errors30d = wrongCount): Mistake => ({
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
  attempts_30d: attempts30d,
  errors_30d: errors30d,
});

describe('error intelligence v2', () => {
  it('keeps a small sample visible without diagnosing or recommending a lesson', () => {
    const result = clusterObservedMistakesV2([mistake('a'), mistake('b')]);
    expect(result[0]).toMatchObject({ eligible: false, microLesson: null });
    expect(result[0]?.thresholdReason).toContain('Chưa đủ bằng chứng 30 ngày');
  });

  it('creates an offline remedial micro-lesson only after both thresholds pass', () => {
    const result = clusterObservedMistakesV2([
      mistake('a', 3, 5, 3),
      mistake('b', 2, 5, 2),
    ]);
    expect(result[0]).toMatchObject({ eligible: true, wrongAttempts: 5, openItems: 2 });
    expect(result[0]?.microLesson?.source).toBe('OFFLINE_OBSERVED_ERRORS');
    expect(result[0]?.microLesson?.steps.length).toBeGreaterThanOrEqual(2);
    expect(result[0]?.microLesson?.practiceItemIds).toEqual(['a','b']);
    expect(result[0]).toMatchObject({ attempts30d: 10, errors30d: 5, errorRate30d: 0.5 });
  });

  it('does not diagnose a high historic count when recent attempts are missing', () => {
    const result = clusterObservedMistakesV2([
      { ...mistake('a', 20), attempts_30d: 0, errors_30d: 0 },
      { ...mistake('b', 20), attempts_30d: 0, errors_30d: 0 },
    ]);
    expect(result[0]).toMatchObject({ eligible: false, attempts30d: 0, errorRate30d: null, microLesson: null });
  });

  it('does not infer a semantic diagnosis from unrelated exercise labels', () => {
    const result = clusterObservedMistakesV2([
      { ...mistake('a', 5), exercise_type: 'unknown_custom_exercise' },
      { ...mistake('b', 5), exercise_type: 'unknown_custom_exercise' },
    ]);
    expect(result[0]?.key).toBe('MEANING');
    expect(result[0]?.exerciseTypes).toEqual(['unknown_custom_exercise']);
  });

  it('does not offer a vocabulary-only practice queue for grammar-only records', () => {
    const grammarMistake = (id: string): Mistake => ({
      ...mistake(id, 3, 5, 3),
      vocabulary_id: null,
      grammar_id: id,
      skill_type: 'GRAMMAR',
      exercise_type: 'grammar_choice',
    });
    const result = clusterObservedMistakesV2([
      grammarMistake('g1'), grammarMistake('g2'),
    ]);
    expect(result[0]).toMatchObject({ eligible: false, microLesson: null, supportedPracticeItems: 0 });
    expect(result[0]?.thresholdReason).toContain('mục từ vựng');
  });
});
