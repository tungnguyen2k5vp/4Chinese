import type { ReviewInput } from "@/services/srs/scheduler";
import type { ReviewRating, Vocabulary } from "@/types/models";

export interface ReviewQueueEntry {
  word: Vocabulary;
  pass: 1 | 2 | 3;
}

export interface WordReviewState {
  attempts: number;
  successfulPasses: number;
  assistedPasses: number;
  failed: boolean;
  responseTimeMs: number;
}

export const emptyWordReviewState = (): WordReviewState => ({
  attempts: 0,
  successfulPasses: 0,
  assistedPasses: 0,
  failed: false,
  responseTimeMs: 0,
});

/**
 * Three rounds keep repetitions apart with unseen words in between.  The
 * second/third rounds are rotated while avoiding a duplicate at a boundary.
 */
export function buildInterleavedReviewQueue(words: Vocabulary[]): ReviewQueueEntry[] {
  if (!words.length) return [];
  const entries: ReviewQueueEntry[] = [];
  let previousId = "";
  for (let pass = 1; pass <= 3; pass += 1) {
    let round = [...words];
    if (words.length > 2 && pass > 1) {
      const offset = (pass - 1) % words.length;
      round = [...words.slice(offset), ...words.slice(0, offset)];
    }
    if (round.length > 1 && round[0]?.id === previousId) {
      round = [...round.slice(1), round[0]!];
    }
    round.forEach((word) => entries.push({ word, pass: pass as 1 | 2 | 3 }));
    previousId = round.at(-1)?.id ?? previousId;
  }
  return entries;
}

export function recordReviewAttempt(
  current: WordReviewState,
  passed: boolean,
  responseTimeMs: number,
  assisted = false,
): WordReviewState {
  return {
    attempts: current.attempts + 1,
    successfulPasses: current.successfulPasses + (passed ? 1 : 0),
    assistedPasses: current.assistedPasses + (passed && assisted ? 1 : 0),
    failed: current.failed || !passed,
    responseTimeMs: current.responseTimeMs + Math.max(0, responseTimeMs),
  };
}

export function hasPassedWord(state: WordReviewState): boolean {
  return state.attempts >= 3 && state.successfulPasses === 3 && !state.failed;
}

/** Assistance is not an incorrect answer. All-correct assisted rounds keep the level. */
export function interleavedReviewInput(state: WordReviewState, rating: ReviewRating): ReviewInput {
  const correct = hasPassedWord(state);
  const hintUsed = state.assistedPasses > 0;
  return {
    correct,
    hintUsed,
    rating: !correct ? "again" : hintUsed ? "hard" : rating,
    responseTimeMs: state.responseTimeMs / Math.max(1, state.attempts),
  };
}
