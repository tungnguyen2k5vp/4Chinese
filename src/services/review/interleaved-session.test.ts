import { describe, expect, it } from "vitest";

import { buildInterleavedReviewQueue, emptyWordReviewState, hasPassedWord, recordReviewAttempt } from "./interleaved-session";

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
});
