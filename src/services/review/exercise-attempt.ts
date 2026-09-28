import type { ReviewExerciseType } from "@/types/models";

/** A mode-independent outcome passed from an exercise UI into the SRS layer. */
export interface NormalizedReviewAttempt {
  correct: boolean;
  incorrect: boolean;
  hintUsed: boolean;
  responseTimeMs: number;
  attemptCount: number;
  exerciseType: ReviewExerciseType;
}

export function normalizeReviewAttempt(input: Omit<NormalizedReviewAttempt, "incorrect" | "responseTimeMs" | "attemptCount"> & {
  responseTimeMs?: number;
  attemptCount?: number;
}): NormalizedReviewAttempt {
  return {
    correct: input.correct,
    incorrect: !input.correct,
    hintUsed: input.hintUsed,
    responseTimeMs: Math.max(0, Math.round(input.responseTimeMs ?? 0)),
    attemptCount: Math.max(1, Math.round(input.attemptCount ?? 1)),
    exerciseType: input.exerciseType,
  };
}
