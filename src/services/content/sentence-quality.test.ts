import { describe, expect, it } from 'vitest';

import { isLearnerFacingSentence, rankExamplesForLearner, scoreSentenceDifficulty } from './sentence-quality';

describe('sentence quality policy', () => {
  it('ranks reviewed, target-sense examples close to the learner level', () => {
    expect(rankExamplesForLearner([
      { id: 'draft', reviewStatus: 'PENDING', difficulty: 1, tokenCount: 3, targetSenseMatch: true },
      { id: 'wrong-sense', reviewStatus: 'REVIEWED', difficulty: 1, tokenCount: 3, targetSenseMatch: false },
      { id: 'best', reviewStatus: 'REVIEWED', difficulty: 2, tokenCount: 4, targetSenseMatch: true },
      { id: 'hard', reviewStatus: 'REVIEWED', difficulty: 7, tokenCount: 10, targetSenseMatch: true },
    ], 2).map((item) => item.id)).toEqual(['best', 'hard']);
  });

  it('rejects generic template text and computes deterministic difficulty', () => {
    expect(isLearnerFacingSentence('这是一个学习词语的句子', 'Câu ví dụ', 'Zhè shì')).toBe(false);
    expect(scoreSentenceDifficulty({ tokenCount: 8, targetHsk: 1, wordHskLevels: [1, 1, 2], grammarDifficulty: 1, rareWordCount: 0 })).toBe(1);
    expect(scoreSentenceDifficulty({ tokenCount: 25, targetHsk: 1, wordHskLevels: [5], grammarDifficulty: 4, rareWordCount: 2 })).toBeGreaterThan(5);
  });
});
