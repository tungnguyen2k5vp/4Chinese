import type { SQLiteDatabase } from "expo-sqlite";

import { grammarSeed } from "./grammar";

import { recommendGrammarMicroLessons } from "@/services/learning/grammar-micro-lessons";

export async function listGrammarMicroLessons(
  db: SQLiteDatabase,
  nowMs = Date.now(),
) {
  const rows = await db.getAllAsync<{
    id: string;
    grammar_id: string;
    exercise_type: string;
    correct: number;
    created_at: string;
  }>(
    "SELECT id,grammar_id,exercise_type,correct,created_at FROM grammar_attempts WHERE created_at>=? AND created_at<=? ORDER BY created_at DESC,id DESC LIMIT 2000",
    new Date(nowMs - 30 * 86400000).toISOString(),
    new Date(nowMs).toISOString(),
  );
  const known = new Set(grammarSeed.map((seed) => seed.id));
  return recommendGrammarMicroLessons(
    rows
      .filter((row) => known.has(row.grammar_id))
      .map((row) => ({
        id: row.id,
        grammarId: row.grammar_id,
        exerciseType: row.exercise_type,
        correct: row.correct === 1,
        createdAt: row.created_at,
      })),
    nowMs,
  ).map((item) => ({
    ...item,
    seed: grammarSeed.find((seed) => seed.id === item.grammarId)!,
  }));
}
