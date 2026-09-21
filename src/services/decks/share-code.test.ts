import { describe, expect, it } from "vitest";

import {
  createSharedDeckPayload,
  decodeDeckShareCode,
  encodeDeckShareCode,
} from "./share-code";

import type { Vocabulary } from "@/types/models";

const word: Vocabulary = {
  id: "word-1",
  simplified: "书",
  traditional: "書",
  pinyin: "shū",
  pinyinNumeric: "shu1",
  primaryMeaningVi: "sách",
  meaningsVi: ["sách"],
  meaningsEn: ["book"],
  pos: ["danh từ"],
  hskBand: 1,
  frequencyRank: 20,
  classifiers: [],
  radical: "⺮",
  strokeCount: 4,
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

describe("deck share code", () => {
  it("round-trips Chinese, Vietnamese and English fields", () => {
    const code = encodeDeckShareCode(createSharedDeckPayload({ name: "HSK 1" }, [word]));
    const decoded = decodeDeckShareCode(`Hãy học cùng mình: ${code}`);
    expect(decoded?.name).toBe("HSK 1");
    expect(decoded?.words[0]).toMatchObject({ simplified: "书", primaryMeaningVi: "sách", meaningsEn: ["book"] });
  });

  it("rejects malformed or empty codes", () => {
    expect(decodeDeckShareCode("HZD1.not-json")).toBeNull();
    expect(decodeDeckShareCode("không có mã")).toBeNull();
  });
});
