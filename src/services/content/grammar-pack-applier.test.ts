import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { grammarPackApplier } from './grammar-pack-applier';

import { expoAdapter } from '@/db/fixtures/legacy_database';
import { migrateDatabaseSchema } from '@/db/migrations';

describe('grammar content pack applier', () => {
  it('upserts reviewed grammar content and deprecates it without deleting learner progress', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      const payload = { operations: [{ operation: 'UPSERT' as const, grammar: { id: 'grammar_hsk1_001', title: '是', pattern: 'A 是 B',
        explanationVi: 'Mẫu câu giới thiệu.', hskLevel: '1' as const, difficulty: 1, sentences: [{ id: 'sentence_hsk1_001',
          hanzi: '我是学生。', pinyin: 'Wǒ shì xuéshēng.', translationVi: 'Tôi là học sinh.', difficulty: 1,
          reviewStatus: 'REVIEWED' as const, provenance: 'EDITORIAL' as const }] } }] };
      await grammarPackApplier.apply(db, payload);
      await db.runAsync(`INSERT INTO grammar_progress(grammar_id,attempts,correct,updated_at) VALUES(?,?,?,?)`, 'grammar_hsk1_001', 3, 3, '2026-09-29');
      await grammarPackApplier.apply(db, { operations: [{ operation: 'DEPRECATE', grammarId: 'grammar_hsk1_001' }] });
      expect(sqlite.prepare("SELECT is_active FROM grammar_points WHERE id='grammar_hsk1_001'").get()).toEqual({ is_active: 0 });
      expect(sqlite.prepare("SELECT attempts FROM grammar_progress WHERE grammar_id='grammar_hsk1_001'").get()).toEqual({ attempts: 3 });
      expect(sqlite.prepare("SELECT review_status FROM sentences WHERE id='sentence_hsk1_001'").get()).toEqual({ review_status: 'REVIEWED' });
    } finally { sqlite.close(); }
  });
});
