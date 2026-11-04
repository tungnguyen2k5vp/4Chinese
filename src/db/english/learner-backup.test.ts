import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { expoAdapter } from "../fixtures/legacy_database";

import {
  addEnglishCards,
  createEnglishDeck,
  initializeEnglishLearner,
  readEnglishDraft,
  saveEnglishDraft,
  startEnglishCard,
} from "./learner";
import {
  exportEnglishLearnerBackup,
  replaceEnglishLearnerBackup,
  validateEnglishLearnerBackup,
} from "./learner-backup";

async function fixture() {
  const raw = new DatabaseSync(":memory:");
  const db = expoAdapter(raw);
  await initializeEnglishLearner(db);
  await createEnglishDeck(db, "en:deck:1", "Cá nhân");
  await addEnglishCards(db, [
    {
      id: "en:card:1",
      deck_id: "en:deck:1",
      headword: "user input",
      meaning_vi: "nghĩa cá nhân",
      ipa: "",
      pos: "",
      sense_id: null,
      source_id: "USER",
    },
  ]);
  await startEnglishCard(db, "en:card:1", new Date("2026-10-10T00:00:00Z"));
  return { raw, db };
}
describe("English-only backup boundary", () => {
  it("round trips decks and SRS, without exporting the original dictionary", async () => {
    const { raw, db } = await fixture();
    const targetRaw = new DatabaseSync(":memory:");
    const target = expoAdapter(targetRaw);
    try {
      const backup = await exportEnglishLearnerBackup(db);
      await replaceEnglishLearnerBackup(target, backup, "REPLACE_ENGLISH_ONLY");
      expect(await exportEnglishLearnerBackup(target)).toEqual(backup);
      expect(Object.keys(backup).sort()).toEqual([
        "cards",
        "decks",
        "format",
        "reviews",
        "version",
      ]);
    } finally {
      raw.close();
      targetRaw.close();
    }
  });
  it("validates references, duplicates and progress before any deletion", async () => {
    const { raw, db } = await fixture();
    try {
      const backup = await exportEnglishLearnerBackup(db);
      expect(() =>
        validateEnglishLearnerBackup({
          ...backup,
          cards: [backup.cards[0], backup.cards[0]],
        }),
      ).toThrow();
      await expect(
        replaceEnglishLearnerBackup(
          db,
          { ...backup, decks: [] },
          "REPLACE_ENGLISH_ONLY",
        ),
      ).rejects.toThrow();
      const corrupted = structuredClone(backup);
      corrupted.cards[0]!.progress_json = "{}";
      await expect(
        replaceEnglishLearnerBackup(db, corrupted, "REPLACE_ENGLISH_ONLY"),
      ).rejects.toThrow();
      expect(await exportEnglishLearnerBackup(db)).toEqual(backup);
    } finally {
      raw.close();
    }
  });
  it("rolls back failed replacement to the exact prior English state", async () => {
    const { raw, db } = await fixture();
    try {
      const backup = await exportEnglishLearnerBackup(db);
      raw.exec(
        "CREATE TRIGGER fail_restore BEFORE INSERT ON en_cards BEGIN SELECT RAISE(ABORT,'failed restore'); END;",
      );
      await expect(
        replaceEnglishLearnerBackup(db, backup, "REPLACE_ENGLISH_ONLY"),
      ).rejects.toThrow("failed restore");
      expect(await exportEnglishLearnerBackup(db)).toEqual(backup);
    } finally {
      raw.close();
    }
  });
  it("preserves a draft independently of learner backup replacement", async () => {
    const { raw, db } = await fixture();
    try {
      await saveEnglishDraft(db, { headword: "unsaved", meaning: "bản nháp" });
      const backup = await exportEnglishLearnerBackup(db);
      await replaceEnglishLearnerBackup(db, backup, "REPLACE_ENGLISH_ONLY");
      expect(await readEnglishDraft(db)).toEqual({
        headword: "unsaved",
        meaning: "bản nháp",
      });
    } finally {
      raw.close();
    }
  });
});
