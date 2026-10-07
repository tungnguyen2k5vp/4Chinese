export type SentenceDifficultyInput = {
  tokenCount: number;
  targetHsk: number;
  wordHskLevels: readonly number[];
  grammarDifficulty: number;
  rareWordCount: number;
};

/** Deterministic, explainable difficulty score (1–10); it never calls AI. */
export function scoreSentenceDifficulty(input: SentenceDifficultyInput): number {
  const averageWordLevel = input.wordHskLevels.length
    ? input.wordHskLevels.reduce((sum, level) => sum + level, 0) / input.wordHskLevels.length
    : input.targetHsk;
  const lengthPenalty = Math.max(0, input.tokenCount - 8) / 5;
  const levelPenalty = Math.max(0, averageWordLevel - input.targetHsk);
  const score = 1 + lengthPenalty + levelPenalty + Math.max(0, input.grammarDifficulty - 1) * 0.7 + input.rareWordCount;
  return Math.max(1, Math.min(10, Math.round(score)));
}

export type LearnerSentence = {
  id: string;
  reviewStatus: 'REVIEWED' | 'PENDING' | 'REJECTED';
  difficulty: number;
  tokenCount: number;
  targetSenseMatch: boolean;
};

/** Keeps generic/unreviewed and level-inappropriate examples out of Word Detail. */
export function rankExamplesForLearner(
  examples: readonly LearnerSentence[],
  learnerLevel: number,
  limit = 3,
): LearnerSentence[] {
  return examples
    .filter((item) => item.reviewStatus === 'REVIEWED' && item.targetSenseMatch)
    .slice()
    .sort((left, right) => {
      const leftDistance = Math.abs(left.difficulty - learnerLevel);
      const rightDistance = Math.abs(right.difficulty - learnerLevel);
      return leftDistance - rightDistance || left.tokenCount - right.tokenCount || left.id.localeCompare(right.id);
    })
    .slice(0, Math.max(0, limit));
}

const genericPatterns = [
  /学习.*意思/u,
  /这是一个.*句子/u,
  /this is an? example sentence/iu,
];

export function isLearnerFacingSentence(text: string, translation: string, pinyin: string): boolean {
  const source = text.trim();
  return source.length >= 2 && source.length <= 160 && translation.trim().length >= 2 && pinyin.trim().length >= 2 &&
    !genericPatterns.some((pattern) => pattern.test(source) || pattern.test(translation));
}
