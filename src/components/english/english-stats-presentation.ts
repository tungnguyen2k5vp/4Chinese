export interface EnglishAccuracyPresentation {
  percent: number;
  value: string;
  badge: string;
}

/** Returns null until there is at least one committed review result. */
export function getEnglishAccuracyPresentation(
  reviewed: number,
  correct: number,
): EnglishAccuracyPresentation | null {
  if (!Number.isFinite(reviewed) || reviewed <= 0) return null;
  const percent = Math.round(
    (Math.max(0, Math.min(correct, reviewed)) / reviewed) * 100,
  );
  return {
    percent,
    value: `${percent}%`,
    badge:
      percent >= 80
        ? "Xuất sắc"
        : percent >= 60
          ? "Khá"
          : "Cần luyện thêm",
  };
}

/** Formats accumulated response time without changing how it is measured. */
export function formatEnglishStudyDuration(milliseconds: number): string {
  const totalSeconds = Number.isFinite(milliseconds)
    ? Math.max(0, Math.floor(milliseconds / 1000))
    : 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  if (minutes > 0) {
    return seconds > 0 ? `${minutes} phút ${seconds} giây` : `${minutes} phút`;
  }
  return `${seconds} giây`;
}
