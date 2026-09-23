import type { SQLiteDatabase } from "expo-sqlite";

import {
  findBulkLookupCandidates,
  type BulkLookupQuery,
} from "@/db/repository";
import { normalizePinyinInput } from "@/services/pinyin/pinyin";
import { meaningSearchAlternatives } from "@/services/search/meaning-query";
import { normalizeSearch } from "@/services/search/normalize";
import { isLowQualityMeaning, vocabularySearchAliases } from "@/services/vocabulary/quality";
import type { Vocabulary } from "@/types/models";

export interface BulkResolvedWord {
  input: string;
  word: Vocabulary | null;
  alternatives: Vocabulary[];
}

export function parseBulkVocabularyInput(value: string, limit = 100): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value.split(/\r?\n|[;；]+/)) {
    const item = raw.trim().replace(/^[-•]\s*/, "");
    const key = normalizeSearch(item);
    if (!item || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function containsHanzi(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value);
}

function containsVietnameseTone(value: string): boolean {
  return /[ÀÁẠẢÃĂẮẶẲẴÂẤẬẨẪĐÈÉẸẺẼÊẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỐỘỔỖƠỚỢỞỠÙÚỤỦŨƯỨỰỬỮỲÝỴỶỸàáạảãăắặẳẵâấậẩẫđèéẹẻẽêếệểễìíịỉĩòóọỏõôốộổỗơớợởỡùúụủũưứựửữỳýỵỷỹ]/u.test(value);
}

function normalizeMeaningExact(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("vi-VN")
    .replace(/[^\p{L}\p{N}\u3400-\u9fff]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isLikelyPinyin(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || containsHanzi(trimmed) || containsVietnameseTone(trimmed)) return false;
  if (!/^[a-züÜǖǘǚǜ0-9\s'·-]+$/u.test(trimmed)) return false;
  return /[aeiouüÜǖǘǚǜ]/iu.test(trimmed);
}

function hskPriority(word: Vocabulary): number {
  if (word.hskBand === 1) return 500;
  if (word.hskBand === 2) return 420;
  // HSK 3-4 is part of the offline dictionary too. Keep HSK 1-2 as the
  // beginner tie-breaker, while preventing intermediate entries from being
  // buried under a loose match from a much higher level.
  if (word.hskBand === 3) return 330;
  if (word.hskBand === 4) return 280;
  if (word.hskBand === 5) return 60;
  if (word.hskBand === 6) return 30;
  return 0;
}

function hasNameOrSurnameIntent(query: string): boolean {
  const normalized = normalizeSearch(query);
  return /(^| )(ho|ten|ten rieng|ho ten|nguoi)( |$)/.test(normalized);
}

function isNameOrSurnameCandidate(word: Vocabulary): boolean {
  const fields = [
    ...word.pos,
    word.primaryMeaningVi,
    ...word.meaningsVi,
    ...word.meaningsEn,
    word.source,
  ].map(normalizeSearch);
  return fields.some((field) =>
    field.includes("ho") ||
    field.includes("ten rieng") ||
    field.includes("surname")
  );
}

type BulkScoreContext = {
  query: string;
  normalized: string;
  semanticQueries: string[];
  normalizedPinyinQuery: string;
  exactQuery: string;
  hasVietnameseTone: boolean;
  likelyPinyin: boolean;
  nameIntent: boolean;
};

function createBulkScoreContext(query: string): BulkScoreContext {
  return {
    query,
    normalized: normalizeSearch(query),
    semanticQueries: meaningSearchAlternatives(normalizeSearch(query)),
    normalizedPinyinQuery: normalizePinyinInput(query),
    exactQuery: normalizeMeaningExact(query),
    hasVietnameseTone: containsVietnameseTone(query),
    likelyPinyin: isLikelyPinyin(query),
    nameIntent: hasNameOrSurnameIntent(query),
  };
}

function scoreBulkCandidate(context: BulkScoreContext, word: Vocabulary): number {
  const {
    query,
    normalized,
    semanticQueries,
    normalizedPinyinQuery,
    exactQuery,
    hasVietnameseTone,
    likelyPinyin,
    nameIntent,
  } = context;
  const rawMeanings = [
    word.primaryMeaningVi,
    ...word.meaningsVi,
    ...word.meaningsEn,
    ...vocabularySearchAliases(word.simplified),
  ]
    .map((meaning) => meaning.trim())
    .filter(Boolean);
  const meanings = rawMeanings
    .map(normalizeSearch)
    .filter(Boolean);
  const pinyin = normalizePinyinInput(word.pinyinNumeric || word.pinyin);
  const frequencyBonus = Math.max(0, 160 - (word.frequencyRank ?? 80_000) / 500);
  const levelBonus = hskPriority(word);
  const nameIntentBonus = nameIntent && isNameOrSurnameCandidate(word) ? 5_000 : 0;
  const nameIntentPenalty = nameIntent && !isNameOrSurnameCandidate(word) ? 4_000 : 0;
  // Variant/phonology notes (for example “dùng trong 上聲”) must never beat
  // the common word meaning in a learner-facing search result.
  const technicalMeaningPenalty = rawMeanings.some(isLowQualityMeaning) ? 3_200 : 0;

  if (query.trim() === word.simplified || query.trim() === word.traditional) {
    return 15_000 + levelBonus + frequencyBonus + nameIntentBonus - technicalMeaningPenalty;
  }
  if (containsHanzi(query)) {
    return word.simplified.includes(query.trim()) || word.traditional.includes(query.trim())
      ? 9_000 + levelBonus + frequencyBonus - technicalMeaningPenalty
      : 0;
  }
  if (pinyin && pinyin === normalizedPinyinQuery) {
    return 12_000 + levelBonus + frequencyBonus + nameIntentBonus - technicalMeaningPenalty;
  }
  if (normalizedPinyinQuery.length >= 2 && pinyin.startsWith(normalizedPinyinQuery)) {
    return 7_000 + levelBonus + frequencyBonus + nameIntentBonus - nameIntentPenalty - technicalMeaningPenalty - Math.min(300, pinyin.length - normalizedPinyinQuery.length);
  }

  // Do not let accent-stripping turn different Vietnamese words into a false
  // positive.  For example “thứ” must not silently resolve to “thư/sách”.
  // An exact accent-preserving phrase still gets the strongest meaning score.
  const exactMeaningMatch = rawMeanings.some((meaning) => {
    const exactMeaning = normalizeMeaningExact(meaning);
    return exactMeaning === exactQuery;
  });
  const primaryMeaning = normalizeMeaningExact(word.primaryMeaningVi.split(/[;；]/u)[0] ?? word.primaryMeaningVi);
  const primaryMeaningMatch =
    primaryMeaning === exactQuery || ` ${primaryMeaning} `.includes(` ${exactQuery} `);
  const exactPhraseMatch = rawMeanings.some((meaning) => {
    const exactMeaning = normalizeMeaningExact(meaning);
    return ` ${exactMeaning} `.includes(` ${exactQuery} `);
  });
  // A word's learner-facing primary meaning is stronger evidence than a
  // technical/secondary dictionary sense. For example, "nhiều" should map
  // to 多, not let the secondary sense of 百 win only because 百 is HSK 1.
  if (primaryMeaningMatch) {
    return 14_000 + levelBonus + frequencyBonus + nameIntentBonus - nameIntentPenalty;
  }
  if (exactMeaningMatch) {
    return 13_000 + levelBonus + frequencyBonus + nameIntentBonus - nameIntentPenalty - technicalMeaningPenalty;
  }
  if (exactPhraseMatch) return 11_200 + levelBonus + frequencyBonus + nameIntentBonus - nameIntentPenalty - technicalMeaningPenalty;

  // Keep accent-sensitive one-word input safe. The exact-token checks above
  // still allow “sớm” to find “sáng sớm”, while this prevents “thứ” from
  // degrading to the unrelated unaccented token “thư” (book/letter).
  if (
    hasVietnameseTone &&
    !likelyPinyin &&
    exactQuery.split(" ").length === 1
  ) return 0;

  let semanticScore = 0;
  semanticQueries.forEach((alternative, index) => {
    meanings.forEach((meaning) => {
      if (meaning === alternative) {
        semanticScore = Math.max(semanticScore, 11_000 - index * 80);
      } else if (` ${meaning} `.includes(` ${alternative} `)) {
        semanticScore = Math.max(semanticScore, 8_800 - index * 80);
      }
    });
    if (normalizeSearch(word.simplified) === alternative || normalizeSearch(word.traditional) === alternative) {
      semanticScore = Math.max(semanticScore, 11_500 - index * 80);
    }
  });

  if (!semanticScore) {
    const tokens = normalized.split(" ").filter((token) => token.length >= 2);
    const searchable = ` ${meanings.join(" ")} `;
    const matches = tokens.filter((token) => searchable.includes(` ${token} `)).length;
    const coverage = tokens.length ? matches / tokens.length : 0;
    if (coverage === 1) semanticScore = 6_500;
    else if (coverage >= 0.67) semanticScore = 4_000;
    else if (tokens.length === 1 && matches === 1) semanticScore = 3_500;
  }

  return semanticScore
    ? Math.max(0, semanticScore + levelBonus + frequencyBonus + nameIntentBonus - nameIntentPenalty - technicalMeaningPenalty)
    : 0;
}

export function bulkCandidateScore(query: string, word: Vocabulary): number {
  return scoreBulkCandidate(createBulkScoreContext(query), word);
}

export function rankBulkCandidates(
  query: string,
  candidates: Vocabulary[],
  limit = 6,
): Vocabulary[] {
  const context = createBulkScoreContext(query);
  const ranked = candidates
    .map((word) => ({ word, score: scoreBulkCandidate(context, word) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
  const best = ranked[0]?.score ?? 0;
  const minimum = best >= 8_000 ? best - 2_000 : 3_000;
  return ranked
    .filter((item) => item.score >= minimum)
    .slice(0, Math.max(1, limit))
    .map((item) => item.word);
}

export async function resolveBulkVocabulary(
  db: SQLiteDatabase,
  input: string,
): Promise<BulkResolvedWord[]> {
  const terms = parseBulkVocabularyInput(input);
  if (!terms.length) return [];
  const queries: BulkLookupQuery[] = terms.map((term) => ({
    value: term,
    allowPinyin: !containsHanzi(term) && isLikelyPinyin(term),
  }));
  const candidates = await findBulkLookupCandidates(db, queries);
  return terms.map((term) => {
    const unique = rankBulkCandidates(term, candidates);
    return { input: term, word: unique[0] ?? null, alternatives: unique.slice(0, 6) };
  });
}
