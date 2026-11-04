import { describe, expect, it } from "vitest";

import { buildInterleavedReviewQueue, emptyWordReviewState, hasPassedWord, interleavedReviewInput, recordReviewAttempt } from "./interleaved-session";

import { applyReview } from "@/services/srs/scheduler";
import type { Vocabulary } from "@/types/models";

const word = (id: string) => ({ id }) as Vocabulary;

describe("interleaved review session", () => {
  it("places each word three times without adjacent duplicates", () => {
    const queue = buildInterleavedReviewQueue([word("a"), word("b"), word("c")]);
    expect(queue).toHaveLength(9);
    expect(queue.filter((entry) => entry.word.id === "a")).toHaveLength(3);
    expect(queue.every((entry, index) => index === 0 || entry.word.id !== queue[index - 1]?.word.id)).toBe(true);
  });

  it("requires all three passes", () => {
    let state = emptyWordReviewState();
    state = recordReviewAttempt(state, true, 1000);
    state = recordReviewAttempt(state, false, 1000);
    state = recordReviewAttempt(state, true, 1000);
    expect(hasPassedWord(state)).toBe(false);
    expect(state.responseTimeMs).toBe(3000);
  });
  const progress = { memoryLevel: 3, deepMemoryStage: 0, reviewCount: 4, correctCount: 4, wrongCount: 0, lapseCount: 0, consecutiveCorrect: 4, consecutiveWrong: 0, hintUsedCount: 0, averageResponseTimeMs: 8000, lastResponseTimeMs: 8000, isKnown: false };
  it.each([1, 2, 3])("keeps level 3 with %i assisted correct passes and does not record a wrong answer", assistedCount => {
    let state = emptyWordReviewState();
    for (let i = 0; i < 3; i++) state = recordReviewAttempt(state, true, 8000, i < assistedCount);
    expect(hasPassedWord(state)).toBe(true);
    const input = interleavedReviewInput(state, "easy");
    expect(input).toMatchObject({ correct: true, hintUsed: true, rating: "hard" });
    const result = applyReview(progress, input);
    expect(result).toMatchObject({ memoryLevel: 3, direction: "same", wrongCount: 0, lapseCount: 0, hintUsedCount: 1 });
  });
  it("still lowers the level for an actual incorrect answer, even with hints elsewhere", () => {
    let state = emptyWordReviewState();
    state = recordReviewAttempt(state, true, 8000, true);
    state = recordReviewAttempt(state, false, 8000);
    state = recordReviewAttempt(state, true, 8000);
    const result = applyReview(progress, interleavedReviewInput(state, "good"));
    expect(result.direction).toBe("down");
    expect(result.wrongCount).toBe(1);
  });
  it("promotes three independent correct passes and preserves a deliberate hard rating", () => {
    let state = emptyWordReviewState();
    for (let i = 0; i < 3; i++) state = recordReviewAttempt(state, true, 8000);
    expect(applyReview(progress, interleavedReviewInput(state, "good")).direction).toBe("up");
    expect(applyReview(progress, interleavedReviewInput(state, "hard")).direction).toBe("same");
  });
});
