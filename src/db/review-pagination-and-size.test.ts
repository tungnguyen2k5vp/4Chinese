import { describe, expect, it } from "vitest";

import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { migrateDatabaseSchema } from "./migrations";
import { getDueVocabulary, getLearnedReviewPage, getSettings, saveSettings } from "./repository";

import { REVIEW_SESSION_SIZES } from "@/services/review/session-size";
import { useAppStore } from "@/stores/app-store";

async function fixture() {
  const raw = createLegacyDatabase();
  const db = expoAdapter(raw);
  await migrateDatabaseSchema(db);
  raw.exec("UPDATE user_vocabulary_progress SET studied=0,status='NEW',is_known=0");
  raw.exec("INSERT INTO personal_deck(id,name,color,created_at,updated_at,deleted_at) VALUES('trash','Trash','#2457D6','2026-01-01','2026-01-01','2026-01-02')");
  const insertWord = raw.prepare(`INSERT INTO vocabulary(id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,pos,hsk_band,source,source_version,source_url,translation_status,search_text,is_custom,deck_id)
    SELECT ?,?,?,pinyin,pinyin_numeric,?,meanings_vi,meanings_en,pos,?,source,source_version,source_url,translation_status,search_text,1,? FROM vocabulary WHERE id='custom-1'`);
  const insertProgress = raw.prepare(`INSERT INTO user_vocabulary_progress(vocabulary_id,status,studied,due,next_review_at,state,memory_level,mastery_level,is_known,is_suspended,created_at,updated_at) VALUES(?,?,?,?,?,2,3,3,?,?,?,?)`);
  for (let index = 0; index < 125; index++) {
    const id = `page-${String(index).padStart(3, '0')}`;
    const due = index < 65 ? '2020-01-01T00:00:00Z' : '2099-01-01T00:00:00Z';
    insertWord.run(id, `词${index}`, `詞${index}`, `QA ${index}`, index % 2 ? '5' : '1', index === 124 ? 'trash' : index % 3 ? 'deck-1' : null);
    insertProgress.run(id, index === 121 ? 'KNOWN' : index === 123 ? 'NEW' : 'LEARNING', index === 123 ? 0 : 1, due, due, index === 121 ? 1 : 0, index === 122 ? 1 : 0, '2026-01-01', '2026-01-01');
  }
  raw.exec("INSERT INTO personal_deck_vocabulary(deck_id,vocabulary_id,created_at) SELECT deck_id,id,'2026-01-01' FROM vocabulary WHERE id LIKE 'page-%' AND deck_id IS NOT NULL");
  raw.exec("UPDATE user_vocabulary_progress SET memory_level=6,mastery_level=6 WHERE vocabulary_id='page-120'");
  return { raw, db };
}

describe('learned review pages and configurable sessions', () => {
  it('paginates all learned words across bands/decks, including due, known and suspended words', async () => {
    const { raw, db } = await fixture();
    try {
      const before = JSON.stringify(raw.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all());
      const pages = await Promise.all([1,2,3].map(page => getLearnedReviewPage(db,page)));
      expect(pages.map(page => page.words.length)).toEqual([50,50,23]);
      expect(pages.every(page => page.total === 123 && page.totalPages === 3)).toBe(true);
      const words = pages.flatMap(page => page.words);
      expect(new Set(words.map(word => word.id)).size).toBe(123);
      expect(words.some(word => word.hskBand === 5 && word.deckId === 'deck-1')).toBe(true);
      expect(words.some(word => word.nextReviewAt?.startsWith('2020'))).toBe(true);
      expect(words.find(word => word.id === 'page-121')?.isKnown).toBe(true);
      expect(words.find(word => word.id === 'page-122')?.isSuspended).toBe(true);
      expect(words.find(word => word.id === 'page-120')?.masteryLevel).toBe(6);
      expect(words.some(word => ['page-123','page-124'].includes(word.id))).toBe(false);
      expect((await getLearnedReviewPage(db,2)).words.map(word => word.id)).toEqual(pages[1]!.words.map(word => word.id));
      expect(JSON.stringify(raw.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all())).toBe(before);
      expect((await getLearnedReviewPage(db,999)).page).toBe(3);
      raw.exec("DELETE FROM user_vocabulary_progress WHERE vocabulary_id >= 'page-099' AND vocabulary_id LIKE 'page-%'");
      expect(await getLearnedReviewPage(db,3)).toMatchObject({page:2,total:99,totalPages:2});
    } finally { raw.close(); }
  });

  it('persists each supported size and queues exactly that many unique due words', async () => {
    const { raw, db } = await fixture();
    const previous = useAppStore.getState();
    try {
      for (const size of REVIEW_SESSION_SIZES) {
        await saveSettings(db,{...await getSettings(db),reviewSessionSize:size});
        const settings = await getSettings(db);
        expect(settings.reviewSessionSize).toBe(size);
        useAppStore.getState().setSettings(settings);
        const words = await getDueVocabulary(db,size);
        expect(words).toHaveLength(size);
        useAppStore.getState().setReviewQueue([words[0]!,...words]);
        expect(useAppStore.getState().reviewQueue).toHaveLength(size);
        expect(new Set(useAppStore.getState().reviewQueue.map(word=>word.id)).size).toBe(size);
      }
      // Explicit setup selection works even if the store previously held five.
      useAppStore.getState().setSettings({...await getSettings(db),reviewSessionSize:5});
      useAppStore.getState().setReviewQueue(await getDueVocabulary(db,15),15);
      expect(useAppStore.getState().reviewQueue).toHaveLength(15);
      raw.prepare('UPDATE user_settings SET value=? WHERE id=1').run(JSON.stringify({reviewSessionSize:50}));
      expect((await getSettings(db)).reviewSessionSize).toBe(10);
    } finally { useAppStore.setState(previous); raw.close(); }
  });
});
