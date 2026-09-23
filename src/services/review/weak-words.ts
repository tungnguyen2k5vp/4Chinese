export type WeakWordSignals = {
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lapseCount: number;
  consecutiveWrong: number;
  hintUsedCount: number;
  nextReviewAt: string;
};

export type WeaknessAssessment = {
  score: number;
  reasons: string[];
};

/**
 * Turns existing, persisted review signals into a transparent “needs work”
 * score. This intentionally never changes SRS state or a due date.
 */
export function assessWeakness(signals: WeakWordSignals): WeaknessAssessment {
  const reviewCount = Math.max(0, signals.reviewCount);
  const wrongCount = Math.max(0, signals.wrongCount);
  const lapseCount = Math.max(0, signals.lapseCount);
  const consecutiveWrong = Math.max(0, signals.consecutiveWrong);
  const hintUsedCount = Math.max(0, signals.hintUsedCount);
  const accuracy = reviewCount ? Math.max(0, Math.min(1, signals.correctCount / reviewCount)) : 1;
  const reasons: string[] = [];

  if (consecutiveWrong >= 2) reasons.push(`Sai liên tiếp ${consecutiveWrong} lần`);
  else if (consecutiveWrong === 1) reasons.push("Có lần trả lời sai gần đây");
  if (lapseCount >= 2) reasons.push(`Quên lại ${lapseCount} lần`);
  else if (lapseCount === 1) reasons.push("Đã quên lại 1 lần");
  if (reviewCount >= 3 && accuracy < 0.7) reasons.push(`Độ chính xác ${Math.round(accuracy * 100)}%`);
  if (hintUsedCount >= 3) reasons.push(`Đã dùng gợi ý ${hintUsedCount} lần`);

  const score =
    consecutiveWrong * 20 +
    lapseCount * 14 +
    wrongCount * 4 +
    hintUsedCount * 2 +
    (reviewCount >= 3 ? Math.round((1 - accuracy) * 20) : 0);

  return { score, reasons };
}

export function isWeakWord(signals: WeakWordSignals): boolean {
  const { score, reasons } = assessWeakness(signals);
  return reasons.length > 0 && score >= 8;
}
