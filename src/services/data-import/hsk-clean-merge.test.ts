import { describe, expect, it } from 'vitest';

import {
  mergeCleanHskVocabulary,
  parseCleanHskCsv,
  pinyinMatchKey,
  pinyinToNumeric,
  type VocabularyRecord,
} from '../../../scripts/merge-hsk-clean';

const currentWord = (overrides: Partial<VocabularyRecord> = {}): VocabularyRecord => ({
  id: 'hsk-existing', simplified: '看', traditional: '看', pinyin: 'kàn', pinyinNumeric: 'kan4',
  primaryMeaningVi: 'xem', meaningsVi: ['xem'], meaningsEn: ['to look'], pos: ['động từ'], hskBand: 1,
  frequencyRank: 1, classifiers: [], radical: '目', strokeCount: 9, visualType: 'illustration',
  imageUri: null, imageSource: null, imageLicense: null, imageAttribution: null, audioUri: null,
  source: 'old', sourceVersion: 'old', sourceUrl: '', translationStatus: 'machine', examples: [{ id: 'keep' }],
  ...overrides,
});

describe('merge-hsk-clean', () => {
  it('parses quotes and converts tone-mark pinyin without losing each syllable tone', () => {
    const rows = parseCleanHskCsv('hsk_level,hanzi,pinyin,meaning_vi,meaning_en\nHSK 1,事,shì,"Chuyện, việc",Thing\n');
    expect(rows[0]?.meaning_vi).toBe('Chuyện, việc');
    expect(pinyinToNumeric("jiǔ'érjiǔzhī")).toBe('jiu3 er2jiu3zhi1');
    expect(pinyinMatchKey('dìfang')).toBe('difang#4');
    expect(pinyinToNumeric('ma')).toBe('ma5');
  });

  it('updates only divergent canonical fields while preserving ID, media and examples', () => {
    const { words, report } = mergeCleanHskVocabulary([currentWord()], [
      { hsk_level: 'HSK 1', hanzi: '看', pinyin: 'kàn', meaning_vi: 'nhìn; xem', meaning_en: 'to look; to watch' },
    ], 'clean');
    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({ id: 'hsk-existing', radical: '目', examples: [{ id: 'keep' }], primaryMeaningVi: 'nhìn; xem' });
    expect(report).toMatchObject({ added: 0, matchedExisting: 1, updated: { meaningVi: 1, meaningEn: 1, hskBand: 0, pinyin: 0, records: 1 } });
  });

  it('adds a separate stable row for a distinct source reading instead of overwriting learned progress', () => {
    const { words, report } = mergeCleanHskVocabulary([currentWord()], [
      { hsk_level: 'HSK 1', hanzi: '看', pinyin: 'kàn', meaning_vi: 'xem', meaning_en: 'to look' },
      { hsk_level: 'HSK 6', hanzi: '看', pinyin: 'kān', meaning_vi: 'trông coi', meaning_en: 'to guard' },
    ], 'clean');
    expect(words).toHaveLength(2);
    expect(words.find((word) => word.id === 'hsk-existing')?.hskBand).toBe(1);
    expect(words.find((word) => word.pinyinNumeric === 'kan1')).toMatchObject({ hskBand: 6, traditional: '看' });
    expect(report).toMatchObject({ added: 1, matchedExisting: 1 });
  });

  it('keeps unrelated legacy vocabulary that is absent from the supplied source', () => {
    const legacy = currentWord({ id: 'legacy', simplified: '旧词', pinyin: 'jiù cí', pinyinNumeric: 'jiu4 ci2' });
    const { words, report } = mergeCleanHskVocabulary([currentWord(), legacy], [
      { hsk_level: 'HSK 1', hanzi: '看', pinyin: 'kàn', meaning_vi: 'xem', meaning_en: 'to look' },
    ], 'clean');
    expect(words.find((word) => word.id === 'legacy')).toEqual(legacy);
    expect(report.preservedExistingNotInSource).toBe(1);
  });
});
