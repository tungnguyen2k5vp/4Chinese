import type { SQLiteDatabase } from "expo-sqlite";

import { decodeSharedWordProgress, type SharedWordProgress } from "@/services/decks/share-code";

// Fixed allowlist: no shared field is ever used as an SQL identifier.
const columns: Record<keyof SharedWordProgress, string> = {
  status: "status", studied: "studied", due: "due", state: "state", stability: "stability",
  difficulty: "difficulty", elapsedDays: "elapsed_days", scheduledDays: "scheduled_days",
  learningSteps: "learning_steps", reps: "reps", lapses: "lapses", lastReview: "last_review",
  masteryLevel: "mastery_level", isKnown: "is_known", isSuspended: "is_suspended",
  memoryLevel: "memory_level", deepMemoryStage: "deep_memory_stage", learnedAt: "learned_at",
  nextReviewAt: "next_review_at", reviewCount: "review_count", correctCount: "correct_count",
  wrongCount: "wrong_count", lapseCount: "lapse_count", consecutiveCorrect: "consecutive_correct",
  consecutiveWrong: "consecutive_wrong", hintUsedCount: "hint_used_count",
  averageResponseTimeMs: "average_response_time_ms", lastResponseTimeMs: "last_response_time_ms",
};
const entries = Object.entries(columns) as [keyof SharedWordProgress, string][];
const resetFields = `state=0,status='NEW',studied=0,due=?,stability=0,difficulty=0,elapsed_days=0,
  scheduled_days=0,learning_steps=0,reps=0,lapses=0,last_review=NULL,mastery_level=0,
  is_known=0,is_suspended=0,memory_level=0,deep_memory_stage=0,learned_at=NULL,next_review_at=?,
  review_count=0,correct_count=0,wrong_count=0,lapse_count=0,consecutive_correct=0,
  consecutive_wrong=0,hint_used_count=0,average_response_time_ms=0,last_response_time_ms=0,updated_at=?`;

export async function getDeckShareProgress(db: SQLiteDatabase, deckId: string) {
  const rows = await db.getAllAsync<SharedWordProgress & { vocabularyId: string }>(
    `SELECT m.vocabulary_id AS vocabularyId,${entries.map(([field, column]) => `p.${column} AS ${field}`).join(",")}
     FROM personal_deck_vocabulary m JOIN personal_deck d ON d.id=m.deck_id AND d.deleted_at IS NULL
     LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=m.vocabulary_id WHERE m.deck_id=?`, deckId,
  );
  const result = new Map<string, SharedWordProgress | null>();
  for (const row of rows) {
    if (!row.status) { result.set(row.vocabularyId, null); continue; }
    const progress = decodeSharedWordProgress({
      ...row, studied: Boolean(row.studied), isKnown: Boolean(row.isKnown), isSuspended: Boolean(row.isSuspended),
    });
    if (!progress) throw new Error("Không đọc được tiến độ hợp lệ. Chưa tạo mã chia sẻ.");
    result.set(row.vocabularyId, progress);
  }
  return result;
}

/** Caller owns the transaction; importing a snapshot never awards XP or fabricates review logs. */
export async function restoreSharedWordProgress(db: SQLiteDatabase, vocabularyId: string, value: SharedWordProgress | null) {
  const now = new Date().toISOString();
  if (value === null) {
    await db.runAsync(`UPDATE user_vocabulary_progress SET ${resetFields} WHERE vocabulary_id=?`, now, now, now, vocabularyId);
    return;
  }
  const progress = decodeSharedWordProgress(value);
  if (!progress) throw new Error("Tiến độ chia sẻ không hợp lệ. Chưa nhập bộ từ.");
  const names = entries.map(([, column]) => column);
  await db.runAsync(
    `INSERT INTO user_vocabulary_progress(vocabulary_id,${names.join(",")},created_at,updated_at)
     VALUES(${Array.from({ length: names.length + 3 }, () => "?").join(",")})
     ON CONFLICT(vocabulary_id) DO UPDATE SET ${names.map((name) => `${name}=excluded.${name}`).join(",")},updated_at=excluded.updated_at`,
    vocabularyId, ...entries.map(([field]) => typeof progress[field] === "boolean" ? Number(progress[field]) : progress[field] as string | number | null), now, now,
  );
}

export async function resetDeckProgress(db: SQLiteDatabase, deckId: string): Promise<number> {
  const id = deckId.trim();
  if (!id || id.length > 200) throw new Error("Bộ từ không hợp lệ.");
  const members = `SELECT m.vocabulary_id FROM personal_deck_vocabulary m
    JOIN personal_deck d ON d.id=m.deck_id AND d.deleted_at IS NULL WHERE m.deck_id=?`;
  let count = 0;
  await db.withTransactionAsync(async () => {
    const deck = await db.getFirstAsync<{ id: string }>("SELECT id FROM personal_deck WHERE id=? AND deleted_at IS NULL", id);
    if (!deck) throw new Error("Bộ từ không còn tồn tại.");
    count = (await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM (${members})`, id))?.count ?? 0;
    const now = new Date().toISOString();
    await db.runAsync(`UPDATE user_vocabulary_progress SET ${resetFields} WHERE vocabulary_id IN (${members})`, now, now, now, id);
    for (const table of ["review_log", "mistake_records", "vocabulary_skill_mastery"]) {
      await db.runAsync(`DELETE FROM ${table} WHERE vocabulary_id IN (${members})`, id);
    }
  });
  return count;
}
