import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { englishDictionarySchema } from "../../src/db/english/schema";
import {
  normalizeEnglishHeadword,
  normalizeEnglishMeaning,
} from "../../src/services/languages/config";

export const SKY_SOURCE_ID =
  "skypedia-388adc0826300912e5b0311c089e0e70494b065f";
export const SKY_DB_SHA256 =
  "2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a";
export const SKY_SOURCE_URL =
  "https://github.com/skypediacode/english-vietnamese-dictionary/tree/388adc0826300912e5b0311c089e0e70494b065f";

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
export function assertSourceShape(source: DatabaseSync): void {
  source.exec("PRAGMA query_only=ON; PRAGMA trusted_schema=OFF;");
  if (source.prepare("PRAGMA quick_check").get()?.quick_check !== "ok")
    throw new Error("SOURCE_INTEGRITY_FAILED");
  const columns: Record<string, string[]> = {
    words: ["id", "word", "lang_code"],
    definitions: ["id", "definition", "pos", "sub_pos", "definition_lang"],
    word_definitions: ["id", "word_id", "definition_id", "example"],
    pronunciations: ["id", "word_id", "ipa", "region"],
  };
  for (const [table, required] of Object.entries(columns)) {
    const actual = source
      .prepare("PRAGMA table_info(" + table + ")")
      .all()
      .map((row) => row.name);
    if (required.some((column) => !actual.includes(column)))
      throw new Error("SOURCE_SCHEMA_DRIFT:" + table);
    const type = source
      .prepare("SELECT type FROM sqlite_master WHERE name=?")
      .get(table)?.type;
    if (type !== "table") throw new Error("SOURCE_NOT_BASE_TABLE:" + table);
  }
  if (source.prepare("PRAGMA foreign_key_check").all().length)
    throw new Error("SOURCE_FOREIGN_KEY_FAILED");
}
function number(source: DatabaseSync, query: string): number {
  return Number(source.prepare(query).get()?.n ?? 0);
}
export function auditEnglishSource(source: DatabaseSync) {
  assertSourceShape(source);
  return {
    words: number(source, "SELECT COUNT(*) n FROM words WHERE lang_code='en'"),
    definitions: number(source, "SELECT COUNT(*) n FROM definitions"),
    wordSenseLinks: number(
      source,
      "SELECT COUNT(*) n FROM word_definitions wd JOIN words w ON w.id=wd.word_id WHERE w.lang_code='en'",
    ),
    missingVietnamese: number(
      source,
      "SELECT COUNT(*) n FROM word_definitions wd JOIN words w ON w.id=wd.word_id JOIN definitions d ON d.id=wd.definition_id WHERE w.lang_code='en' AND (d.definition_lang<>'vi' OR TRIM(d.definition)='')",
    ),
    wordsWithoutSense: number(
      source,
      "SELECT COUNT(*) n FROM words w WHERE w.lang_code='en' AND NOT EXISTS(SELECT 1 FROM word_definitions wd WHERE wd.word_id=w.id)",
    ),
    pronunciations: number(
      source,
      "SELECT COUNT(*) n FROM pronunciations p JOIN words w ON w.id=p.word_id WHERE w.lang_code='en'",
    ),
    missingIpaWords: number(
      source,
      "SELECT COUNT(*) n FROM words w WHERE w.lang_code='en' AND NOT EXISTS(SELECT 1 FROM pronunciations p WHERE p.word_id=w.id AND TRIM(p.ipa)<>'')",
    ),
    exampleLinks: number(
      source,
      "SELECT COUNT(*) n FROM word_definitions wd JOIN words w ON w.id=wd.word_id WHERE w.lang_code='en' AND TRIM(COALESCE(wd.example,''))<>''",
    ),
    emptyPosLinks: number(
      source,
      "SELECT COUNT(*) n FROM word_definitions wd JOIN words w ON w.id=wd.word_id JOIN definitions d ON d.id=wd.definition_id WHERE w.lang_code='en' AND TRIM(COALESCE(d.pos,''))=''",
    ),
    languages: source
      .prepare("SELECT lang_code,COUNT(*) n FROM words GROUP BY lang_code")
      .all(),
    pos: source
      .prepare(
        "SELECT pos,COUNT(*) n FROM definitions GROUP BY pos ORDER BY n DESC",
      )
      .all(),
    regions: source
      .prepare(
        "SELECT region,COUNT(*) n FROM pronunciations GROUP BY region ORDER BY n DESC",
      )
      .all(),
    homographs: source
      .prepare(
        "SELECT w.word,COUNT(DISTINCT p.ipa) ipa_count FROM words w JOIN pronunciations p ON p.word_id=w.id WHERE w.word IN ('lead','read','wind','tear','bow','close','live','bass') GROUP BY w.word",
      )
      .all(),
    independentlyReviewed: 0,
    senseSpecificIpaLinks: 0,
    sourceStatus: "LICENSE_REVIEW_REQUIRED",
  };
}

/** Preserves each source word/definition link, including shared definition IDs. */
export function importSkypedia(
  source: DatabaseSync,
  target: DatabaseSync,
  digest: string,
  attribution: string,
): void {
  assertSourceShape(source);
  if (!/^[a-f0-9]{64}$/u.test(digest))
    throw new Error("INVALID_SOURCE_CHECKSUM");
  target.exec("BEGIN IMMEDIATE");
  try {
    target.exec(englishDictionarySchema);
    target
      .prepare("INSERT INTO english_sources VALUES(?,?,?,?,?,?)")
      .run(
        SKY_SOURCE_ID,
        "388adc0826300912e5b0311c089e0e70494b065f",
        digest,
        "CC-BY-SA-4.0; upstream review pending",
        "LICENSE_REVIEW_REQUIRED",
        attribution,
      );
    const wordInsert = target.prepare(
      "INSERT INTO english_words VALUES(?,?,?,?,?,?,?,?,?)",
    );
    for (const row of source
      .prepare("SELECT id,word FROM words WHERE lang_code='en' ORDER BY id")
      .iterate()) {
      if (typeof row.word !== "string" || !row.word.trim())
        throw new Error("INVALID_SOURCE_HEADWORD");
      const headword = row.word;
      wordInsert.run(
        "en:sky:w:" + row.id,
        headword,
        normalizeEnglishHeadword(headword),
        normalizeEnglishHeadword(headword),
        /\s/u.test(headword) ? "PHRASE" : "SINGLE_WORD",
        null,
        SKY_SOURCE_ID,
        String(row.id),
        "source_unreviewed",
      );
    }
    const senseInsert = target.prepare(
      "INSERT INTO english_senses VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    const exampleInsert = target.prepare(
      "INSERT INTO english_examples VALUES(?,?,?,?,?,?)",
    );
    let previousWord: unknown,
      order = 0;
    for (const row of source
      .prepare(
        "SELECT wd.id,wd.word_id,d.pos,d.sub_pos,d.definition,d.definition_lang,wd.example FROM word_definitions wd JOIN words w ON w.id=wd.word_id JOIN definitions d ON d.id=wd.definition_id WHERE w.lang_code='en' ORDER BY wd.word_id,wd.id",
      )
      .iterate()) {
      if (previousWord !== row.word_id) {
        previousWord = row.word_id;
        order = 0;
      }
      const senseId = "en:sky:s:" + row.id;
      // No comma-splitting, inferred sense, guessed POS or translation.
      const meaning =
        row.definition_lang === "vi" ? String(row.definition) : "";
      senseInsert.run(
        senseId,
        "en:sky:w:" + row.word_id,
        String(row.pos ?? ""),
        row.sub_pos ?? null,
        meaning,
        normalizeEnglishMeaning(meaning),
        row.definition_lang === "en" ? (row.definition ?? null) : null,
        null,
        null,
        null,
        ++order,
        SKY_SOURCE_ID,
        "source_unreviewed",
      );
      if (String(row.example ?? "").trim())
        exampleInsert.run(
          "en:sky:e:" + row.id,
          senseId,
          String(row.example),
          null,
          SKY_SOURCE_ID,
          "generated_unreviewed",
        );
    }
    const pronunciationInsert = target.prepare(
      "INSERT INTO english_pronunciations VALUES(?,?,?,?,?,?,?,?)",
    );
    for (const row of source
      .prepare(
        "SELECT p.* FROM pronunciations p JOIN words w ON w.id=p.word_id WHERE w.lang_code='en' ORDER BY p.id",
      )
      .iterate()) {
      const region = String(row.region ?? "");
      const accent = /^(US|NAmE|AmE|General-American)$/iu.test(region)
        ? "en-US"
        : /^(UK|BrE|GB|Received-Pronunciation)$/iu.test(region)
          ? "en-GB"
          : "UNSPECIFIED";
      pronunciationInsert.run(
        "en:sky:p:" + row.id,
        "en:sky:w:" + row.word_id,
        null,
        String(row.ipa),
        accent,
        region || null,
        SKY_SOURCE_ID,
        "source_unreviewed",
      );
    }
    // FTS is built once; no corpus preload or runtime download.
    target.exec(
      "INSERT INTO english_search(word_id,headword,meanings) SELECT w.word_id,w.headword,COALESCE(GROUP_CONCAT(s.normalized_meaning,' '),'') FROM english_words w LEFT JOIN english_senses s ON s.word_id=w.word_id GROUP BY w.word_id;",
    );
    if (target.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("PACK_FOREIGN_KEY_FAILED");
    const audit = auditEnglishSource(source);
    if (
      number(target, "SELECT COUNT(*) n FROM english_words") !== audit.words ||
      number(target, "SELECT COUNT(*) n FROM english_senses") !==
        audit.wordSenseLinks
    )
      throw new Error("PACK_COUNT_MISMATCH");
    target.exec("PRAGMA user_version=1; COMMIT");
  } catch (error) {
    target.exec("ROLLBACK");
    throw error;
  }
}

export function assertRedistributablePack(db: DatabaseSync): void {
  if (
    number(
      db,
      "SELECT COUNT(*) n FROM english_sources WHERE distribution_status<>'APPROVED'",
    ) > 0 ||
    number(db, "SELECT COUNT(*) n FROM english_sources") === 0
  )
    throw new Error("LICENSE_REVIEW_REQUIRED");
}

export const csvTables: Record<string, string> = {
  english_words: "SELECT * FROM english_words ORDER BY word_id",
  english_senses: "SELECT * FROM english_senses ORDER BY word_id,sense_order",
  english_pronunciations:
    "SELECT * FROM english_pronunciations ORDER BY pronunciation_id",
  english_examples: "SELECT * FROM english_examples ORDER BY example_id",
  english_forms: "SELECT * FROM english_forms ORDER BY form_id",
  english_cefr: "SELECT * FROM english_cefr ORDER BY mapping_id",
  english_all_flat:
    "SELECT w.word_id,w.headword,w.entry_type,s.sense_id,s.part_of_speech,s.meaning_vi,s.definition_en,s.sense_order,s.review_status FROM english_words w JOIN english_senses s ON s.word_id=w.word_id ORDER BY w.word_id,s.sense_order",
};
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/u.test(text) ? '"' + text.replace(/"/gu, '""') + '"' : text;
}
