import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { assertRedistributablePack } from "../../../scripts/lib/english-pack";
import {
  importKaikkiVietnamese,
  readKaikkiGzip,
} from "../../../scripts/lib/kaikki-vietnamese";

const metadata = {
  sha256: "a".repeat(64),
  version: "synthetic test fixture; not production content",
};
const noun = {
  lang_code: "en",
  word: "book",
  pos: "noun",
  senses: [
    { glosses: ["sách, quyển sách"], examples: [{ text: "Synthetic only" }] },
  ],
  sounds: [
    { ipa: "/bʊk/", tags: ["US"] },
    { ipa: "/bʊk/", tags: ["UK"] },
    { ipa: "source uncertain", raw_tags: ["Mỹ"] },
  ],
  forms: [{ form: "books", tags: ["plural"] }],
};
async function* records(values: unknown[]) {
  let line = 0;
  for (const value of values)
    yield { line: ++line, raw: JSON.stringify(value) };
}
describe("Raw Vietnamese Wiktionary import — synthetic isolated fixture", () => {
  it("streams gzip/UTF-8 records including a final line without newline, rejects damaged gzip and encoding", async () => {
    const directory = mkdtempSync(join(tmpdir(), "4chinese-kaikki-test-"));
    const path = join(directory, "fixture.gz");
    const read = async () => {
      const rows = [];
      for await (const row of readKaikkiGzip(path)) rows.push(row);
      return rows;
    };
    try {
      writeFileSync(
        path,
        gzipSync(
          JSON.stringify(noun) + "\r\n" + JSON.stringify({ lang_code: "vi" }),
        ),
      );
      expect((await read()).map((row) => row.line)).toEqual([1, 2]);
      writeFileSync(path, Buffer.from("damaged gzip"));
      await expect(read()).rejects.toThrow();
      writeFileSync(path, gzipSync(Buffer.from([0xff])));
      await expect(read()).rejects.toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("rolls back on malformed JSON and mid-stream IO failure", async () => {
    const db = new DatabaseSync(":memory:");
    async function* invalid() {
      yield { line: 1, raw: JSON.stringify(noun) };
      yield { line: 2, raw: "{" };
    }
    async function* failed() {
      yield { line: 1, raw: JSON.stringify(noun) };
      throw new Error("SYNTHETIC_READ_FAILURE");
    }
    try {
      await expect(
        importKaikkiVietnamese(db, invalid(), metadata),
      ).rejects.toThrow("INVALID_SOURCE_JSON:line=2");
      await expect(
        importKaikkiVietnamese(db, failed(), metadata),
      ).rejects.toThrow("SYNTHETIC_READ_FAILURE");
      expect(
        db
          .prepare(
            "SELECT COUNT(*) n FROM sqlite_master WHERE name='english_words'",
          )
          .get()?.n,
      ).toBe(0);
    } finally {
      db.close();
    }
  });
  it("explicitly counts language-free hard redirects without treating them as dictionary entries", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      const report = await importKaikkiVietnamese(
        db,
        records([
          noun,
          {
            title: "Main Page",
            redirect: "Wiktionary:Trang Chính",
            pos: "hard-redirect",
          },
        ]),
        metadata,
      );
      expect(report).toMatchObject({
        words: 1,
        skippedRedirects: 1,
        rawRecords: 2,
      });
    } finally {
      db.close();
    }
  });
  it("retains distinct POS/senses, comma gloss and raw attribution; does not invent examples, CEFR or accents", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      const report = await importKaikkiVietnamese(
        db,
        records([
          noun,
          {
            lang_code: "en",
            word: "book",
            pos: "verb",
            senses: [{ glosses: ["đặt chỗ", "đặt trước"] }],
          },
          {
            lang_code: "en",
            word: "take off",
            pos: "verb",
            senses: [{ glosses: ["cất cánh"] }],
          },
          { lang_code: "zh", word: "中文" },
        ]),
        metadata,
      );
      expect(report).toMatchObject({
        words: 3,
        senses: 3,
        forms: 1,
        pronunciations: 3,
        skippedOtherLanguages: 1,
        excludedExamples: 1,
        examples: 0,
        cefrMappings: 0,
      });
      expect(
        db
          .prepare("SELECT meaning_vi FROM english_senses ORDER BY meaning_vi")
          .all()
          .map((row) => row.meaning_vi),
      ).toContain("đặt chỗ\nđặt trước");
      expect(
        db
          .prepare(
            "SELECT meaning_vi FROM english_senses WHERE part_of_speech='noun'",
          )
          .get()?.meaning_vi,
      ).toBe("sách, quyển sách");
      expect(
        db
          .prepare("SELECT accent FROM english_pronunciations ORDER BY accent")
          .all()
          .map((row) => row.accent),
      ).toEqual(["UK", "UNSPECIFIED", "US"]);
      expect(
        db
          .prepare(
            "SELECT COUNT(*) n FROM english_pronunciations WHERE sense_id IS NOT NULL",
          )
          .get()?.n,
      ).toBe(0);
      expect(
        db
          .prepare(
            "SELECT entry_type FROM english_words WHERE headword='take off'",
          )
          .get()?.entry_type,
      ).toBe("PHRASE");
      expect(
        db
          .prepare(
            "SELECT COUNT(*) n FROM english_search WHERE english_search MATCH ?",
          )
          .get('"sach"')?.n,
      ).toBe(1);
      expect(
        db
          .prepare(
            "SELECT page_url FROM kaikki_raw_records WHERE raw_json LIKE ?",
          )
          .get('%"word":"take off"%')?.page_url,
      ).toBe("https://vi.wiktionary.org/wiki/take%20off");
      expect(() => assertRedistributablePack(db)).toThrow(
        "LICENSE_REVIEW_REQUIRED",
      );
    } finally {
      db.close();
    }
  });
  it("deduplicates identical source records only, retains every occurrence line, stable IDs after reordering", async () => {
    const a = new DatabaseSync(":memory:"),
      b = new DatabaseSync(":memory:");
    const verb = {
      lang_code: "en",
      word: "book",
      pos: "verb",
      senses: [{ glosses: ["đặt chỗ"] }],
    };
    try {
      expect(
        (await importKaikkiVietnamese(a, records([noun, noun, verb]), metadata))
          .duplicateRecords,
      ).toBe(1);
      await importKaikkiVietnamese(b, records([verb, noun]), metadata);
      expect(
        a.prepare("SELECT word_id FROM english_words ORDER BY word_id").all(),
      ).toEqual(
        b.prepare("SELECT word_id FROM english_words ORDER BY word_id").all(),
      );
      expect(
        a.prepare("SELECT COUNT(*) n FROM kaikki_record_lines").get()?.n,
      ).toBe(3);
    } finally {
      a.close();
      b.close();
    }
  });
  it("preserves empty senses in raw provenance without fake meaning", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      const report = await importKaikkiVietnamese(
        db,
        records([
          noun,
          { lang_code: "en", word: "unknown", pos: "noun", senses: [{}] },
        ]),
        metadata,
      );
      expect(report.emptySenses).toBe(1);
      expect(db.prepare("SELECT COUNT(*) n FROM english_senses").get()?.n).toBe(
        1,
      );
      expect(db.prepare("SELECT COUNT(*) n FROM english_words").get()?.n).toBe(
        2,
      );
    } finally {
      db.close();
    }
  });
  it.each([
    {
      lang_code: "en",
      word: "broken",
      pos: "noun",
      senses: [{ glosses: [123] }],
    },
    { lang_code: "en", word: "broken", senses: [] },
    { word: "missing language" },
  ])("rolls back the entire pack on schema drift", async (value) => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(
        "CREATE TABLE sentinel(id INTEGER); INSERT INTO sentinel VALUES(7)",
      );
      await expect(
        importKaikkiVietnamese(db, records([noun, value]), metadata),
      ).rejects.toThrow("SCHEMA_DRIFT");
      expect(
        db
          .prepare("SELECT name FROM sqlite_master WHERE name='english_words'")
          .get(),
      ).toBeUndefined();
      expect(db.prepare("SELECT id FROM sentinel").get()?.id).toBe(7);
    } finally {
      db.close();
    }
  });
  it("refuses metadata corruption and empty-English corpus", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      await expect(
        importKaikkiVietnamese(db, records([noun]), {
          ...metadata,
          sha256: "bad",
        }),
      ).rejects.toThrow("INVALID_SOURCE_METADATA");
      await expect(
        importKaikkiVietnamese(db, records([{ lang_code: "zh" }]), metadata),
      ).rejects.toThrow("NO_ENGLISH_VIETNAMESE_CONTENT");
    } finally {
      db.close();
    }
  });
});
