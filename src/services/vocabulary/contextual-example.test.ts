import { describe, expect, it } from "vitest";

import { createContextualExample, withContextualExamples, withSingleContextualExample } from "./contextual-example";

import { getOfflineVocabulary } from "@/db/database";


const word = {
  id: "word-1", simplified: "学习", traditional: "學習", pinyin: "xué xí", pinyinNumeric: "xue2 xi2",
  primaryMeaningVi: "học", meaningsVi: ["học"], meaningsEn: ["study"], pos: ["động từ"], hskBand: 1 as const,
  frequencyRank: 1, classifiers: [], radical: null, strokeCount: null, visualType: "none" as const,
  imageUri: null, imageSource: null, imageLicense: null, imageAttribution: null, audioUri: null,
  source: "test", sourceVersion: "1", sourceUrl: "", translationStatus: "verified" as const,
  examples: [
    { id: "one", vocabularyId: "word-1", chinese: "我学习。", pinyin: "Wǒ xuéxí.", vietnamese: "Tôi học.", difficulty: 1 },
    { id: "two", vocabularyId: "word-1", chinese: "学习中文。", pinyin: "Xuéxí Zhōngwén.", vietnamese: "Học tiếng Trung.", difficulty: 2 },
  ],
};

describe("contextual examples", () => {
  it("preserves all examples for detail views while list views retain one", () => {
    expect(withContextualExamples(word).examples).toHaveLength(2);
    expect(withSingleContextualExample(word).examples).toEqual([word.examples[0]]);
  });

  it("uses a sentence about visiting the library instead of talking about learning its meaning", () => {
    const library = getOfflineVocabulary([1]).find((item) => item.simplified === "图书馆");
    expect(library).toBeDefined();
    expect(withContextualExamples(library!).examples[0]).toMatchObject({
      chinese: "我在图书馆看书。",
      vietnamese: "Tôi đọc sách ở thư viện.",
    });
  });

  it("discards only the old automatic sentence, retaining user-written examples", () => {
    const generated = {
      id: "old-ex", vocabularyId: word.id,
      chinese: `我正在学习“${word.simplified}”这个词。`,
      pinyin: "Wǒ zhèngzài xuéxí...",
      vietnamese: "Tôi đang học cách dùng của từ “học”.", difficulty: 1,
    };
    expect(withContextualExamples({ ...word, examples: [generated, ...word.examples] }).examples).toEqual(word.examples);
    expect(withContextualExamples({ ...word, simplified: "罕见词", examples: [generated] }).examples).toEqual([]);
    expect(withContextualExamples({ ...word, examples: [generated] }).examples[0]?.chinese).toBe("我每天学习汉语。");
  });

  it("does not fabricate contextual usage for an unknown word or a variant sense", () => {
    expect(createContextualExample({ ...word, simplified: "未知词" })).toBeNull();
    expect(withSingleContextualExample({ ...word, simplified: "未知词", examples: [] }).examples).toEqual([]);
    expect(createContextualExample({ ...word, simplified: "吃", primaryMeaningVi: "biến thể của 吃[chi1]" })).toBeNull();
    expect(createContextualExample({ ...word, simplified: "听", pinyinNumeric: "yin3" })).toBeNull();
    expect(createContextualExample({ ...word, simplified: "在", primaryMeaningVi: "tồn tại; còn sống" })).toBeNull();
  });

  it("audits every bundled entry: no displayed example is the metalinguistic template", () => {
    const vocabulary = getOfflineVocabulary();
    expect(vocabulary.length).toBeGreaterThanOrEqual(11330);
    for (const entry of vocabulary) {
      const shown = withContextualExamples(entry).examples;
      expect(shown.every((example) => !example.chinese.includes("我正在学习“"))).toBe(true);
      expect(shown.every((example) => example.chinese.includes(entry.simplified) && example.vietnamese.trim() && example.pinyin.trim())).toBe(true);
    }
  });
});
