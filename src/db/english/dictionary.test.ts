import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import {
  assertRedistributablePack,
  csvCell,
  importSkypedia,
} from "../../../scripts/lib/english-pack";
import { createLegacyDatabase, expoAdapter } from "../fixtures/legacy_database";
import { migrateDatabaseSchema } from "../migrations";

import {
  analyzeEnglishBulk,
  findEnglishCandidates,
  getEnglishSenses,
} from "./dictionary";

import {
  assertSessionLanguage,
  languageConfigs,
  normalizeEnglishHeadword,
} from "@/services/languages/config";

/** Authored synthetic test fixture. Never shipped as a real dictionary/content pack. */
function sourceFixture() {
  const source = new DatabaseSync(":memory:");
  source.exec(
    "PRAGMA foreign_keys=ON; CREATE TABLE words(id INTEGER PRIMARY KEY,word TEXT,lang_code TEXT); CREATE TABLE definitions(id INTEGER PRIMARY KEY,definition TEXT,pos TEXT,sub_pos TEXT,definition_lang TEXT); CREATE TABLE word_definitions(id INTEGER PRIMARY KEY,word_id INTEGER REFERENCES words(id),definition_id INTEGER REFERENCES definitions(id),example TEXT); CREATE TABLE pronunciations(id INTEGER PRIMARY KEY,word_id INTEGER REFERENCES words(id),ipa TEXT,region TEXT);",
  );
  source.prepare("INSERT INTO words VALUES(?,?,?)").run(1, "book", "en");
  source.prepare("INSERT INTO words VALUES(?,?,?)").run(2, "take off", "en");
  source.prepare("INSERT INTO words VALUES(?,?,?)").run(3, "go", "en");
  source
    .prepare("INSERT INTO definitions VALUES(?,?,?,?,?)")
    .run(1, "sách", "N", null, "vi");
  source
    .prepare("INSERT INTO definitions VALUES(?,?,?,?,?)")
    .run(2, "đặt chỗ", "V", null, "vi");
  source
    .prepare("INSERT INTO definitions VALUES(?,?,?,?,?)")
    .run(3, "cất cánh", "V", null, "vi");
  source
    .prepare("INSERT INTO definitions VALUES(?,?,?,?,?)")
    .run(4, "đi", "V", null, "vi");
  for (const [id, word, definition] of [
    [1, 1, 1],
    [2, 1, 2],
    [3, 2, 3],
    [4, 3, 4],
  ]) {
    source
      .prepare("INSERT INTO word_definitions VALUES(?,?,?,?)")
      .run(
        id!,
        word!,
        definition!,
        'Synthetic example, "quoted".\nSecond line.',
      );
  }
  source
    .prepare("INSERT INTO pronunciations VALUES(?,?,?,?)")
    .run(1, 1, "/bʊk/", "US");
  source
    .prepare("INSERT INTO pronunciations VALUES(?,?,?,?)")
    .run(2, 1, "/bʊk/", "UK");
  return source;
}
function snapshot(db: DatabaseSync) {
  return JSON.stringify(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all()
      .map((row) => [
        row.name,
        db
          .prepare(
            'SELECT * FROM "' + String(row.name).replace(/"/gu, '""') + '"',
          )
          .all()
          .map((value) => JSON.stringify(value))
          .sort(),
      ]),
  );
}
function setup() {
  const source = sourceFixture(),
    target = new DatabaseSync(":memory:");
  importSkypedia(source, target, "a".repeat(64), "Synthetic fixture");
  return { source, target, db: expoAdapter(target) };
}
describe("English content foundation — isolated from Chinese runtime", () => {
  it("preserves separate senses, POS, IPA variants and untranslated examples", async () => {
    const { source, target, db } = setup();
    try {
      expect(
        (await getEnglishSenses(db, "en:sky:w:1")).map((row) => [
          row.part_of_speech,
          row.meaning_vi,
        ]),
      ).toEqual([
        ["N", "sách"],
        ["V", "đặt chỗ"],
      ]);
      expect(
        target
          .prepare(
            "SELECT accent,sense_id FROM english_pronunciations ORDER BY accent",
          )
          .all(),
      ).toEqual([
        { accent: "en-GB", sense_id: null },
        { accent: "en-US", sense_id: null },
      ]);
      expect(
        target
          .prepare(
            "SELECT review_status,translation_vi FROM english_examples LIMIT 1",
          )
          .get(),
      ).toEqual({
        review_status: "generated_unreviewed",
        translation_vi: null,
      });
      expect(() => assertRedistributablePack(target)).toThrow(
        "LICENSE_REVIEW_REQUIRED",
      );
      const before = snapshot(target);
      expect(() =>
        importSkypedia(source, target, "a".repeat(64), "Synthetic fixture"),
      ).toThrow();
      expect(snapshot(target)).toBe(before);
    } finally {
      source.close();
      target.close();
    }
  });
  it("keeps exact phrases ahead of search, supports VI FTS and bound malicious input", async () => {
    const { source, target, db } = setup();
    try {
      expect((await findEnglishCandidates(db, "TAKE OFF"))[0]).toMatchObject({
        headword: "take off",
        match: "exact",
      });
      expect((await findEnglishCandidates(db, "sach"))[0]?.headword).toBe(
        "book",
      );
      expect(await findEnglishCandidates(db, "' OR 1=1 --")).toEqual([]);
      expect(normalizeEnglishHeadword("  Don’t  give-up ")).toBe(
        "don't give-up",
      );
    } finally {
      source.close();
      target.close();
    }
  });
  it.each([10, 50, 100])(
    "analyzes %i lines without silently selecting senses",
    async (count) => {
      const { source, target, db } = setup();
      try {
        const rows = await analyzeEnglishBulk(
          db,
          Array.from({ length: count }, (_, index) =>
            index % 2 ? "book" : "not-in-fixture",
          ).join("\n"),
        );
        expect(rows).toHaveLength(count);
        expect(rows.every((row) => row.selectedSenseId === null)).toBe(true);
        expect(rows[0]!.candidates).toEqual([]);
        expect(rows[1]!.candidates[0]!.match).toBe("exact");
        await expect(
          analyzeEnglishBulk(db, Array(101).fill("book").join("\n")),
        ).rejects.toThrow("LIMIT_100");
      } finally {
        source.close();
        target.close();
      }
    },
  );
  it("returns explicit irregular-form candidates rather than rewriting input", async () => {
    const { source, target, db } = setup();
    try {
      target
        .prepare("INSERT INTO english_forms VALUES(?,?,?,?,?,?,?,?,?,?)")
        .run(
          "form-1",
          "en:sky:w:3",
          "went",
          "went",
          "en:sky:w:3",
          "past",
          "past",
          null,
          "synthetic",
          "skypedia-388adc0826300912e5b0311c089e0e70494b065f",
        );
      const rows = await analyzeEnglishBulk(db, "went");
      expect(rows[0]!.input).toBe("went");
      expect(rows[0]!.candidates[0]).toMatchObject({
        headword: "go",
        match: "form",
      });
    } finally {
      source.close();
      target.close();
    }
  });
  it("does not change any Chinese table, progress, history or IDs", async () => {
    const chinese = createLegacyDatabase();
    const { source, target } = setup();
    try {
      await migrateDatabaseSchema(expoAdapter(chinese));
      const before = snapshot(chinese);
      target
        .prepare("INSERT INTO english_forms VALUES(?,?,?,?,?,?,?,?,?,?)")
        .run(
          "form-1",
          "en:sky:w:3",
          "went",
          "went",
          "en:sky:w:3",
          "past",
          "past",
          null,
          "synthetic",
          "skypedia-388adc0826300912e5b0311c089e0e70494b065f",
        );
      expect(snapshot(chinese)).toBe(before);
      expect(
        chinese
          .prepare(
            "SELECT vocabulary_id,notes FROM user_vocabulary_progress WHERE vocabulary_id='custom-1'",
          )
          .get(),
      ).toMatchObject({
        vocabulary_id: "custom-1",
        notes: "Ghi chú không được mất",
      });
      expect(
        chinese
          .prepare("SELECT name FROM sqlite_master WHERE name='english_words'")
          .get(),
      ).toBeUndefined();
    } finally {
      chinese.close();
      source.close();
      target.close();
    }
  });
  it("rejects cross-language contexts and omits Chinese-only tools in EN config", () => {
    expect(languageConfigs.en.capabilities).toEqual({
      hanzi: false,
      tones: false,
      ipa: true,
      spelling: true,
    });
    expect(() =>
      assertSessionLanguage(
        {
          learningLanguage: "en",
          uiLocale: "vi",
          pronunciationVariant: "en-US",
          sessionId: "1",
        },
        "zh",
      ),
    ).toThrow("SESSION_LANGUAGE_MISMATCH");
    expect(() =>
      assertSessionLanguage(
        {
          learningLanguage: "en",
          uiLocale: "vi",
          pronunciationVariant: "zh-CN",
          sessionId: "1",
        },
        "en",
      ),
    ).toThrow("PRONUNCIATION_LANGUAGE_MISMATCH");
  });
  it("writes valid CSV quoting without comma-splitting senses", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell(null)).toBe("");
  });
  it("rolls back all staging schema/content when an import fails", () => {
    const source = sourceFixture(),
      target = new DatabaseSync(":memory:");
    try {
      source.prepare("UPDATE words SET word=? WHERE id=2").run("");
      expect(() =>
        importSkypedia(source, target, "a".repeat(64), "Synthetic"),
      ).toThrow();
      expect(
        target
          .prepare("SELECT name FROM sqlite_master WHERE name='english_words'")
          .get(),
      ).toBeUndefined();
    } finally {
      source.close();
      target.close();
    }
  });
});
