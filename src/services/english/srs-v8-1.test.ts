import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { addEnglishDictionaryCard, createEnglishDeck, englishDueQueue, englishQuickQueue, initializeEnglishLearner, reviewEnglishCard, startEnglishCard } from '@/db/english/learner';
import { expoAdapter } from '@/db/fixtures/legacy_database';
import { applyReview } from '@/services/srs/scheduler';

describe('V8.1 scheduler equivalence and sense integrity for all persisted modes', () => {
  it.each(['MEANING', 'SPELLING', 'LISTENING'] as const)('%s: correct/wrong, one event, due and notes retained', async mode => {
    for (const correct of [true, false]) {
      const fixtureDirectory = mkdtempSync(join(tmpdir(), 'fourchinese-v81-srs-'));
      const fixturePath = join(fixtureDirectory, 'learner.db');
      let raw = new DatabaseSync(fixturePath);
      try {
        const db = expoAdapter(raw); await initializeEnglishLearner(db);
        await createEnglishDeck(db, 'en:deck:srs', 'SRS fixture');
        await addEnglishDictionaryCard(db, { id: 'en:card:bank', deck_id: 'en:deck:srs', headword: 'bank', meaning_vi: 'ngân hàng — nghĩa tự chọn', pos: 'danh từ', ipa: '', sense_id: 'en:sky:wd:bank-selected', source_id: 'USER', notes: 'Retain my notes' });
        await startEnglishCard(db, 'en:card:bank', new Date('2026-10-01T00:00:00Z'));
        const date = new Date('2026-10-13T00:00:00Z');
        const card = (await englishDueQueue(db, date))[0]!;
        const input = { correct, responseTimeMs: 1200 };
        const expected = applyReview(JSON.parse(card.progress_json), input, date);
        const context = { learningLanguage: 'en', uiLocale: 'vi', pronunciationVariant: 'en-US', sessionId: 'en:session:qa' } as const;
        expect(await reviewEnglishCard(db, context, `qa-${mode}-${correct}`, card.id, card.revision, input, mode, date)).toEqual(expected);
        expect(await reviewEnglishCard(db, context, `qa-${mode}-${correct}`, card.id, card.revision, input, mode, date)).toEqual(expected);
        const saved = await db.getFirstAsync<{ sense_id: string; meaning_vi: string; notes: string; next_review_at: string }>('SELECT * FROM en_cards WHERE id=?', card.id);
        expect(saved).toMatchObject({ sense_id: card.sense_id, meaning_vi: card.meaning_vi, notes: card.notes, next_review_at: expected.nextReviewAt });
        expect(raw.prepare('SELECT count(*) n FROM en_reviews').get()?.n).toBe(1);
        const before = JSON.stringify(raw.prepare('SELECT * FROM en_cards').all());
        await englishQuickQueue(db, date, 0);
        expect(JSON.stringify(raw.prepare('SELECT * FROM en_cards').all())).toBe(before);
        raw.close();
        raw = new DatabaseSync(fixturePath, { readOnly: true });
        expect(raw.prepare('SELECT next_review_at,sense_id,meaning_vi,notes FROM en_cards WHERE id=?').get(card.id)).toEqual({ next_review_at: expected.nextReviewAt, sense_id: card.sense_id, meaning_vi: card.meaning_vi, notes: card.notes });
        expect(raw.prepare('SELECT count(*) n FROM en_reviews').get()?.n).toBe(1);
      } finally { raw.close(); rmSync(fixtureDirectory, { recursive: true }); }
    }
  });
});
