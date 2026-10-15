import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { expoAdapter } from '@/db/fixtures/legacy_database';
import { lookupEnglishForms, searchEnglishDictionary } from '@/services/english/dictionary-intelligence';
import { englishFormCandidates, normalizeDictionaryInput } from '@/services/english/morphology';

describe('bounded morphology layer, source SQLite stays read-only', () => {
  it.each([['learning', 'learn'], ['studying', 'study'], ['running', 'run'], ['played', 'play'], ['stopped', 'stop'], ['went', 'go'], ['gone', 'go'], ['ate', 'eat'], ['eaten', 'eat'], ['saw', 'see'], ['seen', 'see'], ['children', 'child'], ['mice', 'mouse'], ['teeth', 'tooth'], ['boxes', 'box'], ['better', 'good'], ['best', 'well'], ['bigger', 'big']])('%s suggests %s with actual compatible dictionary senses', async (surface, lemma) => {
    const db = new DatabaseSync('artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db', { readOnly: true });
    try {
      const rows = await lookupEnglishForms(expoAdapter(db), surface!);
      expect(rows.some(row => row.headword === lemma && row.matchType === 'LEMMA_MATCH')).toBe(true);
      expect(rows.every(row => row.senseId.startsWith('en:sky:wd:') && row.meaning)).toBe(true);
    } finally { db.close(); }
  });
  it.each(['left', 'meeting', 'running', 'read', 'lead', 'look up', 'bank', 'book', 'shorts', 'run', 'set'])('keeps ambiguity for explicit sense selection: %s', async word => {
    const db = new DatabaseSync('artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db', { readOnly: true });
    try {
      const rows = await lookupEnglishForms(expoAdapter(db), word);
      expect(rows.length).toBeGreaterThan(1);
      expect(rows.some(row => row.headword === word && row.matchType !== 'LEMMA_MATCH')).toBe(true);
      if (word === 'look up') expect(rows.every(row => row.headword === word)).toBe(true);
      if (word === 'left') expect(rows.some(row => row.headword === 'leave')).toBe(true);
      if (word === 'meeting') expect(rows.some(row => row.headword === 'meet')).toBe(true);
    } finally { db.close(); }
  });
  it('ranks exact before lemma without selecting or writing', async () => {
    const db = new DatabaseSync('artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db', { readOnly: true });
    try {
      const results = await searchEnglishDictionary(expoAdapter(db), 'Learning');
      expect(results.some(row => row.headword === 'learn' && row.match === 'lemma')).toBe(true);
      const exactIndex = results.findIndex(row => row.match === 'exact');
      const lemmaIndex = results.findIndex(row => row.match === 'lemma');
      if (exactIndex >= 0) expect(exactIndex).toBeLessThan(lemmaIndex);
    } finally { db.close(); }
  });
  it('preserves phrases/apostrophes and bounds suggestions', () => {
    expect(normalizeDictionaryInput('  LOOK   UP  ')).toBe('look up');
    expect(normalizeDictionaryInput('I’m')).toBe("i'm");
    for (const word of ["don't", "can't", "I'm", "they've"]) expect(englishFormCandidates(word).length).toBeGreaterThan(0);
    expect(englishFormCandidates('漢字')).toEqual([]);
    expect(englishFormCandidates('a'.repeat(201))).toEqual([]);
    expect(englishFormCandidates('running').length).toBeLessThanOrEqual(16);
  });
});
