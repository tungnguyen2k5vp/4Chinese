import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { expoAdapter } from "../fixtures/legacy_database";

import {
  discardEnglishEditDraft,
  englishCardPage,
  readEnglishCard,
  readEnglishEditDraft,
  saveEnglishEditDraft,
  updateEnglishCard,
} from "./card-editor";
import { setEnglishCardSuspended, setEnglishDeckTrashed } from "./decks";
import {
  addEnglishCards,
  createEnglishDeck,
  englishDueQueue,
  initializeEnglishLearner,
  reviewEnglishCard,
  startEnglishCard,
} from "./learner";

async function fixture() {
  const raw = new DatabaseSync(":memory:");
  const db = expoAdapter(raw);
  await initializeEnglishLearner(db);
  await createEnglishDeck(db, "en:deck:1", "QA");
  await addEnglishCards(db, [
    {
      id: "en:card:1",
      deck_id: "en:deck:1",
      headword: "bank",
      meaning_vi: "bờ sông",
      pos: "noun",
      ipa: "",
      sense_id: null,
      source_id: "USER",
    },
  ]);
  const card = await readEnglishCard(db, "en:card:1");
  return { raw, db, card };
}
describe("English card edits and keyset pagination", () => {
  it("retains actual committed review history and discards only the selected edit draft", async () => {
    const { raw, db, card } = await fixture();
    try {
      await startEnglishCard(db, card.id, new Date("2026-10-10T00:00:00Z"));
      await reviewEnglishCard(
        db,
        {
          learningLanguage: "en",
          uiLocale: "vi",
          pronunciationVariant: "en-US",
          sessionId: "session:history",
        },
        "history:op",
        card.id,
        1,
        { correct: true, responseTimeMs: 1000 },
        "MEANING",
        new Date("2026-10-10T01:00:00Z"),
      );
      const before = await readEnglishCard(db, card.id);
      const history = JSON.stringify(
        raw.prepare("SELECT * FROM en_reviews").all(),
      );
      await updateEnglishCard(db, card.id, { ...before, notes: "saved note" });
      const saved = await readEnglishCard(db, card.id);
      expect(saved).toEqual({
        ...before,
        notes: "saved note",
        revision: before.revision + 1,
      });
      expect(
        JSON.stringify(raw.prepare("SELECT * FROM en_reviews").all()),
      ).toBe(history);
      await saveEnglishEditDraft(db, card.id, {
        ...saved,
        notes: "discard me",
      });
      raw
        .prepare("INSERT INTO en_drafts VALUES(?,?)")
        .run("custom-card", '{"headword":"keep","meaning":"giữ"}');
      await discardEnglishEditDraft(db, card.id);
      expect(await readEnglishEditDraft(db, card.id)).toBeNull();
      expect(await readEnglishCard(db, card.id)).toEqual(saved);
      expect(
        raw
          .prepare("SELECT COUNT(*) n FROM en_drafts WHERE id='custom-card'")
          .get(),
      ).toEqual({ n: 1 });
      expect(
        JSON.stringify(raw.prepare("SELECT * FROM en_reviews").all()),
      ).toBe(history);
    } finally {
      raw.close();
    }
  });
  it("keeps IDs, schedule, history, suspension and Chinese sentinel unchanged", async () => {
    const { raw, db } = await fixture();
    try {
      raw.exec(
        "CREATE TABLE chinese_sentinel(id TEXT, progress TEXT); INSERT INTO chinese_sentinel VALUES('zh:original','unchanged')",
      );
      await startEnglishCard(db, "en:card:1", new Date("2026-10-10T00:00:00Z"));
      const before = await readEnglishCard(db, "en:card:1");
      const value = {
        ...before,
        headword: " river bank ",
        meaning_vi: " bờ sông ",
        notes: "ghi chú",
      };
      await saveEnglishEditDraft(db, before.id, value);
      expect((await readEnglishEditDraft(db, before.id))?.headword).toBe(
        " river bank ",
      );
      await updateEnglishCard(db, before.id, value);
      const after = await readEnglishCard(db, before.id);
      expect(after).toEqual({
        ...before,
        headword: "river bank",
        notes: "ghi chú",
        revision: before.revision + 1,
      });
      expect(await readEnglishEditDraft(db, before.id)).toBeNull();
      expect(raw.prepare("SELECT * FROM chinese_sentinel").get()).toEqual({
        id: "zh:original",
        progress: "unchanged",
      });
      // A captured prompt cannot review an edited card under its previous revision.
      await expect(
        reviewEnglishCard(
          db,
          {
            learningLanguage: "en",
            uiLocale: "vi",
            pronunciationVariant: "en-US",
            sessionId: "session",
          },
          "op",
          before.id,
          before.revision,
          { correct: true, responseTimeMs: 1000 },
          "SPELLING",
          new Date("2026-10-10T01:00:00Z"),
        ),
      ).rejects.toThrow("ENGLISH_REVIEW_STALE");
      expect(raw.prepare("SELECT COUNT(*) n FROM en_reviews").get()).toEqual({
        n: 0,
      });
      expect(
        await englishDueQueue(db, new Date("2026-10-10T01:00:00Z")),
      ).toHaveLength(1);
    } finally {
      raw.close();
    }
  });
  it("rejects stale/trash/invalid edits without deleting saved draft", async () => {
    const { raw, db, card } = await fixture();
    try {
      await saveEnglishEditDraft(db, card.id, { ...card, headword: "pending" });
      await startEnglishCard(db, card.id);
      await expect(
        updateEnglishCard(db, card.id, { ...card, headword: "overwrite" }),
      ).rejects.toThrow("ENGLISH_EDIT_STALE");
      expect((await readEnglishEditDraft(db, card.id))?.headword).toBe(
        "pending",
      );
      await setEnglishDeckTrashed(db, card.deck_id, true);
      await expect(updateEnglishCard(db, card.id, card)).rejects.toThrow(
        "ENGLISH_CARD_UNAVAILABLE",
      );
      await expect(updateEnglishCard(db, "zh:card:1", card)).rejects.toThrow(
        "ENGLISH_ID_REQUIRED",
      );
      await expect(
        updateEnglishCard(db, card.id, { ...card, notes: "x".repeat(10001) }),
      ).rejects.toThrow("INVALID_ENGLISH_EDIT");
      await expect(
        updateEnglishCard(db, card.id, { ...card, headword: " " }),
      ).rejects.toThrow("INVALID_ENGLISH_EDIT");
    } finally {
      raw.close();
    }
  });
  it("allows only personal notes on sourced cards, preserving exact lexical values and provenance", async () => {
    const { raw, db } = await fixture();
    try {
      raw.exec(
        "UPDATE en_cards SET source_id='LICENSED',sense_id='sense:1',headword=' bank ',pos=' noun '",
      );
      const card = await readEnglishCard(db, "en:card:1");
      await expect(
        updateEnglishCard(db, card.id, { ...card, meaning_vi: "nguồn bị đổi" }),
      ).rejects.toThrow("ENGLISH_SOURCE_CONTENT_READ_ONLY");
      await updateEnglishCard(db, card.id, { ...card, notes: "personal" });
      expect(await readEnglishCard(db, card.id)).toEqual({
        ...card,
        notes: "personal",
        revision: 1,
      });
    } finally {
      raw.close();
    }
  });
  it("lets an imported shared copy be customized locally", async () => {
    const { raw, db } = await fixture();
    try {
      raw.exec("UPDATE en_cards SET source_id='SHARED'");
      const card = await readEnglishCard(db, "en:card:1");
      await updateEnglishCard(db, card.id, { ...card, meaning_vi: "nghĩa của tôi", notes: "ghi chú riêng" });
      expect(await readEnglishCard(db, card.id)).toMatchObject({
        source_id: "SHARED",
        meaning_vi: "nghĩa của tôi",
        notes: "ghi chú riêng",
      });
    } finally {
      raw.close();
    }
  });
  it("rolls back content and retains draft if clearing the draft fails", async () => {
    const { raw, db, card } = await fixture();
    try {
      await saveEnglishEditDraft(db, card.id, { ...card, notes: "pending" });
      raw.exec(
        "CREATE TRIGGER fail_edit_clear BEFORE DELETE ON en_drafts BEGIN SELECT RAISE(ABORT,'disk fault'); END",
      );
      await expect(
        updateEnglishCard(db, card.id, { ...card, notes: "pending" }),
      ).rejects.toThrow("disk fault");
      expect(await readEnglishCard(db, card.id)).toEqual(card);
      expect((await readEnglishEditDraft(db, card.id))?.notes).toBe("pending");
    } finally {
      raw.close();
    }
  });
  it("serializes concurrent edits so exactly one wins the same revision", async () => {
    const { raw, db, card } = await fixture();
    try {
      const results = await Promise.allSettled([
        updateEnglishCard(db, card.id, { ...card, notes: "first" }),
        updateEnglishCard(db, card.id, { ...card, notes: "second" }),
      ]);
      expect(results.map((row) => row.status)).toEqual([
        "fulfilled",
        "rejected",
      ]);
      expect((await readEnglishCard(db, card.id)).notes).toBe("first");
    } finally {
      raw.close();
    }
  });
  it("pages all 151 cards without skips/duplicates and uses the deck index", async () => {
    const { raw, db } = await fixture();
    try {
      for (let start = 2; start <= 151; start += 100)
        await addEnglishCards(
          db,
          Array.from({ length: Math.min(100, 152 - start) }, (_, n) => ({
            id: `en:card:${start + n}`,
            deck_id: "en:deck:1",
            headword: `word${start + n}`,
            meaning_vi: "nghĩa",
            pos: "",
            ipa: "",
            sense_id: null,
            source_id: "USER",
          })),
        );
      let cursor: string | null = null;
      const ids: string[] = [];
      do {
        const page = await englishCardPage(db, "en:deck:1", cursor);
        expect(page.cards.length).toBeLessThanOrEqual(25);
        ids.push(...page.cards.map((row) => row.id));
        cursor = page.next;
      } while (cursor);
      expect(ids.length).toBe(151);
      expect(new Set(ids).size).toBe(151);
      const plan = raw
        .prepare(
          "EXPLAIN QUERY PLAN SELECT * FROM en_cards WHERE deck_id=? AND id>? ORDER BY id LIMIT ?",
        )
        .all("en:deck:1", "", 26);
      expect(JSON.stringify(plan)).toContain("en_cards_deck");
      await expect(
        englishCardPage(db, "en:deck:1", null, NaN),
      ).rejects.toThrow();
      await setEnglishDeckTrashed(db, "en:deck:1", true);
      expect((await englishCardPage(db, "en:deck:1")).cards).toEqual([]);
    } finally {
      raw.close();
    }
  });
  it("searches and filters the selected deck without exposing suspended cards in the active list", async () => {
    const { raw, db } = await fixture();
    try {
      expect((await englishCardPage(db, "en:deck:1", null, 25, "bank")).cards.map((row) => row.headword)).toEqual(["bank"]);
      expect((await englishCardPage(db, "en:deck:1", null, 25, "sông")).cards).toHaveLength(1);
      expect((await englishCardPage(db, "en:deck:1", null, 25, "missing")).cards).toHaveLength(0);
      expect((await englishCardPage(db, "en:deck:1", null, 25, "", "NEW")).cards).toHaveLength(1);
      await setEnglishCardSuspended(db, "en:card:1", true);
      expect((await englishCardPage(db, "en:deck:1", null, 25, "", "all")).cards).toHaveLength(0);
      expect((await englishCardPage(db, "en:deck:1", null, 25, "bank", "SUSPENDED")).cards).toHaveLength(1);
      await expect(englishCardPage(db, "en:deck:1", null, 25, "x".repeat(201))).rejects.toThrow("INVALID_ENGLISH_SEARCH");
    } finally {
      raw.close();
    }
  });
});
