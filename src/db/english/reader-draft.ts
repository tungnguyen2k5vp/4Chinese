import type { SQLiteDatabase } from "expo-sqlite";

import { englishLearnerTransaction, type EnglishCard } from "./learner";

import { englishReadingWindow } from "@/services/reader/english-tokenizer";

export interface EnglishReaderDraft {
  title: string;
  text: string;
  position: number;
  revision: number;
}
const key = "reader-document";
function validate(value: EnglishReaderDraft) {
  if (
    !value ||
    typeof value.title !== "string" ||
    value.title.length > 200 ||
    typeof value.text !== "string" ||
    value.text.length > 100_000 ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0
  )
    throw new Error("INVALID_ENGLISH_READER_DRAFT");
  englishReadingWindow(value.text, value.position);
}
export async function readEnglishReaderDraft(
  db: SQLiteDatabase,
): Promise<EnglishReaderDraft | null> {
  const row = await db.getFirstAsync<{ payload_json: string }>(
    "SELECT payload_json FROM en_drafts WHERE id=?",
    key,
  );
  if (!row) return null;
  const draft = JSON.parse(row.payload_json) as EnglishReaderDraft;
  validate(draft);
  return draft;
}
/** Optimistic draft save: don't silently overwrite another open editor's content or position. */
export async function saveEnglishReaderDraft(
  db: SQLiteDatabase,
  input: EnglishReaderDraft,
) {
  validate(input);
  return englishLearnerTransaction(db, async () => {
    const old = await readEnglishReaderDraft(db);
    if ((old?.revision ?? 0) !== input.revision)
      throw new Error("ENGLISH_READER_STALE");
    const next = { ...input, revision: input.revision + 1 };
    await db.runAsync(
      "INSERT INTO en_drafts(id,payload_json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json",
      key,
      JSON.stringify(next),
    );
    return next;
  });
}
/** Personal cards only, not a dictionary or morphological inference. One explicit tap, <=20 results. */
export async function lookupEnglishPersonalWord(
  db: SQLiteDatabase,
  token: string,
): Promise<EnglishCard[]> {
  if (typeof token !== "string" || !token.trim() || token.length > 300)
    throw new Error("INVALID_ENGLISH_READER_WORD");
  return db.getAllAsync<EnglishCard>(
    `SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id
     WHERE d.deleted=0 AND c.headword=? COLLATE NOCASE ORDER BY c.id LIMIT 20`,
    token,
  );
}
