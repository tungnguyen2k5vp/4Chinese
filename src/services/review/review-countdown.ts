const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = 24 * 60;

/** Formats the time remaining before a vocabulary card becomes due. */
export function formatReviewCountdown(
  nextReviewAt: string | null | undefined,
  nowMs = Date.now(),
): string {
  if (!nextReviewAt) return "Chưa xếp lịch";

  const targetMs = Date.parse(nextReviewAt);
  if (!Number.isFinite(targetMs)) return "Chưa xếp lịch";

  const remainingMs = targetMs - nowMs;
  if (remainingMs <= 0) return "Đã đến hạn";

  // Ceil so a card with any remaining seconds never displays "0 phút".
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / MINUTE_MS));
  const days = Math.floor(totalMinutes / DAY_MINUTES);
  const hours = Math.floor((totalMinutes % DAY_MINUTES) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0 || days > 0) parts.push(`${hours} giờ`);
  parts.push(`${minutes} phút`);

  return `Còn ${parts.join(" ")}`;
}
