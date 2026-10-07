import { clusterObservedMistakes, type ErrorCluster } from './error-intelligence';

import type { Mistake, PracticeSkill } from '@/db/mistakes';

export type ErrorIntelligenceOptions = {
  /** Minimum observed wrong answers before a cluster becomes actionable. */
  minimumWrongAttempts?: number;
  /** Minimum distinct open records before a cluster becomes actionable. */
  minimumOpenItems?: number;
};

export type RemedialMicroLesson = {
  id: string;
  title: string;
  explanation: string;
  steps: readonly string[];
  exerciseTypes: readonly string[];
  source: 'OFFLINE_OBSERVED_ERRORS';
};

export type ErrorClusterV2 = ErrorCluster & {
  skill: PracticeSkill | 'CONFUSABLE';
  exerciseTypes: readonly string[];
  eligible: boolean;
  thresholdReason: string;
  microLesson: RemedialMicroLesson | null;
};

const DEFAULTS: Required<ErrorIntelligenceOptions> = {
  minimumWrongAttempts: 5,
  minimumOpenItems: 2,
};

const lessonCopy: Record<ErrorClusterV2['key'], { explanation: string; steps: readonly string[]; exerciseTypes: readonly string[] }> = {
  MEANING: {
    explanation: 'Ôn lại nghĩa trong câu cụ thể; không suy ra lỗi từ một lần chọn sai.',
    steps: ['Đọc câu và che nghĩa tiếng Việt.', 'Tự nói nghĩa phù hợp với ngữ cảnh.', 'Làm 2 câu chọn nghĩa rồi quay lại câu gốc.'],
    exerciseTypes: ['meaning_in_context', 'meaning_choice'],
  },
  PINYIN: {
    explanation: 'Đối chiếu pinyin và thanh điệu của chính các từ đã ghi nhận lỗi.',
    steps: ['Nghe mẫu một lần.', 'Đọc pinyin chậm từng âm tiết.', 'Làm 2 lượt nhận diện pinyin trước khi đọc nhanh.'],
    exerciseTypes: ['hanzi_to_pinyin', 'pinyin_choice'],
  },
  LISTENING: {
    explanation: 'Nghe lại từ/câu đã xuất hiện, tách nhận diện âm khỏi việc đoán nghĩa.',
    steps: ['Nghe chậm và chọn từ.', 'Nghe tốc độ thường.', 'Kiểm tra lại pinyin sau khi chọn.'],
    exerciseTypes: ['audio_to_hanzi', 'audio_to_meaning'],
  },
  HANZI: {
    explanation: 'Nhận diện mặt chữ từ đúng mục tiêu đã ghi nhận, không kết luận lỗi chữ khác.',
    steps: ['Quan sát toàn bộ chữ.', 'So sánh phần khác nhau với đáp án.', 'Làm 2 lượt chọn Hán tự trong ngữ cảnh.'],
    exerciseTypes: ['meaning_to_hanzi', 'pinyin_to_hanzi'],
  },
  WRITING: {
    explanation: 'Viết lại đúng chữ/từ đã sai và kiểm tra từng chữ sau khi hoàn thành.',
    steps: ['Viết một lượt không gợi ý.', 'Mở gợi ý từng nét nếu cần.', 'Viết lại một lượt để kiểm tra phục hồi.'],
    exerciseTypes: ['writing', 'stroke_order'],
  },
  SPEAKING: {
    explanation: 'Tự nghe lại bản ghi; dữ liệu STT không được coi là điểm phát âm.',
    steps: ['Nghe mẫu.', 'Ghi một câu ngắn.', 'Nghe lại và tự đánh dấu điểm cần sửa.'],
    exerciseTypes: ['shadowing', 'recording_review'],
  },
  GRAMMAR: {
    explanation: 'Ôn cấu trúc trong câu và đối chiếu với lỗi đã ghi nhận.',
    steps: ['Đọc giải thích ngắn.', 'So sánh câu đúng và câu sai.', 'Làm 2 bài tập cùng cấu trúc.'],
    exerciseTypes: ['grammar_choice', 'grammar_correction'],
  },
  CONFUSABLE: {
    explanation: 'Phân biệt các từ đã xuất hiện trong cùng ngữ cảnh; không mở rộng thành cặp mới chưa được biên tập.',
    steps: ['Đọc hai câu đối chiếu.', 'Gạch chân dấu hiệu ngữ cảnh.', 'Chọn từ và giải thích vì sao.'],
    exerciseTypes: ['confusable_context', 'confusable_choice'],
  },
};

function buildLesson(cluster: ErrorCluster): RemedialMicroLesson {
  const copy = lessonCopy[cluster.key];
  return {
    id: `remedial-${cluster.key.toLowerCase()}`,
    title: `Củng cố: ${cluster.title}`,
    explanation: copy.explanation,
    steps: copy.steps,
    exerciseTypes: copy.exerciseTypes,
    source: 'OFFLINE_OBSERVED_ERRORS',
  };
}

/**
 * Converts observed mistakes into actionable clusters only after a minimum
 * sample. Small samples remain visible but are explicitly non-diagnostic.
 */
export function clusterObservedMistakesV2(
  items: readonly Mistake[],
  options: ErrorIntelligenceOptions = {},
): ErrorClusterV2[] {
  const thresholds = { ...DEFAULTS, ...options };
  const safeMinimumWrong = Number.isSafeInteger(thresholds.minimumWrongAttempts) && thresholds.minimumWrongAttempts > 0
    ? thresholds.minimumWrongAttempts : DEFAULTS.minimumWrongAttempts;
  const safeMinimumOpen = Number.isSafeInteger(thresholds.minimumOpenItems) && thresholds.minimumOpenItems > 0
    ? thresholds.minimumOpenItems : DEFAULTS.minimumOpenItems;
  return clusterObservedMistakes(items).map((cluster) => {
    const exerciseTypes = [...new Set(cluster.examples.map((item) => item.exercise_type))];
    const enoughWrong = cluster.wrongAttempts >= safeMinimumWrong;
    const enoughItems = cluster.openItems >= safeMinimumOpen;
    const eligible = enoughWrong && enoughItems;
    const thresholdReason = eligible
      ? `Đủ mẫu: ${cluster.wrongAttempts}/${safeMinimumWrong} lần sai, ${cluster.openItems}/${safeMinimumOpen} mục mở.`
      : `Chưa đủ mẫu để kết luận: cần ${safeMinimumWrong} lần sai và ${safeMinimumOpen} mục mở.`;
    return {
      ...cluster,
      skill: cluster.key,
      exerciseTypes,
      eligible,
      thresholdReason,
      microLesson: eligible ? buildLesson(cluster) : null,
    };
  });
}

