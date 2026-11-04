import { DatabaseSync } from "node:sqlite";

import type { SQLiteDatabase } from "expo-sqlite";
import { describe, expect, it } from "vitest";


import { expoAdapter } from "../fixtures/legacy_database";

import { initializeEnglishLearner } from "./learner";
import { readEnglishProfilePreferences, saveEnglishProfilePreferences } from "./profile";

describe("English-only profile preferences", () => {
  it("round-trips validated choices in the existing learner draft table without a schema change", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw) as unknown as SQLiteDatabase;
    try {
      await initializeEnglishLearner(db);
      const before = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
      const saved = await saveEnglishProfilePreferences(db, {
        goal: "work", level: "intermediate", topics: ["technology", "business", "technology"], dailyMinutes: 15,
      });
      expect(saved.topics).toEqual(["technology", "business"]);
      expect(await readEnglishProfilePreferences(db)).toEqual(saved);
      expect(await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version")).toEqual(before);
    } finally { raw.close(); }
  });

  it("falls back safely for malformed or unsupported persisted values", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw) as unknown as SQLiteDatabase;
    try {
      await initializeEnglishLearner(db);
      await db.runAsync("INSERT INTO en_drafts(id,payload_json) VALUES('profile-preferences:v1',?)", JSON.stringify({ goal: "made-up", level: "C2", topics: ["fiction"], dailyMinutes: 999 }));
      expect(await readEnglishProfilePreferences(db)).toEqual({ goal: null, level: null, topics: [], dailyMinutes: 10 });
    } finally { raw.close(); }
  });
});
