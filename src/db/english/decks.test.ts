import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { expoAdapter } from "../fixtures/legacy_database";

import {
  renameEnglishDeck,
  setEnglishDeckTrashed,
  listTrashedEnglishDecks,
  setEnglishCardSuspended,
} from "./decks";
import {
  initializeEnglishLearner,
  createEnglishDeck,
  addEnglishCards,
  startEnglishCard,
  englishDueQueue,
  listEnglishDecks,
} from "./learner";

describe("English deck recovery and card suspension", () => {
  it("rename/trash/restore preserve IDs and scheduler; trash excludes learning and due", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw);
    try {
      await initializeEnglishLearner(db);
      await createEnglishDeck(db, "en:deck:1", "Before");
      await addEnglishCards(
        db,
        [1, 2].map((n) => ({
          id: `en:card:${n}`,
          deck_id: "en:deck:1",
          headword: "bank",
          meaning_vi: `nghĩa ${n}`,
          pos: "",
          ipa: "",
          source_id: "USER",
          sense_id: null,
        })),
      );
      await startEnglishCard(db, "en:card:1", new Date("2026-10-10T00:00:00Z"));
      const before = JSON.stringify(
        raw.prepare("SELECT * FROM en_cards ORDER BY id").all(),
      );
      await renameEnglishDeck(db, "en:deck:1", "After");
      await setEnglishDeckTrashed(db, "en:deck:1", true);
      expect(await listEnglishDecks(db)).toEqual([]);
      expect(await listTrashedEnglishDecks(db)).toEqual([
        { id: "en:deck:1", name: "After" },
      ]);
      const now = new Date("2026-10-10T01:00:00Z");
      expect(await englishDueQueue(db, now)).toEqual([]);
      await expect(startEnglishCard(db, "en:card:2", now)).rejects.toThrow();
      await setEnglishDeckTrashed(db, "en:deck:1", false);
      expect(await englishDueQueue(db, now)).toHaveLength(1);
      expect(
        JSON.stringify(raw.prepare("SELECT * FROM en_cards ORDER BY id").all()),
      ).toBe(before);
      await setEnglishCardSuspended(db, "en:card:1", true);
      expect(await englishDueQueue(db, now)).toEqual([]);
      await setEnglishCardSuspended(db, "en:card:1", false);
      expect(await englishDueQueue(db, now)).toHaveLength(1);
      await setEnglishCardSuspended(db, "en:card:2", true);
      await expect(startEnglishCard(db, "en:card:2", now)).rejects.toThrow();
      await expect(renameEnglishDeck(db, "en:deck:1", " ")).rejects.toThrow();
      await expect(
        setEnglishDeckTrashed(db, "zh:deck:1", true),
      ).rejects.toThrow();
    } finally {
      raw.close();
    }
  });
});
