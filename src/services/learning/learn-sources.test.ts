import { describe, expect, it } from 'vitest';

import { hsk30LearningGroups } from './learn-sources';
import { groupVocabularyByTopic, vocabularyTopicId, vocabularyTopics } from './vocabulary-topics';

import syllabus from '@/data/hsk30-2025-11.json';
import { getOfflineVocabulary } from '@/db/database';

const words = getOfflineVocabulary();
describe('new learning sources', () => {
  it('classifies the entire dictionary once across nineteen topics', () => {
    const groups = groupVocabularyByTopic(words);
    expect(vocabularyTopics).toHaveLength(19);
    expect([...groups.values()].flat().map(word => word.id).sort()).toEqual(words.map(word => word.id).sort());
    expect([...groups.keys()].length).toBe(19);
    expect(groups.get('people')!.length).toBeGreaterThan(3);
    expect(vocabularyTopicId(words.find(word => word.simplified === '汤')!)).toBe('food');
  });
  it('uses the new syllabus level instead of the old band and retains the original word ID', () => {
    const word = words.find(word => word.simplified === '爱')!;
    const groups = hsk30LearningGroups([{ ...word, hskBand: 6 }]);
    expect(groups.get('1')?.map(item => item.id)).toEqual([word.id]);
    expect(groups.get('6')).toEqual([]);
  });
  it('does not put an unmatched headword or a wrong reading into a syllabus lesson', () => {
    const word = words.find(word => word.simplified === '爱')!;
    const wrong = { ...word, pinyin: 'āi', pinyinNumeric: 'ai1' };
    expect([...hsk30LearningGroups([wrong]).values()].flat()).toEqual([]);
    const sourceCounts = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7-9'].map(level => syllabus.rows.vocabulary.filter(row => row.hsk_level === level).length);
    expect(sourceCounts).toEqual([300, 200, 500, 1000, 1600, 1800, 5600]);
  });
});
