import type { SQLiteDatabase } from "expo-sqlite";

import {
  normalizeEnglishHeadword,
  normalizeEnglishMeaning,
} from "@/services/languages/config";

export interface EnglishCandidate {
  word_id: string;
  headword: string;
  entry_type: string;
  match: "exact" | "form" | "search";
}
export interface EnglishSense {
  sense_id: string;
  word_id: string;
  part_of_speech: string;
  meaning_vi: string;
  review_status: string;
}
type DictionaryDb = Pick<SQLiteDatabase, "getAllAsync">;

export async function findEnglishCandidates(
  db: DictionaryDb,
  query: string,
): Promise<EnglishCandidate[]> {
  const normalized = normalizeEnglishHeadword(query);
  if (!normalized || normalized.length > 200) return [];
  const exact = await db.getAllAsync<EnglishCandidate>(
    "SELECT word_id,headword,entry_type,'exact' AS match FROM english_words WHERE normalized_headword=? ORDER BY word_id LIMIT 12",
    normalized,
  );
  if (exact.length) return exact;
  const forms = await db.getAllAsync<EnglishCandidate>(
    "SELECT DISTINCT w.word_id,w.headword,w.entry_type,'form' AS match FROM english_forms f JOIN english_words w ON w.word_id=f.lemma_id WHERE f.normalized_form=? ORDER BY w.word_id LIMIT 12",
    normalized,
  );
  if (forms.length) return forms;
  const terms = normalizeEnglishMeaning(query).split(" ").filter(Boolean);
  if (!terms.length) return [];
  const expression = terms
    .map((term) => '"' + term.replace(/"/gu, '""') + '"*')
    .join(" AND ");
  return db.getAllAsync<EnglishCandidate>(
    // Let FTS5 use its ranked iterator and stop before joining every matching
    // entry. Rank ties may select a different subset than global word-ID order;
    // suggestions are never auto-selected and detail loads all headword POS.
    "SELECT w.word_id,w.headword,w.entry_type,'search' AS match FROM (SELECT word_id,rank FROM english_search WHERE english_search MATCH ? ORDER BY rank LIMIT 12) f JOIN english_words w ON w.word_id=f.word_id ORDER BY f.rank,w.word_id",
    expression,
  );
}
export async function getEnglishSenses(
  db: DictionaryDb,
  wordId: string,
): Promise<EnglishSense[]> {
  return db.getAllAsync<EnglishSense>(
    "SELECT * FROM english_senses WHERE word_id=? ORDER BY sense_order,sense_id",
    wordId,
  );
}
/** Matches only; never selects a sense or writes cards for the user. */
export async function analyzeEnglishBulk(db: DictionaryDb, text: string) {
  const rows = text
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean);
  if (rows.length > 100) throw new Error("ENGLISH_BULK_LIMIT_100");
  const cache = new Map<string, EnglishCandidate[]>();
  const result = [];
  for (const input of rows) {
    const key = normalizeEnglishHeadword(input);
    if (!cache.has(key)) cache.set(key, await findEnglishCandidates(db, input));
    result.push({ input, candidates: cache.get(key)!, selectedSenseId: null });
  }
  return result;
}
