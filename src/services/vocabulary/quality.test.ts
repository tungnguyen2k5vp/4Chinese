import { describe, expect, it } from "vitest";

import {
  applyVocabularyQualityOverride,
  cleanLearnerMeaning,
  isLowQualityMeaning,
  vocabularySearchAliases,
} from "./quality";

import type { Vocabulary } from "@/types/models";

const word = (simplified: string): Vocabulary => ({
  id: simplified,
  simplified,
  traditional: simplified,
  pinyin: "",
  pinyinNumeric: "",
  primaryMeaningVi: "",
  meaningsVi: [],
  meaningsEn: [],
  pos: [],
  hskBand: 1,
  frequencyRank: null,
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
  translationStatus: "machine",
  examples: [],
});

describe("vocabulary quality corrections", () => {
  it("replaces the phonology-only 上 entry with its common HSK sense", () => {
    const corrected = applyVocabularyQualityOverride({
      ...word("上"),
      pinyin: "shǎng",
      pinyinNumeric: "shang3",
      primaryMeaningVi: "dùng trong 上聲[shang3 sheng1]",
    });

    expect(corrected.pinyinNumeric).toBe("shang4");
    expect(corrected.primaryMeaningVi).toBe("trên; lên; ở trên");
    expect(corrected.meaningsVi).toContain("trên");
  });

  it("provides concrete Vietnamese aliases for common time words", () => {
    expect(vocabularySearchAliases("上午")).toEqual(expect.arrayContaining(["buổi sáng"]));
    expect(vocabularySearchAliases("早上")).toEqual(expect.arrayContaining(["sáng sớm"]));
    expect(vocabularySearchAliases("中午")).toEqual(expect.arrayContaining(["buổi trưa"]));
  });

  it("flags source notes so they can be ranked below learner-facing meanings", () => {
    expect(isLowQualityMeaning("dùng trong 上聲[shang3 sheng1]")).toBe(true);
    expect(isLowQualityMeaning("buổi sáng")).toBe(false);
  });

  it("strips measure-word/source annotations from the offline index", () => {
    expect(cleanLearnerMeaning("rau (LT: 棵[ke1])")).toBe("rau");
    expect(cleanLearnerMeaning("siêu thị (viết tắt của 超级市场[chao1 ji2 shi4 chang3])")).toBe("siêu thị");
  });

  it("does not merge distinct readings of a multi-reading CSV headword", () => {
    const corrected = applyVocabularyQualityOverride({
      ...word("\u4e3a"),
      primaryMeaningVi: "bi\u1ebfn th\u1ec3 c\u1ee7a \u70ba|\u4e3a[wei2]",
    });
    expect(corrected.primaryMeaningVi).toBe("bi\u1ebfn th\u1ec3 c\u1ee7a \u70ba|\u4e3a[wei2]");
  });
});
