import { describe, expect, it } from "vitest";

import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import {
  getListeningComprehension,
  listListeningItems,
  type ListeningItem,
} from "./listening-library";
import { migrateDatabaseSchema } from "./migrations";

import { starterVocabulary } from "@/data/starter-vocabulary";
import { systemTtsSource } from "@/services/audio/source";

describe("local listening library", () => {
  it("only publishes active reviewed sentences, keeps provenance and paginates", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const insert =
        sqlite.prepare(`INSERT INTO sentences(id,hanzi,pinyin,translation_vi,hsk_level,source,created_at,review_status,is_active)
        VALUES(?,'你好。','Nǐ hǎo.','Xin chào.','1','fixture-only','2026-10-01',?,?)`);
      insert.run("a", "REVIEWED", 1);
      insert.run("b", "REVIEWED", 1);
      insert.run("draft", "PENDING", 1);
      insert.run("inactive", "REVIEWED", 0);
      const first = await listListeningItems(db, { level: "1", limit: 1 });
      expect(first.map((row) => row.id)).toEqual(["a"]);
      expect(first[0]).toMatchObject({
        audioSource: { type: "SYSTEM_TTS" },
        source: "fixture-only",
        reviewStatus: "REVIEWED",
      });
      expect(
        (await listListeningItems(db, { level: "1", limit: 1, offset: 1 })).map(
          (row) => row.id,
        ),
      ).toEqual(["b"]);
      expect(await listListeningItems(db, { level: "7-9" })).toEqual([]);
      await expect(listListeningItems(db, { level: "bad" })).rejects.toThrow(
        "INVALID_LISTENING_LEVEL",
      );
    } finally {
      sqlite.close();
    }
  });
});

describe("source-bound self-comprehension companions", () => {
  const item = (transcript: string): ListeningItem => ({
    id: "existing-sentence",
    level: "1",
    type: "SENTENCE",
    transcript,
    pinyin: "",
    translation: "",
    audioSource: systemTtsSource(transcript),
    targetVocabulary: [],
    targetGrammar: [],
    reviewStatus: "REVIEWED",
    source: "existing source label",
  });
  it("has twelve exact-source companions with separate draft provenance and stable references", () => {
    const exercises = starterVocabulary
      .flatMap((word) =>
        word.examples.map((example) =>
          getListeningComprehension(item(example.chinese)),
        ),
      )
      .filter(Boolean);
    expect(exercises).toHaveLength(12);
    for (const exercise of exercises) {
      expect(exercise).toMatchObject({
        sentenceId: "existing-sentence",
        provenance: "AI_AUTHORED_SELF_PRACTICE",
        reviewStatus: "DRAFT",
        sentenceSource: "existing source label",
      });
      expect(new Set(exercise!.choices).size).toBe(3);
      expect(exercise!.choices[exercise!.correctIndex]).toBeTruthy();
      expect(exercise!.explanationVi.length).toBeGreaterThan(20);
    }
  });
  it("does not generate exercises for arbitrary, modified, blank-source or unreviewed items", () => {
    expect(getListeningComprehension(item("你好。"))).toBeNull();
    expect(getListeningComprehension(item("我每天学习英语。"))).toBeNull();
    expect(
      getListeningComprehension({ ...item("我每天学习汉语。"), source: " " }),
    ).toBeNull();
    expect(
      getListeningComprehension({
        ...item("我每天学习汉语。"),
        reviewStatus: "PENDING",
      } as unknown as ListeningItem),
    ).toBeNull();
  });
  it("returns isolated choices and never promotes the underlying sentence", () => {
    const sentence = item("我每天学习汉语。");
    const before = structuredClone(sentence);
    getListeningComprehension(sentence)!.choices[0] = "modified";
    expect(getListeningComprehension(sentence)!.choices[0]).toBe("Mỗi ngày");
    expect(sentence).toEqual(before);
  });
});
