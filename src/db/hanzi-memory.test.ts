import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import {
  listMemoryCandidates,
  memoryOverview,
  readMemoryMnemonic,
  recordMemoryChoice,
  recordMemoryContrast,
  saveMemoryMnemonic,
} from "./hanzi-memory";
import { migrateDatabaseSchema } from "./migrations";
import { listMistakes, recordPracticeResult } from "./mistakes";
import { getVocabulary, reviewWord } from "./repository";
import { saveVocabularyContext } from "./vocabulary-context";

import { buildMemoryQuestion } from "@/services/memory/hanzi-memory";

const protectedTables = [
  "vocabulary",
  "example_sentence",
  "user_vocabulary_progress",
  "review_log",
  "daily_stats",
  "user_settings",
  "xp_events",
  "lesson_progress",
  "lesson_activity_progress",
];
const snapshot = (sqlite: DatabaseSync) =>
  Object.fromEntries(
    protectedTables.map((table) => [
      table,
      sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
    ]),
  );
async function setup() {
  const sqlite = createLegacyDatabase();
  const db = expoAdapter(sqlite);
  await migrateDatabaseSchema(db);
  sqlite.exec(
    "UPDATE user_vocabulary_progress SET learned_at='2025-01-01T00:00:00Z',wrong_count=3,lapse_count=2,review_count=5 WHERE vocabulary_id='custom-1'",
  );
  return { sqlite, db };
}
describe("V8.3 real isolated SQLite safety", () => {
  it("ignores suspended/deleted/never-learned cards and rejects malformed time", async () => {
    const { sqlite, db } = await setup();
    try {
      const before = snapshot(sqlite);
      expect((await listMemoryCandidates(db)).map((c) => c.word.id)).toEqual([
        "custom-1",
      ]);
      await expect(
        listMemoryCandidates(db, "old", 5, "invalid"),
      ).rejects.toThrow("INVALID_MEMORY_TIME");
      expect(snapshot(sqlite)).toEqual(before);
      sqlite.exec("UPDATE user_vocabulary_progress SET is_suspended=1");
      expect(await listMemoryCandidates(db)).toEqual([]);
      sqlite.exec(
        "UPDATE user_vocabulary_progress SET is_suspended=0; UPDATE personal_deck SET deleted_at='2026-10-15'",
      );
      expect(await listMemoryCandidates(db)).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
  it("never inserts missing editorial words and validates contrast inputs", async () => {
    const { sqlite, db } = await setup();
    try {
      const before = snapshot(sqlite);
      expect(await recordMemoryContrast(db, "tu-shi", "土", "士", false)).toBe(
        false,
      );
      await expect(
        recordMemoryContrast(db, "tu-shi", "土", "日", false),
      ).rejects.toThrow("INVALID_MEMORY_CONTRAST");
      await expect(
        saveMemoryMnemonic(db, "custom-1", "您", "[/4Chinese:mnemonic]"),
      ).rejects.toThrow("INVALID_MEMORY_MNEMONIC");
      await expect(
        saveMemoryMnemonic(db, "custom-1", "土", "not in word"),
      ).rejects.toThrow("MEMORY_NOTE_WORD_NOT_FOUND");
      expect(snapshot(sqlite)).toEqual(before);
    } finally {
      sqlite.close();
    }
  });
  it("reads old and weak words including not-yet-due words without rewriting any protected record", async () => {
    const { sqlite, db } = await setup();
    try {
      sqlite.exec(
        "UPDATE user_vocabulary_progress SET next_review_at='2099-01-01T00:00:00Z' WHERE vocabulary_id='custom-1'",
      );
      const before = snapshot(sqlite);
      const version = sqlite.prepare("PRAGMA user_version").get();
      expect(
        (await listMemoryCandidates(db, "old", 20, "2026-10-15T00:00:00Z"))[0]
          ?.word.id,
      ).toBe("custom-1");
      expect((await listMemoryCandidates(db, "weak"))[0]?.word.id).toBe(
        "custom-1",
      );
      const overview = await memoryOverview(db);
      expect(overview.learned).toBe(1);
      expect(overview.due).toBe(0);
      expect(snapshot(sqlite)).toEqual(before);
      expect(sqlite.prepare("PRAGMA user_version").get()).toEqual(version);
    } finally {
      sqlite.close();
    }
  });
  it("persists verified rescue evidence and leaves dictionary, SRS, notes, XP, progress and review history intact", async () => {
    const { sqlite, db } = await setup();
    try {
      const before = snapshot(sqlite);
      const word = (await getVocabulary(db, "custom-1"))!;
      const question = buildMemoryQuestion(word, "meaning_to_hanzi", [], null);
      await recordMemoryChoice(db, question, {
        correct: false,
        hintUsed: false,
        responseTimeMs: 1000,
      });
      await recordMemoryChoice(db, question, {
        correct: true,
        hintUsed: true,
        responseTimeMs: 1200,
      });
      expect((await listMistakes(db))[0]?.correct_streak).toBe(0);
      expect(snapshot(sqlite)).toEqual(before);
      await expect(
        recordMemoryChoice(
          db,
          { ...question, type: "writing" },
          { correct: true, hintUsed: false, responseTimeMs: 1 },
        ),
      ).rejects.toThrow("WRITING_REQUIRES_MANUAL_COMPARISON");
      // The main due-only SRS still uses the original transaction and scheduler.
      expect(
        await reviewWord(
          db,
          "custom-1",
          { correct: true, responseTimeMs: 1000 },
          "meaning-hanzi",
        ),
      ).not.toBeNull();
      expect(sqlite.prepare("SELECT COUNT(*) n FROM review_log").get()).toEqual(
        { n: 2 },
      );
    } finally {
      sqlite.close();
    }
  });
  it("reuses only user-confirmed reader context and retains notes and evidence after reopening a file database", async () => {
    const { sqlite, db } = await setup();
    const temp = mkdtempSync(path.join(tmpdir(), "4chinese-v83-"));
    const file = path.join(temp, "isolated.db");
    try {
      await saveVocabularyContext(db, {
        vocabularyId: "custom-1",
        sentence: "您好，老师！",
        sourceType: "READER",
        sourceId: "isolated-reader",
        location: "test:1",
        userConfirmed: true,
      });
      const candidate = (await listMemoryCandidates(db))[0]!;
      expect(candidate.personalSentence).toBe("您好，老师！");
      expect(
        buildMemoryQuestion(
          candidate.word,
          "cloze",
          [],
          candidate.personalSentence,
        ).prompt,
      ).not.toContain("您好");
      const before = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .get() as Record<string, unknown>;
      await saveMemoryMnemonic(
        db,
        "custom-1",
        "您",
        "Tôi tự liên tưởng lời chào lịch sự.",
      );
      await saveMemoryMnemonic(db, "custom-1", "您", "Mẹo của riêng tôi.");
      const after = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .get() as Record<string, unknown>;
      expect({ ...after, notes: before.notes }).toEqual(before);
      expect(String(after.notes)).toContain("Ghi chú không được mất");
      expect(readMemoryMnemonic(String(after.notes), "您")).toBe(
        "Mẹo của riêng tôi.",
      );
      await recordPracticeResult(db, {
        vocabularyId: "custom-1",
        skill: "PINYIN",
        exerciseType: "hanzi_to_pinyin",
        correct: false,
      });
      sqlite.prepare("VACUUM INTO ?").run(file);
      const reopened = new DatabaseSync(file);
      try {
        const rdb = expoAdapter(reopened);
        expect((await listMistakes(rdb))[0]?.wrong_count).toBe(1);
        expect((await listMemoryCandidates(rdb))[0]?.personalSentence).toBe(
          candidate.personalSentence,
        );
        const persisted = reopened
          .prepare("SELECT notes FROM user_vocabulary_progress")
          .get() as { notes: string };
        expect(readMemoryMnemonic(persisted.notes, "您")).toBe(
          "Mẹo của riêng tôi.",
        );
      } finally {
        reopened.close();
      }
    } finally {
      sqlite.close();
      rmSync(temp, { recursive: true, force: true });
    }
  });
  it("does not insert progress for a new word just to store a mnemonic", async () => {
    const { sqlite, db } = await setup();
    try {
      const before = snapshot(sqlite);
      await expect(
        saveMemoryMnemonic(db, "hsk-1-ni", "你", "new"),
      ).rejects.toThrow("MEMORY_NOTE_WORD_NOT_FOUND");
      expect(snapshot(sqlite)).toEqual(before);
    } finally {
      sqlite.close();
    }
  });
});
