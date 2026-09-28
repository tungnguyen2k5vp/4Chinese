import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { seedGrammarContent } from './grammar';
import { migrateDatabaseSchema } from './migrations';
import { getSpeakingSummary, listShadowingSentences, listToneWords, saveSpeakingPractice } from './speaking';

import { parseLocalBackup } from '@/services/backup/format';

describe('speaking practice persistence is independent of SRS', () => {
  it('stores attempts exactly once, reuses shared sentences and round-trips backup', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      const before = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      await migrateDatabaseSchema(db);
      await seedGrammarContent(db, []);
      expect((await listToneWords(db)).map((word) => word.id)).toEqual(['hsk-1-ni']);
      const sentences = await listShadowingSentences(db);
      expect(sentences).toHaveLength(14);
      const input = { id: 'attempt-1', kind: 'tone' as const, targetId: 'hsk-1-ni', correct: false };
      await saveSpeakingPractice(db, input);
      await saveSpeakingPractice(db, input);
      await saveSpeakingPractice(db, { ...input, id: 'attempt-2', correct: true });
      await saveSpeakingPractice(db, { id: 'shadow-1', kind: 'shadowing', targetId: sentences[0]!.id });
      expect(await getSpeakingSummary(db)).toEqual({ toneAttempts: 2, toneCorrect: 1, shadowingAttempts: 1 });
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(before);
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM review_log').get()).toEqual({ n: 1 });
      expect(sqlite.prepare("SELECT wrong_count FROM mistake_records WHERE exercise_type='tone_dictionary'").get()).toEqual({ wrong_count: 1 });
      expect(sqlite.prepare('SELECT speaking_score FROM vocabulary_skill_mastery').get()).toEqual({ speaking_score: 0 });
      const backup = parseLocalBackup(JSON.stringify(await exportLocalBackup(db, 'test')));
      expect(backup.data.speakingPractice).toHaveLength(3);
      sqlite.exec('DELETE FROM speaking_practice');
      await importLocalBackup(db, backup);
      expect(await getSpeakingSummary(db)).toEqual({ toneAttempts: 2, toneCorrect: 1, shadowingAttempts: 1 });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
  it('invalid references fail atomically, keeping old data unchanged', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await expect(saveSpeakingPractice(db, { id: 'bad', kind: 'tone', targetId: 'missing', correct: true })).rejects.toThrow();
      expect(await getSpeakingSummary(db)).toEqual({ toneAttempts: 0, toneCorrect: 0, shadowingAttempts: 0 });
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM vocabulary_skill_mastery').get()).toEqual({ n: 0 });
    } finally { sqlite.close(); }
  });
});
