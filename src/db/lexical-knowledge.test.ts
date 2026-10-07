import type { DatabaseSync } from 'node:sqlite';

import { describe, expect, it, vi } from 'vitest';

import { getOfflineVocabulary } from './database';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { listPublishedLexicalKnowledge, stageLexicalV5Drafts, validateLexicalDraft } from './lexical-knowledge';
import { migrateDatabaseSchema } from './migrations';

import { lexicalV5Drafts } from '@/data/lexical-v5-drafts';
import { lexicalReadingMatchesForWord } from '@/services/vocabulary/lexical-reading';

function insertWord(sqlite: DatabaseSync, overrides: Record<string, string | number | null>) {
  const template = sqlite.prepare("SELECT * FROM vocabulary WHERE id='custom-1'").get()!;
  const row = { ...template, is_custom: 0, deck_id: null, ...overrides };
  const columns = Object.keys(row);
  sqlite.prepare(`INSERT INTO vocabulary(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`)
    .run(...Object.values(row));
}

function lexicalSnapshot(sqlite: DatabaseSync) {
  return Object.fromEntries(['word_senses', 'word_collocations', 'sentences', 'word_sense_examples']
    .map(table => [table, sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1,2`).all()]));
}

describe('lexical sense staging and publication', () => {
  it('keeps every candidate contextual, pronunciation-specific, original and unpublished', () => {
    expect(lexicalV5Drafts.length).toBeGreaterThanOrEqual(30);
    expect(new Set(lexicalV5Drafts.map(item => item.id)).size).toBe(lexicalV5Drafts.length);
    for (const draft of lexicalV5Drafts) expect(() => validateLexicalDraft(draft)).not.toThrow();
    const readings = lexicalV5Drafts.filter(item => item.hanzi === '得').map(item => item.numeric);
    expect(readings).toEqual(['de5','de2','dei3']);
    expect(() => validateLexicalDraft({ ...lexicalV5Drafts[0]!, reviewStatus: 'VERIFIED' } as never)).toThrow();
  });
  it('stages atomically by exact reading without overwriting meanings or learner progress; retries are idempotent', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      sqlite.exec("UPDATE vocabulary SET simplified='学习',pinyin_numeric='xue2 xi2',is_custom=0 WHERE id='custom-1'");
      const before = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      const meanings = sqlite.prepare("SELECT meanings_vi FROM vocabulary WHERE id='custom-1'").get();
      const outcome = await stageLexicalV5Drafts(db); await stageLexicalV5Drafts(db);
      expect(outcome.staged).toBe(1); expect(outcome.unresolved.length).toBe(lexicalV5Drafts.length - 1);
      expect(sqlite.prepare('SELECT COUNT(*) n FROM word_senses').get()).toEqual({ n: 1 });
      expect(sqlite.prepare('SELECT COUNT(*) n FROM word_sense_examples').get()).toEqual({ n: 1 });
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(before);
      expect(sqlite.prepare("SELECT meanings_vi FROM vocabulary WHERE id='custom-1'").get()).toEqual(meanings);
      expect(await listPublishedLexicalKnowledge(db, 'custom-1')).toEqual({ senses: [], collocations: [] });
      sqlite.exec("UPDATE word_senses SET review_status='PUBLISHED',reviewed_by='fixture-human',reviewed_at='2026-10-01' WHERE vocabulary_id='custom-1'; UPDATE word_collocations SET review_status='PUBLISHED' WHERE vocabulary_id='custom-1'");
      const published = await listPublishedLexicalKnowledge(db,'custom-1');
      expect(published.senses).toHaveLength(1); expect(published.collocations).toHaveLength(3);
      const reviewedContent = lexicalSnapshot(sqlite);
      await stageLexicalV5Drafts(db);
      expect(lexicalSnapshot(sqlite)).toEqual(reviewedContent);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
  it('binds the corrected drafts to canonical IDs offline, preserving stale installed data and SRS on retries', async () => {
    const sqlite = createLegacyDatabase();
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('OFFLINE'));
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const hanzi = new Set(lexicalV5Drafts.map(draft => draft.hanzi));
      const words = getOfflineVocabulary().filter(word => hanzi.has(word.simplified));
      for (const word of words) insertWord(sqlite, {
        id: word.id, simplified: word.simplified, pinyin_numeric: word.pinyinNumeric,
        frequency_rank: word.frequencyRank ?? null,
        // A stale display reading/meaning is not authority for binding or rewriting the base row.
        pinyin: 'stale display', primary_meaning_vi: 'learner-visible old meaning',
      });
      const vocabularyBefore = sqlite.prepare('SELECT * FROM vocabulary ORDER BY id').all();
      const progressBefore = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      const reviewsBefore = sqlite.prepare('SELECT * FROM review_log').all();
      const outcome = await stageLexicalV5Drafts(db);
      expect(outcome.staged).toBe(35);
      expect(outcome.unresolved).toEqual([]);

      const senses = sqlite.prepare('SELECT vocabulary_id,sense_id,pinyin_numeric,review_status,reviewed_by,reviewed_at FROM word_senses ORDER BY sense_id').all();
      const expectedBindings = lexicalV5Drafts.flatMap(draft => {
        const candidates = words.filter(word => word.simplified === draft.hanzi)
          .sort((a, b) => (a.frequencyRank ?? -1) - (b.frequencyRank ?? -1) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
          .slice(0, 12);
        const word = candidates.find(candidate => lexicalReadingMatchesForWord(draft.hanzi, candidate.pinyinNumeric, draft.numeric));
        return word ? [{ vocabulary_id: word.id, sense_id: draft.id, pinyin_numeric: draft.numeric,
          review_status: 'DRAFT', reviewed_by: null, reviewed_at: null }] : [];
      }).sort((a, b) => a.sense_id.localeCompare(b.sense_id));
      expect(senses).toEqual(expectedBindings);
      expect(senses).toContainEqual(expect.objectContaining({
        vocabulary_id: 'hsk-e2eb3575485d', sense_id: 'sense-v5-haishi-choice', pinyin_numeric: 'hai2 shi5',
      }));
      expect(senses).toContainEqual(expect.objectContaining({
        vocabulary_id: 'hsk-2cd55c2fdfc6', sense_id: 'sense-v5-zhidao', pinyin_numeric: 'zhi1 dao4',
      }));
      const beforeRetry = lexicalSnapshot(sqlite);
      expect(await stageLexicalV5Drafts(db)).toEqual(outcome);
      expect(lexicalSnapshot(sqlite)).toEqual(beforeRetry);
      expect(sqlite.prepare('SELECT * FROM vocabulary ORDER BY id').all()).toEqual(vocabularyBefore);
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(progressBefore);
      expect(sqlite.prepare('SELECT * FROM review_log').all()).toEqual(reviewsBefore);
      expect(sqlite.prepare("SELECT COUNT(*) n FROM sentences WHERE provenance='AI_DRAFT' AND review_status='PENDING'").get()).toEqual({ n: 35 });
      expect(sqlite.prepare("SELECT COUNT(*) n FROM word_collocations WHERE review_status!='DRAFT'").get()).toEqual({ n: 0 });
      expect(sqlite.prepare('SELECT COUNT(*) n FROM word_collocations').get()).toEqual({ n: 71 });
      expect(await listPublishedLexicalKnowledge(db, 'hsk-2cd55c2fdfc6')).toEqual({ senses: [], collocations: [] });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); sqlite.close(); }
  });
  it.each(['xue2xi2', 'XUE2’XI2', 'xuéxí', 'xue2-xi2'])
    ('stages an old compact/marked installed reading %s without rewriting it', async pinyin => {
      const sqlite = createLegacyDatabase();
      try {
        const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
        sqlite.prepare("UPDATE vocabulary SET simplified='学习',pinyin_numeric=?,is_custom=0 WHERE id='custom-1'").run(pinyin);
        const vocabularyBefore = sqlite.prepare('SELECT * FROM vocabulary ORDER BY id').all();
        expect((await stageLexicalV5Drafts(db)).staged).toBe(1);
        expect(sqlite.prepare('SELECT vocabulary_id,sense_id FROM word_senses').all())
          .toEqual([{ vocabulary_id: 'custom-1', sense_id: 'sense-v5-xuexi' }]);
        expect(sqlite.prepare('SELECT * FROM vocabulary ORDER BY id').all()).toEqual(vocabularyBefore);
      } finally { sqlite.close(); }
    });
  it('binds explicit polyphonic variants, not custom copies, different tones or multiword prefixes', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      insertWord(sqlite, { id: 'kan-prefix', simplified: '看', pinyin_numeric: 'kan4 shu1', frequency_rank: null });
      insertWord(sqlite, { id: 'kan-custom', simplified: '看', pinyin_numeric: 'kan4', is_custom: 1 });
      insertWord(sqlite, { id: 'kan-variants', simplified: '看', pinyin_numeric: 'kan1 / kàn', frequency_rank: 2 });
      insertWord(sqlite, { id: 'de-variants', simplified: '得', pinyin_numeric: 'de2; de0; dei3' });
      insertWord(sqlite, { id: 'wei-wrong', simplified: '为', pinyin_numeric: 'wei4' });
      insertWord(sqlite, { id: 'ting-bad', simplified: '听', pinyin_numeric: 'ting1 (listen)' });
      const outcome = await stageLexicalV5Drafts(db);
      expect(outcome.staged).toBe(6);
      expect(sqlite.prepare("SELECT vocabulary_id,sense_id FROM word_senses WHERE vocabulary_id='kan-variants' ORDER BY sense_id").all())
        .toEqual([{ vocabulary_id: 'kan-variants', sense_id: 'sense-v5-kan-look' }, { vocabulary_id: 'kan-variants', sense_id: 'sense-v5-kan-read' }]);
      expect(sqlite.prepare("SELECT sense_id FROM word_senses WHERE vocabulary_id='de-variants' ORDER BY sense_id").all())
        .toEqual([{ sense_id: 'sense-v5-de-complement' }, { sense_id: 'sense-v5-de-obtain' }, { sense_id: 'sense-v5-dei-must' }]);
      expect(outcome.unresolved).toContain('sense-v5-wei-be');
      expect(outcome.unresolved).toContain('sense-v5-ting');
      expect(sqlite.prepare("SELECT COUNT(*) n FROM word_senses WHERE vocabulary_id IN ('kan-prefix','kan-custom','ting-bad')").get()).toEqual({ n: 0 });
      const beforeRetry = lexicalSnapshot(sqlite);
      await stageLexicalV5Drafts(db);
      expect(lexicalSnapshot(sqlite)).toEqual(beforeRetry);
    } finally { sqlite.close(); }
  });
  it('uses deterministic SQLite null-first rank/ID ordering and keeps the 12-candidate bound', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      insertWord(sqlite, { id: 'ting-ranked', simplified: '听', pinyin_numeric: 'ting1', frequency_rank: 1 });
      insertWord(sqlite, { id: 'ting-z-null', simplified: '听', pinyin_numeric: 'ting1', frequency_rank: null });
      insertWord(sqlite, { id: 'ting-a-null', simplified: '听', pinyin_numeric: 'ting1', frequency_rank: null });
      for (let rank = 0; rank < 12; rank++) insertWord(sqlite, {
        id: `kan-wrong-${rank}`, simplified: '看', pinyin_numeric: 'kan1', frequency_rank: rank,
      });
      insertWord(sqlite, { id: 'kan-thirteenth', simplified: '看', pinyin_numeric: 'kan4', frequency_rank: 12 });
      const outcome = await stageLexicalV5Drafts(db);
      expect(outcome.staged).toBe(1);
      expect(outcome.unresolved).toContain('sense-v5-kan-look');
      expect(sqlite.prepare('SELECT vocabulary_id FROM word_senses').all()).toEqual([{ vocabulary_id: 'ting-a-null' }]);
    } finally { sqlite.close(); }
  });
  it('rolls back partially staged content after an interrupted write and succeeds on retry', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      sqlite.exec("UPDATE vocabulary SET simplified='学习',pinyin_numeric='xue2xi2',is_custom=0 WHERE id='custom-1'");
      const before = lexicalSnapshot(sqlite);
      sqlite.exec("CREATE TRIGGER interrupt_lexical BEFORE INSERT ON word_collocations BEGIN SELECT RAISE(ABORT,'INTERRUPTED'); END");
      await expect(stageLexicalV5Drafts(db)).rejects.toThrow('INTERRUPTED');
      expect(lexicalSnapshot(sqlite)).toEqual(before);
      sqlite.exec('DROP TRIGGER interrupt_lexical');
      expect((await stageLexicalV5Drafts(db)).staged).toBe(1);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});
