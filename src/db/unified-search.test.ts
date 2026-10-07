import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { searchAllContent } from './unified-search';

describe('unified local search', () => {
  it('finds accent-normalized Vietnamese through FTS, bounds results and hides deleted decks', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      sqlite.exec("UPDATE vocabulary SET search_text='nhac nho 您好 nin hao' WHERE id='custom-1'");
      expect((await searchAllContent(db, 'nhắc nhở')).some(row => row.id === 'custom-1')).toBe(true);
      sqlite.exec("UPDATE personal_deck SET deleted_at='2026-10-01' WHERE id=(SELECT deck_id FROM vocabulary WHERE id='custom-1')");
      expect((await searchAllContent(db, 'nhắc nhở')).some(row => row.id === 'custom-1')).toBe(false);
      expect(await searchAllContent(db, '%_"')).toEqual([]);
    } finally { sqlite.close(); }
  });
  it('uses bounded SQL fallback when optional FTS is unavailable and retains story back context', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      sqlite.exec("UPDATE vocabulary SET search_text='nhac nho' WHERE id='custom-1'");
      sqlite.exec('DROP TABLE vocabulary_search_fts');
      expect((await searchAllContent(db, 'nhắc')).some(row => row.id === 'custom-1')).toBe(true);
      sqlite.exec("INSERT INTO stories(id,title,description,hsk_level,content,created_at) VALUES('search-story','Truyện trường học','Một ngày vui','1','今天很好。','2026-10-01')");
      expect(await searchAllContent(db, 'trường')).toContainEqual({ id: 'search-story', kind: 'STORY', title: 'Truyện trường học', subtitle: 'Một ngày vui', pathname: '/reader', params: { storyId: 'search-story' } });
      sqlite.exec("UPDATE stories SET is_active=0 WHERE id='search-story'");
      expect((await searchAllContent(db, 'trường')).some(row => row.id === 'search-story')).toBe(false);
    } finally { sqlite.close(); }
  });
  it('surfaces real database failure instead of silently producing an empty result', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      sqlite.exec('DROP TABLE grammar_points');
      await expect(searchAllContent(db, 'từ')).rejects.toThrow();
    } finally { sqlite.close(); }
  });
});
