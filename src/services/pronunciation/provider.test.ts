import { describe, expect, it } from "vitest";

import { compareRecognizedMandarin, normalizeMandarinTranscript, normalizePinyinForComparison } from "./provider";

const target = { simplified: "你好", traditional: "你好", pinyin: "nǐ hǎo" };

describe("pronunciation provider comparison", () => {
  it("normalizes Hanzi punctuation and spaces", () => {
    expect(normalizeMandarinTranscript(" 你 好！ ")).toBe("你好");
  });

  it("compares pinyin without tone marks or tone numbers", () => {
    expect(normalizePinyinForComparison("NI3 HAO3")).toBe("nihao");
    expect(compareRecognizedMandarin("ni3 hao3", target).exactMatch).toBe(true);
  });

  it("accepts exact Hanzi and distinguishes a larger recognized phrase", () => {
    expect(compareRecognizedMandarin("你好", target).exactMatch).toBe(true);
    const result = compareRecognizedMandarin("你好老师", target, 0.82);
    expect(result).toMatchObject({ exactMatch: false, partialMatch: true, provider: "native", isPronunciationScore: false, confidence: 0.82 });
  });

  it("does not claim an empty transcript was recognized", () => {
    const result = compareRecognizedMandarin("", target);
    expect(result.exactMatch).toBe(false);
    expect(result.partialMatch).toBe(false);
    expect(result.transcript).toBeUndefined();
  });
});
