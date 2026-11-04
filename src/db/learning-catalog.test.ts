import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import {
  getHskLearningGroups, getLearningWordBatch, getLearningWordPage, getNewWordsLearnedToday,
  getUnlearnedCatalog, getUnlearnedVocabulary,
} from './repository';

import { HSK30_VERSION } from '@/services/hsk/hsk30-source';
import { hsk30LearningGroups } from '@/services/learning/learn-sources';
import { groupVocabularyByTopic } from '@/services/learning/vocabulary-topics';
import { toLocalDateKey } from '@/services/stats/calendar';

async function fixture() {
  const raw = createLegacyDatabase();
  const db = expoAdapter(raw);
  await migrateDatabaseSchema(db);
  raw.exec("UPDATE user_vocabulary_progress SET status='NEW',studied=0,is_known=0,is_suspended=0");
  const add = raw.prepare(`INSERT INTO vocabulary(id,simplified,traditional,pinyin,pinyin_numeric,
    primary_meaning_vi,meanings_vi,meanings_en,pos,hsk_band,source,source_version,source_url,
    translation_status,search_text,is_custom,deck_id,frequency_rank)
    SELECT ?,?,?,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,pos,'5',
      source,source_version,source_url,translation_status,search_text,0,NULL,?
    FROM vocabulary WHERE id='hsk-1-ni'`);
  for (let i = 0; i < 85; i++) add.run(`word-${i}`, `词${i}`, `詞${i}`, i);
  raw.exec("INSERT INTO personal_deck(id,name,color,created_at,updated_at,deleted_at) VALUES('trash','Trash','#2457D6','2026-01-01','2026-01-01','2026-01-02')");
  raw.exec("INSERT INTO personal_deck_vocabulary(deck_id,vocabulary_id,created_at) VALUES('deck-1','word-0','2026-01-01'),('trash','word-1','2026-01-01')");
  return { raw, db };
}

describe('bounded learning catalog reads', () => {
  it('reads installed sense-matched syllabus levels without examples or legacy-band classification', async () => {
    const { raw, db } = await fixture();
    try {
      expect(await getHskLearningGroups(db)).toBeNull();
      raw.prepare("INSERT INTO hsk_standard_versions(id,name,version,source,status,created_at) VALUES(?,'QA','QA','fixture','UNVERIFIED','2026-01-01')").run(HSK30_VERSION);
      raw.prepare("INSERT INTO hsk_syllabus_imports(version_id,zip_sha256,installed_at,item_count,example_count) VALUES(?,?,'2026-01-01',5,0)").run(HSK30_VERSION, '0'.repeat(64));
      const item = raw.prepare("INSERT INTO hsk_syllabus_items(version_id,kind,source_id,level,source_order,content_json) VALUES(?,'vocabulary',?,'1',?,'{}')");
      const link = raw.prepare("INSERT INTO hsk_syllabus_links(version_id,kind,source_id,vocabulary_id,status,candidates_json) VALUES(?,'vocabulary',?,?,?,'[]')");
      for (const [order, id, status] of [[0,'word-0','MATCHED'],[1,'word-0','MATCHED'],[2,'word-1','MATCHED'],[3,null,'CONFLICT'],[4,null,'MISSING']] as const) {
        item.run(HSK30_VERSION, String(order), order);
        link.run(HSK30_VERSION, String(order), id, status);
      }
      raw.exec("INSERT INTO user_vocabulary_progress(vocabulary_id,status,studied,is_known,due,next_review_at,created_at,updated_at) VALUES('word-1','KNOWN',1,1,'2026-01-01','2026-01-01','2026-01-01','2026-01-01')");
      raw.exec('PRAGMA query_only=ON');
      const groups = await getHskLearningGroups(db);
      expect(groups?.get('1')).toEqual(['word-0']); // word-0 belongs to legacy band 5.
      expect(groups?.get('7-9')).toEqual([]);
      expect(groups?.size).toBe(7);
    } finally { raw.close(); }
  });

  it('preserves deduplication, eligibility, topic and official HSK matching without loading examples', async () => {
    const { raw, db } = await fixture();
    try {
      raw.exec(`INSERT INTO user_vocabulary_progress(vocabulary_id,status,studied,is_known,is_suspended,due,next_review_at,created_at,updated_at)
        VALUES('word-0','LEARNING',1,0,0,'2026-01-01','2026-01-01','2026-01-01','2026-01-01'),
        ('word-1','KNOWN',1,1,0,'2026-01-01','2026-01-01','2026-01-01','2026-01-01'),
        ('word-2','SKIPPED',0,0,0,'2026-01-01','2026-01-01','2026-01-01','2026-01-01'),
        ('word-3','NEW',0,0,1,'2026-01-01','2026-01-01','2026-01-01','2026-01-01')`);
      raw.exec("UPDATE vocabulary SET simplified='词0',pinyin=(SELECT pinyin FROM vocabulary WHERE id='word-0') WHERE id='word-4'");
      const before = raw.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all();
      raw.exec('PRAGMA query_only=ON');
      const queries: string[] = [];
      const observed = { ...db, getAllAsync: async <T>(sql: string, ...args: unknown[]) => {
        queries.push(sql);
        return db.getAllAsync<T>(sql, ...args as (string | number | null)[]);
      }} as typeof db;
      const catalog = await getUnlearnedCatalog(observed);
      expect(queries).toHaveLength(1);
      expect(queries[0]).not.toContain('example_sentence');
      expect(catalog.some(word => 'examples' in word || 'classifiers' in word)).toBe(false);
      const old = (await getUnlearnedVocabulary(db, [1,2,3,4,5,6,'7-9'], 20_000)).filter(word => !word.isCustom);
      expect(catalog.map(word => word.id)).toEqual(old.map(word => word.id));
      expect(catalog.some(word => ['word-0','word-1','word-2','word-3','word-4','custom-1'].includes(word.id))).toBe(false);
      const ids = (groups: Map<string, { id: string }[]>) => Array.from(groups, ([key, words]) => [key, words.map(word => word.id)]);
      expect(ids(groupVocabularyByTopic(catalog))).toEqual(ids(groupVocabularyByTopic(old)));
      expect(ids(hsk30LearningGroups(catalog))).toEqual(ids(hsk30LearningGroups(old)));
      expect(raw.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all()).toEqual(before);
    } finally { raw.close(); }
  });

  it('hydrates at most 40 words per read, preserves order and continues without duplicates', async () => {
    const { raw, db } = await fixture();
    try {
      raw.exec('PRAGMA query_only=ON');
      const ids = (await getUnlearnedCatalog(db)).map(word => word.id);
      const pages = [];
      let offset = 0;
      while (offset < ids.length) {
        const page = await getLearningWordBatch(db, ids, offset);
        expect(page.words.length).toBeLessThanOrEqual(40);
        expect(page.nextOffset).toBeGreaterThan(offset);
        pages.push(...page.words);
        offset = page.nextOffset;
      }
      expect(pages.map(word => word.id)).toEqual(ids);
      const original = (await getUnlearnedVocabulary(db, [1,2,3,4,5,6,'7-9'], 20_000)).filter(word => !word.isCustom);
      expect(pages.map(word => word.examples)).toEqual(original.map(word => word.examples));
      expect(await getLearningWordBatch(db, ids, offset)).toEqual({ words: [], nextOffset: offset });
      await expect(getLearningWordPage(db, ids.slice(0, 41))).rejects.toThrow('LEARNING_PAGE_TOO_LARGE');
      await expect(getLearningWordBatch(db, ids, -1)).rejects.toThrow('INVALID_LEARNING_OFFSET');
    } finally { raw.close(); }
  });

  it('rechecks progress and skips an exhausted page after a catalog was read', async () => {
    const { raw, db } = await fixture();
    try {
      const ids = (await getUnlearnedCatalog(db)).map(word => word.id);
      const mark = raw.prepare(`INSERT INTO user_vocabulary_progress(vocabulary_id,status,studied,is_known,due,next_review_at,created_at,updated_at)
        VALUES(?,'KNOWN',1,1,'2026-01-01','2026-01-01','2026-01-01','2026-01-01')`);
      for (const id of ids.slice(0, 40)) mark.run(id);
      raw.exec('PRAGMA query_only=ON');
      const page = await getLearningWordBatch(db, ids);
      expect(page.words.map(word => word.id)).toEqual(ids.slice(40, 80));
      expect(page.nextOffset).toBe(80);
    } finally { raw.close(); }
  });

  it('isolates active private decks and rejects membership in a deleted deck', async () => {
    const { raw, db } = await fixture();
    try {
      raw.exec('PRAGMA query_only=ON');
      expect((await getUnlearnedCatalog(db, 'deck-1')).map(word => word.id).sort()).toEqual(['custom-1', 'word-0']);
      expect(await getUnlearnedCatalog(db, 'trash')).toEqual([]);
      expect((await getLearningWordBatch(db, ['word-1','word-0','custom-1'], 0, 'deck-1')).words.map(word => word.id)).toEqual(['word-0','custom-1']);
      expect((await getLearningWordBatch(db, ['word-1'], 0, 'trash')).words).toEqual([]);
    } finally { raw.close(); }
  });

  it('reads only today’s local daily count without a dashboard aggregation or writes', async () => {
    const { raw, db } = await fixture();
    try {
      raw.prepare('INSERT INTO daily_stats(date,new_words) VALUES(?,7)').run(toLocalDateKey(new Date()));
      raw.exec('PRAGMA query_only=ON');
      expect(await getNewWordsLearnedToday(db)).toBe(7);
    } finally { raw.close(); }
  });
});
