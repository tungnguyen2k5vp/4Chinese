import { describe, expect, it } from "vitest";

import { rankRelatedWords } from "./related-words";

import type { Vocabulary } from "@/types/models";

function word(id: string, simplified: string, hskBand: Vocabulary["hskBand"], frequencyRank: number | null, status?: Vocabulary["status"]): Vocabulary {
  return { id, simplified, traditional: simplified, pinyin: "xue", pinyinNumeric: "xue2", primaryMeaningVi: id, meaningsVi: [id], meaningsEn: [id], pos: [], hskBand, frequencyRank, classifiers: [], radical: null, strokeCount: null, visualType: "none", imageUri: null, imageSource: null, imageLicense: null, imageAttribution: null, audioUri: null, source: "test", sourceVersion: "1", sourceUrl: "", translationStatus: "verified", examples: [], status };
}

describe("rankRelatedWords", () => {
  it("prefers shared characters, close HSK level, current learning status, then frequency", () => {
    const source = word("learn", "学", 1, 10);
    const ranked = rankRelatedWords(source, [
      word("unrelated", "天气", 1, 1),
      word("advanced", "大学", 4, 1, "LEARNING"),
      word("learning", "学生", 1, 999, "LEARNING"),
      word("frequent", "学习", 1, 2, "NEW"),
    ]);

    expect(ranked.map((item) => item.id)).toEqual(["learning", "frequent", "advanced"]);
  });
});
