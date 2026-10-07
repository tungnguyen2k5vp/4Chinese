import { describe, expect, it } from 'vitest';

import { getOfflineVocabulary, initializeDatabase } from './database';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { stageLexicalV5Drafts } from './lexical-knowledge';
import { migrateDatabaseSchema } from './migrations';
import { DATABASE_VERSION } from './schema';

import { lexicalV5Drafts } from '@/data/lexical-v5-drafts';
import { lexicalReadingMatchesForWord } from '@/services/vocabulary/lexical-reading';

// v40 binds all former blockers to one canonical base entry while retaining
// every valid reading. These records are staged as DRAFT and remain hidden
// until editorial review; the migration never touches learner-owned rows.
const resolved = [
  ['sense-v5-kan-look', 'hsk-5ada4f209f7c', 'kan4'],
  ['sense-v5-kan-read', 'hsk-5ada4f209f7c', 'kan4'],
  ['sense-v5-ting', 'hsk-f5ac916e8404', 'ting1'],
  ['sense-v5-wei-be', 'hsk-fd9fc129006f', 'wei2'],
  ['sense-v5-xing-okay', 'hsk-452f73e60f02', 'xing2'],
  ['sense-v5-de-complement', 'hsk-8fb39c44dd88', 'de5'],
  ['sense-v5-dei-must', 'hsk-114dc5e71c9c', 'dei3'],
  ['sense-v5-zhang-grow', 'hsk-2e37a2ff70f4', 'zhang3'],
  ['sense-v5-yue-music', 'hsk-ffcac51bafd8', 'yue4'],
] as const;

describe('v40 canonical readings for previously unresolved V5 lexical drafts', { timeout: 15_000 }, () => {
  const words = getOfflineVocabulary();

  it.each(resolved)('%s binds to %s with reading %s', (senseId, wordId, expected) => {
    const draft = lexicalV5Drafts.find(item => item.id === senseId)!;
    const word = words.find(item => item.id === wordId)!;
    expect(draft).toBeDefined();
    expect(draft.reviewStatus).toBe('DRAFT');
    expect(word).toBeDefined();
    expect(lexicalReadingMatchesForWord(word.simplified, word.pinyinNumeric, expected)).toBe(true);
    expect(lexicalReadingMatchesForWord(word.simplified, word.pinyinNumeric, draft.numeric)).toBe(true);
  });

  it('stages all nine corrected senses without changing vocabulary, SRS or review history', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const template = sqlite.prepare("SELECT * FROM vocabulary WHERE id='custom-1'").get()!;
      for (const wordId of new Set(resolved.map(item => item[1]))) {
        const word = words.find(item => item.id === wordId)!;
        const row = { ...template, id: word.id, simplified: word.simplified,
          pinyin_numeric: word.pinyinNumeric, frequency_rank: word.frequencyRank ?? null,
          is_custom: 0, deck_id: null };
        const columns = Object.keys(row);
        sqlite.prepare(`INSERT INTO vocabulary(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`)
          .run(...Object.values(row));
      }
      const vocabularyBefore = sqlite.prepare('SELECT * FROM vocabulary ORDER BY id').all();
      const progressBefore = sqlite.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all();
      const historyBefore = sqlite.prepare('SELECT * FROM review_log ORDER BY id').all();
      const first = await stageLexicalV5Drafts(db);
      const expectedIds = resolved.map(item => item[0]);
      expect(first.unresolved.filter(id => expectedIds.includes(id as typeof expectedIds[number]))).toEqual([]);
      expect(first.staged).toBe(11); // all drafts for the seven corrected characters
      for (const senseId of expectedIds) {
        expect(sqlite.prepare('SELECT sense_id,review_status FROM word_senses WHERE sense_id=?').all(senseId))
          .toEqual([{ sense_id: senseId, review_status: 'DRAFT' }]);
      }
      const contentBeforeRetry = sqlite.prepare('SELECT * FROM word_senses ORDER BY sense_id').all();
      expect(await stageLexicalV5Drafts(db)).toEqual(first);
      expect(sqlite.prepare('SELECT * FROM word_senses ORDER BY sense_id').all()).toEqual(contentBeforeRetry);
      expect(sqlite.prepare('SELECT * FROM vocabulary ORDER BY id').all()).toEqual(vocabularyBefore);
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all()).toEqual(progressBefore);
      expect(sqlite.prepare('SELECT * FROM review_log ORDER BY id').all()).toEqual(historyBefore);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('upgrades a v39 install while preserving custom vocabulary and progress', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const template = sqlite.prepare("SELECT * FROM vocabulary WHERE id='custom-1'").get()!;
      const affected = new Set<string>(resolved.map(item => item[1]));
      for (const word of words.filter(item => affected.has(item.id))) {
        const row = { ...template, id: word.id, simplified: word.simplified,
          pinyin: 'old display', pinyin_numeric: 'old1', primary_meaning_vi: 'old meaning',
          frequency_rank: word.frequencyRank ?? null, is_custom: 0, deck_id: null };
        const columns = Object.keys(row);
        sqlite.prepare(`INSERT INTO vocabulary(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`)
          .run(...Object.values(row));
      }
      const customBefore = sqlite.prepare("SELECT * FROM vocabulary WHERE id='custom-1'").get();
      const progressBefore = sqlite.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all();
      const historyBefore = sqlite.prepare('SELECT * FROM review_log ORDER BY id').all();
      sqlite.exec('PRAGMA user_version = 39');
      await initializeDatabase(db);
      for (const word of words.filter(item => affected.has(item.id))) {
        expect(sqlite.prepare('SELECT pinyin_numeric,primary_meaning_vi FROM vocabulary WHERE id=?').get(word.id))
          .toEqual({ pinyin_numeric: word.pinyinNumeric, primary_meaning_vi: word.primaryMeaningVi });
      }
      expect(sqlite.prepare("SELECT * FROM vocabulary WHERE id='custom-1'").get()).toEqual(customBefore);
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all()).toEqual(progressBefore);
      expect(sqlite.prepare('SELECT * FROM review_log ORDER BY id').all()).toEqual(historyBefore);
      expect(sqlite.prepare('PRAGMA user_version').get()).toEqual({ user_version: DATABASE_VERSION });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});