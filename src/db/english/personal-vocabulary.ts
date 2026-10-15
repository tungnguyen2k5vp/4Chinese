import type { SQLiteDatabase } from "expo-sqlite";

import type { EnglishCard } from "./learner";

export function englishMemoryLevel(
  card: Pick<EnglishCard, "status" | "progress_json">,
): number {
  if (card.status === "NEW") return 0;
  const progress = JSON.parse(card.progress_json);
  if (progress.isKnown === true) return 0;
  return Math.max(1, Math.min(6, Math.trunc(progress.memoryLevel)));
}
export interface EnglishMemorySummary {
  total: number;
  studied: number;
  knownCount: number;
  newCount: number;
  due: number;
  suspended: number;
  levels: number[];
}
export interface EnglishDeckMemorySummary extends EnglishMemorySummary {
  id: string;
  name: string;
}

async function memorySummary(
  db: SQLiteDatabase,
  now: Date,
  deckId?: string,
): Promise<EnglishMemorySummary> {
  const rows = await db.getAllAsync<{
    level: number;
    suspended: number;
    n: number;
    due: number;
  }>(
    `SELECT CASE WHEN c.status='NEW' THEN 0 WHEN json_extract(c.progress_json,'$.isKnown')=1 THEN -1
       ELSE MIN(6,MAX(1,CAST(json_extract(c.progress_json,'$.memoryLevel') AS INTEGER))) END level,
     c.suspended,COUNT(*) n,SUM(CASE WHEN c.status='LEARNING' AND c.suspended=0 AND c.next_review_at<=? THEN 1 ELSE 0 END) due
     FROM en_cards c JOIN en_decks d ON d.id=c.deck_id
     WHERE d.deleted=0 AND (? IS NULL OR d.id=?) GROUP BY level,c.suspended`,
    now.toISOString(),
    deckId ?? null,
    deckId ?? null,
  );
  const summary: EnglishMemorySummary = {
    total: 0,
    studied: 0,
    knownCount: 0,
    newCount: 0,
    due: 0,
    suspended: 0,
    levels: [0, 0, 0, 0, 0, 0],
  };
  for (const row of rows) {
    summary.total += row.n;
    if (row.suspended) {
      summary.suspended += row.n;
      continue;
    }
    summary.due += row.due;
    if (row.level === 0) summary.newCount += row.n;
    else {
      summary.studied += row.n;
      if (row.level === -1) summary.knownCount += row.n;
      else summary.levels[row.level - 1] = (summary.levels[row.level - 1] ?? 0) + row.n;
    }
  }
  return summary;
}

export async function englishMemorySummary(
  db: SQLiteDatabase,
  now = new Date(),
): Promise<EnglishMemorySummary> {
  return memorySummary(db, now);
}

export async function englishDeckMemorySummary(
  db: SQLiteDatabase,
  deckId: string,
  now = new Date(),
): Promise<EnglishDeckMemorySummary> {
  if (!deckId.startsWith("en:") || deckId.length > 200)
    throw new Error("ENGLISH_ID_REQUIRED");
  const deck = await db.getFirstAsync<{ id: string; name: string }>(
    "SELECT id,name FROM en_decks WHERE id=? AND deleted=0",
    deckId,
  );
  if (!deck) throw new Error("ENGLISH_DECK_UNAVAILABLE");
  return { id: deck.id, name: deck.name, ...(await memorySummary(db, now, deckId)) };
}
export async function listEnglishDeckSummaries(
  db: SQLiteDatabase,
  now = new Date(),
) {
  return db.getAllAsync<{
    id: string;
    name: string;
    wordCount: number;
    dueCount: number;
  }>(
    `SELECT d.id,d.name,COUNT(c.id) wordCount,
     COALESCE(SUM(CASE WHEN c.status='LEARNING' AND c.suspended=0 AND c.next_review_at<=? THEN 1 ELSE 0 END),0) dueCount
     FROM en_decks d LEFT JOIN en_cards c ON c.deck_id=d.id WHERE d.deleted=0 GROUP BY d.id ORDER BY d.name,d.id`,
    now.toISOString(),
  );
}
