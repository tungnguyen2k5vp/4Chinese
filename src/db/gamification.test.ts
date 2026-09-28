import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { awardActivityXp, getGamificationSummary, setWeeklyStudyGoal } from './gamification';
import { migrateDatabaseSchema } from './migrations';

import { parseLocalBackup } from '@/services/backup/format';
import { localWeek, longestStudyStreak } from '@/services/stats/gamification';

describe('gamification uses evidence, without resetting legacy state', () => {
  it('calculates local Monday–Sunday across year boundaries and deduplicates streak days', () => {
    expect(localWeek(new Date(2026, 0, 1))).toEqual({ start: '2025-12-29', end: '2026-01-04' });
    expect(longestStudyStreak(['2025-12-31', '2026-01-02', '2026-01-01', '2026-01-01', '2026-01-04'])).toBe(3);
  });
  it('awards once per content/day, persists weekly target and includes only current week', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      const old = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      await migrateDatabaseSchema(db);
      const now = new Date(2026, 8, 27, 15);
      expect((await getGamificationSummary(db, 30, now)).totalXp).toBe(0);
      await awardActivityXp(db, 'learn', 'custom-1', now);
      await awardActivityXp(db, 'learn', 'custom-1', new Date(2026, 8, 28));
      await awardActivityXp(db, 'tone', 'read:custom-1', now);
      await awardActivityXp(db, 'tone', 'read:custom-1', now);
      await awardActivityXp(db, 'tone', 'listen:custom-1', now);
      await setWeeklyStudyGoal(db, 120);
      sqlite.exec("INSERT INTO daily_stats(date,study_seconds) VALUES('2026-09-21',120),('2026-09-27',600),('2026-09-28',9000)");
      const result = await getGamificationSummary(db, 30, now);
      expect(result.totalXp).toBe(16);
      expect(result.todayXp).toBe(16);
      expect(result.weeklyMinutes).toBe(120);
      expect(result.weeklySeconds).toBe(720);
      expect(result.achievements.find((item) => item.id === 'listening-100')?.progress).toBe(1);
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(old);
      const backup = parseLocalBackup(JSON.stringify(await exportLocalBackup(db, 'test')));
      await importLocalBackup(db, backup);
      expect(await getGamificationSummary(db, 30, now)).toEqual(result);
      await expect(setWeeklyStudyGoal(db, 0)).rejects.toThrow('INVALID_WEEKLY_GOAL');
    } finally { sqlite.close(); }
  });
  it('unlocks from historical evidence once, preserves unlock after streak breaks, restores and rolls back invalid data', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      for (let day = 1; day <= 7; day++) sqlite.prepare('INSERT INTO daily_stats(date,new_words) VALUES(?,1)').run(`2026-09-0${day}`);
      const result = await getGamificationSummary(db, 30, new Date(2026, 8, 7));
      const unlocked = result.achievements.find((item) => item.id === 'streak-7')!.unlockedAt;
      expect(unlocked).not.toBeNull();
      const later = await getGamificationSummary(db, 30, new Date(2026, 8, 27));
      expect(later.streak).toBe(0);
      expect(later.achievements.find((item) => item.id === 'streak-7')!.unlockedAt).toBe(unlocked);
      const backup = await exportLocalBackup(db, 'test');
      await importLocalBackup(db, backup);
      const original = sqlite.prepare('SELECT * FROM user_achievements').all();
      backup.data.userAchievements = [{ achievement_id: 'not-in-catalog', unlocked_at: '2026-09-27' }];
      await expect(importLocalBackup(db, backup)).rejects.toThrow();
      expect(sqlite.prepare('SELECT * FROM user_achievements').all()).toEqual(original);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});
