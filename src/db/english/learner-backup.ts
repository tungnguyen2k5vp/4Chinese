import type { SQLiteDatabase } from "expo-sqlite";

import {
  type EnglishCard,
  englishLearnerTransaction,
  initializeEnglishLearner,
} from "./learner";

import type { SrsProgress } from "@/services/srs/scheduler";

export interface EnglishLearnerBackup {
  format: "4CHINESE_ENGLISH_LEARNER";
  version: 1;
  decks: { id: string; name: string; deleted: number }[];
  cards: EnglishCard[];
  reviews: {
    operation_id: string;
    card_id: string;
    session_id: string;
    reviewed_at: string;
    correct: number;
    response_ms: number;
    mode: string;
    result_json: string;
  }[];
}
function fail(): never {
  throw new Error("INVALID_ENGLISH_BACKUP");
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
  return value as Record<string, unknown>;
}
function text(value: unknown, nonempty = false): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length > 10000 ||
    (nonempty && !value.trim())
  )
    fail();
}
function integer(
  value: unknown,
  max = Number.MAX_SAFE_INTEGER,
): asserts value is number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < 0 ||
    (value as number) > max
  )
    fail();
}
function date(value: unknown): void {
  text(value);
  if (new Date(value).toISOString() !== value) fail();
}
function progress(value: unknown): void {
  text(value);
  const parsed = record(JSON.parse(value));
  const fields: (keyof SrsProgress)[] = [
    "memoryLevel",
    "deepMemoryStage",
    "reviewCount",
    "correctCount",
    "wrongCount",
    "lapseCount",
    "consecutiveCorrect",
    "consecutiveWrong",
    "hintUsedCount",
    "averageResponseTimeMs",
    "lastResponseTimeMs",
  ];
  fields.forEach((key) => integer(parsed[key]));
  integer(parsed.memoryLevel, 6);
  integer(parsed.deepMemoryStage, 4);
  if (
    typeof parsed.isKnown !== "boolean" ||
    (parsed.correctCount as number) + (parsed.wrongCount as number) !==
      parsed.reviewCount
  )
    fail();
}
function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > 100000) fail();
  return value.map(record);
}
function unique(
  values: Record<string, unknown>[],
  key: string,
  prefix = false,
): Set<string> {
  const ids = new Set<string>();
  for (const row of values) {
    text(row[key], true);
    if (prefix && !row[key].startsWith("en:")) fail();
    if (ids.has(row[key])) fail();
    ids.add(row[key]);
  }
  return ids;
}
export function validateEnglishLearnerBackup(
  value: unknown,
): EnglishLearnerBackup {
  const root = record(value);
  if (root.format !== "4CHINESE_ENGLISH_LEARNER" || root.version !== 1) fail();
  const decks = rows(root.decks);
  const cards = rows(root.cards);
  const reviews = rows(root.reviews);
  const deckIds = unique(decks, "id", true);
  const cardIds = unique(cards, "id", true);
  unique(reviews, "operation_id");
  for (const deck of decks) {
    text(deck.name, true);
    integer(deck.deleted, 1);
  }
  for (const card of cards) {
    if (!deckIds.has(String(card.deck_id))) fail();
    for (const field of ["headword", "meaning_vi", "source_id"])
      text(card[field], true);
    for (const field of ["pos", "ipa", "notes"]) text(card[field]);
    if (card.sense_id !== null) text(card.sense_id, true);
    if (card.source_id !== "USER" && !card.sense_id) fail();
    if (!["NEW", "LEARNING"].includes(String(card.status))) fail();
    integer(card.suspended, 1);
    integer(card.revision);
    progress(card.progress_json);
    if (card.status === "LEARNING") date(card.next_review_at);
    else if (card.next_review_at !== null) fail();
  }
  for (const review of reviews) {
    if (!cardIds.has(String(review.card_id))) fail();
    text(review.session_id, true);
    date(review.reviewed_at);
    integer(review.correct, 1);
    integer(review.response_ms);
    progress(review.result_json);
    if (!["MEANING", "SPELLING", "LISTENING"].includes(String(review.mode)))
      fail();
  }
  return value as EnglishLearnerBackup;
}
export async function exportEnglishLearnerBackup(
  db: SQLiteDatabase,
): Promise<EnglishLearnerBackup> {
  let result!: EnglishLearnerBackup;
  await englishLearnerTransaction(db, async () => {
    result = {
      format: "4CHINESE_ENGLISH_LEARNER",
      version: 1,
      decks: await db.getAllAsync(
        "SELECT * FROM en_decks ORDER BY id LIMIT 100001",
      ),
      cards: await db.getAllAsync(
        "SELECT * FROM en_cards ORDER BY id LIMIT 100001",
      ),
      reviews: await db.getAllAsync(
        "SELECT * FROM en_reviews ORDER BY operation_id LIMIT 100001",
      ),
    };
  });
  return validateEnglishLearnerBackup(result);
}
/** Explicit English-only replacement. Never touches Chinese or dictionary tables. */
export async function replaceEnglishLearnerBackup(
  db: SQLiteDatabase,
  value: unknown,
  confirmedScope: "REPLACE_ENGLISH_ONLY",
): Promise<void> {
  if (confirmedScope !== "REPLACE_ENGLISH_ONLY")
    throw new Error("ENGLISH_RESTORE_CONFIRMATION_REQUIRED");
  const backup = validateEnglishLearnerBackup(
    JSON.parse(JSON.stringify(value)),
  );
  await initializeEnglishLearner(db);
  await englishLearnerTransaction(db, async () => {
    await db.execAsync(
      "DELETE FROM en_reviews; DELETE FROM en_cards; DELETE FROM en_decks;",
    );
    for (const row of backup.decks)
      await db.runAsync(
        "INSERT INTO en_decks VALUES(?,?,?)",
        row.id,
        row.name,
        row.deleted,
      );
    for (const row of backup.cards)
      await db.runAsync(
        "INSERT INTO en_cards VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        row.id,
        row.deck_id,
        row.headword,
        row.meaning_vi,
        row.pos,
        row.ipa,
        row.sense_id,
        row.source_id,
        row.notes,
        row.status,
        row.suspended,
        row.progress_json,
        row.next_review_at,
        row.revision,
      );
    for (const row of backup.reviews)
      await db.runAsync(
        "INSERT INTO en_reviews VALUES(?,?,?,?,?,?,?,?)",
        row.operation_id,
        row.card_id,
        row.session_id,
        row.reviewed_at,
        row.correct,
        row.response_ms,
        row.mode,
        row.result_json,
      );
  });
}
