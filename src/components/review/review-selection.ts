import { exerciseForReviewMode } from "@/services/review/exercise";
import { resolveReviewMode } from "@/services/review/review-mode";
import type { ReviewMode } from "@/types/models";

/** UI selection only: mixed is never written as a database review mode. */
export type ReviewSelection = ReviewMode | "mixed";

export const reviewSelections: readonly ReviewSelection[] = [
  "mixed", "meaning-hanzi", "hanzi-meaning", "pinyin-hanzi", "audio-hanzi",
  "hanzi-pinyin", "audio-meaning", "cloze", "writing", "hanzi-recall-pinyin-compose",
];

const mixedModes: readonly ReviewMode[] = [
  "hanzi-meaning", "audio-meaning", "cloze", "hanzi-pinyin",
  "meaning-hanzi", "audio-hanzi", "pinyin-hanzi", "writing",
];

export function resolveReviewSelection(value: string | string[] | undefined): ReviewSelection {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "mixed" ? "mixed" : resolveReviewMode(candidate);
}

export function reviewSelectionLabel(selection: ReviewSelection): string {
  if (selection === "mixed") return "ÔN TRỘN NHIỀU DẠNG";
  if (selection === "hanzi-recall-pinyin-compose") return "GÕ PINYIN · GHÉP HÁN TỰ";
  return exerciseForReviewMode(selection).label;
}

export function reviewSelectionDescription(selection: ReviewSelection): string {
  if (selection === "mixed") return "Xen kẽ chọn nghĩa, nghe, chọn pinyin, điền câu và viết Hán tự. Mỗi từ vẫn có 3 lượt; lịch ôn và cách chấm mức nhớ giữ nguyên.";
  if (selection === "hanzi-recall-pinyin-compose") return "Nhìn Hán tự, nhớ cách đọc rồi gõ pinyin để ghép lại từ. Không hiện sẵn pinyin; bạn có thể dùng gợi ý khi cần.";
  if (selection === "cloze") return "Điền Hán tự vào câu có sẵn. Ưu tiên ngữ cảnh bạn đã lưu; từ chưa có câu phù hợp sẽ chuyển sang nghĩa → Hán tự.";
  if (selection === "writing") return "Dựa vào nghĩa và pinyin để viết Hán tự. Bạn cũng có thể chuyển sang nhập bằng bàn phím.";
  return exerciseForReviewMode(selection).prompt;
}

/** Stable across rerenders and rotated interleaving rounds; varies per word/pass. */
export function reviewModeForTurn(selection: ReviewSelection, wordIndex: number, pass: number): ReviewMode {
  if (selection !== "mixed") return selection;
  const position = Math.max(0, Math.trunc(wordIndex)) + Math.max(0, Math.trunc(pass) - 1);
  return mixedModes[position % mixedModes.length]!;
}
