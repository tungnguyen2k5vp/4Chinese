import { describe, expect, it } from "vitest";

import {
  englishReadingWindow,
  tokenizeEnglishReading,
} from "./english-tokenizer";

describe("English reader boundaries, not Chinese longest-match", () => {
  it("bounds pathological runs while preserving noninteractive literal text", () => {
    const text = "a".repeat(9000);
    const first = englishReadingWindow(text, 0, 300);
    expect(first.next).toBe(300);
    expect(first.tokens[0]).toMatchObject({
      text: "a".repeat(300),
      word: false,
    });
    expect(englishReadingWindow(text, 300, 300).next).toBe(600);
  });
  it("preserves punctuation/whitespace/emoji and contractions/hyphens exactly", () => {
    const text =
      "Don't stop. We’re co-workers—yes! 🙂\n café, studying; look after.";
    const tokens = tokenizeEnglishReading(text);
    expect(tokens.map((token) => token.text).join("")).toBe(text);
    expect(
      tokens.filter((token) => token.word).map((token) => token.text),
    ).toEqual([
      "Don't",
      "stop",
      "We’re",
      "co-workers",
      "yes",
      "café",
      "studying",
      "look",
      "after",
    ]);
    for (const token of tokens)
      expect(text.slice(token.start, token.end)).toBe(token.text);
  });
  it("keeps source text intact across bounded reading windows without dropping split whitespace", () => {
    const text = "word  don't co-worker.\n".repeat(200);
    let start = 0,
      collected = "";
    do {
      const window = englishReadingWindow(text, start, 300);
      collected += window.tokens.map((token) => token.text).join("");
      if (window.next === null) break;
      expect(window.next).toBeGreaterThan(start);
      start = window.next;
    } while (start < text.length);
    expect(collected).toBe(text);
  });
  it.each([100, 1_000, 10_000, 100_000])(
    "keeps the first visible window bounded and source-aligned for %i characters",
    (length) => {
      const source = "Don't stop. co-workers 🙂\n".repeat(
        Math.ceil(length / 25),
      ).slice(0, length);
      const window = englishReadingWindow(source, 0);
      const visible = window.tokens.map((token) => token.text).join("");
      const boundary = window.next ?? source.length;

      expect(visible).toBe(source.slice(0, boundary));
      expect(boundary).toBeGreaterThan(0);
      expect(boundary).toBeLessThanOrEqual(5_000);
      for (const token of window.tokens) {
        expect(token.start).toBeGreaterThanOrEqual(0);
        expect(token.end).toBeLessThanOrEqual(boundary);
        expect(source.slice(token.start, token.end)).toBe(token.text);
      }
    },
  );
  it("rejects oversized input and invalid or in-word positions", () => {
    expect(() => tokenizeEnglishReading("x".repeat(100001))).toThrow(
      "TEXT_LIMIT",
    );
    expect(() => englishReadingWindow("hello", 2)).toThrow("INSIDE_WORD");
    expect(() => englishReadingWindow("hello", -1)).toThrow("POSITION");
    expect(() => englishReadingWindow("hello", 0, 0)).toThrow("POSITION");
    expect(englishReadingWindow("", 0)).toEqual({ tokens: [], next: null });
  });
});
