import { describe, expect, it } from 'vitest';

import { originalPracticeBank } from './practice-bank';
import { examAnswerCounts, examAnswerState, examPromptParts, examReviewIndices, examTimeLabel } from './presentation';
import type { ExamSnapshot } from './session';

describe('exam presentation preserves answer and scoring distinctions', () => {
  const { profile, questions } = originalPracticeBank[0]!;
  const answers = { [questions[0]!.id]: 0, [questions[1]!.id]: 0 };
  const snapshot: ExamSnapshot = { contentVersion: 1, profile, questions, answers, currentIndex: 0, flaggedIds: [questions[2]!.id] };
  it('counts answer index zero and keeps wrong separate from unanswered', () => {
    expect(examAnswerState(questions[0]!, answers)).toBe('correct');
    expect(examAnswerCounts(questions, answers)).toEqual({ total: 4, answered: 2, correct: 1, wrong: 1, unanswered: 2 });
    expect(examReviewIndices(snapshot, 'wrong')).toEqual([1]);
    expect(examReviewIndices(snapshot, 'correct')).toEqual([0]);
    expect(examReviewIndices(snapshot, 'unanswered')).toEqual([2, 3]);
    expect(examReviewIndices(snapshot, 'flagged')).toEqual([2]);
    expect(examReviewIndices(snapshot, 'all')).toEqual([0, 1, 2, 3]);
  });
  it('splits only known reading passage layouts, without dropping other text', () => {
    expect(examPromptParts(questions[0]!)).toEqual({ passage: '小明是学生。他每天去学校。', instruction: '小明每天去哪儿？' });
    const listening = { ...questions[0]!, skill: 'LISTENING' as const };
    expect(examPromptParts(listening)).toEqual({ passage: '', instruction: listening.prompt });
    expect(examPromptParts({ ...questions[0]!, prompt: '第一行\n第二行' }).instruction).toBe('第一行\n第二行');
    expect(examTimeLabel(65)).toBe('1:05');
    expect(examTimeLabel(0)).toBe('0:00');
  });
});
