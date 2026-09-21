import type { SQLiteDatabase } from "expo-sqlite";

import { rankPinyinCandidates, type PinyinCandidateContext } from "./candidateRanking";

import { findPinyinCandidates } from "@/db/repository";
import { normalizePinyinInput } from "@/services/pinyin/pinyin";
import type { HskBand, Vocabulary } from "@/types/models";

export interface PinyinHanziCandidate {
  word: Vocabulary;
  normalizedPinyin: string;
  candidateRank: number;
}

export interface PinyinSearchContext extends PinyinCandidateContext {
  scriptMode?: "simplified" | "traditional";
  limit?: number;
}

/** Offline, debounced by the UI component, SQLite-backed candidate search. */
export async function searchHanziCandidates(
  db: SQLiteDatabase,
  query: string,
  context: PinyinSearchContext = {},
): Promise<PinyinHanziCandidate[]> {
  const normalizedQuery = normalizePinyinInput(query);
  if (!normalizedQuery) return [];
  // Fetch a wider SQLite window than the rendered bar so target/HSK bonuses
  // can still promote a candidate that is not among the first frequency rows.
  const words = await findPinyinCandidates(db, normalizedQuery, Math.max(40, context.limit ?? 8));
  const ranked = rankPinyinCandidates(
    words.map((word) => ({ word, normalizedPinyin: normalizePinyinInput(word.pinyinNumeric || word.pinyin) })),
    normalizedQuery,
    context,
  );
  return ranked.slice(0, Math.max(1, Math.min(12, context.limit ?? 8))).map((candidate, index) => ({
    ...candidate,
    candidateRank: index + 1,
  }));
}

export type { HskBand };
export { normalizePinyinInput };
