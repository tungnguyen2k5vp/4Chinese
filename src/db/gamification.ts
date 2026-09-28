import type { SQLiteDatabase } from 'expo-sqlite';

import { calculateStreak, toLocalDateKey } from '@/services/stats/calendar';
import { achievementDefinitions, localWeek, longestStudyStreak, type AchievementMetric } from '@/services/stats/gamification';

export type XpActivity = 'learn' | 'review' | 'grammar' | 'tone' | 'shadowing' | 'story';
const rewards: Record<XpActivity, number> = { learn: 10, review: 5, grammar: 5, tone: 3, shadowing: 5, story: 15 };

/** Called inside the activity's transaction. A word/content earns at most once
 * per local day; first learning/story comprehension earn once in total. */
export async function awardActivityXp(db: SQLiteDatabase, activity: XpActivity, entityId: string, now = new Date()): Promise<void> {
  if (!entityId || entityId.length > 240 || !Number.isFinite(now.getTime())) throw new Error('INVALID_XP_EVENT');
  const day = toLocalDateKey(now);
  const id = JSON.stringify([activity, entityId, activity === 'learn' || activity === 'story' ? 'once' : day]);
  await db.runAsync(`INSERT OR IGNORE INTO xp_events(id,activity,entity_id,points,local_date,created_at)
    VALUES(?,?,?,?,?,?)`, id, activity, entityId, rewards[activity], day, now.toISOString());
}

export type Achievement = { id: string; title: string; threshold: number; progress: number; unlockedAt: string | null };
export type GamificationSummary = { totalXp: number; todayXp: number; streak: number; bestStreak: number;
  weeklyMinutes: number; weeklySeconds: number; week: { start: string; end: string }; achievements: Achievement[] };

export async function setWeeklyStudyGoal(db: SQLiteDatabase, minutes: number): Promise<void> {
  if (!Number.isInteger(minutes) || minutes < 30 || minutes > 2100) throw new Error('INVALID_WEEKLY_GOAL');
  await db.runAsync(`INSERT INTO learning_goals(id,weekly_minutes,updated_at) VALUES(1,?,?)
    ON CONFLICT(id) DO UPDATE SET weekly_minutes=excluded.weekly_minutes,updated_at=excluded.updated_at`, minutes, new Date().toISOString());
}

export async function seedAchievements(db: SQLiteDatabase): Promise<void> {
  for (const item of achievementDefinitions) await db.runAsync(
    'INSERT OR IGNORE INTO achievements(id,title,metric,threshold) VALUES(?,?,?,?)', item.id, item.title, item.metric, item.threshold);
}

/** XP is explicit new activity history, never manufactured from legacy totals.
 * Historical achievements can be unlocked from existing, verifiable progress. */
export async function getGamificationSummary(db: SQLiteDatabase, dailyGoalMinutes: number, now = new Date()): Promise<GamificationSummary> {
  const week = localWeek(now);
  let summary: GamificationSummary | undefined;
  await db.withTransactionAsync(async () => {
    const xp = await db.getFirstAsync<{ total: number; today: number }>(`SELECT COALESCE(SUM(points),0) AS total,
      COALESCE(SUM(CASE WHEN local_date=? THEN points ELSE 0 END),0) AS today FROM xp_events`, toLocalDateKey(now));
    const dates = await db.getAllAsync<{ date: string }>(`SELECT date FROM daily_stats WHERE reviewed>0 OR new_words>0 OR study_seconds>=60
      UNION SELECT local_date AS date FROM xp_events WHERE local_date<=?`, toLocalDateKey(now));
    const activeDates = dates.map((row) => row.date).filter((date) => date <= toLocalDateKey(now));
    const bestStreak = longestStudyStreak(activeDates);
    const counters = await db.getFirstAsync<{ vocabulary: number; listening: number; hanzi: number; stories: number }>(`SELECT
      (SELECT COUNT(*) FROM user_vocabulary_progress WHERE studied=1 AND status='LEARNING') AS vocabulary,
      (SELECT COUNT(*) FROM review_log WHERE correct=1 AND exercise_type IN ('audio_to_hanzi','audio_to_meaning')) +
      (SELECT COUNT(*) FROM xp_events WHERE activity='tone' AND entity_id LIKE 'listen:%') AS listening,
      (SELECT COUNT(*) FROM review_log WHERE correct=1 AND exercise_type IN ('writing','meaning_to_hanzi','pinyin_to_hanzi')) AS hanzi,
      (SELECT COUNT(*) FROM story_progress WHERE completed_at IS NOT NULL AND best_score=1) AS stories`);
    const progress: Record<AchievementMetric, number> = { vocabulary: counters?.vocabulary ?? 0,
      listening: counters?.listening ?? 0, hanzi: counters?.hanzi ?? 0, stories: counters?.stories ?? 0, streak: bestStreak };
    await seedAchievements(db);
    for (const achievement of achievementDefinitions) {
      if (progress[achievement.metric] >= achievement.threshold) await db.runAsync(
        'INSERT OR IGNORE INTO user_achievements(achievement_id,unlocked_at) VALUES(?,?)', achievement.id, now.toISOString());
    }
    const unlocked = new Map((await db.getAllAsync<{ achievement_id: string; unlocked_at: string }>(
      'SELECT achievement_id,unlocked_at FROM user_achievements')).map((row) => [row.achievement_id, row.unlocked_at]));
    const goal = await db.getFirstAsync<{ weekly_minutes: number }>('SELECT weekly_minutes FROM learning_goals WHERE id=1');
    const seconds = await db.getFirstAsync<{ seconds: number }>(`SELECT COALESCE(SUM(study_seconds),0) AS seconds FROM daily_stats WHERE date BETWEEN ? AND ?`, week.start, toLocalDateKey(now));
    summary = { totalXp: xp?.total ?? 0, todayXp: xp?.today ?? 0, streak: calculateStreak(activeDates, now), bestStreak,
      weeklyMinutes: goal?.weekly_minutes ?? Math.min(2100, Math.max(30, Math.round(dailyGoalMinutes * 7))),
      weeklySeconds: seconds?.seconds ?? 0, week,
      achievements: achievementDefinitions.map((item) => ({ id: item.id, title: item.title, threshold: item.threshold,
        progress: progress[item.metric], unlockedAt: unlocked.get(item.id) ?? null })) };
  });
  if (!summary) throw new Error('GAMIFICATION_READ_FAILED');
  return summary;
}
