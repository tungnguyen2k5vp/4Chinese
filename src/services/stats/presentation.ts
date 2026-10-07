import type { DashboardStats } from '@/types/models';

export type StatsMetric = { label: string; value: number; unit: string };

/** Only show measurements backed by actual local learning data. */
export function hasMeaningfulStatsData(stats: DashboardStats, activeDays: number): boolean {
  return activeDays > 0 || [
    stats.learned,
    stats.known,
    stats.skipped,
    stats.mastered,
    stats.due,
    stats.reviewedToday,
    stats.correctToday,
    stats.newToday,
    stats.streak,
    stats.studySeconds,
  ].some((value) => value > 0);
}

export function buildVisibleStatsMetrics(stats: DashboardStats, accuracy: number): StatsMetric[] {
  const metrics: StatsMetric[] = [
    { label: 'Đã học', value: stats.learned, unit: 'từ' },
    { label: 'Đã biết', value: stats.known, unit: 'từ' },
    { label: 'Bỏ qua', value: stats.skipped, unit: 'từ' },
    { label: 'Nhớ sâu', value: stats.mastered, unit: 'từ' },
    { label: 'Đến hạn', value: stats.due, unit: 'từ' },
    { label: 'Chính xác', value: accuracy, unit: '%' },
    { label: 'Chuỗi ngày', value: stats.streak, unit: 'ngày' },
    { label: 'Hôm nay', value: Math.floor(stats.studySeconds / 60), unit: 'phút' },
  ];

  return metrics.filter((metric) => metric.label === 'Chính xác'
    ? stats.reviewedToday > 0
    : metric.value > 0);
}
