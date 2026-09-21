import { describe, expect, it } from "vitest";

import { rankPinyinCandidates } from "./candidateRanking";

import type { Vocabulary } from "@/types/models";

function word(id: string, simplified: string, pinyinNumeric: string, hskBand: Vocabulary["hskBand"] = 1, frequencyRank = 100): Vocabulary {
  return {
    id,
    simplified,
    traditional: simplified,
    pinyin: pinyinNumeric,
    pinyinNumeric,
    primaryMeaningVi: simplified,
    meaningsVi: [simplified],
    meaningsEn: [],
    pos: [],
    hskBand,
    frequencyRank,
    classifiers: [],
    radical: null,
    strokeCount: null,
    visualType: "none",
    imageUri: null,
    imageSource: null,
    imageLicense: null,
    imageAttribution: null,
    audioUri: null,
    source: "test",
    sourceVersion: "1",
    sourceUrl: "local://test",
    translationStatus: "verified",
    examples: [],
  };
}

describe("pinyin Hanzi candidate ranking", () => {
  it("prioritizes an exact whole-word match for 学习", () => {
    const ranked = rankPinyinCandidates([
      { word: word("single", "学", "xue2", 1, 1), normalizedPinyin: "xue" },
      { word: word("whole", "学习", "xue2 xi2", 1, 18), normalizedPinyin: "xuexi" },
      { word: word("other", "血洗", "xue4 xi3", 5, 1000), normalizedPinyin: "xuexi" },
    ], "xuexi", { targetVocabularyId: "whole", hskBand: 1 });
    expect(ranked.map((item) => item.word.simplified)).toEqual(["学习", "血洗", "学"]);
  });

  it("keeps a whole-word exact match ahead of a single-character exact match", () => {
    const ranked = rankPinyinCandidates([
      { word: word("single", "习", "xue2xi2", 1, 1), normalizedPinyin: "xuexi" },
      { word: word("whole", "学习", "xue2 xi2", 1, 99), normalizedPinyin: "xuexi" },
    ], "xuexi");
    expect(ranked[0]?.word.simplified).toBe("学习");
  });

  it("uses the target bonus without automatically selecting it", () => {
    const ranked = rankPinyinCandidates([
      { word: word("other", "稀罕", "xi1 han5", 1, 900), normalizedPinyin: "xihan" },
      { word: word("target", "喜欢", "xi3 huan5", 4, 9000), normalizedPinyin: "xihuan" },
    ], "xihuan", { targetVocabularyId: "target" });
    expect(ranked[0]?.word.id).toBe("target");
    expect(ranked[0]?.word.simplified).toBe("喜欢");
  });
});
