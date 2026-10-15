import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { expoAdapter } from "../fixtures/legacy_database";

import {
  parseEnglishCustomBulk,
  readEnglishBulkDraft,
  saveEnglishBulkDraft,
} from "./custom-bulk";
import {
  addEnglishCards,
  createEnglishDeck,
  initializeEnglishLearner,
} from "./learner";

describe("Explicit personal English bulk input", () => {
  it.each([10, 50, 100])(
    "parses %i user-selected meanings without guessing",
    (size) => {
      const parsed = parseEnglishCustomBulk(
        Array.from({ length: size }, (_, n) => `phrase ${n}\tnghĩa ${n}`).join(
          "\r\n",
        ),
      );
      expect(parsed.issues).toEqual([]);
      expect(parsed.rows).toHaveLength(size);
    },
  );
  it("retains phrases, apostrophes, multiple senses and original case; refuses repeated pairs", () => {
    const result = parseEnglishCustomBulk(
      "\n  Bank\tngân hàng\nbank\tbờ sông\nBANK\tNGÂN HÀNG\nlook up\ttra cứu\ndon't\tkhông\n",
    );
    expect(result.rows.map((row) => row.headword)).toEqual([
      "Bank",
      "bank",
      "look up",
      "don't",
    ]);
    expect(result.issues[0]?.line).toBe(4);
  });
  it("rejects missing meanings, extra columns, overlong fields and >100 nonempty rows", () => {
    expect(
      parseEnglishCustomBulk("hello\nword\t\nword\tmeaning\textra").issues,
    ).toHaveLength(3);
    expect(parseEnglishCustomBulk(`${"a".repeat(301)}\tx`).issues).toHaveLength(
      1,
    );
    expect(
      parseEnglishCustomBulk(
        Array.from({ length: 101 }, (_, n) => `word${n}\tnghĩa`).join("\n"),
      ).issues,
    ).toHaveLength(1);
    expect(parseEnglishCustomBulk("x".repeat(230001)).rows).toHaveLength(0);
    expect(parseEnglishCustomBulk("\n\t\n").rows).toEqual([]);
  });
  it("successful atomic batch clears only bulk draft; failed batch retains draft and all prior rows", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw);
    try {
      await initializeEnglishLearner(db);
      await createEnglishDeck(db, "en:deck:1", "Batch");
      await saveEnglishBulkDraft(db, "one\tmột\ntwo\thai");
      raw
        .prepare("INSERT INTO en_drafts VALUES(?,?)")
        .run("custom-card", '{"headword":"keep","meaning":"giữ"}');
      const cards = [1, 2].map((n) => ({
        id: `en:card:${n}`,
        deck_id: "en:deck:1",
        headword: `word${n}`,
        meaning_vi: "nghĩa",
        pos: "",
        ipa: "",
        sense_id: null,
        source_id: "USER",
      }));
      raw.exec(
        "CREATE TRIGGER fail_batch BEFORE INSERT ON en_cards WHEN NEW.id='en:card:2' BEGIN SELECT RAISE(ABORT,'disk failure'); END",
      );
      await expect(addEnglishCards(db, cards, "bulk-cards")).rejects.toThrow(
        "disk failure",
      );
      expect(raw.prepare("SELECT COUNT(*) n FROM en_cards").get()).toEqual({
        n: 0,
      });
      expect(await readEnglishBulkDraft(db)).toBe("one\tmột\ntwo\thai");
      raw.exec("DROP TRIGGER fail_batch");
      await addEnglishCards(db, cards, "bulk-cards");
      expect(await readEnglishBulkDraft(db)).toBe("");
      expect(
        raw
          .prepare("SELECT COUNT(*) n FROM en_drafts WHERE id='custom-card'")
          .get(),
      ).toEqual({ n: 1 });
    } finally {
      raw.close();
    }
  });
});
