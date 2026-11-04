import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { getDashboardStats, getDueCount, getDueVocabulary, listPersonalDecks } from './repository';

import { buildDailySessionPlan } from '@/services/learning/daily-session';
import { useAppStore } from '@/stores/app-store';

describe('Home all-due scope and bounded review sessions', () => {
  it('matches active deck totals across HSK levels, excludes ineligible cards, and refreshes after a batch', async () => {
    const raw = createLegacyDatabase();
    try {
      const db = expoAdapter(raw); await migrateDatabaseSchema(db);
      raw.exec("UPDATE vocabulary SET hsk_band='5' WHERE id='custom-1'");
      raw.exec("INSERT INTO personal_deck(id,name,color,created_at,updated_at,deleted_at) VALUES('deck-2','Second','#2457D6','2026-01-01','2026-01-01',NULL),('trash','Trash','#2457D6','2026-01-01','2026-01-01','2026-01-02')");
      const insertWord = raw.prepare(`INSERT INTO vocabulary(id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,pos,hsk_band,source,source_version,source_url,translation_status,search_text,is_custom,deck_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      const insertProgress = raw.prepare(`INSERT INTO user_vocabulary_progress(vocabulary_id,status,studied,due,next_review_at,state,memory_level,mastery_level,is_known,is_suspended,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
      for (let index = 0; index < 25; index++) {
        const id = `scope-${index}`, due = index === 20 ? '2099-01-01T00:00:00Z' : '2020-01-01T00:00:00Z';
        insertWord.run(id, `测试${index}`, `測試${index}`, 'cè shì', 'ce4 shi4', `QA ${index}`, '[]', '[]', '[]', index % 2 ? '5' : '1', 'user', '1', '', 'verified', `QA ${index}`, 1, index === 24 ? 'trash' : index < 10 ? 'deck-1' : 'deck-2');
        insertProgress.run(id, index === 23 ? 'NEW' : 'LEARNING', index === 23 ? 0 : 1, due, due, 2, 1, 1, index === 21 ? 1 : 0, index === 22 ? 1 : 0, '2026-01-01', '2026-01-01');
      }
      raw.exec("INSERT INTO personal_deck_vocabulary(deck_id,vocabulary_id,created_at) SELECT deck_id,id,'2026-01-01' FROM vocabulary WHERE id LIKE 'scope-%'");
      const before = JSON.stringify(raw.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all());
      expect((await getDashboardStats(db, [1])).due).toBe(10);
      expect(await getDueCount(db)).toBe(21);
      expect((await listPersonalDecks(db)).reduce((sum, deck) => sum + deck.dueCount, 0)).toBe(21);
      const batch = await getDueVocabulary(db, 10);
      expect(batch).toHaveLength(10);
      expect(new Set(batch.map(word => word.id)).size).toBe(10);
      expect(batch.some(word => word.hskBand === 5)).toBe(true);
      expect(JSON.stringify(raw.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all())).toBe(before);
      const future = raw.prepare('UPDATE user_vocabulary_progress SET next_review_at=? WHERE vocabulary_id=?');
      batch.forEach(word => future.run('2099-01-01T00:00:00Z', word.id));
      expect(await getDueCount(db)).toBe(11);
      expect((await listPersonalDecks(db)).reduce((sum, deck) => sum + deck.dueCount, 0)).toBe(11);
      expect(await getDueVocabulary(db, 10)).toHaveLength(10);
    } finally { raw.close(); }
  });
  it('deduplicates queues and bounds daily plans to at most twenty words', async () => {
    const raw = createLegacyDatabase();
    const previous = useAppStore.getState();
    try {
      const db = expoAdapter(raw); await migrateDatabaseSchema(db);
      const word = (await getDueVocabulary(db, 1))[0]!;
      const words = Array.from({ length: 25 }, (_, index) => ({ ...word, id: `queue-${index}` }));
      useAppStore.getState().setReviewQueue([words[0]!, words[0]!, ...words]);
      expect(useAppStore.getState().reviewQueue).toHaveLength(10);
      expect(new Set(useAppStore.getState().reviewQueue.map(item => item.id)).size).toBe(10);
      const plan = buildDailySessionPlan({ dueWords: words, weakWords: [], unlearnedWords: [], dailyNewWordGoal: 10, learnedToday: 0, learnSessionSize: 10, reviewSessionSize: 50, studyTimeGoalMinutes: 60, totalDueCount: 25, skillStats: [] });
      expect(plan.dueWords).toHaveLength(20);
    } finally { useAppStore.setState(previous); raw.close(); }
  });
});
