import { describe, expect, it } from 'vitest';

import { storiesV5Drafts, validatePublishedStoryPack, type StoryDraft } from '../data/stories-v5';
import { transitionContentReview } from '../services/content/review-workflow';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { getStory, getStoryQuestions, importPublishedStoryPack, listStories, recordStoryAnswer, recordStoryQuiz,
  seedStories, splitStorySentences, storySeed } from './stories';

/** Synthetic evidence solely exercises the gate; no real content review is claimed. */
function publishedFixture(index = 0): StoryDraft {
  const original = structuredClone(storiesV5Drafts[index]!);
  let review = original.review;
  const evidence = { reviewer: 'TEST FIXTURE — not an actual reviewer', reviewedAt: '2026-10-01T00:00:00.000Z',
    reviewNotes: 'Synthetic test evidence only', sourceRef: 'test-fixture', licenseEvidence: 'Synthetic test rights',
    verificationEvidence: 'Synthetic verification, no academic approval' };
  for (const next of ['REVIEWED', 'VERIFIED', 'PUBLISHED'] as const) {
    review = transitionContentReview(review, { actor: 'HUMAN', next, expectedRevision: review.revision, evidence });
  }
  return { ...original, review };
}

describe('progress-safe V5 story integration', () => {
  it('preserves all 18 legacy IDs and never seeds drafts', async () => {
    expect(storySeed.map((s) => s.id)).toEqual([
      'story-school-1', 'story-new-friend-hsk1', 'story-rainy-day-hsk1', 'story-fruit-shop-hsk1',
      'story-family-dinner-hsk1', 'story-lost-pencil-hsk1', 'story-weekend-2', 'story-birthday-hsk2',
      'story-wrong-bus-hsk2', 'story-library-book-hsk2', 'story-learn-swimming-hsk2', 'story-supermarket-list-hsk2',
      'story-letter-3', 'story-train-visit-hsk3', 'story-old-photo-hsk3', 'story-lost-dog-hsk3',
      'story-message-mixup-hsk3', 'story-neighborhood-trees-hsk3',
    ]);
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db); await seedStories(db); await seedStories(db);
      expect(await listStories(db)).toHaveLength(18);
      await expect(importPublishedStoryPack(db, storiesV5Drafts)).rejects.toThrow('STORY_PUBLICATION_GATE_REQUIRED');
      expect(await listStories(db)).toHaveLength(18);
      await expect(recordStoryQuiz(db, storiesV5Drafts[0]!.id, [0, 0, 0])).rejects.toThrow('STORY_QUIZ_INCOMPLETE');
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM story_progress').get()).toEqual({ n: 0 });
    } finally { sqlite.close(); }
  });

  it('imports all three questions once, skips existing IDs, and records one full-quiz attempt', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db); await seedStories(db);
      await recordStoryAnswer(db, 'story-school-1', true);
      const legacyBefore = await getStory(db, 'story-school-1');
      const pack = [publishedFixture(), publishedFixture(1)];
      expect(await importPublishedStoryPack(db, pack)).toEqual({ inserted: 2, skipped: 0 });
      expect(await getStoryQuestions(db, pack[0]!.id)).toHaveLength(3);
      await expect(recordStoryAnswer(db, pack[0]!.id, true)).rejects.toThrow('STORY_FULL_QUIZ_REQUIRED');
      expect(await getStory(db, pack[0]!.id)).toMatchObject({ attempts: 0, best_score: 0 });
      await expect(recordStoryQuiz(db, pack[0]!.id, [0])).rejects.toThrow('STORY_QUIZ_INCOMPLETE');
      await expect(recordStoryQuiz(db, pack[0]!.id, [0, 1, -1])).rejects.toThrow('STORY_QUIZ_INCOMPLETE');
      await recordStoryQuiz(db, pack[0]!.id, pack[0]!.questions.map((q) => q.answer));
      await recordStoryQuiz(db, pack[0]!.id, [0, 0, 0]);
      expect(await getStory(db, pack[0]!.id)).toMatchObject({ attempts: 2, best_score: 1 });
      const before = await getStory(db, pack[0]!.id);
      const questionsBefore = await getStoryQuestions(db, pack[0]!.id);
      expect(await importPublishedStoryPack(db, [{ ...pack[0], title: 'Changed title' }])).toEqual({ inserted: 0, skipped: 1 });
      expect(await getStory(db, pack[0]!.id)).toEqual(before);
      expect(await getStoryQuestions(db, pack[0]!.id)).toEqual(questionsBefore);
      expect(await getStory(db, 'story-school-1')).toEqual(legacyBefore);
      expect(() => validatePublishedStoryPack([pack[0], pack[0]])).toThrow('DUPLICATE_STORY_ID');
      sqlite.prepare('UPDATE stories SET is_active=0 WHERE id=?').run(pack[0]!.id);
      expect(await getStory(db, pack[0]!.id)).toBeNull();
      expect((await listStories(db)).some((s) => s.id === pack[0]!.id)).toBe(false);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('rejects an invalid trailing record before writes and rolls back question collisions', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db); await seedStories(db);
      const pack = [publishedFixture(), publishedFixture(1)];
      await expect(importPublishedStoryPack(db, [pack[0], storiesV5Drafts[1]])).rejects.toThrow('STORY_PUBLICATION_GATE_REQUIRED');
      expect(await listStories(db)).toHaveLength(18);
      sqlite.prepare('INSERT INTO story_questions(id,story_id,prompt_vi,choices_json,correct_index) VALUES(?,?,?,?,?)')
        .run(`${pack[1]!.id}-q1`, 'story-school-1', 'User saved question', '["A","B","C"]', 0);
      await expect(importPublishedStoryPack(db, pack)).rejects.toThrow();
      expect(await listStories(db)).toHaveLength(18);
      expect(await getStoryQuestions(db, pack[0]!.id)).toHaveLength(0);
      expect(await getStoryQuestions(db, 'story-school-1')).toHaveLength(2);
    } finally { sqlite.close(); }
  });
});

describe('sentence replay boundaries', () => {
  it('keeps Chinese punctuation and separates line breaks without empty utterances', () => {
    expect(splitStorySentences('今天下雨。你来吗？\n我在家！')).toEqual(['今天下雨。', '你来吗？', '我在家！']);
    expect(splitStorySentences('')).toEqual([]);
    expect(splitStorySentences('  没有句号\n下一行  ')).toEqual(['没有句号', '下一行']);
  });
});
