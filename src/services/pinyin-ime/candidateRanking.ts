import { normalizePinyinInput } from "@/services/pinyin/pinyin";
import type { HskBand, Vocabulary } from "@/types/models";

export interface PinyinCandidateRecord {
  word: Vocabulary;
  normalizedPinyin: string;
}

export interface PinyinCandidateContext {
  targetVocabularyId?: string;
  hskBand?: HskBand;
}

/**
 * Applies the product ranking rules without changing the database result set.
 * Exact pinyin is deliberately the first key; a target-word bonus only breaks
 * ties, so it can never auto-fill or hide a better exact dictionary match.
 */
export function rankPinyinCandidates(
  candidates: PinyinCandidateRecord[],
  query: string,
  context: PinyinCandidateContext = {},
): PinyinCandidateRecord[] {
  const normalizedQuery = normalizePinyinInput(query);
  return [...candidates].sort((left, right) => {
    const leftExact = left.normalizedPinyin === normalizedQuery ? 1 : 0;
    const rightExact = right.normalizedPinyin === normalizedQuery ? 1 : 0;
    if (leftExact !== rightExact) return rightExact - leftExact;

    const leftWholeWord = Array.from(left.word.simplified).length > 1 ? 1 : 0;
    const rightWholeWord = Array.from(right.word.simplified).length > 1 ? 1 : 0;
    if (leftExact && rightExact && leftWholeWord !== rightWholeWord) {
      return rightWholeWord - leftWholeWord;
    }

    const leftTarget = left.word.id === context.targetVocabularyId ? 1 : 0;
    const rightTarget = right.word.id === context.targetVocabularyId ? 1 : 0;
    if (leftTarget !== rightTarget) return rightTarget - leftTarget;

    const leftHsk = context.hskBand !== undefined && left.word.hskBand === context.hskBand ? 1 : 0;
    const rightHsk = context.hskBand !== undefined && right.word.hskBand === context.hskBand ? 1 : 0;
    if (leftHsk !== rightHsk) return rightHsk - leftHsk;

    const leftFrequency = left.word.frequencyRank ?? Number.MAX_SAFE_INTEGER;
    const rightFrequency = right.word.frequencyRank ?? Number.MAX_SAFE_INTEGER;
    if (leftFrequency !== rightFrequency) return leftFrequency - rightFrequency;

    const leftPrefix = left.normalizedPinyin.startsWith(normalizedQuery) ? 1 : 0;
    const rightPrefix = right.normalizedPinyin.startsWith(normalizedQuery) ? 1 : 0;
    if (leftPrefix !== rightPrefix) return rightPrefix - leftPrefix;

    // When pinyin ties, keep whole-word candidates before single-character
    // fallbacks.  The learner can still choose a character manually.
    const leftLength = Array.from(left.word.simplified).length;
    const rightLength = Array.from(right.word.simplified).length;
    if (leftLength !== rightLength) return rightLength - leftLength;
    return left.word.simplified.localeCompare(right.word.simplified);
  });
}

/** Short alias used by callers that only need the ranking stage. */
export const rankCandidates = rankPinyinCandidates;
