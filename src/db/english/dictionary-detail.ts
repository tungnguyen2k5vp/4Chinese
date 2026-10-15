import type { SQLiteDatabase } from "expo-sqlite";

import type { EnglishCardInput } from "./learner";

import { normalizeEnglishHeadword } from "@/services/languages/config";

type ContentDb = Pick<SQLiteDatabase, "getAllAsync" | "getFirstAsync">;
export interface SenseCursor {
  pos: string;
  word: string;
  order: number;
  sense: string;
}
export interface DictionarySenseDetail {
  sense_id: string;
  word_id: string;
  headword: string;
  part_of_speech: string;
  meaning_vi: string;
  definition_en: string | null;
  usage_note: string | null;
  source_id: string;
  review_status: string;
  sense_order: number;
}
function limit(value: number) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 50)
    throw new Error("INVALID_DICTIONARY_PAGE_SIZE");
  return value;
}
/** All POS/source entries for the headword, not just the first candidate's senses. */
export async function englishHeadwordSensePage(
  db: ContentDb,
  headword: string,
  cursor: SenseCursor | null = null,
  size = 20,
) {
  const normalized = normalizeEnglishHeadword(headword);
  if (!normalized || normalized.length > 300)
    throw new Error("INVALID_DICTIONARY_HEADWORD");
  limit(size);
  if (
    cursor &&
    (typeof cursor.pos !== "string" ||
      typeof cursor.word !== "string" ||
      typeof cursor.sense !== "string" ||
      !Number.isSafeInteger(cursor.order) ||
      cursor.order < 0)
  )
    throw new Error("INVALID_DICTIONARY_CURSOR");
  const rows = await db.getAllAsync<DictionarySenseDetail>(
    `SELECT s.*,w.headword FROM english_words w JOIN english_senses s ON s.word_id=w.word_id
     WHERE w.normalized_headword=? ${cursor ? "AND (s.part_of_speech,s.word_id,s.sense_order,s.sense_id)>(?,?,?,?)" : ""}
     ORDER BY s.part_of_speech,s.word_id,s.sense_order,s.sense_id LIMIT ?`,
    normalized,
    ...(cursor ? [cursor.pos, cursor.word, cursor.order, cursor.sense] : []),
    size + 1,
  );
  const senses = rows.slice(0, size),
    last = senses[senses.length - 1];
  return {
    senses,
    next:
      rows.length > size && last
        ? {
            pos: last.part_of_speech,
            word: last.word_id,
            order: last.sense_order,
            sense: last.sense_id,
          }
        : null,
  };
}
export interface DictionaryPronunciation {
  pronunciation_id: string;
  word_id: string;
  sense_id: string | null;
  ipa: string;
  accent: string;
  pronunciation_variant: string | null;
  review_status: string;
}
/** Entry-wide IPA remains labelled entry-wide; never presented as proven sense-specific. */
export async function englishPronunciationPage(
  db: ContentDb,
  wordId: string,
  after: string | null = null,
  size = 20,
) {
  limit(size);
  if (
    !wordId.startsWith("en:") ||
    wordId.length > 300 ||
    (after !== null && typeof after !== "string")
  )
    throw new Error("INVALID_DICTIONARY_ENTRY");
  const rows = await db.getAllAsync<DictionaryPronunciation>(
    `SELECT * FROM english_pronunciations WHERE word_id=? ${after === null ? "" : "AND pronunciation_id>?"} ORDER BY pronunciation_id LIMIT ?`,
    wordId,
    ...(after === null ? [] : [after]),
    size + 1,
  );
  const pronunciations = rows.slice(0, size);
  return {
    pronunciations,
    next:
      rows.length > size
        ? pronunciations[pronunciations.length - 1]!.pronunciation_id
        : null,
  };
}
export interface DictionarySelection {
  cardId: string;
  deckId: string;
  senseId: string;
  pronunciationId?: string;
}
/** Resolve only explicit IDs from immutable source; reject unapproved or mismatched data. No writes. */
export async function resolveEnglishDictionarySelection(
  db: ContentDb,
  input: DictionarySelection,
): Promise<EnglishCardInput> {
  if (
    !input.cardId.startsWith("en:") ||
    !input.deckId.startsWith("en:") ||
    !input.senseId
  )
    throw new Error("INVALID_DICTIONARY_SELECTION");
  const row = await db.getFirstAsync<
    DictionarySenseDetail & { distribution_status: string }
  >(
    `SELECT s.*,w.headword,src.distribution_status FROM english_senses s
     JOIN english_words w ON w.word_id=s.word_id JOIN english_sources src ON src.source_id=s.source_id
     WHERE s.sense_id=? AND w.source_id=s.source_id`,
    input.senseId,
  );
  if (!row) throw new Error("DICTIONARY_SENSE_NOT_FOUND");
  if (row.distribution_status !== "APPROVED")
    throw new Error("LICENSE_REVIEW_REQUIRED");
  let ipa = "";
  if (input.pronunciationId !== undefined) {
    const selected = await db.getFirstAsync<
      DictionaryPronunciation & { distribution_status: string }
    >(
      `SELECT p.*,src.distribution_status FROM english_pronunciations p
       JOIN english_sources src ON src.source_id=p.source_id WHERE p.pronunciation_id=?`,
      input.pronunciationId,
    );
    if (
      !selected ||
      selected.word_id !== row.word_id ||
      (selected.sense_id !== null && selected.sense_id !== row.sense_id)
    )
      throw new Error("DICTIONARY_PRONUNCIATION_MISMATCH");
    if (selected.distribution_status !== "APPROVED")
      throw new Error("LICENSE_REVIEW_REQUIRED");
    // Until sense-specific playback/provenance is represented in learner cards, do not
    // flatten an entry-wide or unreviewed pronunciation into an asserted sense IPA.
    if (
      selected.sense_id !== row.sense_id ||
      selected.review_status !== "reviewed"
    )
      throw new Error("DICTIONARY_PRONUNCIATION_UNVERIFIED");
    ipa = selected.ipa;
  }
  return {
    id: input.cardId,
    deck_id: input.deckId,
    headword: row.headword,
    meaning_vi: row.meaning_vi,
    pos: row.part_of_speech,
    ipa,
    sense_id: row.sense_id,
    source_id: row.source_id,
  };
}
