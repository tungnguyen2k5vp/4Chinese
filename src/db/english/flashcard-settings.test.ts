import { DatabaseSync } from "node:sqlite";

import type { SQLiteDatabase } from "expo-sqlite";
import { describe, expect, it } from "vitest";


import { expoAdapter } from "../fixtures/legacy_database";

import { readEnglishFlashcardSettings, saveEnglishFlashcardSettings } from "./flashcard-settings";
import { initializeEnglishLearner } from "./learner";

describe("English flashcard session settings", () => {
  it("persists only implemented controls in the existing English learner DB", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw) as unknown as SQLiteDatabase;
    try {
      await initializeEnglishLearner(db);
      const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
      const settings = await saveEnglishFlashcardSettings(db, { shuffleOnStart: true, autoPlayOnShow: true, reviewBatchSize: 15 });
      expect(await readEnglishFlashcardSettings(db)).toEqual(settings);
      expect(settings.reviewBatchSize).toBe(15);
      expect(await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version")).toEqual(version);
    } finally { raw.close(); }
  });

  it("defaults to five and rejects unsupported batch sizes without changing database schema", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw) as unknown as SQLiteDatabase;
    try {
      await initializeEnglishLearner(db);
      expect((await readEnglishFlashcardSettings(db)).reviewBatchSize).toBe(5);
      const stored = await saveEnglishFlashcardSettings(db, {
        shuffleOnStart: false,
        autoPlayOnShow: false,
        reviewBatchSize: 50 as never,
      });
      expect(stored.reviewBatchSize).toBe(5);
    } finally { raw.close(); }
  });
});
