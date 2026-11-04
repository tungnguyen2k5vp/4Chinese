import syllabus from '@/data/hsk30-2025-11.json';
import { HSK30_LEVELS, matchHsk30Vocabulary } from '@/services/hsk/hsk30-source';
import type { Vocabulary } from '@/types/models';

/** Match the 2025 syllabus by headword, reading and POS; never reuse old band labels. */
export function hsk30LearningGroups<T extends Pick<Vocabulary, 'id' | 'simplified' | 'pinyin' | 'pinyinNumeric' | 'pos' | 'hskBand'>>(words: T[]) {
  const candidates = words.map(word => ({ id: word.id, simplified: word.simplified, pinyin: word.pinyin, pinyin_numeric: word.pinyinNumeric, pos: JSON.stringify(word.pos), hsk_band: String(word.hskBand) }));
  const matches = matchHsk30Vocabulary(syllabus.rows.vocabulary, candidates);
  const byId = new Map(words.map(word => [word.id, word]));
  const groups = new Map<string, T[]>(HSK30_LEVELS.map(level => [level, []]));
  const seen = new Map<string, Set<string>>(HSK30_LEVELS.map(level => [level, new Set()]));
  matches.forEach((match, index) => {
    const word = match.vocabularyId ? byId.get(match.vocabularyId) : null;
    const level = syllabus.rows.vocabulary[index]!.hsk_level.replace('HSK', '');
    if (word && !seen.get(level)!.has(word.id)) { groups.get(level)!.push(word); seen.get(level)!.add(word.id); }
  });
  return groups;
}
