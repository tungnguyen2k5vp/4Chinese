import { describe, expect, it } from "vitest";

import {
  createSharedDeckPayload,
  decodeDeckShareCode,
  decodeSharedDeckPayload,
  decodeSharedWordProgress,
  encodeDeckShareCode,
} from "./share-code";
import type { SharedWordProgress } from "./share-code";

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

  it("round-trips a complete progress snapshot and strips private or unknown fields", () => {
    const progress = {
      status: "LEARNING", studied: true, due: "2026-11-01T00:00:00.000Z", state: 2,
      stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, learningSteps: 0,
      reps: 8, lapses: 1, lastReview: "2026-10-31T00:00:00.000Z", masteryLevel: 4,
      isKnown: false, isSuspended: false, memoryLevel: 4, deepMemoryStage: 0,
      learnedAt: "2026-10-01T00:00:00.000Z", nextReviewAt: "2026-11-01T00:00:00.000Z",
      reviewCount: 8, correctCount: 7, wrongCount: 1, lapseCount: 1, consecutiveCorrect: 3,
      consecutiveWrong: 0, hintUsedCount: 1, averageResponseTimeMs: 1200, lastResponseTimeMs: 900,
      vocabularyId: "private-id", notes: "private-note", isFavorite: true,
    } as SharedWordProgress;
    const payload = createSharedDeckPayload({ name: "Chuyển máy" }, [word], new Map([[word.id, progress]]));
    const code = encodeDeckShareCode(payload);
    expect(code.startsWith("HZD2.")).toBe(true);
    const decoded = decodeDeckShareCode(`Bộ từ kèm tiến độ:\n${code}`)!;
    expect(decoded.version).toBe(2);
    expect(decoded.snapshotAt).toBeTruthy();
    expect(decoded.words[0]?.progress).toMatchObject({ memoryLevel: 4, reviewCount: 8, nextReviewAt: progress.nextReviewAt });
    expect(JSON.stringify(decoded)).not.toMatch(/private-id|private-note|isFavorite/);
    expect(decodeDeckShareCode(code.replace("HZD2.", "HZD1."))).toBeNull();
    for (const change of [
      { memoryLevel: 7 }, { memoryLevel: -1 }, { reviewCount: 1.5 }, { reviewCount: Infinity },
      { due: "invalid" }, { nextReviewAt: null }, { studied: "true" }, { status: "NEW" },
      { deepMemoryStage: 1 }, { isKnown: true }, { learnedAt: "9999-01-01" },
    ]) expect(decodeSharedWordProgress({ ...progress, ...change })).toBeNull();
    const incomplete = structuredClone(decoded); delete incomplete.words[0]!.progress;
    expect(decodeSharedDeckPayload(incomplete)).toBeNull();
    expect(decodeSharedDeckPayload({ ...decoded, words: [...decoded.words, ...decoded.words] })).toBeNull();
  });

  it("keeps untouched words explicit and never silently truncates a transfer", () => {
    const payload = createSharedDeckPayload({ name: "Mới" }, [word], new Map([[word.id, null]]));
    expect(decodeDeckShareCode(encodeDeckShareCode(payload))?.words[0]?.progress).toBeNull();
    expect(() => createSharedDeckPayload({ name: "Thiếu dữ liệu" }, [word], new Map())).toThrow();
    expect(() => createSharedDeckPayload({ name: "Quá lớn" }, Array.from({ length: 501 }, () => word))).toThrow(/500/);
    expect(decodeSharedDeckPayload({ ...payload, words: Array.from({ length: 501 }, () => payload.words[0]) })).toBeNull();
  });
});
