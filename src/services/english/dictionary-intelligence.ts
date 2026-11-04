import type { SQLiteDatabase } from 'expo-sqlite';

import { lookupSkypediaBatch, searchSkypedia, type SkypediaMeaning } from '@/db/english/skypedia';
import { englishFormCandidates, normalizeDictionaryInput } from '@/services/english/morphology';

type Source = Pick<SQLiteDatabase, 'getAllAsync' | 'getFirstAsync'>;
export interface IntelligentSearchResult {
  headword: string;
  senseCount: number;
  match: 'exact' | 'form' | 'lemma' | 'prefix' | 'meaning';
  surface?: string;
  explanation?: string;
}
export async function lookupEnglishForms(db: Source, input: string): Promise<SkypediaMeaning[]> {
  const surface = normalizeDictionaryInput(input);
  if (!surface || surface.length > 200) return [];
  const forms = englishFormCandidates(surface);
  const keys = [surface, ...new Set(forms.map(row => row.lemma))];
  const groups = await lookupSkypediaBatch(db, keys);
  const result = [...(groups[0] ?? [])];
  for (let i = 1; i < keys.length; i++) {
    const evidence = forms.filter(form => form.lemma === keys[i]);
    for (const sense of groups[i] ?? []) {
      const aliases = { V: ['V', 'VERB'], N: ['N', 'NOUN'], A: ['A', 'ADJ', 'ADJECTIVE'], R: ['R', 'D', 'ADV', 'ADVERB'], ANY: [] };
      const sourcePos = sense.rawPos.toUpperCase().split(/[^A-Z]/u);
      if (!evidence.some(form => form.pos === 'ANY' || aliases[form.pos].some(pos => sourcePos.includes(pos)))) continue;
      if (result.some(row => row.senseId === sense.senseId)) continue;
      result.push({ ...sense, matchType: 'LEMMA_MATCH', rankingExplanation: `${surface} → ${sense.headword}. ${evidence[0]?.reason}; gợi ý dạng từ, bạn chọn nghĩa.`, isInflectedForm: true });
    }
  }
  return result;
}
export async function searchEnglishDictionary(db: Source, input: string, limit = 10): Promise<IntelligentSearchResult[]> {
  const surface = normalizeDictionaryInput(input);
  if (!surface || surface.length > 200) return [];
  const senses = await lookupEnglishForms(db, surface);
  const grouped = new Map<string, IntelligentSearchResult>();
  for (const sense of senses) {
    const key = sense.headword;
    const previous = grouped.get(key);
    if (previous) previous.senseCount++;
    else grouped.set(key, { headword: key, senseCount: 1, match: sense.matchType === 'LEMMA_MATCH' ? 'lemma' : 'exact', surface, explanation: sense.matchType === 'LEMMA_MATCH' ? `${surface} → ${key}` : undefined });
  }
  const safeLimit = Math.max(1, Math.min(20, Math.trunc(limit) || 10));
  if (grouped.size) return [...grouped.values()].slice(0, safeLimit);
  return searchSkypedia(db, surface, safeLimit);
}
