import type { SQLiteDatabase } from "expo-sqlite";

export interface EnglishFlashcardSettings {
  shuffleOnStart: boolean;
  autoPlayOnShow: boolean;
  autoPlayOnReveal?: boolean;
  showContext?: boolean;
  reviewBatchSize: EnglishReviewBatchSize;
}
export const ENGLISH_REVIEW_BATCH_SIZES = [5, 10, 15, 20] as const;
export type EnglishReviewBatchSize = (typeof ENGLISH_REVIEW_BATCH_SIZES)[number];
export function isEnglishReviewBatchSize(value: unknown): value is EnglishReviewBatchSize {
  return ENGLISH_REVIEW_BATCH_SIZES.some((size) => size === value);
}
export const defaultEnglishFlashcardSettings: EnglishFlashcardSettings = {
  shuffleOnStart: false,
  autoPlayOnShow: false,
  autoPlayOnReveal: false,
  showContext: true,
  reviewBatchSize: 5,
};
const key = "flashcard-settings:v1";

export async function readEnglishFlashcardSettings(db: Pick<SQLiteDatabase, "getFirstAsync">): Promise<EnglishFlashcardSettings> {
  const row = await db.getFirstAsync<{ payload_json: string }>("SELECT payload_json FROM en_drafts WHERE id=?", key);
  if (!row) return { ...defaultEnglishFlashcardSettings };
  try {
    const value = JSON.parse(row.payload_json) as Partial<EnglishFlashcardSettings>;
    return {
      shuffleOnStart: value.shuffleOnStart === true,
      autoPlayOnShow: value.autoPlayOnShow === true,
      autoPlayOnReveal: value.autoPlayOnReveal === true,
      showContext: value.showContext !== false,
      reviewBatchSize: isEnglishReviewBatchSize(value.reviewBatchSize)
        ? value.reviewBatchSize
        : defaultEnglishFlashcardSettings.reviewBatchSize,
    };
  } catch { return { ...defaultEnglishFlashcardSettings }; }
}

export async function saveEnglishFlashcardSettings(db: Pick<SQLiteDatabase, "runAsync">, value: EnglishFlashcardSettings): Promise<EnglishFlashcardSettings> {
  const safe = {
    shuffleOnStart: value.shuffleOnStart === true,
    autoPlayOnShow: value.autoPlayOnShow === true,
    autoPlayOnReveal: value.autoPlayOnReveal === true,
    showContext: value.showContext !== false,
    reviewBatchSize: isEnglishReviewBatchSize(value.reviewBatchSize)
      ? value.reviewBatchSize
      : defaultEnglishFlashcardSettings.reviewBatchSize,
  };
  await db.runAsync(
    "INSERT INTO en_drafts(id,payload_json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json",
    key,
    JSON.stringify(safe),
  );
  return safe;
}
