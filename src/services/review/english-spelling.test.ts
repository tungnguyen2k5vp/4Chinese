import { describe, expect, it } from "vitest";

import { isEnglishSpellingCorrect } from "./english-spelling";

describe("English personal-card spelling", () => {
  it("ignores capitalization, repeated whitespace and typographic apostrophes", () => {
    expect(isEnglishSpellingCorrect("Look up", "  LOOK   UP ")).toBe(true);
    expect(isEnglishSpellingCorrect("don't", "don’t")).toBe(true);
  });
  it("does not guess forms or ignore letters, hyphens and accents", () => {
    expect(isEnglishSpellingCorrect("bank", "banks")).toBe(false);
    expect(isEnglishSpellingCorrect("well-known", "well known")).toBe(false);
    expect(isEnglishSpellingCorrect("café", "cafe")).toBe(false);
    expect(isEnglishSpellingCorrect("their", "there")).toBe(false);
  });
  it("empty and overlong answers cannot be correct", () => {
    expect(isEnglishSpellingCorrect("", "")).toBe(false);
    expect(isEnglishSpellingCorrect("bank", " ")).toBe(false);
    expect(isEnglishSpellingCorrect("a".repeat(301), "a".repeat(301))).toBe(false);
  });
});
