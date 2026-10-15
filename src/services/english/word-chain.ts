import type { SQLiteDatabase } from "expo-sqlite";

import { englishWordChainPools } from '@/data/english-word-chain-pools';

export type WordChainDifficulty = "easy" | "normal" | "hard";
export type WordChainValidation =
  | { valid: true; word: string; points: number }
  | { valid: false; reason: "empty" | "characters" | "wrong-letter" | "too-short" | "already-used" };

export const wordChainRules: Record<WordChainDifficulty, { minLength: number; pointsPerWord: number }> = {
  easy: { minLength: 2, pointsPerWord: 5 },
  normal: { minLength: 2, pointsPerWord: 10 },
  hard: { minLength: 2, pointsPerWord: 15 },
};

export function normalizeChainWord(value: string): string {
  return value.normalize("NFC").trim().toLocaleLowerCase("en-US");
}

export function validateWordChainGuess(
  guess: string,
  previousWord: string,
  usedWords: ReadonlySet<string>,
  difficulty: WordChainDifficulty,
): WordChainValidation {
  const word = normalizeChainWord(guess);
  if (!word) return { valid: false, reason: "empty" };
  if (!/^[a-z]+$/u.test(word)) return { valid: false, reason: "characters" };
  if (word.length < wordChainRules[difficulty].minLength) return { valid: false, reason: "too-short" };
  if (usedWords.has(word)) return { valid: false, reason: "already-used" };
  const required = normalizeChainWord(previousWord).at(-1);
  if (!required || word[0] !== required) return { valid: false, reason: "wrong-letter" };
  return { valid: true, word, points: wordChainRules[difficulty].pointsPerWord + word.length };
}

/** Pulls a bounded page from the user's private, cached dictionary. No learner DB writes. */
export async function pickDictionaryChainWord(
  db: Pick<SQLiteDatabase, "getAllAsync">,
  startsWith: string,
  usedWords: ReadonlySet<string>,
  difficulty: WordChainDifficulty,
): Promise<string | null> {
  const start = startsWith ? normalizeChainWord(startsWith).slice(0, 1) : "a";
  if (!/^[a-z]$/u.test(start)) return null;
  const pool = englishWordChainPools[difficulty].filter(word => word.startsWith(start) && !usedWords.has(word));
  if (!pool.length) return null;
  const bounded = pool.slice(0, 100);
  const rows = await db.getAllAsync<{ word: string }>(
    `SELECT w.word FROM words w
     WHERE w.lang_code='en' AND w.word IN (${bounded.map(() => '?').join(',')})
       AND EXISTS (
         SELECT 1 FROM word_definitions wd
         JOIN definitions d ON d.id=wd.definition_id
         WHERE wd.word_id=w.id AND d.definition_lang='vi'
       )
     ORDER BY w.word LIMIT 100`,
    ...bounded,
  );
  const candidates = rows
    .map((row) => row.word.trim())
    .filter((word) => /^[a-z]+$/iu.test(word) && pool.includes(word.toLowerCase()) && !usedWords.has(normalizeChainWord(word)));
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}
