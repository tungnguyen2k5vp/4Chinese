import { describe, expect, it } from "vitest";

import { readerHanziTerms, segmentReaderText } from "./segment";

import type { Vocabulary } from "@/types/models";

function word(id: string, simplified: string): Vocabulary {
  return { id, simplified, traditional: simplified, pinyin: id, pinyinNumeric: id, primaryMeaningVi: id, meaningsVi: [id], meaningsEn: [id], pos: [], hskBand: 1, frequencyRank: 1, classifiers: [], radical: null, strokeCount: null, visualType: "none", imageUri: null, imageSource: null, imageLicense: null, imageAttribution: null, audioUri: null, source: "test", sourceVersion: "1", sourceUrl: "", translationStatus: "verified", examples: [] };
}

describe("Reader segmentation", () => {
  it("creates bounded exact-Hanzi lookup terms without punctuation", () => {
    expect(readerHanziTerms("我在学习中文。", 3)).toEqual(expect.arrayContaining(["我", "我在", "学习", "学习中", "中文"]));
  });

  it("uses longest dictionary match and keeps unknown Hanzi visible", () => {
    const tokens = segmentReaderText("我在学习中文", [word("learn", "学习"), word("chinese", "中文"), word("me", "我")]);
    expect(tokens.map((token) => [token.text, token.vocabulary?.id ?? null])).toEqual([["我", "me"], ["在", null], ["学习", "learn"], ["中文", "chinese"]]);
  });
});
