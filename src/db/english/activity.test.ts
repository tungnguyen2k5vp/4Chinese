import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { expoAdapter } from "../fixtures/legacy_database";

import {
  englishDailyPlan,
  englishDayWindow,
  englishMistakeBook,
} from "./activity";
import {
  addEnglishCards,
  createEnglishDeck,
  initializeEnglishLearner,
  reviewEnglishCard,
  startEnglishCard,
} from "./learner";

async function fixture() {
  const raw = new DatabaseSync(":memory:");
  const db = expoAdapter(raw);
  await initializeEnglishLearner(db);
  await createEnglishDeck(db, "en:deck:1", "Personal");
  await addEnglishCards(
    db,
    [1, 2, 3].map((n) => ({
      id: `en:card:${n}`,
      deck_id: "en:deck:1",
      headword: `word ${n}`,
      meaning_vi: `nghĩa ${n}`,
      pos: "",
      ipa: "",
      sense_id: null,
      source_id: "USER",
    })),
  );
  return { raw, db };
}
const now = new Date("2026-10-10T12:00:00Z");
const context = {
  learningLanguage: "en",
  uiLocale: "vi",
  pronunciationVariant: "en-US",
  sessionId: "en:session:qa",
} as const;

describe("English daily activity derived from persisted reviews", () => {
  it("fresh cards are suggestions, not prematurely due; reads do not mutate", async () => {
    const { raw, db } = await fixture();
    try {
      const before = JSON.stringify(
        raw.prepare("SELECT * FROM en_cards").all(),
      );
      expect(await englishDailyPlan(db, now)).toEqual({
        due: 0,
        newCards: 3,
        suggestedNew: 3,
        reviewedToday: 0,
        correctToday: 0,
        responseMsToday: 0,
        historicalMistakes: 0,
      });
      expect(await englishMistakeBook(db)).toEqual([]);
      expect(JSON.stringify(raw.prepare("SELECT * FROM en_cards").all())).toBe(
        before,
      );
    } finally {
      raw.close();
    }
  });
  it("one wrong retry is one event; later correct keeps historical error honestly labeled", async () => {
    const { raw, db } = await fixture();
    try {
      await startEnglishCard(
        db,
        "en:card:1",
        new Date(now.getTime() - 3600000),
      );
      const input = { correct: false, responseTimeMs: 1234 };
      const next = await reviewEnglishCard(
        db,
        context,
        "en:op:wrong",
        "en:card:1",
        1,
        input,
        "MEANING",
        now,
      );
      await reviewEnglishCard(
        db,
        context,
        "en:op:wrong",
        "en:card:1",
        1,
        input,
        "MEANING",
        now,
      );
      expect((await englishDailyPlan(db, now)).reviewedToday).toBe(1);
      expect((await englishMistakeBook(db))[0]).toMatchObject({
        wrong_count: 1,
        latest_correct: 0,
      });
      await reviewEnglishCard(
        db,
        context,
        "en:op:correct",
        "en:card:1",
        2,
        { correct: true, responseTimeMs: 500 },
        "MEANING",
        new Date(next.nextReviewAt),
      );
      expect((await englishMistakeBook(db))[0]).toMatchObject({
        wrong_count: 1,
        latest_correct: 1,
      });
      expect(
        (await englishDailyPlan(db, new Date(next.nextReviewAt)))
          .historicalMistakes,
      ).toBe(1);
    } finally {
      raw.close();
    }
  });
  it("excludes suspended/deleted cards from recommendations and deleted decks from mistakes", async () => {
    const { raw, db } = await fixture();
    try {
      raw
        .prepare("UPDATE en_cards SET suspended=1 WHERE id=?")
        .run("en:card:2");
      expect((await englishDailyPlan(db, now)).suggestedNew).toBe(2);
      await startEnglishCard(
        db,
        "en:card:1",
        new Date(now.getTime() - 3600000),
      );
      await reviewEnglishCard(
        db,
        context,
        "en:op:x",
        "en:card:1",
        1,
        { correct: false, responseTimeMs: 0 },
        "MEANING",
        now,
      );
      raw.prepare("UPDATE en_decks SET deleted=1").run();
      expect((await englishDailyPlan(db, now)).newCards).toBe(0);
      expect(await englishMistakeBook(db)).toEqual([]);
      // Committed history is retained even when its deck is moved out of the active view.
      expect((await englishDailyPlan(db, now)).reviewedToday).toBe(1);
    } finally {
      raw.close();
    }
  });
  it("uses a half-open local calendar day; rejects invalid bounds", async () => {
    const { raw, db } = await fixture();
    try {
      const { start, end } = englishDayWindow(now);
      const insert = raw.prepare(
        "INSERT INTO en_reviews VALUES(?,?,?,?,?,?,?,?)",
      );
      [
        new Date(new Date(start).getTime() - 1).toISOString(),
        start,
        end,
      ].forEach((at, n) =>
        insert.run(
          `op${n}`,
          "en:card:1",
          "session",
          at,
          1,
          100,
          "MEANING",
          "{}",
        ),
      );
      expect((await englishDailyPlan(db, now)).reviewedToday).toBe(1);
      expect(() => englishDayWindow(new Date(NaN))).toThrow(
        "INVALID_ENGLISH_DATE",
      );
      await expect(englishMistakeBook(db, NaN)).rejects.toThrow();
      await expect(englishMistakeBook(db, 101)).rejects.toThrow();
    } finally {
      raw.close();
    }
  });
});
