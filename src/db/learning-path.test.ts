import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { listGrammarPoints, seedGrammarContent } from './grammar';
import { completeLesson, isLessonUnlocked, listCompletedLessonActivityIds, recordLessonActivityEvidence,
  listLearningCourses, listLearningLessons, listLessonActivities, parseLearningVocabularyTarget, seedLearningPath, startLesson } from './learning-path';
import { migrateDatabaseSchema } from './migrations';
import { listVocabulary } from './repository';

describe('additive learning path', () => {
  it('seeds stable lessons, unlocks in order and preserves progress in Backup 2.0', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await seedGrammarContent(db, []);
      await seedLearningPath(db);
      await seedLearningPath(db);
      const courses = await listLearningCourses(db);
      expect(courses).toHaveLength(7);
      const lessons = await listLearningLessons(db, 'hsk-1-path');
      expect(lessons).toHaveLength(7 + (await listGrammarPoints(db, '1')).length);
      expect(isLessonUnlocked(lessons, 0)).toBe(true);
      expect(isLessonUnlocked(lessons, 1)).toBe(false);
      const wordLessons = lessons.filter((item) => item.id.startsWith('hsk-1-words-'));
      expect(wordLessons).toHaveLength(1);
      const wordActivities = await listLessonActivities(db, wordLessons[0]!.id);
      expect(parseLearningVocabularyTarget(wordActivities[0]?.target)).toEqual({ band: '1', offset: 0, limit: 2 });
      expect(parseLearningVocabularyTarget('1')).toBeNull();
      expect(parseLearningVocabularyTarget('1:0:1000')).toBeNull();
      const firstWordPage = await listVocabulary(db, { band: 1, limit: 1, bandSlice: { offset: 0, limit: 1 } });
      const secondWordPage = await listVocabulary(db, { band: 1, limit: 1, bandSlice: { offset: 1, limit: 1 } });
      expect(firstWordPage).toHaveLength(1);
      expect(secondWordPage).toHaveLength(1);
      expect(firstWordPage[0]?.id).not.toBe(secondWordPage[0]?.id);
      await startLesson(db, lessons[0]!.id);
      await expect(completeLesson(db, lessons[0]!.id)).rejects.toThrow('LESSON_ACTIVITIES_INCOMPLETE');
      const activities = await listLessonActivities(db, lessons[0]!.id);
      const evidence = ['VOCABULARY_DETAIL_VIEWED', 'READING_TOKENS_ANALYZED', 'GRAMMAR_CORRECT_ANSWER'] as const;
      for (const [index, activity] of activities.entries()) await recordLessonActivityEvidence(db, activity.id, evidence[index]!, 'test-' + index);
      expect(await listCompletedLessonActivityIds(db, lessons[0]!.id)).toEqual(activities.map((item) => item.id));
      await completeLesson(db, lessons[0]!.id);
      expect(isLessonUnlocked(await listLearningLessons(db, 'hsk-1-path'), 1)).toBe(true);
      const backup = await exportLocalBackup(db, 'test');
      expect(backup.data.lessonProgress).toHaveLength(1);
      expect(backup.data.lessonActivityProgress).toHaveLength(activities.length);
      sqlite.exec('DELETE FROM lesson_activity_progress');
      sqlite.exec('DELETE FROM lesson_progress');
      await importLocalBackup(db, backup);
      expect((await listLearningCourses(db))[0]?.earned_xp).toBe(20);
      expect(await listCompletedLessonActivityIds(db, lessons[0]!.id)).toHaveLength(activities.length);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});
