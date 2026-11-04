import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { expoAdapter } from "../fixtures/legacy_database";

import { addEnglishCards, createEnglishDeck, englishDueQueue, initializeEnglishLearner, reviewEnglishCard, startEnglishCard } from "./learner";
import { beginEnglishNewWordReview, englishLearningIds, selectedEnglishNewCards } from "./new-word-session";

const now = new Date("2026-10-18T10:00:00Z");
async function fixture() {
  const raw = new DatabaseSync(":memory:");
  const db = expoAdapter(raw);
  await initializeEnglishLearner(db);
  await createEnglishDeck(db, "en:deck:new", "Từ vừa thêm");
  await createEnglishDeck(db, "en:deck:other", "Bộ khác");
  await addEnglishCards(db, Array.from({ length: 4 }, (_, n) => ({ id: `en:card:${n}`, deck_id: n === 3 ? "en:deck:other" : "en:deck:new", headword: `word${n}`, meaning_vi: `nghĩa ${n}`, pos: "", ipa: "", sense_id: null, source_id: "USER" })));
  return { raw, db };
}

describe("selected English new-word session", () => {
  it("saves a selection-screen already-known choice at level 1 without a scored review or a long-interval exemption", async () => {
    const { raw, db } = await fixture();
    try {
      await startEnglishCard(db, "en:card:0", now);
      await startEnglishCard(db, "en:card:0", now);
      const saved = raw.prepare("SELECT progress_json,next_review_at,revision FROM en_cards WHERE id='en:card:0'").get()!;
      expect(JSON.parse(saved.progress_json as string)).toMatchObject({ memoryLevel: 1, isKnown: false });
      expect(saved.next_review_at).toBe("2026-10-18T10:30:00.000Z");
      expect(saved.revision).toBe(1);
      expect(raw.prepare("SELECT COUNT(*) n FROM en_reviews").get()).toEqual({ n: 0 });
      expect((await selectedEnglishNewCards(db, ["en:card:1", "en:card:2"], "en:deck:new")).length).toBe(2);
    } finally { raw.close(); }
  });
  it("reads the exact selection in order without starting SRS or recording copied answers", async () => {
    const { raw, db } = await fixture();
    try {
      const before = raw.prepare("SELECT * FROM en_cards ORDER BY id").all();
      expect((await selectedEnglishNewCards(db, ["en:card:2", "en:card:0"], "en:deck:new")).map(card => card.id)).toEqual(["en:card:2", "en:card:0"]);
      expect(raw.prepare("SELECT * FROM en_cards ORDER BY id").all()).toEqual(before);
      expect(raw.prepare("SELECT COUNT(*) n FROM en_reviews").get()).toEqual({ n: 0 });
    } finally { raw.close(); }
  });
  it("starts only selected words for immediate normal review and keeps the first SRS level at one", async () => {
    const { raw, db } = await fixture();
    try {
      const cards = await beginEnglishNewWordReview(db, ["en:card:2", "en:card:0"], "en:deck:new", now);
      expect(cards.map(card => [card.id, card.revision, card.status])).toEqual([["en:card:2", 1, "LEARNING"], ["en:card:0", 1, "LEARNING"]]);
      expect((await englishDueQueue(db, now)).map(card => card.id).sort()).toEqual(["en:card:0", "en:card:2"]);
      expect(raw.prepare("SELECT status,revision FROM en_cards WHERE id='en:card:1'").get()).toEqual({ status: "NEW", revision: 0 });
      const result = await reviewEnglishCard(db, { learningLanguage: "en", uiLocale: "vi", pronunciationVariant: "en-US", sessionId: "first-learning" }, "first-answer", cards[0]!.id, cards[0]!.revision, { correct: true, rating: "hard", responseTimeMs: 7000 }, "MEANING", now);
      expect(result.memoryLevel).toBe(1);
      expect(result.nextReviewAt).toBe("2026-10-18T10:30:00.000Z");
      expect(result.reviewCount).toBe(1);
    } finally { raw.close(); }
  });
  it("rejects a different deck, suspended or already learned words without partially starting the selection", async () => {
    const { raw, db } = await fixture();
    try {
      await expect(beginEnglishNewWordReview(db, ["en:card:0", "en:card:3"], "en:deck:new", now)).rejects.toThrow();
      await startEnglishCard(db, "en:card:1", now);
      await expect(beginEnglishNewWordReview(db, ["en:card:0", "en:card:1"], "en:deck:new", now)).rejects.toThrow();
      raw.prepare("UPDATE en_cards SET suspended=1 WHERE id='en:card:2'").run();
      await expect(beginEnglishNewWordReview(db, ["en:card:0", "en:card:2"], "en:deck:new", now)).rejects.toThrow();
      expect(raw.prepare("SELECT status,revision FROM en_cards WHERE id='en:card:0'").get()).toEqual({ status: "NEW", revision: 0 });
    } finally { raw.close(); }
  });
  it("rolls back a batch when saving a later card fails", async () => {
    const { raw, db } = await fixture();
    try {
      raw.exec("CREATE TRIGGER fail_later BEFORE UPDATE ON en_cards WHEN NEW.id='en:card:2' BEGIN SELECT RAISE(ABORT,'save failure'); END;");
      await expect(beginEnglishNewWordReview(db, ["en:card:0", "en:card:2"], "en:deck:new", now)).rejects.toThrow();
      expect(raw.prepare("SELECT status,revision FROM en_cards WHERE id='en:card:0'").get()).toEqual({ status: "NEW", revision: 0 });
    } finally { raw.close(); }
  });
  it("deduplicates IDs, limits the session and rejects invalid route parameters", () => {
    expect(englishLearningIds('["en:1","en:1","en:2"]')).toEqual(["en:1", "en:2"]);
    expect(() => englishLearningIds('["zh:1"]')).toThrow();
    expect(() => englishLearningIds('{}')).toThrow();
    expect(() => englishLearningIds(JSON.stringify(Array.from({ length: 21 }, (_, i) => `en:${i}`)))).toThrow();
  });
});
