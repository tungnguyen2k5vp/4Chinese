import { existsSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { expoAdapter } from "../fixtures/legacy_database";

import { setEnglishCardSuspended } from "./decks";
import {
  initializeEnglishLearner,
  englishDeckShareSnapshot,
  importEnglishSharedDeck,
  markEnglishCardKnown,
  saveEnglishRecognizedBatch,
  startEnglishCard,
  type EnglishCardInput,
} from "./learner";
import {
  englishDeckMemorySummary,
  englishMemoryLevel,
  englishMemorySummary,
  listEnglishDeckSummaries,
} from "./personal-vocabulary";
import {
  bulkPreviewIssues,
  readEnglishBulkForm,
  saveEnglishBulkForm,
} from "./recognized-bulk";
import {
  lookupSkypedia,
  parsePersonalEnglishList,
  SKYPEDIA_SOURCE,
  skypediaDeserializeBytes,
} from "./skypedia";

const card = (n: number): EnglishCardInput => ({
  id: `en:card:${n}`,
  deck_id: "en:deck:unit8",
  headword: `word${n}`,
  meaning_vi: `nghĩa ${n}`,
  pos: "noun",
  ipa: "/test/",
  sense_id: `en:sky:wd:${n}`,
  source_id: SKYPEDIA_SOURCE,
  notes: "Ví dụ: A real example.",
});
describe("personal English vocabulary", () => {
  it("normalizes only WAL transport header; original bytes and content pages stay unchanged", () => {
    const original = new Uint8Array(1000);
    original.set(new TextEncoder().encode("SQLite format 3\u0000"));
    original[18] = 2;
    original[19] = 2;
    original[900] = 42;
    const normalized = skypediaDeserializeBytes(original);
    expect(original[18]).toBe(2);
    expect(normalized[18]).toBe(1);
    expect(normalized[19]).toBe(1);
    expect(normalized.slice(20)).toEqual(original.slice(20));
    expect(normalized).not.toBe(original);
    expect(() => skypediaDeserializeBytes(new Uint8Array(1000))).toThrow();
  });
  it("accepts plain words, phrases and legacy pairs; rejects >100 and marks malformed rows", () => {
    expect(
      parsePersonalEnglishList("hello\nlook up\nlove\tyêu").map(
        (r) => r.meaning,
      ),
    ).toEqual(["", "", "yêu"]);
    expect(
      parsePersonalEnglishList("123\nword\tmeaning\textra").every(
        (r) => r.issue,
      ),
    ).toBe(true);
    expect(() =>
      parsePersonalEnglishList(Array(101).fill("hello").join("\n")),
    ).toThrow();
    expect(
      parsePersonalEnglishList(Array(100).fill("hello").join("\n")),
    ).toHaveLength(100);
  });
  it("flags duplicate/unknown rows but respects × exclusion and manual meanings", () => {
    const items = parsePersonalEnglishList(
      "hello\txin chào\nHello\txin chào\nunknown",
    ).map((r) => ({ ...r, selected: null, meanings: [], excluded: false }));
    expect([...bulkPreviewIssues(items).keys()]).toEqual([2, 3]);
    items[1]!.excluded = true;
    items[2]!.meaning = "nghĩa tự nhập";
    expect(bulkPreviewIssues(items).size).toBe(0);
  });
  it("saves 100 source cards and new deck atomically, preserves draft on rollback, and keeps SRS on duplicates", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw);
    try {
      await initializeEnglishLearner(db);
      await saveEnglishBulkForm(db, {
        text: "hello",
        name: "Unit 8",
        deck: "new",
        items: null,
      });
      await expect(
        saveEnglishRecognizedBatch(
          db,
          [card(1), { ...card(2), id: card(1).id }],
          "Unit 8",
        ),
      ).rejects.toThrow();
      expect(raw.prepare("SELECT COUNT(*) n FROM en_decks").get()).toEqual({
        n: 0,
      });
      expect((await readEnglishBulkForm(db)).text).toBe("hello");
      await saveEnglishRecognizedBatch(
        db,
        Array.from({ length: 100 }, (_, i) => card(i)),
        "Unit 8",
      );
      expect((await readEnglishBulkForm(db)).text).toBe("");
      expect((await listEnglishDeckSummaries(db))[0]?.wordCount).toBe(100);
      const now = new Date("2026-10-11T00:00:00Z");
      await startEnglishCard(db, card(0).id, now);
      const before = raw
        .prepare("SELECT * FROM en_cards WHERE id=?")
        .get(card(0).id);
      await expect(
        saveEnglishRecognizedBatch(db, [
          { ...card(0), id: "en:card:duplicate" },
        ]),
      ).rejects.toThrow("đã có");
      expect(
        raw.prepare("SELECT * FROM en_cards WHERE id=?").get(card(0).id),
      ).toEqual(before);
      expect(
        await englishMemorySummary(db, new Date("2026-10-11T01:00:00Z")),
      ).toMatchObject({
        total: 100,
        studied: 1,
        newCount: 99,
        due: 1,
        levels: [1, 0, 0, 0, 0, 0],
      });
      await setEnglishCardSuspended(db, card(0).id, true);
      expect(await englishMemorySummary(db)).toMatchObject({
        studied: 0,
        suspended: 1,
      });
      await setEnglishCardSuspended(db, card(0).id, false);
      expect(
        raw
          .prepare(
            "SELECT progress_json,next_review_at FROM en_cards WHERE id=?",
          )
          .get(card(0).id),
      ).toMatchObject({
        progress_json: before!.progress_json,
        next_review_at: before!.next_review_at,
      });
    } finally {
      raw.close();
    }
  });
  it("commits saveable cards and the unresolved bulk draft in one transaction", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw);
    try {
      await initializeEnglishLearner(db);
      const remainder = JSON.stringify({
        text: "bank\nbook",
        deck: "en:deck:unit8",
        name: "",
        items: [],
      });
      await saveEnglishRecognizedBatch(db, [card(1)], "Unit 8", remainder);

      expect(raw.prepare("SELECT COUNT(*) n FROM en_cards").get()).toEqual({ n: 1 });
      expect((await listEnglishDeckSummaries(db))[0]).toMatchObject({ name: "Unit 8", wordCount: 1 });
      expect((await readEnglishBulkForm(db)).text).toBe("bank\nbook");
    } finally {
      raw.close();
    }
  });
  it("marks known English words separately from SRS memory levels", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw);
    try {
      await initializeEnglishLearner(db);
      await saveEnglishRecognizedBatch(db, [card(21), card(22)], "Known test");
      const now = new Date("2026-10-11T00:00:00Z");
      await markEnglishCardKnown(db, card(21).id, now);
      const row = raw.prepare("SELECT status,progress_json,next_review_at FROM en_cards WHERE id=?").get(card(21).id) as {
        status: string; progress_json: string; next_review_at: string;
      };
      expect(row.status).toBe("LEARNING");
      expect(JSON.parse(row.progress_json).isKnown).toBe(true);
      expect(new Date(row.next_review_at).getTime()).toBeGreaterThan(now.getTime());
      expect(englishMemoryLevel({ status: "LEARNING", progress_json: row.progress_json })).toBe(0);
      await expect(englishMemorySummary(db, now)).resolves.toMatchObject({
        studied: 1,
        knownCount: 1,
        newCount: 1,
        levels: [0, 0, 0, 0, 0, 0],
      });
      await expect(englishDeckMemorySummary(db, "en:deck:unit8", now)).resolves.toMatchObject({
        knownCount: 1,
        newCount: 1,
      });
    } finally {
      raw.close();
    }
  });
  it("shares only public learning fields and imports a friend deck with fresh SRS", async () => {
    const raw = new DatabaseSync(":memory:");
    const db = expoAdapter(raw);
    try {
      await initializeEnglishLearner(db);
      await saveEnglishRecognizedBatch(db, [{ ...card(31), notes: "Private note" }], "Share source");
      const snapshot = await englishDeckShareSnapshot(db, "en:deck:unit8");
      expect(snapshot).toEqual({
        name: "Share source",
        words: [{ headword: "word31", meaning_vi: "nghĩa 31", pos: "noun", ipa: "/test/" }],
      });

      const importedCount = await importEnglishSharedDeck(
        db,
        "en:deck:friend",
        "Friend's list",
        [
          {
            id: "en:card:friend1",
            deck_id: "en:deck:friend",
            headword: snapshot.words[0]!.headword,
            meaning_vi: snapshot.words[0]!.meaning_vi,
            pos: snapshot.words[0]!.pos,
            ipa: snapshot.words[0]!.ipa,
            sense_id: null,
            source_id: "SHARED",
          },
        ],
      );
      expect(importedCount).toBe(1);
      expect(raw.prepare("SELECT status,source_id,notes,progress_json FROM en_cards WHERE id='en:card:friend1'").get()).toMatchObject({
        status: "NEW",
        source_id: "SHARED",
        notes: "",
        progress_json: JSON.stringify({
          memoryLevel: 0, deepMemoryStage: 0, reviewCount: 0, correctCount: 0,
          wrongCount: 0, lapseCount: 0, consecutiveCorrect: 0, consecutiveWrong: 0,
          hintUsedCount: 0, averageResponseTimeMs: 0, lastResponseTimeMs: 0, isKnown: false,
        }),
      });
      await expect(importEnglishSharedDeck(db, "en:deck:broken", "Broken", [
        { ...card(32), id: "en:card:duplicate", deck_id: "en:deck:broken", notes: "" },
        { ...card(33), id: "en:card:duplicate", deck_id: "en:deck:broken", notes: "" },
      ])).rejects.toThrow("INVALID_ENGLISH_SHARED_DECK");
      expect(raw.prepare("SELECT id FROM en_decks WHERE id='en:deck:broken'").get()).toBeUndefined();
    } finally {
      raw.close();
    }
  });
  it.skipIf(
    !existsSync(
      "artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db",
    ),
  )("reads original Skypedia tables without rewriting the source", async () => {
    const original = readFileSync(
      "artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db",
    );
    const raw = new DatabaseSync(
      "artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db",
      { readOnly: true },
    );
    try {
      const rows = await lookupSkypedia(expoAdapter(raw), "hello");
      expect(rows.length).toBeGreaterThan(1);
      expect(rows[0]?.meaning).toContain("Chào");
      expect(rows[0]?.example).toContain("Hello");
      expect(rows[0]?.id).toMatch(/^en:sky:wd:/);
      expect(await lookupSkypedia(expoAdapter(raw), "zzzznotaword999")).toEqual(
        [],
      );
      expect(
        Buffer.compare(
          Buffer.from(skypediaDeserializeBytes(original)).subarray(20),
          original.subarray(20),
        ),
      ).toBe(0);
    } finally {
      raw.close();
    }
  });
});
