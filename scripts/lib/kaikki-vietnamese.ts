import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { createGunzip } from "node:zlib";

import { z } from "zod";

import { englishDictionarySchema } from "../../src/db/english/schema";
import {
  normalizeEnglishHeadword,
  normalizeEnglishMeaning,
} from "../../src/services/languages/config";

const labels = z.array(z.string()).optional();
const redirectSchema = z
  .object({
    title: z.string().min(1),
    redirect: z.string().min(1),
    pos: z.literal("hard-redirect"),
  })
  .strict();
const recordSchema = z
  .object({
    lang_code: z.literal("en"),
    word: z.string().trim().min(1),
    pos: z.string().trim().min(1),
    senses: z.array(
      z
        .object({ glosses: labels, tags: labels, raw_tags: labels })
        .passthrough(),
    ),
    forms: z
      .array(
        z
          .object({ form: z.string().min(1), tags: labels, raw_tags: labels })
          .passthrough(),
      )
      .optional(),
    sounds: z
      .array(
        z
          .object({
            ipa: z.string().optional(),
            tags: labels,
            raw_tags: labels,
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

export interface RawRecord {
  line: number;
  raw: string;
}
export interface KaikkiMetadata {
  sha256: string;
  version: string;
}

/** Streaming, bounded and fatal UTF-8/gzip decoding; never loads the corpus into JS. */
export async function* readKaikkiGzip(path: string): AsyncGenerator<RawRecord> {
  const stream = createReadStream(path).compose(createGunzip());
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let pending = "",
    bytes = 0,
    line = 0;
  try {
    for await (const chunk of stream) {
      bytes += chunk.length;
      if (bytes > 500_000_000) throw new Error("RAW_CORPUS_TOO_LARGE");
      pending += decoder.decode(chunk, { stream: true });
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) {
        const raw = pending.slice(0, end).replace(/\r$/u, "");
        pending = pending.slice(end + 1);
        if (raw.length > 4_000_000) throw new Error("RAW_RECORD_TOO_LARGE");
        yield { line: ++line, raw };
      }
      if (pending.length > 4_000_000) throw new Error("RAW_RECORD_TOO_LARGE");
    }
    pending += decoder.decode();
    if (pending) yield { line: ++line, raw: pending };
  } finally {
    stream.destroy();
  }
}

/** Only raw viwiktionary English records. No translations, CEFR, examples or accents inferred. */
export async function importKaikkiVietnamese(
  db: DatabaseSync,
  records: AsyncIterable<RawRecord>,
  metadata: KaikkiMetadata,
) {
  if (!/^[a-f0-9]{64}$/u.test(metadata.sha256) || !metadata.version.trim())
    throw new Error("INVALID_SOURCE_METADATA");
  const sourceId = "kaikki-vi-" + metadata.sha256;
  const counts = {
    rawRecords: 0,
    skippedRedirects: 0,
    skippedOtherLanguages: 0,
    englishRecords: 0,
    duplicateRecords: 0,
    words: 0,
    senses: 0,
    emptySenses: 0,
    pronunciations: 0,
    forms: 0,
    excludedExamples: 0,
  };
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(englishDictionarySchema);
    db.exec(`CREATE TABLE kaikki_raw_records(word_id TEXT PRIMARY KEY REFERENCES english_words(word_id),raw_json TEXT NOT NULL,page_url TEXT NOT NULL);
      CREATE TABLE kaikki_record_lines(line_number INTEGER PRIMARY KEY,word_id TEXT NOT NULL REFERENCES english_words(word_id));`);
    db.prepare("INSERT INTO english_sources VALUES(?,?,?,?,?,?)").run(
      sourceId,
      metadata.version,
      metadata.sha256,
      "CC-BY-SA-4.0; snapshot exceptions and attribution review pending",
      "LICENSE_REVIEW_REQUIRED",
      "Wiktionary tiếng Việt contributors via Kaikki/Wiktextract. Per-entry page URL in kaikki_raw_records; source raw retained. Normalized extraction; examples/audio/media excluded. No academic verification.",
    );
    const word = db.prepare(
      "INSERT INTO english_words VALUES(?,?,?,?,?,?,?,?,?)",
    );
    const sense = db.prepare(
      "INSERT INTO english_senses VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    const ipa = db.prepare(
      "INSERT INTO english_pronunciations VALUES(?,?,?,?,?,?,?,?)",
    );
    const form = db.prepare(
      "INSERT INTO english_forms VALUES(?,?,?,?,?,?,?,?,?,?)",
    );
    const rawInsert = db.prepare(
      "INSERT INTO kaikki_raw_records VALUES(?,?,?)",
    );
    const lineage = db.prepare("INSERT INTO kaikki_record_lines VALUES(?,?)");
    const duplicate = db.prepare("SELECT 1 FROM english_words WHERE word_id=?");
    for await (const item of records) {
      counts.rawRecords++;
      let parsed: unknown;
      try {
        parsed = JSON.parse(item.raw);
      } catch {
        throw new Error("INVALID_SOURCE_JSON:line=" + item.line);
      }
      if (redirectSchema.safeParse(parsed).success) {
        counts.skippedRedirects++;
        continue;
      }
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("lang_code" in parsed) ||
        typeof parsed.lang_code !== "string"
      )
        throw new Error("SOURCE_SCHEMA_DRIFT:line=" + item.line);
      if (parsed.lang_code !== "en") {
        counts.skippedOtherLanguages++;
        continue;
      }
      const validated = recordSchema.safeParse(parsed);
      if (!validated.success)
        throw new Error("ENGLISH_SCHEMA_DRIFT:line=" + item.line);
      const record = validated.data;
      counts.englishRecords++;
      // Content-derived, snapshot-record identity, not a promise of cross-snapshot learner IDs.
      const digest = createHash("sha256").update(item.raw).digest("hex");
      const wordId = "en:kaikki:vi:" + digest;
      if (duplicate.get(wordId)) {
        lineage.run(item.line, wordId);
        counts.duplicateRecords++;
        continue;
      }
      word.run(
        wordId,
        record.word,
        normalizeEnglishHeadword(record.word),
        normalizeEnglishHeadword(record.word),
        /\s/u.test(record.word) ? "PHRASE" : "SINGLE_WORD",
        null,
        sourceId,
        digest,
        "source_unreviewed",
      );
      rawInsert.run(
        wordId,
        item.raw,
        "https://vi.wiktionary.org/wiki/" + encodeURIComponent(record.word),
      );
      lineage.run(item.line, wordId);
      counts.words++;
      record.senses.forEach((value, index) => {
        if (Array.isArray(value.examples))
          counts.excludedExamples += value.examples.length;
        const glosses = value.glosses?.filter((text) => text.trim()) ?? [];
        if (!glosses.length) {
          counts.emptySenses++;
          return;
        }
        // Multiple gloss strings within ONE source sense stay together, not split on commas.
        const meaning = glosses.join("\n");
        sense.run(
          wordId + ":s:" + index,
          wordId,
          record.pos,
          null,
          meaning,
          normalizeEnglishMeaning(meaning),
          null,
          JSON.stringify({
            tags: value.tags ?? [],
            raw_tags: value.raw_tags ?? [],
          }),
          null,
          null,
          index + 1,
          sourceId,
          "source_unreviewed",
        );
        counts.senses++;
      });
      (record.sounds ?? []).forEach((value, index) => {
        if (!value.ipa?.trim()) return;
        const tags = value.tags ?? [];
        const us = tags.includes("US") || tags.includes("General-American"),
          uk = tags.includes("UK");
        ipa.run(
          wordId + ":p:" + index,
          wordId,
          null,
          value.ipa,
          us && !uk ? "US" : uk && !us ? "UK" : "UNSPECIFIED",
          JSON.stringify({ tags, raw_tags: value.raw_tags ?? [] }),
          sourceId,
          "source_unreviewed",
        );
        counts.pronunciations++;
      });
      (record.forms ?? []).forEach((value, index) => {
        form.run(
          wordId + ":f:" + index,
          wordId,
          value.form,
          normalizeEnglishHeadword(value.form),
          wordId,
          (value.tags ?? []).join("|") || "unspecified",
          null,
          null,
          JSON.stringify({
            tags: value.tags ?? [],
            raw_tags: value.raw_tags ?? [],
            status: "source_unreviewed",
          }),
          sourceId,
        );
        counts.forms++;
      });
    }
    if (!counts.words || !counts.senses)
      throw new Error("NO_ENGLISH_VIETNAMESE_CONTENT");
    db.exec(`INSERT INTO english_search(word_id,headword,meanings)
      SELECT w.word_id,w.headword,COALESCE(GROUP_CONCAT(s.normalized_meaning,' '),'') FROM english_words w LEFT JOIN english_senses s ON s.word_id=w.word_id GROUP BY w.word_id;
      PRAGMA user_version=1;`);
    if (
      db.prepare("PRAGMA foreign_key_check").all().length ||
      db.prepare("PRAGMA quick_check").get()?.quick_check !== "ok"
    )
      throw new Error("PACK_INTEGRITY_FAILED");
    db.exec("COMMIT");
    return {
      ...counts,
      distributionStatus: "LICENSE_REVIEW_REQUIRED",
      independentlyReviewed: 0,
      examples: 0,
      cefrMappings: 0,
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
