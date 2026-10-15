import type { ReviewExerciseType, ReviewMode } from "@/types/models";

export interface ReviewExerciseDefinition {
  type: ReviewExerciseType;
  label: string;
  prompt: string;
  answer: "hanzi" | "meaning" | "pinyin";
  requiresHanziInput: boolean;
  playsAudio: boolean;
}

const definitions: Record<ReviewExerciseType, ReviewExerciseDefinition> = {
  meaning_to_hanzi: { type: "meaning_to_hanzi", label: "NGHĨA → HÁN TỰ", prompt: "Nhìn nghĩa tiếng Việt và tự viết Hán tự.", answer: "hanzi", requiresHanziInput: true, playsAudio: false },
  hanzi_to_meaning: { type: "hanzi_to_meaning", label: "HÁN TỰ → NGHĨA", prompt: "Chọn nghĩa tiếng Việt sát nhất với Hán tự.", answer: "meaning", requiresHanziInput: false, playsAudio: false },
  hanzi_to_pinyin: { type: "hanzi_to_pinyin", label: "HÁN TỰ → PINYIN", prompt: "Chọn cách đọc đúng của Hán tự.", answer: "pinyin", requiresHanziInput: false, playsAudio: false },
  pinyin_to_hanzi: { type: "pinyin_to_hanzi", label: "PINYIN → HÁN TỰ", prompt: "Nhìn pinyin và tự viết Hán tự.", answer: "hanzi", requiresHanziInput: true, playsAudio: false },
  audio_to_hanzi: { type: "audio_to_hanzi", label: "NGHE → HÁN TỰ", prompt: "Nghe từ rồi tự viết Hán tự.", answer: "hanzi", requiresHanziInput: true, playsAudio: true },
  audio_to_meaning: { type: "audio_to_meaning", label: "NGHE → NGHĨA", prompt: "Nghe âm thanh rồi chọn nghĩa đúng.", answer: "meaning", requiresHanziInput: false, playsAudio: true },
  writing: { type: "writing", label: "LUYỆN VIẾT HÁN TỰ", prompt: "Nhìn gợi ý và tự viết lại Hán tự.", answer: "hanzi", requiresHanziInput: true, playsAudio: false },
  cloze: { type: "cloze", label: "ĐIỀN TỪ VÀO CÂU", prompt: "Điền từ còn thiếu bằng Hán tự.", answer: "hanzi", requiresHanziInput: true, playsAudio: false },
};

const modeToExercise: Record<ReviewMode, ReviewExerciseType> = {
  "meaning-hanzi": "meaning_to_hanzi",
  "hanzi-meaning": "hanzi_to_meaning",
  "pinyin-hanzi": "pinyin_to_hanzi",
  "hanzi-pinyin": "hanzi_to_pinyin",
  "hanzi-recall-pinyin-compose": "pinyin_to_hanzi",
  "audio-meaning": "audio_to_meaning",
  "audio-hanzi": "audio_to_hanzi",
  writing: "writing",
  cloze: "cloze",
};

export function exerciseTypeForReviewMode(mode: ReviewMode): ReviewExerciseType {
  return modeToExercise[mode];
}

export function exerciseForReviewMode(mode: ReviewMode): ReviewExerciseDefinition {
  return definitions[exerciseTypeForReviewMode(mode)];
}

export const standardReviewModes = [
  "meaning-hanzi",
  "hanzi-meaning",
  "pinyin-hanzi",
  "audio-hanzi",
  "hanzi-pinyin",
  "audio-meaning",
  "cloze",
  "writing",
  "hanzi-recall-pinyin-compose",
] as const satisfies readonly ReviewMode[];
