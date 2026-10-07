import type { SQLiteDatabase } from "expo-sqlite";

import {
  assertQuestionBankReferencesValid,
  getExamSectionWindow,
  type ExamProfile,
  type ExamQuestion,
} from "@/services/exam/engine";
import {
  getExamRemaining,
  validateExamSnapshot,
  type ExamAttempt,
  type ExamSnapshot,
} from "@/services/exam/session";

type AttemptRow = {
  id: string;
  status: ExamAttempt["status"];
  snapshot_json: string;
  started_at_ms: number;
  submitted_at_ms: number | null;
  revision: number;
};
function fromRow(row: AttemptRow): ExamAttempt {
  const snapshot = JSON.parse(row.snapshot_json) as ExamSnapshot;
  validateExamSnapshot(snapshot);
  return {
    id: row.id,
    status: row.status,
    startedAtMs: row.started_at_ms,
    submittedAtMs: row.submitted_at_ms,
    revision: row.revision,
    snapshot,
  };
}
export async function getExamAttempt(
  db: SQLiteDatabase,
  id: string,
): Promise<ExamAttempt> {
  const row = await db.getFirstAsync<AttemptRow>(
    "SELECT * FROM exam_attempts WHERE id=?",
    id,
  );
  if (!row) throw new Error("EXAM_ATTEMPT_NOT_FOUND");
  return fromRow(row);
}
export async function listExamAttempts(
  db: SQLiteDatabase,
): Promise<ExamAttempt[]> {
  return (
    await db.getAllAsync<AttemptRow>(
      "SELECT * FROM exam_attempts ORDER BY started_at_ms DESC LIMIT 30",
    )
  ).map(fromRow);
}
export async function createExamAttempt(
  db: SQLiteDatabase,
  profile: ExamProfile,
  questions: readonly ExamQuestion[],
  nowMs = Date.now(),
): Promise<ExamAttempt> {
  assertQuestionBankReferencesValid(profile, questions);
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new Error("INVALID_EXAM_CLOCK");
  const id = `exam-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const snapshot: ExamSnapshot = {
    contentVersion: 1,
    profile,
    questions: [...questions],
    answers: {},
    flaggedIds: [],
    currentIndex: 0,
    ...(profile.backNavigation === "NO_BACK" ? { furthestIndex: 0 } : {}),
  };
  await db.runAsync(
    `INSERT INTO exam_attempts(id,profile_id,level,status,snapshot_json,started_at_ms,revision,updated_at)
    VALUES(?,?,?,'IN_PROGRESS',?,?,0,?)`,
    id,
    profile.id,
    profile.level,
    JSON.stringify(snapshot),
    nowMs,
    new Date(nowMs).toISOString(),
  );
  return getExamAttempt(db, id);
}
/** Atomic compare-and-swap blocks stale writes, edits after submit, and edits past deadline. */
export async function saveExamAttempt(
  db: SQLiteDatabase,
  attempt: ExamAttempt,
  change: Pick<ExamSnapshot, "answers" | "flaggedIds" | "currentIndex">,
  nowMs = Date.now(),
): Promise<ExamAttempt> {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new Error("INVALID_EXAM_CLOCK");
  const stored = await getExamAttempt(db, attempt.id);
  if (stored.revision !== attempt.revision) throw new Error("EXAM_STALE_WRITE");
  const snapshot = {
    ...stored.snapshot,
    answers: change.answers,
    flaggedIds: change.flaggedIds,
    currentIndex: change.currentIndex,
    ...(stored.snapshot.profile.backNavigation === "NO_BACK"
      ? {
          furthestIndex: Math.max(
            stored.snapshot.furthestIndex ?? stored.snapshot.currentIndex,
            change.currentIndex,
          ),
        }
      : {}),
  };
  if (stored.status !== "IN_PROGRESS" || getExamRemaining(stored, nowMs) === 0)
    throw new Error("EXAM_CLOSED");
  if (stored.snapshot.profile.backNavigation === "NO_BACK") {
    const floor = stored.snapshot.furthestIndex ?? stored.snapshot.currentIndex;
    if (change.currentIndex < floor) throw new Error("EXAM_NO_BACK");
    for (const question of stored.snapshot.questions.slice(0, floor))
      if (
        change.answers[question.id] !== stored.snapshot.answers[question.id] ||
        change.flaggedIds.includes(question.id) !==
          stored.snapshot.flaggedIds.includes(question.id)
      )
        throw new Error("EXAM_NO_BACK");
  }
  validateExamSnapshot(snapshot);
  if (stored.snapshot.profile.navigation === "SECTION_TIMED") {
    const window = getExamSectionWindow(
      stored.snapshot.profile,
      stored.startedAtMs,
      nowMs,
    );
    if (
      !window ||
      change.currentIndex < window.firstQuestionIndex ||
      change.currentIndex > window.lastQuestionIndex
    )
      throw new Error("EXAM_SECTION_CLOSED");
    for (const [index, question] of stored.snapshot.questions.entries()) {
      if (
        index >= window.firstQuestionIndex &&
        index <= window.lastQuestionIndex
      )
        continue;
      if (
        change.answers[question.id] !== stored.snapshot.answers[question.id] ||
        change.flaggedIds.includes(question.id) !==
          stored.snapshot.flaggedIds.includes(question.id)
      )
        throw new Error("EXAM_SECTION_CLOSED");
    }
  }
  const result = await db.runAsync(
    `UPDATE exam_attempts SET snapshot_json=?,revision=revision+1,updated_at=?
    WHERE id=? AND status='IN_PROGRESS' AND revision=?`,
    JSON.stringify(snapshot),
    new Date(nowMs).toISOString(),
    attempt.id,
    attempt.revision,
  );
  if (result.changes !== 1) throw new Error("EXAM_STALE_WRITE");
  return getExamAttempt(db, attempt.id);
}
export async function submitExamAttempt(
  db: SQLiteDatabase,
  id: string,
  nowMs = Date.now(),
): Promise<ExamAttempt> {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new Error("INVALID_EXAM_CLOCK");
  const attempt = await getExamAttempt(db, id);
  if (attempt.status === "SUBMITTED") return attempt;
  const deadline =
    attempt.startedAtMs + attempt.snapshot.profile.durationSeconds * 1000;
  const submittedAt = Math.min(deadline, Math.max(attempt.startedAtMs, nowMs));
  const result = await db.runAsync(
    `UPDATE exam_attempts SET status='SUBMITTED',submitted_at_ms=?,revision=revision+1,updated_at=?
    WHERE id=? AND status='IN_PROGRESS' AND revision=?`,
    submittedAt,
    new Date(nowMs).toISOString(),
    id,
    attempt.revision,
  );
  if (result.changes !== 1) {
    const submitted = await getExamAttempt(db, id);
    if (submitted.status === "SUBMITTED") return submitted;
    throw new Error("EXAM_STALE_WRITE");
  }
  return getExamAttempt(db, id);
}
