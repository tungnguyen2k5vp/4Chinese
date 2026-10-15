import { describe, expect, it } from "vitest";

import { shuffleEnglishQueue } from "./flashcards";

describe("English flashcard queue shuffle", () => {
  it("preserves all cards and leaves the source queue untouched", () => {
    const input = ["a", "b", "c", "d"];
    const result = shuffleEnglishQueue(input, () => 0);
    expect(result).toEqual(["b", "c", "d", "a"]);
    expect([...result].sort()).toEqual([...input].sort());
    expect(input).toEqual(["a", "b", "c", "d"]);
  });
});
