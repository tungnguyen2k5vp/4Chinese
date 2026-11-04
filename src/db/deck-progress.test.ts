import { describe, expect, it } from "vitest";

import { getDeckShareProgress, resetDeckProgress } from "./deck-progress";
import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { migrateDatabaseSchema } from "./migrations";
import { copyVocabularyBatchToDeck, createPersonalDeck, getDeckVocabulary, getDueVocabulary, getProgress, importSharedDeck, startLearningWord } from "./repository";

import { createSharedDeckPayload, decodeDeckShareCode, encodeDeckShareCode } from "@/services/decks/share-code";

async function fixture() {
  const sqlite = createLegacyDatabase();
  const db = expoAdapter(sqlite);
  await migrateDatabaseSchema(db);
  return { sqlite, db };
}

async function snapshot(db: ReturnType<typeof expoAdapter>) {
  const words = await getDeckVocabulary(db, "deck-1");
  return createSharedDeckPayload({ name: "Chuyển máy" }, words, await getDeckShareProgress(db, "deck-1"));
}

describe("deck progress transfer and reset against real SQLite", () => {
  it("restores by word identity on another database, with the original due date and no source writes or XP", async () => {
    const source = await fixture(), target = await fixture();
    try {
      source.sqlite.exec(`UPDATE user_vocabulary_progress SET review_count=8,correct_count=7,wrong_count=1,
        reps=8,lapses=1,lapse_count=1,consecutive_correct=3,last_review='2025-01-05T00:00:00.000Z' WHERE vocabulary_id='custom-1'`);
      const beforeSource = source.sqlite.prepare("SELECT * FROM user_vocabulary_progress").all();
      const sourceProgress = [...(await getDeckShareProgress(source.db, "deck-1")).values()];
      const payload = decodeDeckShareCode(encodeDeckShareCode(await snapshot(source.db)))!;
      target.sqlite.exec("DELETE FROM personal_deck; DELETE FROM vocabulary;");
      const stats = target.sqlite.prepare("SELECT * FROM daily_stats").all();
      const result = await importSharedDeck(target.db, payload, true);
      const words = await getDeckVocabulary(target.db, result.deckId);
      expect(words).toHaveLength(1);
      expect(words[0]!.id).not.toBe("custom-1");
      expect([...(await getDeckShareProgress(target.db, result.deckId)).values()]).toEqual(sourceProgress);
      expect((await getDueVocabulary(target.db, 20, undefined, result.deckId)).map((word) => word.id)).toEqual([words[0]!.id]);
      expect(target.sqlite.prepare("SELECT * FROM daily_stats").all()).toEqual(stats);
      expect(target.sqlite.prepare("SELECT * FROM xp_events").all()).toEqual([]);
      expect(target.sqlite.prepare("SELECT * FROM review_log").all()).toEqual([]);
      expect(source.sqlite.prepare("SELECT * FROM user_vocabulary_progress").all()).toEqual(beforeSource);
      expect(target.sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally { source.sqlite.close(); target.sqlite.close(); }
  });

  it("retains existing local progress for legacy codes and when snapshot restoration is declined", async () => {
    const { sqlite, db } = await fixture();
    try {
      const before = sqlite.prepare("SELECT * FROM user_vocabulary_progress").all();
      const words = await getDeckVocabulary(db, "deck-1");
      const v2 = await snapshot(db); v2.words[0]!.progress!.memoryLevel = 2;
      await importSharedDeck(db, v2, false);
      await importSharedDeck(db, createSharedDeckPayload({ name: "Cũ" }, words), true);
      expect(sqlite.prepare("SELECT * FROM user_vocabulary_progress").all()).toEqual(before);
      const imported = await importSharedDeck(db, v2, true);
      expect((await getDeckVocabulary(db, imported.deckId))[0]!.id).toBe("custom-1");
      expect((await getProgress(db, "custom-1"))?.memoryLevel).toBe(2);
      expect(sqlite.prepare("SELECT notes,is_favorite FROM user_vocabulary_progress WHERE vocabulary_id='custom-1'").get())
        .toEqual({ notes: "Ghi chú không được mất", is_favorite: 1 });
    } finally { sqlite.close(); }
  });

  it("restores NEW, KNOWN and SKIPPED without accidentally enrolling them in review", async () => {
    const source = await fixture(), target = await fixture();
    try {
      for (const status of ["NEW", "KNOWN", "SKIPPED"] as const) {
        source.sqlite.prepare(`UPDATE user_vocabulary_progress SET status=?,studied=?,is_known=?,is_suspended=?,
          memory_level=0,mastery_level=0,deep_memory_stage=0,learned_at=NULL WHERE vocabulary_id='custom-1'`)
          .run(status, status === "KNOWN" ? 1 : 0, status === "KNOWN" ? 1 : 0, status === "SKIPPED" ? 1 : 0);
        const result = await importSharedDeck(target.db, await snapshot(source.db), true);
        expect((await getProgress(target.db, "custom-1"))?.status).toBe(status);
        expect(await getDueVocabulary(target.db, 20, undefined, result.deckId)).toEqual([]);
      }
      const empty = await snapshot(source.db); empty.words[0]!.progress = null;
      await importSharedDeck(target.db, empty, true);
      expect((await getProgress(target.db, "custom-1"))?.status).toBe("NEW");
      expect((await getProgress(target.db, "custom-1"))?.reviewCount).toBe(0);
    } finally { source.sqlite.close(); target.sqlite.close(); }
  });

  it("keeps different pronunciations of the same Hanzi separate", async () => {
    const { sqlite, db } = await fixture();
    try {
      const base = (await getDeckVocabulary(db, "deck-1"))[0]!;
      await copyVocabularyBatchToDeck(db, "deck-1", [{ ...base, simplified: "行", traditional: "行", pinyin: "xíng", pinyinNumeric: "xing2", examples: [] }]);
      const existing = (await getDeckVocabulary(db, "deck-1")).find((word) => word.simplified === "行")!;
      await startLearningWord(db, existing.id);
      const payload = await snapshot(db);
      payload.words = [{ ...payload.words.find((word) => word.simplified === "您好")!, simplified: "行", traditional: "行", pinyin: "háng", pinyinNumeric: "hang2", examples: [] }];
      const result = await importSharedDeck(db, payload, true);
      const imported = (await getDeckVocabulary(db, result.deckId))[0]!;
      expect(imported.id).not.toBe(existing.id);
      expect((await getProgress(db, imported.id))?.memoryLevel).toBe(4);
      expect((await getProgress(db, existing.id))?.memoryLevel).toBe(1);
    } finally { sqlite.close(); }
  });

  it("rejects a corrupted snapshot before creating a deck or writing any progress", async () => {
    const { sqlite, db } = await fixture();
    try {
      const payload = await snapshot(db); payload.words[0]!.progress!.memoryLevel = 99;
      const decks = sqlite.prepare("SELECT * FROM personal_deck").all();
      const progress = sqlite.prepare("SELECT * FROM user_vocabulary_progress").all();
      await expect(importSharedDeck(db, payload, true)).rejects.toThrow();
      expect(sqlite.prepare("SELECT * FROM personal_deck").all()).toEqual(decks);
      expect(sqlite.prepare("SELECT * FROM user_vocabulary_progress").all()).toEqual(progress);
    } finally { sqlite.close(); }
  });

  it("rolls back earlier restored words and memberships when a later progress write fails", async () => {
    const { sqlite, db } = await fixture();
    try {
      await copyVocabularyBatchToDeck(db, "deck-1", [{ ...(await getDeckVocabulary(db, "deck-1"))[0]!,
        simplified: "你", traditional: "你", pinyin: "nǐ", pinyinNumeric: "ni3", examples: [] }]);
      await startLearningWord(db, "hsk-1-ni");
      const payload = await snapshot(db);
      payload.words.sort((left) => left.simplified === "你" ? -1 : 1);
      payload.words[0]!.progress = null;
      const before = sqlite.prepare("SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id").all();
      const memberships = sqlite.prepare("SELECT * FROM personal_deck_vocabulary ORDER BY deck_id,vocabulary_id").all();
      sqlite.exec("CREATE TRIGGER fail_restore BEFORE UPDATE ON user_vocabulary_progress WHEN NEW.vocabulary_id='custom-1' BEGIN SELECT RAISE(ABORT,'simulated write failure'); END;");
      await expect(importSharedDeck(db, payload, true)).rejects.toThrow();
      expect(sqlite.prepare("SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id").all()).toEqual(before);
      expect(sqlite.prepare("SELECT * FROM personal_deck_vocabulary ORDER BY deck_id,vocabulary_id").all()).toEqual(memberships);
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM personal_deck WHERE deleted_at IS NULL").get()).toEqual({ count: 1 });
    } finally { sqlite.close(); }
  });

  it("resets only deck words atomically, preserving content, favorites, notes, other words and overall activity", async () => {
    const { sqlite, db } = await fixture();
    try {
      await startLearningWord(db, "hsk-1-ni");
      const otherDeck = await createPersonalDeck(db, "Bộ dùng chung");
      await copyVocabularyBatchToDeck(db, otherDeck, await getDeckVocabulary(db, "deck-1"));
      sqlite.exec(`INSERT INTO mistake_records(id,vocabulary_id,skill_type,exercise_type,updated_at)
        VALUES('test-mistake','custom-1','MEANING','hanzi_to_meaning','2026-11-01');
        INSERT INTO vocabulary_skill_mastery(vocabulary_id,updated_at) VALUES('custom-1','2026-11-01');`);
      const content = sqlite.prepare("SELECT * FROM vocabulary ORDER BY id").all();
      const outside = await getProgress(db, "hsk-1-ni");
      const stats = sqlite.prepare("SELECT * FROM daily_stats").all();
      const xp = sqlite.prepare("SELECT * FROM xp_events").all();
      sqlite.exec("CREATE TRIGGER fail_reset BEFORE DELETE ON review_log BEGIN SELECT RAISE(ABORT,'simulated reset failure'); END;");
      const progress = await getProgress(db, "custom-1");
      await expect(resetDeckProgress(db, "deck-1")).rejects.toThrow();
      expect(await getProgress(db, "custom-1")).toEqual(progress);
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM review_log").get()).toEqual({ count: 1 });
      sqlite.exec("DROP TRIGGER fail_reset;");
      expect(await resetDeckProgress(db, "deck-1")).toBe(1);
      expect(await getProgress(db, "custom-1")).toMatchObject({ status: "NEW", studied: false, memoryLevel: 0, reviewCount: 0, isFavorite: true });
      expect(sqlite.prepare("SELECT notes FROM user_vocabulary_progress WHERE vocabulary_id='custom-1'").get()).toEqual({ notes: "Ghi chú không được mất" });
      expect((await getDeckVocabulary(db, otherDeck))[0]?.status).toBe("NEW");
      expect(await getProgress(db, "hsk-1-ni")).toEqual(outside);
      expect(sqlite.prepare("SELECT * FROM vocabulary ORDER BY id").all()).toEqual(content);
      expect(sqlite.prepare("SELECT * FROM daily_stats").all()).toEqual(stats);
      expect(sqlite.prepare("SELECT * FROM xp_events").all()).toEqual(xp);
      for (const table of ["review_log", "mistake_records", "vocabulary_skill_mastery"])
        expect(sqlite.prepare(`SELECT * FROM ${table} WHERE vocabulary_id='custom-1'`).all()).toEqual([]);
      await expect(resetDeckProgress(db, "missing-deck")).rejects.toThrow();
      expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});
