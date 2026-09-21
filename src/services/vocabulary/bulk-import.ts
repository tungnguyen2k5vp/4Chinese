import type { SQLiteDatabase } from "expo-sqlite";

import {
  findHanziCandidates,
  findMeaningCandidates,
  findPinyinCandidates,
} from "@/db/repository";
import { normalizePinyinInput } from "@/services/pinyin/pinyin";
import { meaningSearchAlternatives } from "@/services/search/meaning-query";
import { normalizeSearch } from "@/services/search/normalize";
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
  if (word.hskBand === 3) return 160;
  if (word.hskBand === 4) return 100;
  if (word.hskBand === 5) return 60;
  if (word.hskBand === 6) return 30;
  return 0;
}

export function bulkCandidateScore(query: string, word: Vocabulary): number {
  const normalized = normalizeSearch(query);
  const semanticQueries = meaningSearchAlternatives(normalized);
  const rawMeanings = [word.primaryMeaningVi, ...word.meaningsVi, ...word.meaningsEn]
    .map((meaning) => meaning.trim())
    .filter(Boolean);
  const meanings = rawMeanings
    .map(normalizeSearch)
    .filter(Boolean);
  const pinyin = normalizePinyinInput(word.pinyinNumeric || word.pinyin);
  const normalizedPinyinQuery = normalizePinyinInput(query);
  const frequencyBonus = Math.max(0, 160 - (word.frequencyRank ?? 80_000) / 500);
  const levelBonus = hskPriority(word);

  if (query.trim() === word.simplified || query.trim() === word.traditional) {
    return 15_000 + levelBonus + frequencyBonus;
  }
  if (pinyin && pinyin === normalizedPinyinQuery) {
    return 12_000 + levelBonus + frequencyBonus;
  }
  if (normalizedPinyinQuery.length >= 2 && pinyin.startsWith(normalizedPinyinQuery)) {
    return 7_000 + levelBonus + frequencyBonus - Math.min(300, pinyin.length - normalizedPinyinQuery.length);
  }

  // Do not let accent-stripping turn different Vietnamese words into a false
  // positive.  For example “thứ” must not silently resolve to “thư/sách”.
  // An exact accent-preserving phrase still gets the strongest meaning score.
  const exactQuery = normalizeMeaningExact(query);
  const exactMeaningMatch = rawMeanings.some((meaning) => {
    const exactMeaning = normalizeMeaningExact(meaning);
    return exactMeaning === exactQuery;
  });
  const exactPhraseMatch = rawMeanings.some((meaning) => {
    const exactMeaning = normalizeMeaningExact(meaning);
    return ` ${exactMeaning} `.includes(` ${exactQuery} `);
  });
  if (exactMeaningMatch) {
    return 13_000 + levelBonus + frequencyBonus;
  }
  if (exactPhraseMatch) return 11_200 + levelBonus + frequencyBonus;
  if (
    containsVietnameseTone(query) &&
    !isLikelyPinyin(query) &&
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

  return semanticScore ? semanticScore + levelBonus + frequencyBonus : 0;
}

export function rankBulkCandidates(
  query: string,
  candidates: Vocabulary[],
  limit = 6,
): Vocabulary[] {
  const ranked = candidates
    .map((word) => ({ word, score: bulkCandidateScore(query, word) }))
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
  const resolved: BulkResolvedWord[] = [];
  // Keep SQLite work bounded so a 100-line import does not stall gestures on
  // lower-end Android phones.
  for (let offset = 0; offset < terms.length; offset += 6) {
    const batch = await Promise.all(
      terms.slice(offset, offset + 6).map(async (term) => {
      const candidates = containsHanzi(term)
        ? await findHanziCandidates(db, term, 24)
        : (() => {
            // Meaning lookup wins for natural-language input. Pinyin lookup is
            // only used when no meaning matched, preventing words such as
            // “thứ” or “book” from being interpreted as a pinyin prefix.
            return findMeaningCandidates(db, term, containsVietnameseTone(term) ? 100 : 24).then(async (meaningCandidates) => [
              ...meaningCandidates,
              ...(isLikelyPinyin(term) && meaningCandidates.length === 0
                ? await findPinyinCandidates(db, term, 18)
                : []),
            ]);
          })();
      const resolvedCandidates = await candidates;
      const unique = rankBulkCandidates(term, Array.from(
        new Map(resolvedCandidates.map((word) => [word.id, word])).values(),
      ));
      return { input: term, word: unique[0] ?? null, alternatives: unique.slice(0, 6) };
      }),
    );
    resolved.push(...batch);
  }
  return resolved;
}
