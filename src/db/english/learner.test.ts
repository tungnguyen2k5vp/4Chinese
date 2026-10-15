import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { createLegacyDatabase, expoAdapter } from "../fixtures/legacy_database";

import {
  addEnglishDictionaryCard,
  addEnglishCards,
  createEnglishDeck,
  englishDueQueue,
  englishStatistics,
  initializeEnglishLearner,
  listEnglishCards,
  reviewEnglishCard,
  startEnglishCard,
  type EnglishCardInput,
} from "./learner";
import { readEnglishBulkForm, saveEnglishBulkForm } from "./recognized-bulk";

import type { LearningSessionContext } from "@/services/languages/config";
import { applyReview, type SrsProgress } from "@/services/srs/scheduler";

const learnedAt = new Date("2026-10-10T00:00:00Z");
const dueAt = new Date("2026-10-10T00:30:00Z");
const context: LearningSessionContext = {
  learningLanguage: "en",
  uiLocale: "vi",
  pronunciationVariant: "en-US",
  sessionId: "session-en",
};
const card = (n = 1): EnglishCardInput => ({
  id: `en:card:${n}`,
  deck_id: "en:deck:1",
  headword: "test",
  meaning_vi: "nghĩa do người học nhập",
  pos: "noun",
  ipa: "",
  sense_id: null,
  source_id: "USER",
});
async function fixture() {
  const raw = new DatabaseSync(":memory:");
  const db = expoAdapter(raw);
  await initializeEnglishLearner(db);
  await createEnglishDeck(db, "en:deck:1", "Bộ từ tiếng Anh");
  return { raw, db };
}
describe("English learner persistence using shared numeric scheduler", () => {
  it("refuses Chinese DB without mutating its schema or progress", async () => {
    const raw = createLegacyDatabase();
    const db = expoAdapter(raw);
    try {
      const before = JSON.stringify(
        raw.prepare("SELECT * FROM user_vocabulary_progress").all(),
      );
      await expect(initializeEnglishLearner(db)).rejects.toThrow();
      expect(
        raw
          .prepare(
            "SELECT COUNT(*) n FROM sqlite_master WHERE name LIKE 'en_%'",
          )
          .get(),
      ).toEqual({ n: 0 });
      expect(
        JSON.stringify(
          raw.prepare("SELECT * FROM user_vocabulary_progress").all(),
        ),
      ).toBe(before);
      expect(raw.prepare("PRAGMA user_version").get()).toEqual({
        user_version: 9,
      });
    } finally {
      raw.close();
    }
  });
  it("starts at the existing 30 minute interval; NEW and future cards are not due", async () => {
    const { raw, db } = await fixture();
    try {
      await addEnglishCards(db, [card(), card(2)]);
      expect(await englishDueQueue(db, dueAt)).toHaveLength(0);
      await startEnglishCard(db, card().id, learnedAt);
      expect(await englishDueQueue(db, learnedAt)).toHaveLength(0);
      expect(await englishDueQueue(db, dueAt)).toHaveLength(1);
      await startEnglishCard(db, card().id, dueAt);
      expect((await listEnglishCards(db, "en:deck:1"))[0]?.revision).toBe(1);
    } finally {
      raw.close();
    }
  });
  it.each([10, 50, 100])(
    "adds %i cards atomically without guessing senses",
    async (size) => {
      const { raw, db } = await fixture();
      try {
        await addEnglishCards(
          db,
          Array.from({ length: size }, (_, n) => card(n)),
        );
        expect(await listEnglishCards(db, "en:deck:1")).toHaveLength(size);
      } finally {
        raw.close();
      }
    },
  );
  it("requires explicit dictionary sense and keeps two meanings as independent cards", async () => {
    const { raw, db } = await fixture();
    try {
      await expect(
        addEnglishCards(db, [{ ...card(), source_id: "allowed-source" }]),
      ).rejects.toThrow("SENSE_SELECTION");
      await addEnglishCards(db, [
        { ...card(), source_id: "allowed-source", sense_id: "sense-1" },
        {
          ...card(2),
          source_id: "allowed-source",
          sense_id: "sense-2",
          meaning_vi: "nghĩa thứ hai",
        },
      ]);
      expect(await listEnglishCards(db, "en:deck:1")).toHaveLength(2);
    } finally {
      raw.close();
    }
  });
  it("rolls the entire batch back on duplicate ID and never accepts Chinese IDs", async () => {
    const { raw, db } = await fixture();
    try {
      await expect(addEnglishCards(db, [card(), card()])).rejects.toThrow();
      expect(await listEnglishCards(db, "en:deck:1")).toHaveLength(0);
      await expect(
        addEnglishCards(db, [{ ...card(), id: "hsk-1-ni" }]),
      ).rejects.toThrow("ENGLISH_ID");
    } finally {
      raw.close();
    }
  });
  it("adds a dictionary sense atomically without consuming a pending bulk draft or changing SRS", async () => {
    const { raw, db } = await fixture();
    try {
      const draft = { text: "bank\nbook", deck: "en:deck:1", name: "", items: null };
      await saveEnglishBulkForm(db, draft);
      const first = {
        id: "en:card:bank-noun",
        deck_id: "en:deck:1",
        headword: "bank",
        meaning_vi: "ngân hàng",
        pos: "danh từ",
        ipa: "/bæŋk/",
        sense_id: "en:sky:wd:bank-finance",
        source_id: "SKYPEDIA_LOCAL:test",
      };
      await addEnglishDictionaryCard(db, first);
      const saved = await listEnglishCards(db, "en:deck:1");
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        id: first.id,
        sense_id: first.sense_id,
        status: "NEW",
        revision: 0,
      });
      expect(JSON.parse(saved[0]!.progress_json)).toMatchObject({
        reviewCount: 0,
        correctCount: 0,
        memoryLevel: 0,
      });
      expect((await readEnglishBulkForm(db)).text).toBe(draft.text);
      await expect(addEnglishDictionaryCard(db, { ...first, id: "en:card:bank-duplicate" })).rejects.toThrow("đã có trong bộ từ");

      await addEnglishDictionaryCard(db, {
        ...first,
        id: "en:card:bank-river",
        meaning_vi: "bờ sông",
        sense_id: "en:sky:wd:bank-river",
      });
      await createEnglishDeck(db, "en:deck:other", "Khác");
      await addEnglishDictionaryCard(db, { ...first, id: "en:card:bank-other-deck", deck_id: "en:deck:other" });
      expect(await listEnglishCards(db, "en:deck:1")).toHaveLength(2);
      expect(await listEnglishCards(db, "en:deck:other")).toHaveLength(1);
      expect(await englishStatistics(db)).toMatchObject({ reviewed: 0, correct: 0, studyMs: 0, xp: 0 });
    } finally {
      raw.close();
    }
  });
  it("matches existing scheduler exactly; retry adds only one log, one XP event and time", async () => {
    const { raw, db } = await fixture();
    try {
      await addEnglishCards(db, [card()]);
      await startEnglishCard(db, card().id, learnedAt);
      const before = (await englishDueQueue(db, dueAt))[0]!;
      const input = { correct: true, responseTimeMs: 6000 };
      const expected = applyReview(
        JSON.parse(before.progress_json) as SrsProgress,
        input,
        dueAt,
      );
      expect(
        await reviewEnglishCard(
          db,
          context,
          "operation-1",
          before.id,
          before.revision,
          input,
          "MEANING",
          dueAt,
        ),
      ).toEqual(expected);
      expect(
        await reviewEnglishCard(
          db,
          context,
          "operation-1",
          before.id,
          before.revision,
          input,
          "MEANING",
          dueAt,
        ),
      ).toEqual(expected);
      expect(await englishStatistics(db, dueAt)).toMatchObject({
        reviewed: 1,
        correct: 1,
        studyMs: 6000,
        xp: 10,
        due: 0,
      });
    } finally {
      raw.close();
    }
  });
  it("rejects wrong language, premature reviews and stale revisions", async () => {
    const { raw, db } = await fixture();
    try {
      await addEnglishCards(db, [card()]);
      await startEnglishCard(db, card().id, learnedAt);
      const input = { correct: false, responseTimeMs: 500 };
      await expect(
        reviewEnglishCard(
          db,
          { ...context, learningLanguage: "zh" },
          "op",
          card().id,
          1,
          input,
          "SPELLING",
          dueAt,
        ),
      ).rejects.toThrow("LANGUAGE_MISMATCH");
      await expect(
        reviewEnglishCard(
          db,
          context,
          "op",
          card().id,
          1,
          input,
          "SPELLING",
          learnedAt,
        ),
      ).rejects.toThrow("NOT_DUE");
      await expect(
        reviewEnglishCard(
          db,
          context,
          "op",
          card().id,
          0,
          input,
          "SPELLING",
          dueAt,
        ),
      ).rejects.toThrow("STALE");
      expect((await englishStatistics(db, dueAt)).reviewed).toBe(0);
    } finally {
      raw.close();
    }
  });
  it("serializes concurrent duplicate reviews and rolls back schedule when log insertion fails", async () => {
    const { raw, db } = await fixture();
    try {
      await addEnglishCards(db, [card()]);
      await startEnglishCard(db, card().id, learnedAt);
      raw.exec(
        "CREATE TRIGGER reject_reviews BEFORE INSERT ON en_reviews BEGIN SELECT RAISE(ABORT,'storage failed'); END;",
      );
      const review = () =>
        reviewEnglishCard(
          db,
          context,
          "op",
          card().id,
          1,
          { correct: false, responseTimeMs: 500 },
          "MEANING",
          dueAt,
        );
      await expect(review()).rejects.toThrow("storage failed");
      expect((await englishDueQueue(db, dueAt))[0]?.revision).toBe(1);
      raw.exec("DROP TRIGGER reject_reviews");
      await Promise.all([review(), review()]);
      expect((await englishStatistics(db, dueAt)).reviewed).toBe(1);
    } finally {
      raw.close();
    }
  });
  it("excludes suspended cards and deleted decks without erasing history", async () => {
    const { raw, db } = await fixture();
    try {
      await addEnglishCards(db, [card(), card(2)]);
      await startEnglishCard(db, card().id, learnedAt);
      await startEnglishCard(db, card(2).id, learnedAt);
      raw.prepare("UPDATE en_cards SET suspended=1 WHERE id=?").run(card().id);
      expect(await englishDueQueue(db, dueAt)).toHaveLength(1);
      raw.exec("UPDATE en_decks SET deleted=1");
      expect(await englishDueQueue(db, dueAt)).toHaveLength(0);
      expect(await listEnglishCards(db, "en:deck:1")).toHaveLength(0);
    } finally {
      raw.close();
    }
  });
});
