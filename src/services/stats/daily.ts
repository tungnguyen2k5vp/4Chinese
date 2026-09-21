export type DailyCounters = { reviewed: number; correct: number; newWords: number; studySeconds: number };

export function applyReviewToDailyStats(stats: DailyCounters, rating: number, responseTimeMs: number): DailyCounters {
  return { ...stats, reviewed: stats.reviewed + 1, correct: stats.correct + (rating === 1 ? 0 : 1), studySeconds: stats.studySeconds + Math.max(1, Math.round(responseTimeMs / 1000)) };
}
