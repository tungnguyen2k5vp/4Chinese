import type { SQLiteDatabase } from "expo-sqlite";

import { recordPracticeResult } from "./mistakes";

import {
  findConfusablePair,
  validateConfusableAttempt,
} from "@/data/confusable-words";

export const migrationV35Sql = `
CREATE TABLE IF NOT EXISTS confusable_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  pair_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  content_version INTEGER NOT NULL,
  selected_word TEXT NOT NULL,
  correct INTEGER NOT NULL CHECK(correct IN (0,1)),
  assisted INTEGER NOT NULL CHECK(assisted IN (0,1)),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_confusable_pair ON confusable_attempts(pair_id,created_at DESC);
`;

export type ConfusableStats = {
  pair_id: string;
  attempts: number;
  correct: number;
};
export function listConfusableStats(db: SQLiteDatabase) {
  return db.getAllAsync<ConfusableStats>(`SELECT pair_id,COUNT(*) attempts,SUM(correct) correct
    FROM confusable_attempts GROUP BY pair_id`);
}

/** Atomic, retry-idempotent practice evidence; never changes SRS, due dates or review_log. */
export async function recordConfusableAnswer(
  db: SQLiteDatabase,
  input: {
    id: string;
    pairId: string;
    questionId: string;
    selectedWord: string;
    assisted: boolean;
  },
): Promise<boolean> {
  const pair = findConfusablePair(input.pairId);
  const question = pair?.questions.find((item) => item.id === input.questionId);
  const row = {
    id: input.id,
    pair_id: input.pairId,
    question_id: input.questionId,
    content_version: pair?.contentVersion,
    selected_word: input.selectedWord,
    correct: input.selectedWord === question?.answer ? 1 : 0,
    assisted: input.assisted ? 1 : 0,
    created_at: new Date().toISOString(),
  };
  validateConfusableAttempt(row);
  await db.withTransactionAsync(async () => {
    const previous = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM confusable_attempts WHERE id=?",
      input.id,
    );
    if (previous) {
      if (
        previous.pair_id !== row.pair_id ||
        previous.question_id !== row.question_id ||
        previous.selected_word !== row.selected_word ||
        previous.assisted !== row.assisted
      ) {
        throw new Error("CONFUSABLE_ATTEMPT_CONFLICT");
      }
      return;
    }
    await db.runAsync(
      `INSERT INTO confusable_attempts
      (id,pair_id,question_id,content_version,selected_word,correct,assisted,created_at)
      VALUES(?,?,?,?,?,?,?,?)`,
      row.id,
      row.pair_id,
      row.question_id,
      row.content_version!,
      row.selected_word,
      row.correct,
      row.assisted,
      row.created_at,
    );
    // Link to a real bundled word only; never create fake dictionary entries.
    const word = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM vocabulary
      WHERE simplified=? AND is_custom=0 ORDER BY frequency_rank,id LIMIT 1`,
      question!.answer,
    );
    if (word)
      await recordPracticeResult(db, {
        vocabularyId: word.id,
        skill: "MEANING",
        exerciseType: "confusable_" + pair!.id,
        correct: row.correct === 1,
        hintUsed: input.assisted,
      });
  });
  return row.correct === 1;
}
