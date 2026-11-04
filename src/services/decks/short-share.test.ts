import { afterEach, describe, expect, it, vi } from "vitest";

import { createSharedDeckPayload, encodeDeckShareCode } from "./share-code";
import { createShortDeckCode, fetchSharedDeck, normalizeShortDeckCode, publishShortDeck } from "./short-share";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

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

  it("keeps the v2 snapshot intact through the eight-character RPC and bounds network waits", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://share.test");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
    const payload = { version: 2 as const, name: "Tiến độ", snapshotAt: "2026-11-04T00:00:00.000Z", words: [{
      simplified: "你", traditional: "你", pinyin: "nǐ", pinyinNumeric: "ni3", primaryMeaningVi: "bạn",
      meaningsVi: ["bạn"], meaningsEn: ["you"], pos: [], hskBand: 1 as const,
      imageUri: null, imageSource: null, imageLicense: null, imageAttribution: null, examples: [], progress: null,
    }] };
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("true"))
      .mockResolvedValueOnce(Response.json(payload));
    vi.stubGlobal("fetch", fetchMock);
    const code = await publishShortDeck(payload);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).p_payload).toEqual(payload);
    await expect(fetchSharedDeck(code)).resolves.toEqual(payload);
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("timeout")));
    }));
    const pending = expect(fetchSharedDeck(code)).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(15_000);
    await pending;
  });
});
