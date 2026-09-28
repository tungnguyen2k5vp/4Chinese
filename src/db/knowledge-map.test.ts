import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { recordGrammarAnswer, seedGrammarContent } from './grammar';
import { getKnowledgeMap } from './knowledge-map';
import { migrateDatabaseSchema } from './migrations';
import { recordPracticeResult } from './mistakes';

describe('knowledge map from real practice evidence', () => {
  it('shows no-data instead of fabricated weak scores for unpracticed skills', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      await recordPracticeResult(db, { vocabularyId: 'hsk-1-ni', skill: 'PINYIN', exerciseType: 'hanzi_to_pinyin', correct: true });
      const map = await getKnowledgeMap(db);
      expect(map.find((row) => row.skill === 'PINYIN')).toMatchObject({ score: 10, wordCount: 1 });
      expect(map.find((row) => row.skill === 'SPEAKING')).toMatchObject({ score: null, wordCount: 0 });
      expect(map.find((row) => row.skill === 'GRAMMAR')).toMatchObject({ score: null, wordCount: 0 });
      expect(map.filter((row) => row.skill !== 'PINYIN').every((row) => row.score === null)).toBe(true);
    } finally { sqlite.close(); }
  });
  it('uses recorded grammar answers rather than vocabulary score defaults', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db); await seedGrammarContent(db, []);
      await recordGrammarAnswer(db, 'gram-shi', true);
      await recordGrammarAnswer(db, 'gram-shi', false);
      expect((await getKnowledgeMap(db)).find((row) => row.skill === 'GRAMMAR')).toMatchObject({ score: 50, wordCount: 1 });
    } finally { sqlite.close(); }
  });
  it('keeps a measured zero after failure separate from an unattempted skill', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      await recordPracticeResult(db, { vocabularyId: 'hsk-1-ni', skill: 'LISTENING', exerciseType: 'audio_to_hanzi', correct: false });
      const map = await getKnowledgeMap(db);
      expect(map.find((row) => row.skill === 'LISTENING')).toMatchObject({ score: 0, wordCount: 1 });
      expect(map.find((row) => row.skill === 'WRITING')).toMatchObject({ score: null, wordCount: 0 });
    } finally { sqlite.close(); }
  });
});
