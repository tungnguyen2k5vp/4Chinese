import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { getStoryQuestions, listStories, recordStoryAnswer, seedStories } from './stories';

describe('graded stories', () => {
  it('seeds idempotently and restores comprehension progress', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await seedStories(db); await seedStories(db);
      const stories = await listStories(db);
      expect(stories).toHaveLength(18);
      expect(new Set(stories.map((story) => story.id)).size).toBe(stories.length);
      expect(new Set(stories.map((story) => story.title)).size).toBe(stories.length);
      expect(stories.map((story) => story.hsk_level).sort()).toEqual([
        ...Array(6).fill('1'), ...Array(6).fill('2'), ...Array(6).fill('3'),
      ]);
      for (const story of stories) {
        expect(story.content).toMatch(/\p{Script=Han}/u);
        expect(Array.from(story.content).length).toBeGreaterThan(30);
        expect(story.content).not.toMatch(/TODO|lorem ipsum|placeholder|\.{3}/iu);
        const [question] = await getStoryQuestions(db, story.id);
        if (!question) throw new Error(`MISSING_STORY_QUESTION:${story.id}`);
        expect(question.prompt_vi.trim().length).toBeGreaterThan(10);
        const choices = JSON.parse(question.choices_json) as string[];
        expect(choices).toHaveLength(3);
        expect(new Set(choices).size).toBe(choices.length);
        expect(Number.isInteger(question.correct_index)).toBe(true);
        expect(question.correct_index).toBeGreaterThanOrEqual(0);
        expect(question.correct_index).toBeLessThan(choices.length);
      }
      expect(await getStoryQuestions(db, 'story-school-1')).toHaveLength(1);
      await recordStoryAnswer(db, 'story-school-1', true);
      await recordStoryAnswer(db, 'story-school-1', false);
      const backup = await exportLocalBackup(db, 'test');
      sqlite.exec('DELETE FROM story_progress');
      await importLocalBackup(db, backup);
      expect((await listStories(db)).find((story) => story.id === 'story-school-1'))
        .toMatchObject({ best_score: 1, attempts: 2 });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});
