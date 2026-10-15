import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { importKaikkiVietnamese } from "../../../scripts/lib/kaikki-vietnamese";
import { expoAdapter } from "../fixtures/legacy_database";

import {
  englishHeadwordSensePage,
  englishPronunciationPage,
  resolveEnglishDictionarySelection,
} from "./dictionary-detail";
import {
  addEnglishCards,
  createEnglishDeck,
  initializeEnglishLearner,
} from "./learner";

async function setup() {
  const target = new DatabaseSync(":memory:");
  async function* records() {
    for (const [line, pos] of [
      [1, "noun"],
      [2, "verb"],
    ] as const)
      yield {
        line,
        raw: JSON.stringify({
          lang_code: "en",
          word: "book",
          pos,
          senses: Array.from({ length: 30 }, (_, i) => ({
            glosses: ["Synthetic meaning " + pos + i],
          })),
          sounds: [
            { ipa: "/bʊk/", tags: ["US"] },
            { ipa: "/bʊk/", tags: ["UK"] },
          ],
        }),
      };
  }
  await importKaikkiVietnamese(target, records(), {
    sha256: "b".repeat(64),
    version: "synthetic test only",
  });
  return { target, db: expoAdapter(target) };
}
describe("Explicit dictionary sense selection and bounded detail", () => {
  it("pages all 60 senses across multiple POS, no hidden first-entry cap or duplicates", async () => {
    const { target, db } = await setup();
    try {
      let cursor: Awaited<ReturnType<typeof englishHeadwordSensePage>>["next"] =
        null;
      const seen = [];
      do {
        const page = await englishHeadwordSensePage(db, "BOOK", cursor, 7);
        expect(page.senses.length).toBeLessThanOrEqual(7);
        seen.push(...page.senses);
        cursor = page.next;
      } while (cursor);
      expect(seen).toHaveLength(60);
      expect(new Set(seen.map((row) => row.sense_id)).size).toBe(60);
      expect(new Set(seen.map((row) => row.part_of_speech))).toEqual(
        new Set(["noun", "verb"]),
      );
      expect((await englishHeadwordSensePage(db, "unknown")).senses).toEqual(
        [],
      );
      await expect(
        englishHeadwordSensePage(db, "book", null, 51),
      ).rejects.toThrow("PAGE_SIZE");
      await expect(
        englishHeadwordSensePage(db, "book", {
          pos: "noun",
          word: "x",
          order: NaN,
          sense: "x",
        }),
      ).rejects.toThrow("CURSOR");
    } finally {
      target.close();
    }
  });
  it("pages entry-wide IPA without changing its scope or accepting SQL injection", async () => {
    const { target, db } = await setup();
    try {
      const word = (await englishHeadwordSensePage(db, "book")).senses[0]!
        .word_id;
      const first = await englishPronunciationPage(db, word, null, 1);
      expect(first.pronunciations[0]!.sense_id).toBeNull();
      expect(first.next).not.toBeNull();
      expect(
        (await englishPronunciationPage(db, word, first.next, 1))
          .pronunciations,
      ).toHaveLength(1);
      expect(
        (await englishHeadwordSensePage(db, "' OR 1=1 --")).senses,
      ).toEqual([]);
    } finally {
      target.close();
    }
  });
  it("rejects staging data; approved fixture saves exactly the chosen second POS/sense with no guessed IPA", async () => {
    const { target, db } = await setup();
    const learner = new DatabaseSync(":memory:"),
      learnerDb = expoAdapter(learner);
    try {
      const sense = target
        .prepare(
          "SELECT sense_id FROM english_senses WHERE part_of_speech='verb' AND sense_order=17",
        )
        .get()!.sense_id as string;
      const input = { cardId: "en:chosen", deckId: "en:deck", senseId: sense };
      await expect(
        resolveEnglishDictionarySelection(db, input),
      ).rejects.toThrow("LICENSE_REVIEW_REQUIRED");
      // Synthetic fixtures only. No approval of real corpus or bypass in production CLI.
      target.exec("UPDATE english_sources SET distribution_status='APPROVED'");
      const card = await resolveEnglishDictionarySelection(db, input);
      expect(card).toMatchObject({
        sense_id: sense,
        pos: "verb",
        meaning_vi: "Synthetic meaning verb16",
        ipa: "",
      });
      await initializeEnglishLearner(learnerDb);
      await createEnglishDeck(learnerDb, "en:deck", "Synthetic deck");
      await addEnglishCards(learnerDb, [card]);
      expect(
        learner
          .prepare("SELECT sense_id,status,next_review_at FROM en_cards")
          .get(),
      ).toEqual({ sense_id: sense, status: "NEW", next_review_at: null });
      expect(
        learner.prepare("SELECT COUNT(*) n FROM en_reviews").get()?.n,
      ).toBe(0);
    } finally {
      learner.close();
      target.close();
    }
  });
  it("rejects wrong entry/sense and unverified IPA; accepts only reviewed sense-specific selection", async () => {
    const { target, db } = await setup();
    try {
      target.exec("UPDATE english_sources SET distribution_status='APPROVED'");
      const senses = (await englishHeadwordSensePage(db, "book")).senses;
      const selected = senses[0]!,
        another = senses[1]!;
      const ipa = (await englishPronunciationPage(db, selected.word_id))
        .pronunciations[0]!;
      const input = {
        cardId: "en:card",
        deckId: "en:deck",
        senseId: selected.sense_id,
        pronunciationId: ipa.pronunciation_id,
      };
      await expect(
        resolveEnglishDictionarySelection(db, input),
      ).rejects.toThrow("UNVERIFIED");
      target
        .prepare(
          "UPDATE english_pronunciations SET sense_id=?,review_status='reviewed' WHERE pronunciation_id=?",
        )
        .run(another.sense_id, ipa.pronunciation_id);
      await expect(
        resolveEnglishDictionarySelection(db, input),
      ).rejects.toThrow("MISMATCH");
      target
        .prepare(
          "UPDATE english_pronunciations SET sense_id=? WHERE pronunciation_id=?",
        )
        .run(selected.sense_id, ipa.pronunciation_id);
      expect((await resolveEnglishDictionarySelection(db, input)).ipa).toBe(
        "/bʊk/",
      );
      await expect(
        resolveEnglishDictionarySelection(db, { ...input, senseId: "missing" }),
      ).rejects.toThrow("SENSE_NOT_FOUND");
    } finally {
      target.close();
    }
  });
});
