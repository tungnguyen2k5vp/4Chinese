import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { completeLesson, completeLessonActivity, isLessonUnlocked, listCompletedLessonActivityIds,
  listLearningCourses, listLearningLessons, listLessonActivities, seedLearningPath, startLesson } from './learning-path';
import { migrateDatabaseSchema } from './migrations';

describe('additive learning path', () => {
  it('seeds stable lessons, unlocks in order and preserves progress in Backup 2.0', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await seedLearningPath(db);
      await seedLearningPath(db);
      const courses = await listLearningCourses(db);
      expect(courses).toHaveLength(7);
      const lessons = await listLearningLessons(db, 'hsk-1-path');
      expect(lessons).toHaveLength(2);
      expect(isLessonUnlocked(lessons, 0)).toBe(true);
      expect(isLessonUnlocked(lessons, 1)).toBe(false);
      await startLesson(db, lessons[0]!.id);
      await expect(completeLesson(db, lessons[0]!.id)).rejects.toThrow('LESSON_ACTIVITIES_INCOMPLETE');
      const activities = await listLessonActivities(db, lessons[0]!.id);
      for (const activity of activities) await completeLessonActivity(db, activity.id);
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
