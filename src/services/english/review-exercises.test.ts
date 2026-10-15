import { describe, expect, it } from "vitest";

import {
  buildMeaningChoices,
  englishClozeForCard,
  exerciseForQuestion,
  makeEnglishCloze,
  nextReviewProgress,
  readEnglishExampleNote,
  safeReviewBatchSize,
} from "./review-exercises";

import type { EnglishCard } from "@/db/english/learner";

const card = (id: string, headword: string, meaning: string, notes = ""): EnglishCard => ({
  id: `en:card:${id}`,
  deck_id: "en:deck:test",
  headword,
  meaning_vi: meaning,
  pos: "noun",
  ipa: "/test/",
  sense_id: null,
  source_id: "USER",
  notes,
  status: "LEARNING",
  suspended: 0,
  progress_json: "{}",
  next_review_at: "2026-10-12T00:00:00.000Z",
  revision: 1,
});

describe("English mixed review exercise helpers", () => {
  it("alternates meaning choice and listening/cloze in mixed mode and honors deck-specific modes", () => {
    expect([0, 1, 2, 3].map(index => exerciseForQuestion(index, "MIXED"))).toEqual([
      "CHOICE", "LISTEN_CLOZE", "CHOICE", "LISTEN_CLOZE",
    ]);
    expect(exerciseForQuestion(8, "SPELLING")).toBe("LISTEN_CLOZE");
    expect(exerciseForQuestion(9, "LISTENING")).toBe("LISTEN_CLOZE");
    expect(exerciseForQuestion(9, "MEANING")).toBe("CHOICE");
  });

  it("moves the blue progress forward on correct answers, backward on wrong answers, and clamps it", () => {
    expect(nextReviewProgress(0, 5, true)).toBe(1);
    expect(nextReviewProgress(2, 5, false)).toBe(1);
    expect(nextReviewProgress(0, 5, false)).toBe(0);
    expect(nextReviewProgress(5, 5, true)).toBe(5);
    expect(nextReviewProgress(3, 0, true)).toBe(0);
  });

  it("creates answer choices only from distinct meanings in the same review batch", () => {
    const target = card("1", "sweater", "áo len");
    const choices = buildMeaningChoices(target, [
      target,
      card("2", "coat", "áo khoác"),
      card("3", "jacket", "áo khoác"),
      card("4", "dress", "váy"),
      card("5", "sock", "tất"),
    ]);
    expect(choices).toHaveLength(4);
    expect(choices.filter(choice => choice.correct)).toEqual([
      expect.objectContaining({ cardId: target.id, meaning: "áo len" }),
    ]);
    expect(new Set(choices.map(choice => choice.meaning)).size).toBe(4);
    expect(buildMeaningChoices(target, [target])).toHaveLength(1);
  });

  it("masks a whole word but preserves spaces and punctuation", () => {
    expect(makeEnglishCloze("She wore jeans and a sweater.", "sweater")).toEqual({
      sentence: "She wore jeans and a ____.",
      answer: "sweater",
    });
    expect(makeEnglishCloze("We went to a trainers shop.", "train")).toBeNull();
    expect(makeEnglishCloze("We work together.", "work together")).toEqual({
      sentence: "We ____.",
      answer: "work together",
    });
  });

  it("uses only labelled or explicitly saved context examples and never invents a sentence", () => {
    expect(readEnglishExampleNote("Ghi chú: useful\nVí dụ: She wore jeans and a sweater.")).toBe("She wore jeans and a sweater.");
    expect(readEnglishExampleNote("No example was saved.")).toBeNull();
    const sweater = card("1", "sweater", "áo len", "Ví dụ: She wore a sweater.");
    expect(englishClozeForCard(sweater, null)).toEqual({ sentence: "She wore a ____.", answer: "sweater" });
    expect(englishClozeForCard(card("2", "sweater", "áo len"), null)).toBeNull();
    expect(englishClozeForCard(card("3", "learn", "học"), {
      sentence: "She learned the lesson.",
      surface: "learned",
    })).toEqual({ sentence: "She ____ the lesson.", answer: "learned" });
  });

  it("only accepts the 5, 10, 15, and 20 card batch choices", () => {
    expect([5, 10, 15, 20].map(safeReviewBatchSize)).toEqual([5, 10, 15, 20]);
    expect([0, 7, 50, "20", null].map(safeReviewBatchSize)).toEqual([5, 5, 5, 5, 5]);
  });
});
