import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { expoAdapter } from "../fixtures/legacy_database";

import { setEnglishCardSuspended, setEnglishDeckTrashed } from "./decks";
import {
  addEnglishCards,
  createEnglishDeck,
  englishDueQueue,
  englishQuickQueue,
  englishStatistics,
  initializeEnglishLearner,
  reviewEnglishCard,
  startEnglishCard,
} from "./learner";

describe("English quick session is bounded due review, not premature learning", () => {
  it("reviews at most five, excludes future/new/suspended/trash and preserves remaining schedules", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw);
    try {
      await initializeEnglishLearner(db);
      await createEnglishDeck(db, "en:deck:active", "Active");
      await createEnglishDeck(db, "en:deck:trash", "Trash");
      await addEnglishCards(
        db,
        Array.from({ length: 12 }, (_, n) => ({
          id: `en:card:${n}`,
          deck_id: n === 11 ? "en:deck:trash" : "en:deck:active",
          headword: `sample${n}`,
          meaning_vi: "QA nghĩa",
          pos: "",
          ipa: "",
          source_id: "USER",
          sense_id: null,
        })),
      );
      for (let n = 0; n < 12; n++) {
        if (n !== 9)
          await startEnglishCard(
            db,
            `en:card:${n}`,
            new Date(
              n === 10 ? "2026-10-10T01:00:00Z" : "2026-10-10T00:00:00Z",
            ),
          );
      }
      await setEnglishCardSuspended(db, "en:card:8", true);
      await setEnglishDeckTrashed(db, "en:deck:trash", true);
      const now = new Date("2026-10-10T00:30:00Z");
      const all = await englishDueQueue(db, now);
      expect(all).toHaveLength(8);
      const queue = await englishQuickQueue(db, now);
      expect(queue).toHaveLength(5);
      expect(queue.map((row) => row.id)).toEqual(
        all.slice(0, 5).map((row) => row.id),
      );
      const untouched = JSON.stringify(
        raw
          .prepare(
            "SELECT * FROM en_cards WHERE id IN ('en:card:8','en:card:9','en:card:10','en:card:11') ORDER BY id",
          )
          .all(),
      );
      for (const [index, card] of queue.entries()) {
        await reviewEnglishCard(
          db,
          {
            learningLanguage: "en",
            uiLocale: "vi",
            pronunciationVariant: "en-US",
            sessionId: "quick:session",
          },
          `quick:${index}`,
          card.id,
          card.revision,
          { correct: true, responseTimeMs: 1000 },
          "MEANING",
          now,
        );
      }
      expect(await englishDueQueue(db, now)).toHaveLength(3);
      expect(await englishQuickQueue(db, now, 5)).toEqual([]);
      expect(await englishQuickQueue(db, now, 4)).toHaveLength(1);
      expect((await englishStatistics(db, now)).reviewed).toBe(5);
      expect((await englishStatistics(db, now)).xp).toBe(50);
      expect(
        JSON.stringify(
          raw
            .prepare(
              "SELECT * FROM en_cards WHERE id IN ('en:card:8','en:card:9','en:card:10','en:card:11') ORDER BY id",
            )
            .all(),
        ),
      ).toBe(untouched);
      for (const invalid of [-1, 6, NaN, 1.5])
        await expect(englishQuickQueue(db, now, invalid)).rejects.toThrow(
          "INVALID_ENGLISH_QUICK_PROGRESS",
        );
    } finally {
      raw.close();
    }
  });
});
