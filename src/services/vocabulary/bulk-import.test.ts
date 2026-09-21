import { describe, expect, it } from "vitest";

import { parseBulkVocabularyInput, rankBulkCandidates } from "./bulk-import";

import type { Vocabulary } from "@/types/models";

const candidate = (
  id: string,
  simplified: string,
  meaning: string,
  hskBand: Vocabulary["hskBand"],
  frequencyRank: number | null,
): Vocabulary => ({
  id,
  simplified,
  traditional: simplified,
  pinyin: "",
  pinyinNumeric: "",
  primaryMeaningVi: meaning,
  meaningsVi: [meaning],
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
  sourceUrl: "",
  translationStatus: "verified",
  examples: [],
});

describe("parseBulkVocabularyInput", () => {
  it("parses, de-duplicates and limits newline-separated words", () => {
    expect(parseBulkVocabularyInput("李\n quân\n李\n- 学习", 3)).toEqual([
      "李",
      "quân",
      "学习",
    ]);
  });

  it("prefers the whole country phrase over an unrelated frequent word", () => {
    const move = candidate("move", "着", "(cờ) nước đi", 2, 20);
    const vietnam = candidate("vietnam", "越南", "Việt Nam", 2, null);
    expect(rankBulkCandidates("Nước Việt Nam", [move, vietnam])[0]?.id).toBe("vietnam");
    expect(rankBulkCandidates("Nước Việt Nam", [move, vietnam]).map((item) => item.id)).not.toContain("move");
  });

  it("uses HSK 1-2 as a tie breaker for equally relevant beginner meanings", () => {
    const beginner = candidate("beginner", "学", "học", 1, 500);
    const advanced = candidate("advanced", "学术", "học", 5, 20);
    expect(rankBulkCandidates("học", [advanced, beginner])[0]?.id).toBe("beginner");
  });

  it("does not collapse Vietnamese tone differences into a wrong word", () => {
    const book = candidate("book", "书", "sách; thư", 1, 20);
    const order = candidate("order", "次", "thứ; lần", 2, 80);
    expect(rankBulkCandidates("thứ", [book, order])[0]?.id).toBe("order");
  });
});
