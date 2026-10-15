export type ReviewChangeDirection = "up" | "same" | "down";

export interface ReviewLevelChange {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  levelBefore: number;
  levelAfter: number;
  nextReviewAt: string;
  direction: ReviewChangeDirection;
}

/** Safely read the compact result payload passed through the review route. */
export function parseReviewLevelChanges(
  value: string | string[] | undefined,
): ReviewLevelChange[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || raw.length > 32_000) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: ReviewLevelChange[] = [];
    for (const row of parsed.slice(0, 100)) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, unknown>;
      if (
        typeof item.id !== "string" || !item.id || item.id.length > 160 ||
        typeof item.hanzi !== "string" || !item.hanzi || item.hanzi.length > 80 ||
        typeof item.pinyin !== "string" || item.pinyin.length > 120 ||
        typeof item.meaning !== "string" || item.meaning.length > 400 ||
        !Number.isInteger(item.levelBefore) || Number(item.levelBefore) < 0 || Number(item.levelBefore) > 6 ||
        !Number.isInteger(item.levelAfter) || Number(item.levelAfter) < 0 || Number(item.levelAfter) > 6 ||
        typeof item.nextReviewAt !== "string" || !Number.isFinite(Date.parse(item.nextReviewAt)) ||
        !["up", "same", "down"].includes(String(item.direction))
      ) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push({
        id: item.id,
        hanzi: item.hanzi,
        pinyin: item.pinyin,
        meaning: item.meaning,
        levelBefore: Number(item.levelBefore),
        levelAfter: Number(item.levelAfter),
        nextReviewAt: item.nextReviewAt,
        direction: item.direction as ReviewChangeDirection,
      });
    }
    return result;
  } catch {
    return [];
  }
}
