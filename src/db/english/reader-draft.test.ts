import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { expoAdapter } from "../fixtures/legacy_database";

import {
  addEnglishCards,
  createEnglishDeck,
  initializeEnglishLearner,
} from "./learner";
import {
  lookupEnglishPersonalWord,
  readEnglishReaderDraft,
  saveEnglishReaderDraft,
} from "./reader-draft";

describe("English personal Reader draft", () => {
  it("survives closing and reopening a real SQLite file", async () => {
    const directory = mkdtempSync(join(tmpdir(), "english-reader-qa-"));
    const filename = join(directory, "learner.db");
    let sqlite = new DatabaseSync(filename);
    try {
      const db = expoAdapter(sqlite);
      await initializeEnglishLearner(db);
      const draft = await saveEnglishReaderDraft(db, {
        title: "My text",
        text: "Don't stop. 🙂 Book",
        position: 6,
        revision: 0,
      });
      sqlite.close();
      sqlite = new DatabaseSync(filename);
      await initializeEnglishLearner(expoAdapter(sqlite));
      expect(await readEnglishReaderDraft(expoAdapter(sqlite))).toEqual(draft);
    } finally {
      sqlite.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("rolls back a failed write, retains the old draft and allows retry", async () => {
    const sqlite = new DatabaseSync(":memory:"),
      db = expoAdapter(sqlite);
    try {
      await initializeEnglishLearner(db);
      const original = await saveEnglishReaderDraft(db, {
        title: "Before",
        text: "one two",
        position: 0,
        revision: 0,
      });
      sqlite.exec(`CREATE TRIGGER fail_reader BEFORE UPDATE ON en_drafts
        WHEN NEW.id='reader-document' BEGIN SELECT RAISE(ABORT, 'QA_WRITE_FAILURE'); END;`);
      await expect(
        saveEnglishReaderDraft(db, {
          ...original,
          title: "After",
          position: 4,
        }),
      ).rejects.toThrow("QA_WRITE_FAILURE");
      expect(await readEnglishReaderDraft(db)).toEqual(original);
      sqlite.exec("DROP TRIGGER fail_reader");
      const next = await saveEnglishReaderDraft(db, {
        ...original,
        title: "After",
        position: 4,
      });
      expect(next.revision).toBe(2);
      expect(await readEnglishReaderDraft(db)).toEqual(next);
    } finally {
      sqlite.close();
    }
  });
  it("serializes competing saves without silently losing the winning edit", async () => {
    const sqlite = new DatabaseSync(":memory:"),
      db = expoAdapter(sqlite);
    try {
      await initializeEnglishLearner(db);
      const base = { title: "", text: "one two", position: 0, revision: 0 };
      const results = await Promise.allSettled([
        saveEnglishReaderDraft(db, { ...base, title: "First" }),
        saveEnglishReaderDraft(db, { ...base, title: "Second" }),
      ]);
      expect(results.map((result) => result.status)).toEqual([
        "fulfilled",
        "rejected",
      ]);
      expect((await readEnglishReaderDraft(db))?.title).toBe("First");
    } finally {
      sqlite.close();
    }
  });
  it("refuses a corrupt persisted draft instead of resetting or overwriting it", async () => {
    const sqlite = new DatabaseSync(":memory:"),
      db = expoAdapter(sqlite);
    try {
      await initializeEnglishLearner(db);
      sqlite.exec("INSERT INTO en_drafts VALUES('reader-document','not-json')");
      await expect(readEnglishReaderDraft(db)).rejects.toThrow();
      await expect(
        saveEnglishReaderDraft(db, {
          title: "",
          text: "one",
          position: 0,
          revision: 0,
        }),
      ).rejects.toThrow();
      expect(
        sqlite.prepare("SELECT payload_json FROM en_drafts").get()
          ?.payload_json,
      ).toBe("not-json");
    } finally {
      sqlite.close();
    }
  });
  it("restores text and reading offset, isolates drafts and detects concurrent edits", async () => {
    const sqlite = new DatabaseSync(":memory:"),
      db = expoAdapter(sqlite);
    try {
      await initializeEnglishLearner(db);
      sqlite.exec("INSERT INTO en_drafts VALUES('custom-card','{}')");
      expect(await readEnglishReaderDraft(db)).toBeNull();
      const first = await saveEnglishReaderDraft(db, {
        title: "Mine",
        text: "one two three",
        position: 4,
        revision: 0,
      });
      expect(await readEnglishReaderDraft(db)).toEqual(first);
      await expect(
        saveEnglishReaderDraft(db, { ...first, revision: 0 }),
      ).rejects.toThrow("STALE");
      expect(
        sqlite
          .prepare("SELECT payload_json FROM en_drafts WHERE id='custom-card'")
          .get()?.payload_json,
      ).toBe("{}");
      const next = await saveEnglishReaderDraft(db, { ...first, position: 8 });
      expect(next.revision).toBe(2);
      expect(next.position).toBe(8);
    } finally {
      sqlite.close();
    }
  });
  it("does not change cards/SRS/history during reading and only returns exact personal matches", async () => {
    const sqlite = new DatabaseSync(":memory:"),
      db = expoAdapter(sqlite);
    try {
      await initializeEnglishLearner(db);
      await createEnglishDeck(db, "en:deck", "Mine");
      await addEnglishCards(db, [
        {
          id: "en:card",
          deck_id: "en:deck",
          headword: "book",
          meaning_vi: "User meaning",
          pos: "noun",
          ipa: "",
          sense_id: null,
          source_id: "USER",
        },
      ]);
      const before = sqlite.prepare("SELECT * FROM en_cards").all();
      expect((await lookupEnglishPersonalWord(db, "Book"))[0]?.meaning_vi).toBe(
        "User meaning",
      );
      expect(await lookupEnglishPersonalWord(db, "books")).toEqual([]);
      expect(await lookupEnglishPersonalWord(db, "' OR 1=1 --")).toEqual([]);
      await saveEnglishReaderDraft(db, {
        title: "",
        text: "Book",
        position: 0,
        revision: 0,
      });
      expect(sqlite.prepare("SELECT * FROM en_cards").all()).toEqual(before);
      expect(sqlite.prepare("SELECT COUNT(*) n FROM en_reviews").get()?.n).toBe(
        0,
      );
      sqlite.exec("UPDATE en_decks SET deleted=1");
      expect(await lookupEnglishPersonalWord(db, "book")).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});
