import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { englishDialogues, englishReadingLessons, publishedEnglishContent } from './english-learning-content';

import { readEnglishContentProgress, saveEnglishContentProgress } from '@/db/english/content-progress';
import { initializeEnglishLearner } from '@/db/english/learner';
import { expoAdapter } from '@/db/fixtures/legacy_database';

describe('reviewable original learning content', () => {
  it('has complete original metadata; no automatically published or CEFR-certified draft', () => {
    expect(englishDialogues).toHaveLength(6);
    expect(englishReadingLessons).toHaveLength(4);
    expect(publishedEnglishContent(englishDialogues)).toEqual([]);
    expect(publishedEnglishContent(englishReadingLessons)).toEqual([]);
    for (const row of [...englishDialogues, ...englishReadingLessons]) {
      expect(row.metadata).toMatchObject({ rights: 'ORIGINAL_NO_THIRD_PARTY', publication: 'DRAFT', review: 'REVIEW_REQUIRED', version: 'V8.1' });
      expect(row.metadata.attribution.length).toBeGreaterThan(10);
    }
  });
  it('supports sequential dialogue turns and truthful learning modes, no fake accuracy', () => {
    for (const lesson of englishDialogues) {
      expect(lesson.turns.length).toBeGreaterThanOrEqual(6);
      expect(lesson.turns.length).toBeLessThanOrEqual(8);
      for (const [index, turn] of lesson.turns.entries()) {
        expect(turn.speaker).toBe(index % 2 ? 'B' : 'A');
        expect(turn.en.length).toBeGreaterThan(5); expect(turn.vi.length).toBeGreaterThan(5);
      }
      expect(lesson.audio).toBe('DEVICE_TTS');
      expect(lesson).not.toHaveProperty('accuracy'); expect(lesson).not.toHaveProperty('cefr');
    }
  });
  it('uses a separate existing draft key and retains the personal Reader and schema', async () => {
    const raw = new DatabaseSync(':memory:');
    try {
      const db = expoAdapter(raw); await initializeEnglishLearner(db);
      await db.runAsync('INSERT INTO en_drafts VALUES(?,?)', 'reader-document', '{"title":"Private retained"}');
      expect(await readEnglishContentProgress(db, 'everyday-learning')).toEqual({ position: 0, completed: false });
      await saveEnglishContentProgress(db, 'everyday-learning', { position: 0, completed: true });
      expect((await readEnglishContentProgress(db, 'everyday-learning')).completed).toBe(true);
      expect(raw.prepare('SELECT payload_json FROM en_drafts WHERE id=?').get('reader-document')?.payload_json).toBe('{"title":"Private retained"}');
      expect(raw.prepare('PRAGMA user_version').get()?.user_version).toBe(1);
      expect(raw.prepare('SELECT count(*) n FROM en_reviews').get()?.n).toBe(0);
    } finally { raw.close(); }
  });
});
