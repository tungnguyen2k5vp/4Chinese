import type { ReviewMode } from "@/types/models";

const reviewModes = new Set<ReviewMode>([
  "hanzi-meaning",
  "meaning-hanzi",
  "pinyin-hanzi",
  "hanzi-pinyin",
  "hanzi-recall-pinyin-compose",
  "audio-meaning",
  "audio-hanzi",
  "writing",
  "cloze",
]);

/**
 * Keeps old deep links (`?mode=audio`) working while routing every valid
 * review exercise through the same typed mode value.
 */
export function resolveReviewMode(
  value: string | string[] | undefined,
  fallback: ReviewMode = "meaning-hanzi",
): ReviewMode {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "audio") return "audio-meaning";
  return candidate && reviewModes.has(candidate as ReviewMode)
    ? (candidate as ReviewMode)
    : fallback;
}
