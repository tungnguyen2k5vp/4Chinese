import { describe, expect, it } from "vitest";

import { normalizeReviewAttempt } from "./exercise-attempt";

describe("normalizeReviewAttempt", () => {
  it("creates one mode-independent SRS outcome", () => {
    expect(normalizeReviewAttempt({ correct: true, hintUsed: false, responseTimeMs: 1220.7, attemptCount: 3, exerciseType: "audio_to_hanzi" }))
      .toEqual({ correct: true, incorrect: false, hintUsed: false, responseTimeMs: 1221, attemptCount: 3, exerciseType: "audio_to_hanzi" });
  });

  it("clamps malformed timing and attempts instead of corrupting review telemetry", () => {
    expect(normalizeReviewAttempt({ correct: false, hintUsed: true, responseTimeMs: -5, attemptCount: 0, exerciseType: "pinyin_to_hanzi" }))
      .toMatchObject({ incorrect: true, responseTimeMs: 0, attemptCount: 1 });
  });
});
