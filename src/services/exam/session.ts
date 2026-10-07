import {
  assertQuestionBankReferencesValid,
  getExamSectionWindow,
  remainingExamSeconds,
  scorePractice,
  type ExamProfile,
  type ExamQuestion,
} from "./engine";

export interface ExamSnapshot {
  contentVersion: 1;
  profile: ExamProfile;
  questions: ExamQuestion[];
  answers: Record<string, number>;
  flaggedIds: string[];
  currentIndex: number;
  /** Repository-maintained high-water position for optional no-back profiles. */
  furthestIndex?: number;
}
export interface ExamAttempt {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  startedAtMs: number;
  submittedAtMs: number | null;
  revision: number;
  snapshot: ExamSnapshot;
}
/** Validate externally imported attempt rows before any restore mutation. */
export function validateExamBackupRecord(row: Record<string, unknown>): void {
  if (
    typeof row.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,160}$/.test(row.id) ||
    typeof row.snapshot_json !== "string" ||
    row.snapshot_json.length > 2000000 ||
    !Number.isSafeInteger(row.started_at_ms) ||
    (row.started_at_ms as number) < 0 ||
    !Number.isSafeInteger(row.revision) ||
    (row.revision as number) < 0 ||
    !["IN_PROGRESS", "SUBMITTED"].includes(String(row.status)) ||
    typeof row.updated_at !== "string" ||
    !Number.isFinite(Date.parse(row.updated_at))
  )
    throw new Error("INVALID_EXAM_BACKUP");
  const snapshot = JSON.parse(row.snapshot_json) as ExamSnapshot;
  validateExamSnapshot(snapshot);
  if (
    row.profile_id !== snapshot.profile.id ||
    row.level !== snapshot.profile.level
  )
    throw new Error("INVALID_EXAM_BACKUP");
  if (row.status === "IN_PROGRESS" && row.submitted_at_ms !== null)
    throw new Error("INVALID_EXAM_BACKUP");
  if (
    row.status === "SUBMITTED" &&
    (!Number.isSafeInteger(row.submitted_at_ms) ||
      (row.submitted_at_ms as number) < (row.started_at_ms as number) ||
      (row.submitted_at_ms as number) >
        (row.started_at_ms as number) + snapshot.profile.durationSeconds * 1000)
  )
    throw new Error("INVALID_EXAM_BACKUP");
}
export function validateExamSnapshot(snapshot: ExamSnapshot): void {
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    snapshot.contentVersion !== 1
  )
    throw new Error("UNSUPPORTED_EXAM_SNAPSHOT");
  assertQuestionBankReferencesValid(snapshot.profile, snapshot.questions);
  if (
    !Number.isInteger(snapshot.currentIndex) ||
    snapshot.currentIndex < 0 ||
    snapshot.currentIndex >= snapshot.questions.length
  )
    throw new Error("INVALID_EXAM_POSITION");
  if (
    snapshot.furthestIndex !== undefined &&
    (!Number.isInteger(snapshot.furthestIndex) ||
      snapshot.furthestIndex < snapshot.currentIndex ||
      snapshot.furthestIndex >= snapshot.questions.length)
  )
    throw new Error("INVALID_EXAM_POSITION");
  if (
    snapshot.profile.backNavigation === "NO_BACK" &&
    snapshot.furthestIndex !== undefined &&
    snapshot.currentIndex !== snapshot.furthestIndex
  )
    throw new Error("INVALID_EXAM_POSITION");
  if (
    !snapshot.answers ||
    typeof snapshot.answers !== "object" ||
    Array.isArray(snapshot.answers) ||
    !Array.isArray(snapshot.flaggedIds)
  )
    throw new Error("INVALID_EXAM_ANSWER");
  for (const [id, answer] of Object.entries(snapshot.answers)) {
    const question = snapshot.questions.find((item) => item.id === id);
    if (
      !question ||
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer >= question.choices.length
    )
      throw new Error("INVALID_EXAM_ANSWER");
  }
  if (
    new Set(snapshot.flaggedIds).size !== snapshot.flaggedIds.length ||
    snapshot.flaggedIds.some(
      (id) => !snapshot.questions.some((question) => question.id === id),
    )
  )
    throw new Error("INVALID_EXAM_FLAGS");
}
/** Resolve expired section positions on resume without changing immutable content. */
export function getExamCurrentIndex(
  attempt: ExamAttempt,
  nowMs: number,
): number {
  const { snapshot } = attempt;
  const section =
    snapshot.profile.navigation === "SECTION_TIMED"
      ? getExamSectionWindow(snapshot.profile, attempt.startedAtMs, nowMs)
      : null;
  return section
    ? Math.max(
        section.firstQuestionIndex,
        Math.min(snapshot.currentIndex, section.lastQuestionIndex),
      )
    : snapshot.currentIndex;
}
export function getExamRemaining(attempt: ExamAttempt, nowMs: number): number {
  return remainingExamSeconds(
    attempt.startedAtMs,
    nowMs,
    attempt.snapshot.profile.durationSeconds,
  );
}
export function getExamResult(attempt: ExamAttempt) {
  if (attempt.status !== "SUBMITTED" || attempt.submittedAtMs === null)
    throw new Error("EXAM_NOT_SUBMITTED");
  const { questions, answers, profile } = attempt.snapshot;
  return {
    ...scorePractice(questions, answers),
    elapsedSeconds: Math.min(
      profile.durationSeconds,
      Math.max(
        0,
        Math.floor((attempt.submittedAtMs - attempt.startedAtMs) / 1000),
      ),
    ),
    sections: profile.sections.map((section) => ({
      skill: section.skill,
      ...scorePractice(
        questions.filter((question) => question.skill === section.skill),
        answers,
      ),
    })),
    questionTypes: [
      ...new Set(
        questions.map(
          (question) => question.metadata?.questionType ?? "LEGACY_CONTEXT",
        ),
      ),
    ].map((type) => ({
      type,
      ...scorePractice(
        questions.filter(
          (question) =>
            (question.metadata?.questionType ?? "LEGACY_CONTEXT") === type,
        ),
        answers,
      ),
    })),
  };
}
