import type { SQLiteDatabase } from "expo-sqlite";

export interface EnglishMistake {
  id: string;
  headword: string;
  meaning_vi: string;
  deck_name: string;
  wrong_count: number;
  last_wrong_at: string;
  latest_correct: number;
  suspended: number;
  next_review_at: string | null;
}

/** Read-only projection of actual English review events; never manufactures errors. */
export async function englishMistakeBook(db: SQLiteDatabase, limit = 50) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error("INVALID_ENGLISH_ACTIVITY_LIMIT");
  return db.getAllAsync<EnglishMistake>(
    `SELECT c.id,c.headword,c.meaning_vi,d.name deck_name,c.suspended,c.next_review_at,
      COUNT(*) wrong_count,MAX(r.reviewed_at) last_wrong_at,
      (SELECT latest.correct FROM en_reviews latest WHERE latest.card_id=c.id
        ORDER BY latest.reviewed_at DESC,latest.rowid DESC LIMIT 1) latest_correct
    FROM en_reviews r JOIN en_cards c ON c.id=r.card_id JOIN en_decks d ON d.id=c.deck_id
    WHERE r.correct=0 AND d.deleted=0
    GROUP BY c.id ORDER BY last_wrong_at DESC,c.id LIMIT ?`,
    limit,
  );
}

/** Calendar boundaries use the device's local day, not a hard-coded UTC date. */
export function englishDayWindow(now: Date) {
  if (!Number.isFinite(now.getTime())) throw new Error("INVALID_ENGLISH_DATE");
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Recommendations, not an assigned quota or a CEFR/placement estimate. */
export async function englishDailyPlan(db: SQLiteDatabase, now = new Date()) {
  const { start, end } = englishDayWindow(now);
  const counts = await db.getFirstAsync<{ new_cards: number; due: number }>(
    `SELECT COALESCE(SUM(c.status='NEW' AND c.suspended=0),0) new_cards,
      COALESCE(SUM(c.status='LEARNING' AND c.suspended=0 AND c.next_review_at<=?),0) due
      FROM en_cards c JOIN en_decks d ON d.id=c.deck_id WHERE d.deleted=0`,
    now.toISOString(),
  );
  const today = await db.getFirstAsync<{
    reviewed: number;
    correct: number;
    response_ms: number;
  }>(
    `SELECT COUNT(*) reviewed,COALESCE(SUM(correct),0) correct,
      COALESCE(SUM(response_ms),0) response_ms FROM en_reviews WHERE reviewed_at>=? AND reviewed_at<?`,
    start,
    end,
  );
  const mistakes = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT c.id) count FROM en_reviews r
      JOIN en_cards c ON c.id=r.card_id JOIN en_decks d ON d.id=c.deck_id
      WHERE r.correct=0 AND d.deleted=0`,
  );
  return {
    due: counts?.due ?? 0,
    newCards: counts?.new_cards ?? 0,
    suggestedNew: Math.min(5, counts?.new_cards ?? 0),
    reviewedToday: today?.reviewed ?? 0,
    correctToday: today?.correct ?? 0,
    responseMsToday: today?.response_ms ?? 0,
    historicalMistakes: mistakes?.count ?? 0,
  };
}
