import { toLocalDateKey } from './calendar';

export const achievementDefinitions = [
  { id: 'vocabulary-100', title: '100 từ đã học', metric: 'vocabulary', threshold: 100 },
  { id: 'vocabulary-500', title: '500 từ đã học', metric: 'vocabulary', threshold: 500 },
  { id: 'vocabulary-1000', title: '1.000 từ đã học', metric: 'vocabulary', threshold: 1000 },
  { id: 'streak-7', title: 'Chuỗi học 7 ngày', metric: 'streak', threshold: 7 },
  { id: 'streak-30', title: 'Chuỗi học 30 ngày', metric: 'streak', threshold: 30 },
  { id: 'listening-100', title: '100 bài nghe đúng', metric: 'listening', threshold: 100 },
  { id: 'hanzi-500', title: '500 bài viết đúng', metric: 'hanzi', threshold: 500 },
  { id: 'stories-10', title: '10 truyện đọc hiểu đúng', metric: 'stories', threshold: 10 },
] as const;
export type AchievementMetric = typeof achievementDefinitions[number]['metric'];

/** Local Monday–Sunday, not UTC or an arbitrary trailing seven-day window. */
export function localWeek(now: Date): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: toLocalDateKey(start), end: toLocalDateKey(end) };
}

export function longestStudyStreak(dates: string[]): number {
  const sorted = [...new Set(dates)].filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  let longest = 0;
  let streak = 0;
  let previous = '';
  for (const date of sorted) {
    const [year, month, day] = date.split('-').map(Number);
    const before = new Date(year!, month! - 1, day!);
    before.setDate(before.getDate() - 1);
    streak = previous === toLocalDateKey(before) ? streak + 1 : 1;
    longest = Math.max(longest, streak);
    previous = date;
  }
  return longest;
}
