import type { HskLevel } from "@/services/hsk/alignment";

export const writtenPracticeMinutes = [5, 10, 15] as const;
export type WrittenPracticeMinutes = (typeof writtenPracticeMinutes)[number];
export interface WrittenPracticeTiming {
  version: 1;
  baseExerciseId: string;
  minutes: WrittenPracticeMinutes;
  startedAtMs: number;
  deadlineAtMs: number;
}
export interface WrittenExercise {
  id: string;
  contentVersion: 1;
  kind: "WRITING" | "TRANSLATION";
  level: HskLevel;
  title: string;
  prompt: string;
  answerLanguage: "ZH" | "VI";
  minLength: number;
  maxLength: number;
  requiredWords: string[];
  checklist: string[];
  modelAnswer: string;
  note: string;
  sourceType: "CURATED";
  reviewStatus: "UNREVIEWED";
  provenance?: "ORIGINAL_LEGACY" | "ORIGINAL_AI_ASSISTED";
  timing?: WrittenPracticeTiming;
}
const nonblank = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const uniqueNonblank = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every(nonblank) &&
  new Set(value.map((item) => item.normalize("NFKC").trim())).size ===
    value.length;
export function validateWrittenExercise(exercise: WrittenExercise): void {
  if (
    !exercise ||
    exercise.contentVersion !== 1 ||
    typeof exercise.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,120}$/.test(exercise.id) ||
    !["WRITING", "TRANSLATION"].includes(exercise.kind) ||
    !["1", "2", "3", "4", "5", "6", "7-9"].includes(exercise.level) ||
    !["ZH", "VI"].includes(exercise.answerLanguage) ||
    (exercise.kind === "WRITING" && exercise.answerLanguage !== "ZH") ||
    !nonblank(exercise.title) ||
    !nonblank(exercise.prompt) ||
    !nonblank(exercise.modelAnswer) ||
    !nonblank(exercise.note) ||
    !Number.isInteger(exercise.minLength) ||
    !Number.isInteger(exercise.maxLength) ||
    exercise.minLength < 1 ||
    exercise.maxLength < exercise.minLength ||
    exercise.maxLength > 4000 ||
    !uniqueNonblank(exercise.requiredWords) ||
    !uniqueNonblank(exercise.checklist) ||
    !exercise.checklist.length ||
    exercise.checklist.some(
      (item) => typeof item !== "string" || !item.trim(),
    ) ||
    exercise.sourceType !== "CURATED" ||
    exercise.reviewStatus !== "UNREVIEWED" ||
    (exercise.provenance !== undefined &&
      !["ORIGINAL_LEGACY", "ORIGINAL_AI_ASSISTED"].includes(
        exercise.provenance,
      ))
  )
    throw new Error("INVALID_WRITTEN_EXERCISE");
  if (exercise.timing !== undefined) {
    const timing = exercise.timing;
    if (
      !timing ||
      timing.version !== 1 ||
      typeof timing.baseExerciseId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(timing.baseExerciseId) ||
      !(writtenPracticeMinutes as readonly number[]).includes(timing.minutes) ||
      !Number.isSafeInteger(timing.startedAtMs) ||
      timing.startedAtMs < 0 ||
      !Number.isSafeInteger(timing.deadlineAtMs) ||
      timing.deadlineAtMs !== timing.startedAtMs + timing.minutes * 60000 ||
      exercise.id !==
        `${timing.baseExerciseId}-timed-${timing.minutes}m-${timing.startedAtMs.toString(36)}`
    )
      throw new Error("INVALID_WRITTEN_TIMING");
  }
}
/** A separate immutable timed variant: never rewrites an existing exercise/attempt. */
export function createTimedWrittenExercise(
  exercise: WrittenExercise,
  minutes: WrittenPracticeMinutes,
  nowMs = Date.now(),
): WrittenExercise {
  validateWrittenExercise(exercise);
  if (exercise.timing) throw new Error("WRITTEN_TIMER_ALREADY_STARTED");
  if (!(writtenPracticeMinutes as readonly number[]).includes(minutes))
    throw new Error("INVALID_WRITTEN_DURATION");
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new Error("INVALID_WRITTEN_CLOCK");
  const timed: WrittenExercise = {
    ...exercise,
    id: `${exercise.id}-timed-${minutes}m-${nowMs.toString(36)}`,
    requiredWords: [...exercise.requiredWords],
    checklist: [...exercise.checklist],
    timing: {
      version: 1,
      baseExerciseId: exercise.id,
      minutes,
      startedAtMs: nowMs,
      deadlineAtMs: nowMs + minutes * 60000,
    },
  };
  validateWrittenExercise(timed);
  return timed;
}
/** Wall-clock time budget, not an official exam/anti-cheat deadline. null means legacy untimed. */
export function getWrittenRemainingSeconds(
  exercise: WrittenExercise,
  nowMs: number,
): number | null {
  validateWrittenExercise(exercise);
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new Error("INVALID_WRITTEN_CLOCK");
  return exercise.timing
    ? Math.max(
        0,
        Math.min(
          exercise.timing.minutes * 60,
          Math.ceil((exercise.timing.deadlineAtMs - nowMs) / 1000),
        ),
      )
    : null;
}
/** Deliberately excludes samples, checklist and explanatory hints before self-submission. */
export function getWrittenSelfReview(
  exercise: WrittenExercise,
  answer: string,
  status: "DRAFT" | "REVIEWED",
) {
  validateWrittenExercise(exercise);
  if (!["DRAFT", "REVIEWED"].includes(status))
    throw new Error("INVALID_WRITTEN_STATUS");
  if (status !== "REVIEWED") return null;
  if (!nonblank(answer)) throw new Error("INVALID_WRITTEN_ANSWER");
  return {
    check: checkWrittenAnswer(exercise, answer),
    checklist: exercise.checklist,
    modelAnswer: exercise.modelAnswer,
    note: exercise.note,
  };
}
/** Surface checks only: presence/length is not semantic, grammar or official scoring. */
export function checkWrittenAnswer(exercise: WrittenExercise, answer: string) {
  validateWrittenExercise(exercise);
  if (typeof answer !== "string" || answer.length > 12000)
    throw new Error("INVALID_WRITTEN_ANSWER");
  const normalized = answer.normalize("NFKC").trim();
  const length =
    exercise.answerLanguage === "ZH"
      ? [...normalized].filter((character) => /\p{Script=Han}/u.test(character))
          .length
      : normalized.split(/\s+/u).filter(Boolean).length;
  return {
    length,
    unit: exercise.answerLanguage === "ZH" ? "chữ Hán" : "từ",
    lengthInRange: length >= exercise.minLength && length <= exercise.maxLength,
    missingWords: exercise.requiredWords.filter(
      (word) => !normalized.includes(word),
    ),
    hasSentenceEnding: /[。！？.!?]$/u.test(normalized),
  };
}
export function validateWrittenBackupRecord(
  row: Record<string, unknown>,
): void {
  if (
    typeof row.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,160}$/.test(row.id) ||
    typeof row.snapshot_json !== "string" ||
    row.snapshot_json.length > 100000 ||
    typeof row.answer !== "string" ||
    row.answer.length > 12000 ||
    !["DRAFT", "REVIEWED"].includes(String(row.status)) ||
    !Number.isSafeInteger(row.revision) ||
    (row.revision as number) < 0 ||
    typeof row.updated_at !== "string" ||
    !Number.isFinite(Date.parse(row.updated_at))
  )
    throw new Error("INVALID_WRITTEN_BACKUP");
  const exercise = JSON.parse(row.snapshot_json) as WrittenExercise;
  validateWrittenExercise(exercise);
  if (
    exercise.id !== row.exercise_id ||
    (row.status === "REVIEWED" && !row.answer.trim())
  )
    throw new Error("INVALID_WRITTEN_BACKUP");
}

/** Timed variant IDs differ from the bank: immutable snapshot owns the display title. */
export function writtenSnapshotTitle(snapshotJson:string):string {
  try {
    const exercise=JSON.parse(snapshotJson) as WrittenExercise;
    validateWrittenExercise(exercise);
    return exercise.title;
  } catch {return 'Bài đã lưu';}
}
