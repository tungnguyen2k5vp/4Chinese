import type { SQLiteDatabase } from "expo-sqlite";

import { listExamAttempts } from "./exam";
import { listGrammarPoints } from "./grammar";
import { getHskProgress } from "./repository";
import { listWrittenAttempts } from "./written-practice";

import { getExamResult } from "@/services/exam/session";
import type { WrittenExercise } from "@/services/exam/written-practice";

export async function getHskPreparation(db: SQLiteDatabase) {
  const [vocabulary, grammar, recentAttempts, written, totals] =
    await Promise.all([
      getHskProgress(db),
      listGrammarPoints(db),
      listExamAttempts(db),
      listWrittenAttempts(db),
      db.getAllAsync<{ level: string; submitted: number }>(
        "SELECT level,COUNT(*) AS submitted FROM exam_attempts WHERE status='SUBMITTED' GROUP BY level",
      ),
    ]);
  return ["1", "2", "3", "4", "5", "6", "7-9"].map((level) => {
    const vocab = vocabulary.find((item) => item.band === level);
    const points = grammar.filter(
      (item) =>
        item.hsk_level === level ||
        (level === "7-9" && ["7", "8", "9"].includes(item.hsk_level)),
    );
    const completed = recentAttempts.filter(
      (attempt) =>
        attempt.status === "SUBMITTED" &&
        attempt.snapshot.profile.level === level,
    );
    const writing = written.filter(
      (attempt) =>
        attempt.status === "REVIEWED" &&
        (JSON.parse(attempt.snapshot_json) as WrittenExercise).level === level,
    );
    return {
      level,
      vocabulary: {
        available: vocab?.total ?? 0,
        studied: vocab?.learned ?? 0,
        remembered: vocab?.mastered ?? 0,
      },
      grammar: {
        available: points.length,
        practiced: points.filter((point) => point.attempts > 0).length,
      },
      submittedMiniTests:
        totals.find((row) => row.level === level)?.submitted ?? 0,
      recentMiniTests: completed.length,
      recentCorrect: completed.reduce(
        (sum, attempt) => sum + getExamResult(attempt).correct,
        0,
      ),
      recentQuestions: completed.reduce(
        (sum, attempt) => sum + attempt.snapshot.questions.length,
        0,
      ),
      recentSelfReviewedWriting: writing.length,
    };
  });
}
