import { describe, expect, it } from 'vitest';

import { analyzeReaderTokens } from './analysis';

import type { Vocabulary } from '@/types/models';

const token = (status?: Vocabulary['status']) => ({ text: '学',
  vocabulary: status ? { status, hskBand: 2 } as Vocabulary : null });

describe('reader coverage', () => {
  it('distinguishes known, learning and missing words without division by zero', () => {
    expect(analyzeReaderTokens([], '')).toMatchObject({ totalWords: 0, coveragePercent: 0 });
    expect(analyzeReaderTokens([token('KNOWN'), token('LEARNING'), token()], '学习。'))
      .toMatchObject({ totalWords: 3, knownWords: 1, learningWords: 1, unknownWords: 1, coveragePercent: 67 });
  });
});
