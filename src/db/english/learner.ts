import type { SQLiteDatabase } from "expo-sqlite";

import {
  assertSessionLanguage,
  type LearningSessionContext,
} from "@/services/languages/config";
import {
  applyReview,
  initialLearningSchedule,
  knownWordSchedule,
  type ReviewInput,
  type SrsProgress,
} from "@/services/srs/scheduler";

export const ENGLISH_LEARNER_DATABASE = "english-learner.db";
export const ENGLISH_LEARNER_VERSION = 1;
const sql = `
CREATE TABLE IF NOT EXISTS en_decks(id TEXT PRIMARY KEY CHECK(id LIKE 'en:%'), name TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0,1)));
CREATE TABLE IF NOT EXISTS en_cards(
 id TEXT PRIMARY KEY CHECK(id LIKE 'en:%'), deck_id TEXT NOT NULL REFERENCES en_decks(id),
 headword TEXT NOT NULL, meaning_vi TEXT NOT NULL, pos TEXT NOT NULL, ipa TEXT NOT NULL,
 sense_id TEXT, source_id TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','LEARNING')),
 suspended INTEGER NOT NULL DEFAULT 0 CHECK(suspended IN (0,1)),
 progress_json TEXT NOT NULL, next_review_at TEXT, revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0));
CREATE INDEX IF NOT EXISTS en_cards_due ON en_cards(status,suspended,next_review_at);
CREATE INDEX IF NOT EXISTS en_cards_deck ON en_cards(deck_id,id);
CREATE INDEX IF NOT EXISTS en_cards_deck_word ON en_cards(deck_id,headword COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS en_reviews(
 operation_id TEXT PRIMARY KEY, card_id TEXT NOT NULL REFERENCES en_cards(id),
 session_id TEXT NOT NULL, reviewed_at TEXT NOT NULL, correct INTEGER NOT NULL CHECK(correct IN (0,1)),
 response_ms INTEGER NOT NULL CHECK(response_ms>=0), mode TEXT NOT NULL CHECK(mode IN ('MEANING','SPELLING','LISTENING')),
 result_json TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS en_reviews_date ON en_reviews(reviewed_at);
CREATE TABLE IF NOT EXISTS en_drafts(id TEXT PRIMARY KEY, payload_json TEXT NOT NULL);
`;
const pending = new WeakMap<SQLiteDatabase, Promise<unknown>>();
/** Every write through this repository is serialized on its dedicated handle. */
export async function englishLearnerTransaction<T>(
  db: SQLiteDatabase,
  task: () => Promise<T>,
): Promise<T> {
  const previous = pending.get(db) ?? Promise.resolve();
  const result = previous
    .catch(() => undefined)
    .then(async () => {
      let value!: T;
      await db.withTransactionAsync(async () => {
        value = await task();
      });
      return value;
    });
  pending.set(db, result);
  return result;
}
const transaction = englishLearnerTransaction;
export async function initializeEnglishLearner(
  db: SQLiteDatabase,
): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  if ((row?.user_version ?? 0) > ENGLISH_LEARNER_VERSION)
    throw new Error("ENGLISH_LEARNER_DOWNGRADE_REFUSED");
  // Refuse an accidentally supplied Chinese/content handle before any mutation.
  const foreign = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('vocabulary','english_words','learning_preferences') LIMIT 1",
  );
  if (foreign) throw new Error("WRONG_ENGLISH_LEARNER_DATABASE");
  await db.execAsync("PRAGMA foreign_keys=ON");
  await transaction(db, async () => {
    await db.execAsync(sql);
    await db.execAsync("PRAGMA user_version=1");
  });
}
export interface EnglishCard {
  id: string;
  deck_id: string;
  headword: string;
  meaning_vi: string;
  pos: string;
  ipa: string;
  sense_id: string | null;
  source_id: string;
  notes: string;
  status: "NEW" | "LEARNING";
  suspended: number;
  progress_json: string;
  next_review_at: string | null;
  revision: number;
}
const zero: SrsProgress = {
  memoryLevel: 0,
  deepMemoryStage: 0,
  reviewCount: 0,
  correctCount: 0,
  wrongCount: 0,
  lapseCount: 0,
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
  hintUsedCount: 0,
  averageResponseTimeMs: 0,
  lastResponseTimeMs: 0,
  isKnown: false,
};
function required(value: string, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("INVALID_ENGLISH_FIELD");
  return value.trim();
}
function id(value: string): string {
  if (!required(value, 200).startsWith("en:"))
    throw new Error("ENGLISH_ID_REQUIRED");
  return value;
}
export async function createEnglishDeck(
  db: SQLiteDatabase,
  deckId: string,
  name: string,
): Promise<void> {
  id(deckId);
  required(name, 200);
  await transaction(db, async () => {
    await db.runAsync(
      "INSERT INTO en_decks(id,name) VALUES(?,?)",
      deckId,
      name.trim(),
    );
  });
}
export async function listEnglishDecks(db: SQLiteDatabase) {
  return db.getAllAsync<{ id: string; name: string }>(
    "SELECT id,name FROM en_decks WHERE deleted=0 ORDER BY name,id",
  );
}

export interface EnglishDeckShareWord {
  headword: string;
  meaning_vi: string;
  pos: string;
  ipa: string;
}

/** Deliberately omits private notes, provenance, and all personal SRS history. */
export async function englishDeckShareSnapshot(
  db: SQLiteDatabase,
  deckId: string,
): Promise<{ name: string; words: EnglishDeckShareWord[] }> {
  id(deckId);
  const deck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM en_decks WHERE id=? AND deleted=0",
    deckId,
  );
  if (!deck) throw new Error("ENGLISH_DECK_UNAVAILABLE");
  const rows = await db.getAllAsync<EnglishDeckShareWord>(
    "SELECT headword,meaning_vi,pos,ipa FROM en_cards WHERE deck_id=? ORDER BY id LIMIT 501",
    deckId,
  );
  if (rows.length > 500) throw new Error("ENGLISH_SHARE_LIMIT");
  if (!rows.length) throw new Error("ENGLISH_SHARE_EMPTY");
  return { name: deck.name, words: rows };
}

/** Imports a friend copy atomically; every imported card starts with fresh SRS. */
export async function importEnglishSharedDeck(
  db: SQLiteDatabase,
  deckId: string,
  name: string,
  cards: EnglishCardInput[],
): Promise<number> {
  id(deckId);
  required(name, 80);
  if (!cards.length || cards.length > 500) throw new Error("ENGLISH_BATCH_LIMIT");
  const seen = new Set<string>();
  for (const card of cards) {
    id(card.id);
    if (card.deck_id !== deckId || seen.has(card.id))
      throw new Error("INVALID_ENGLISH_SHARED_DECK");
    seen.add(card.id);
    required(card.headword, 300);
    required(card.meaning_vi, 2_000);
    if (
      typeof card.pos !== "string" || card.pos.length > 200 ||
      typeof card.ipa !== "string" || card.ipa.length > 300
    ) throw new Error("INVALID_ENGLISH_SHARED_DECK");
    if (card.notes?.length) throw new Error("ENGLISH_SHARED_NOTES_NOT_ALLOWED");
  }
  await transaction(db, async () => {
    await db.runAsync("INSERT INTO en_decks(id,name) VALUES(?,?)", deckId, name.trim());
    for (const card of cards) {
      await db.runAsync(
        `INSERT INTO en_cards(id,deck_id,headword,meaning_vi,pos,ipa,sense_id,source_id,progress_json,notes)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
        card.id,
        deckId,
        card.headword.trim(),
        card.meaning_vi.trim(),
        card.pos.trim(),
        card.ipa.trim(),
        null,
        "SHARED",
        JSON.stringify(zero),
        "",
      );
    }
  });
  return cards.length;
}

export type EnglishCardInput = Pick<
  EnglishCard,
  | "id"
  | "deck_id"
  | "headword"
  | "meaning_vi"
  | "pos"
  | "ipa"
  | "sense_id"
  | "source_id"
> & { notes?: string };
/** Dictionary cards require an explicitly selected sense; custom meanings belong to the user. */
export async function addEnglishCards(
  db: SQLiteDatabase,
  cards: EnglishCardInput[],
  clearCustomDraft: boolean | "bulk-cards" = false,
): Promise<void> {
  if (!cards.length || cards.length > 100)
    throw new Error("ENGLISH_BATCH_LIMIT");
  if (
    clearCustomDraft === true &&
    (cards.length !== 1 || cards[0]?.source_id !== "USER")
  )
    throw new Error("INVALID_CUSTOM_DRAFT_SAVE");
  if (
    clearCustomDraft === "bulk-cards" &&
    cards.some((card) => card.source_id !== "USER")
  )
    throw new Error("INVALID_CUSTOM_DRAFT_SAVE");
  for (const card of cards) {
    id(card.id);
    id(card.deck_id);
    required(card.headword, 300);
    required(card.meaning_vi);
    required(card.source_id, 200);
    if (card.source_id !== "USER" && !card.sense_id)
      throw new Error("ENGLISH_SENSE_SELECTION_REQUIRED");
  }
  await transaction(db, async () => {
    for (const card of cards) {
      const deck = await db.getFirstAsync(
        "SELECT id FROM en_decks WHERE id=? AND deleted=0",
        card.deck_id,
      );
      if (!deck) throw new Error("ENGLISH_DECK_UNAVAILABLE");
      await db.runAsync(
        `INSERT INTO en_cards(id,deck_id,headword,meaning_vi,pos,ipa,sense_id,source_id,progress_json,notes)
        VALUES(?,?,?,?,?,?,?,?,?,?)`,
        card.id,
        card.deck_id,
        card.headword.trim(),
        card.meaning_vi.trim(),
        card.pos,
        card.ipa,
        card.sense_id,
        card.source_id,
        JSON.stringify(zero),
        card.notes ?? "",
      );
    }
    if (clearCustomDraft)
      await db.runAsync(
        "DELETE FROM en_drafts WHERE id=?",
        clearCustomDraft === "bulk-cards" ? "bulk-cards" : "custom-card",
      );
  });
}
/** Save one detail-page selection atomically without consuming a pending bulk draft. */
export async function addEnglishDictionaryCard(
  db: SQLiteDatabase,
  card: EnglishCardInput,
): Promise<void> {
  id(card.id);
  id(card.deck_id);
  required(card.headword, 300);
  required(card.meaning_vi);
  required(card.source_id, 200);
  if (card.source_id !== "USER" && !card.sense_id)
    throw new Error("ENGLISH_SENSE_SELECTION_REQUIRED");
  await transaction(db, async () => {
    if (!(await db.getFirstAsync("SELECT id FROM en_decks WHERE id=? AND deleted=0", card.deck_id)))
      throw new Error("ENGLISH_DECK_UNAVAILABLE");
    const existing = await db.getAllAsync<{ meaning_vi: string }>(
      "SELECT meaning_vi FROM en_cards WHERE deck_id=? AND headword=? COLLATE NOCASE",
      card.deck_id,
      card.headword.trim(),
    );
    if (existing.some((row) => row.meaning_vi.normalize("NFC").trim().toLocaleLowerCase("vi") === card.meaning_vi.normalize("NFC").trim().toLocaleLowerCase("vi")))
      throw new Error("Từ với nghĩa này đã có trong bộ từ. Không có thẻ nào bị thay đổi.");
    await db.runAsync(
      `INSERT INTO en_cards(id,deck_id,headword,meaning_vi,pos,ipa,sense_id,source_id,progress_json,notes)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
      card.id,
      card.deck_id,
      card.headword.trim(),
      card.meaning_vi.trim(),
      card.pos,
      card.ipa,
      card.sense_id,
      card.source_id,
      JSON.stringify(zero),
      card.notes ?? "",
    );
  });
}
export async function nextEnglishNewCard(
  db: SQLiteDatabase,
  deckId: string,
): Promise<EnglishCard | null> {
  id(deckId);
  return (await db.getFirstAsync<EnglishCard>(
    "SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id WHERE c.deck_id=? AND d.deleted=0 AND c.status='NEW' AND c.suspended=0 ORDER BY c.id LIMIT 1",
    deckId,
  )) ?? null;
}
/** A confirmed preview creates its optional new deck and all cards in one transaction. */
export async function saveEnglishRecognizedBatch(
  db: SQLiteDatabase,
  cards: EnglishCardInput[],
  newDeckName?: string,
  remainingBulkDraftJson?: string,
): Promise<void> {
  if (!cards.length || cards.length > 100)
    throw new Error("ENGLISH_BATCH_LIMIT");
  const deck = id(cards[0]!.deck_id);
  if (newDeckName !== undefined) required(newDeckName, 200);
  if (remainingBulkDraftJson !== undefined) {
    if (remainingBulkDraftJson.length > 2_000_000)
      throw new Error("INVALID_ENGLISH_BULK_DRAFT");
    try {
      JSON.parse(remainingBulkDraftJson);
    } catch {
      throw new Error("INVALID_ENGLISH_BULK_DRAFT");
    }
  }
  const seen = new Set<string>();
  for (const card of cards) {
    id(card.id);
    id(card.deck_id);
    required(card.headword, 300);
    required(card.meaning_vi);
    required(card.source_id, 200);
    if (card.deck_id !== deck || (card.source_id !== "USER" && !card.sense_id))
      throw new Error("INVALID_ENGLISH_BATCH");
    if (
      (card.notes?.length ?? 0) > 10000 ||
      card.pos.length > 200 ||
      card.ipa.length > 300
    )
      throw new Error("INVALID_ENGLISH_FIELD");
    const key = JSON.stringify([
      card.headword.trim().normalize("NFC").toLowerCase(),
      card.meaning_vi.trim().normalize("NFC").toLocaleLowerCase("vi"),
    ]);
    if (seen.has(key))
      throw new Error("Danh sách có từ và nghĩa bị trùng. Hãy bỏ mục lặp.");
    seen.add(key);
  }
  await transaction(db, async () => {
    if (newDeckName !== undefined)
      await db.runAsync(
        "INSERT INTO en_decks(id,name) VALUES(?,?)",
        deck,
        newDeckName.trim(),
      );
    if (
      !(await db.getFirstAsync(
        "SELECT id FROM en_decks WHERE id=? AND deleted=0",
        deck,
      ))
    )
      throw new Error("ENGLISH_DECK_UNAVAILABLE");
    for (const card of cards) {
      const existing = await db.getAllAsync<{ meaning_vi: string }>(
        "SELECT meaning_vi FROM en_cards WHERE deck_id=? AND headword=? COLLATE NOCASE",
        deck,
        card.headword.trim(),
      );
      if (
        existing.some(
          (row) =>
            row.meaning_vi.normalize("NFC").trim().toLocaleLowerCase("vi") ===
            card.meaning_vi.normalize("NFC").trim().toLocaleLowerCase("vi"),
        )
      )
        throw new Error(
          `“${card.headword}” với nghĩa này đã có trong bộ. Hãy bỏ mục trùng.`,
        );
      await db.runAsync(
        `INSERT INTO en_cards(id,deck_id,headword,meaning_vi,pos,ipa,sense_id,source_id,progress_json,notes)
        VALUES(?,?,?,?,?,?,?,?,?,?)`,
        card.id,
        deck,
        card.headword.trim(),
        card.meaning_vi.trim(),
        card.pos,
        card.ipa,
        card.sense_id,
        card.source_id,
        JSON.stringify(zero),
        card.notes ?? "",
      );
    }
    if (remainingBulkDraftJson === undefined) {
      await db.runAsync("DELETE FROM en_drafts WHERE id=?", "bulk-cards");
    } else {
      await db.runAsync(
        "INSERT INTO en_drafts(id,payload_json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json",
        "bulk-cards",
        remainingBulkDraftJson,
      );
    }
  });
}
export async function listEnglishCards(
  db: SQLiteDatabase,
  deckId: string,
  limit = 100,
): Promise<EnglishCard[]> {
  id(deckId);
  return db.getAllAsync<EnglishCard>(
    "SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id WHERE c.deck_id=? AND d.deleted=0 ORDER BY c.id LIMIT ?",
    deckId,
    Math.max(1, Math.min(100, Math.trunc(limit))),
  );
}
export async function startEnglishCard(
  db: SQLiteDatabase,
  cardId: string,
  now = new Date(),
): Promise<void> {
  id(cardId);
  const schedule = initialLearningSchedule(now);
  await transaction(db, async () => {
    const card = await db.getFirstAsync<EnglishCard>(
      "SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id WHERE c.id=? AND d.deleted=0 AND c.suspended=0",
      cardId,
    );
    if (!card) throw new Error("ENGLISH_CARD_NOT_FOUND");
    if (card.status !== "NEW") return;
    await db.runAsync(
      "UPDATE en_cards SET status='LEARNING',progress_json=?,next_review_at=?,revision=revision+1 WHERE id=?",
      JSON.stringify({
        ...zero,
        memoryLevel: schedule.memoryLevel,
        deepMemoryStage: schedule.deepMemoryStage,
      }),
      schedule.nextReviewAt,
      cardId,
    );
  });
}

/** Marks a word as already known and schedules a long-interval confirmation. */
export async function markEnglishCardKnown(
  db: SQLiteDatabase,
  cardId: string,
  now = new Date(),
): Promise<void> {
  id(cardId);
  const schedule = knownWordSchedule(now);
  await transaction(db, async () => {
    const card = await db.getFirstAsync<EnglishCard>(
      "SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id WHERE c.id=? AND d.deleted=0 AND c.suspended=0",
      cardId,
    );
    if (!card) throw new Error("ENGLISH_CARD_NOT_FOUND");
    if (card.status !== "NEW") return;
    await db.runAsync(
      "UPDATE en_cards SET status='LEARNING',progress_json=?,next_review_at=?,revision=revision+1 WHERE id=?",
      JSON.stringify({ ...zero, isKnown: true }),
      schedule.nextReviewAt,
      cardId,
    );
  });
}
export async function englishDueQueue(
  db: SQLiteDatabase,
  now = new Date(),
  limit = 100,
  deckId?: string,
): Promise<EnglishCard[]> {
  if (deckId) id(deckId);
  return db.getAllAsync<EnglishCard>(
    `SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id
    WHERE c.status='LEARNING' AND c.suspended=0 AND d.deleted=0 AND c.next_review_at<=?
      AND (? IS NULL OR c.deck_id=?)
    ORDER BY c.next_review_at,c.id LIMIT ?`,
    now.toISOString(),
    deckId ?? null,
    deckId ?? null,
    Math.max(1, Math.min(100, Math.trunc(limit))),
  );
}
export type EnglishReviewMode = "MEANING" | "SPELLING" | "LISTENING";
export const ENGLISH_QUICK_SESSION_LIMIT = 5;
export async function englishQuickQueue(
  db: SQLiteDatabase,
  now = new Date(),
  completed = 0,
  deckId?: string,
) {
  if (
    !Number.isSafeInteger(completed) ||
    completed < 0 ||
    completed > ENGLISH_QUICK_SESSION_LIMIT
  )
    throw new Error("INVALID_ENGLISH_QUICK_PROGRESS");
  if (completed === ENGLISH_QUICK_SESSION_LIMIT) return [];
  return englishDueQueue(db, now, ENGLISH_QUICK_SESSION_LIMIT - completed, deckId);
}
export async function reviewEnglishCard(
  db: SQLiteDatabase,
  context: LearningSessionContext,
  operationId: string,
  cardId: string,
  expectedRevision: number,
  input: ReviewInput,
  mode: EnglishReviewMode,
  now = new Date(),
) {
  assertSessionLanguage(context, "en");
  id(cardId);
  required(operationId, 200);
  if (
    !Number.isFinite(input.responseTimeMs) ||
    input.responseTimeMs < 0 ||
    typeof input.correct !== "boolean" ||
    !["MEANING", "SPELLING", "LISTENING"].includes(mode)
  )
    throw new Error("INVALID_ENGLISH_REVIEW");
  return transaction(db, async () => {
    const previous = await db.getFirstAsync<{
      card_id: string;
      session_id: string;
      result_json: string;
    }>(
      "SELECT card_id,session_id,result_json FROM en_reviews WHERE operation_id=?",
      operationId,
    );
    if (previous) {
      if (
        previous.card_id !== cardId ||
        previous.session_id !== context.sessionId
      )
        throw new Error("ENGLISH_OPERATION_COLLISION");
      return JSON.parse(previous.result_json) as ReturnType<typeof applyReview>;
    }
    const card = await db.getFirstAsync<EnglishCard>(
      `SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id
      WHERE c.id=? AND d.deleted=0`,
      cardId,
    );
    if (
      !card ||
      card.status !== "LEARNING" ||
      card.suspended ||
      !card.next_review_at ||
      card.next_review_at > now.toISOString()
    )
      throw new Error("ENGLISH_CARD_NOT_DUE");
    if (card.revision !== expectedRevision)
      throw new Error("ENGLISH_REVIEW_STALE");
    const previousProgress = JSON.parse(card.progress_json) as SrsProgress;
    const next = applyReview(
      previousProgress.isKnown
        ? { ...previousProgress, isKnown: false }
        : previousProgress,
      input,
      now,
    );
    await db.runAsync(
      "UPDATE en_cards SET progress_json=?,next_review_at=?,revision=revision+1 WHERE id=? AND revision=?",
      JSON.stringify(next),
      next.nextReviewAt,
      cardId,
      expectedRevision,
    );
    await db.runAsync(
      "INSERT INTO en_reviews VALUES(?,?,?,?,?,?,?,?)",
      operationId,
      cardId,
      context.sessionId,
      now.toISOString(),
      next.correctCount > JSON.parse(card.progress_json).correctCount ? 1 : 0,
      Math.round(input.responseTimeMs),
      mode,
      JSON.stringify(next),
    );
    return next;
  });
}
/** Stats derived from committed logs: retries cannot mint duplicate XP or study time. */
export async function englishStatistics(db: SQLiteDatabase, now = new Date()) {
  const cards = await db.getFirstAsync<{ total: number; studied: number }>(
    "SELECT COUNT(*) total,COALESCE(SUM(c.status='LEARNING'),0) studied FROM en_cards c JOIN en_decks d ON d.id=c.deck_id WHERE d.deleted=0",
  );
  const reviews = await db.getFirstAsync<{
    reviewed: number;
    correct: number;
    studyMs: number;
  }>(
    "SELECT COUNT(*) reviewed,COALESCE(SUM(correct),0) correct,COALESCE(SUM(response_ms),0) studyMs FROM en_reviews",
  );
  const due = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) count FROM en_cards c JOIN en_decks d ON d.id=c.deck_id WHERE c.status='LEARNING' AND c.suspended=0 AND d.deleted=0 AND c.next_review_at<=?",
    now.toISOString(),
  );
  return {
    total: cards?.total ?? 0,
    studied: cards?.studied ?? 0,
    due: due?.count ?? 0,
    reviewed: reviews?.reviewed ?? 0,
    correct: reviews?.correct ?? 0,
    studyMs: reviews?.studyMs ?? 0,
    xp: (reviews?.correct ?? 0) * 10,
  };
}
export async function saveEnglishDraft(
  db: SQLiteDatabase,
  value: { headword: string; meaning: string },
): Promise<void> {
  await transaction(db, async () => {
    await db.runAsync(
      "INSERT INTO en_drafts VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json",
      "custom-card",
      JSON.stringify(value),
    );
  });
}
export async function readEnglishDraft(
  db: SQLiteDatabase,
): Promise<{ headword: string; meaning: string }> {
  const row = await db.getFirstAsync<{ payload_json: string }>(
    "SELECT payload_json FROM en_drafts WHERE id=?",
    "custom-card",
  );
  if (!row) return { headword: "", meaning: "" };
  const value = JSON.parse(row.payload_json);
  if (typeof value.headword !== "string" || typeof value.meaning !== "string")
    throw new Error("INVALID_ENGLISH_DRAFT");
  return value;
}
