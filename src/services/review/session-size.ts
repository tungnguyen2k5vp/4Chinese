export const REVIEW_SESSION_SIZES = [5, 10, 15, 20] as const;
export type ReviewSessionSize = (typeof REVIEW_SESSION_SIZES)[number];

export function normalizeReviewSessionSize(value: unknown): ReviewSessionSize {
  return REVIEW_SESSION_SIZES.includes(value as ReviewSessionSize)
    ? value as ReviewSessionSize
    : 10;
}
