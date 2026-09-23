import { describe, expect, it } from "vitest";

import { createSharedDeckPayload, encodeDeckShareCode } from "./share-code";
import { createShortDeckCode, fetchSharedDeck, normalizeShortDeckCode } from "./short-share";

describe("short deck share code", () => {
  it("creates an eight-character code without ambiguous glyphs", () => {
    expect(createShortDeckCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/u);
  });

  it("accepts spaces or a hyphen while importing", () => {
    expect(normalizeShortDeckCode("abcz-2345")).toBe("ABCZ2345");
    expect(normalizeShortDeckCode("ABC01234")).toBeNull();
  });

  it("keeps importing legacy self-contained HZD1 codes", async () => {
    const legacyCode = encodeDeckShareCode(createSharedDeckPayload(
      { name: "Bộ cũ" },
      [{
        id: "legacy-word",
        simplified: "学习",
        traditional: "學習",
        pinyin: "xuéxí",
        pinyinNumeric: "xue2 xi2",
        primaryMeaningVi: "học tập",
        meaningsVi: ["học tập"],
        meaningsEn: ["to study"],
        pos: ["động từ"],
        hskBand: 1,
        frequencyRank: 1,
        classifiers: [],
        radical: "子",
        strokeCount: 16,
        visualType: "none",
        imageUri: null,
        imageSource: null,
        imageLicense: null,
        imageAttribution: null,
        audioUri: null,
        source: "test",
        sourceVersion: "1",
        sourceUrl: "test://legacy",
        translationStatus: "verified",
        examples: [],
        isCustom: false,
        deckId: null,
      }],
    ));

    await expect(fetchSharedDeck(`Mã cũ: ${legacyCode}`)).resolves.toMatchObject({
      version: 1,
      name: "Bộ cũ",
      words: [{ simplified: "学习" }],
    });
  });
});
