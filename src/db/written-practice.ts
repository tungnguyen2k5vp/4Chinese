import type { SQLiteDatabase } from "expo-sqlite";

import {
  validateWrittenBackupRecord,
  validateWrittenExercise,
  type WrittenExercise,
} from "@/services/exam/written-practice";

export type WrittenAttempt = {
  id: string;
  exercise_id: string;
  snapshot_json: string;
  answer: string;
  status: "DRAFT" | "REVIEWED";
  revision: number;
  updated_at: string;
};
export async function loadWrittenAttempt(
  db: SQLiteDatabase,
  id: string,
): Promise<WrittenAttempt> {
  const row = await db.getFirstAsync<WrittenAttempt>(
    "SELECT * FROM written_practice WHERE id=?",
    id,
  );
  if (!row) throw new Error("WRITTEN_NOT_FOUND");
  validateWrittenBackupRecord(row);
  return row;
}
export async function listWrittenAttempts(
  db: SQLiteDatabase,
): Promise<WrittenAttempt[]> {
  return db.getAllAsync<WrittenAttempt>(
    "SELECT * FROM written_practice ORDER BY updated_at DESC LIMIT 30",
  );
}
export async function openWrittenDraft(
  db: SQLiteDatabase,
  exercise: WrittenExercise,
): Promise<WrittenAttempt> {
  validateWrittenExercise(exercise);
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM written_practice WHERE exercise_id=? AND status='DRAFT' ORDER BY updated_at DESC LIMIT 1",
    exercise.id,
  );
  if (existing) return loadWrittenAttempt(db, existing.id);
  const id = `written-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await db.runAsync(
    "INSERT INTO written_practice(id,exercise_id,snapshot_json,status,updated_at) VALUES(?,?,?,'DRAFT',?)",
    id,
    exercise.id,
    JSON.stringify(exercise),
    new Date().toISOString(),
  );
  return loadWrittenAttempt(db, id);
}
export async function saveWrittenAttempt(
  db: SQLiteDatabase,
  attempt: WrittenAttempt,
  answer: string,
  review = false,
): Promise<WrittenAttempt> {
  if (
    typeof answer !== "string" ||
    answer.length > 12000 ||
    (review && !answer.trim())
  )
    throw new Error("INVALID_WRITTEN_ANSWER");
  const status = review ? "REVIEWED" : "DRAFT";
  const result = await db.runAsync(
    "UPDATE written_practice SET answer=?,status=?,revision=revision+1,updated_at=? WHERE id=? AND status='DRAFT' AND revision=?",
    answer,
    status,
    new Date().toISOString(),
    attempt.id,
    attempt.revision,
  );
  if (result.changes !== 1) throw new Error("WRITTEN_STALE_WRITE");
  return loadWrittenAttempt(db, attempt.id);
}
