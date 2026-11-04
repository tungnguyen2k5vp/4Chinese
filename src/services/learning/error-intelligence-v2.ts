import { clusterObservedMistakes, type ErrorCluster } from './error-intelligence';

import type { Mistake, PracticeSkill } from '@/db/mistakes';

export type ErrorIntelligenceOptions = {
  /** Minimum recent denominator before a cluster can be called a weakness. */
  minimumAttempts?: number;
  /** Minimum recent error count before a cluster can be called a weakness. */
  minimumErrors?: number;
  /** Minimum error proportion among attempts on the currently open error items. */
  minimumErrorRate?: number;
  /** Minimum distinct open records before a cluster becomes actionable. */
  minimumOpenItems?: number;
};

export type RemedialMicroLesson = {
  id: string;
  title: string;
  explanation: string;
  steps: readonly string[];
  exerciseTypes: readonly string[];
  practiceItemIds: readonly string[];
  source: 'OFFLINE_OBSERVED_ERRORS';
};

export type ErrorClusterV2 = ErrorCluster & {
  skill: PracticeSkill | 'CONFUSABLE';
  exerciseTypes: readonly string[];
  attempts30d: number;
  errors30d: number;
  errorRate30d: number | null;
  supportedPracticeItems: number;
  eligible: boolean;
  thresholdReason: string;
  microLesson: RemedialMicroLesson | null;
};

const DEFAULTS: Required<ErrorIntelligenceOptions> = {
  minimumAttempts: 10,
  minimumErrors: 5,
  minimumErrorRate: 0.35,
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

function buildLesson(cluster: ErrorCluster, practiceItemIds: readonly string[]): RemedialMicroLesson {
  const copy = lessonCopy[cluster.key];
  return {
    id: `remedial-${cluster.key.toLowerCase()}`,
    title: `Củng cố: ${cluster.title}`,
    explanation: copy.explanation,
    steps: copy.steps,
    exerciseTypes: copy.exerciseTypes,
    practiceItemIds: practiceItemIds.slice(0,5),
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
  const safeMinimumAttempts = Number.isSafeInteger(thresholds.minimumAttempts) && thresholds.minimumAttempts > 0
    ? thresholds.minimumAttempts : DEFAULTS.minimumAttempts;
  const safeMinimumErrors = Number.isSafeInteger(thresholds.minimumErrors) && thresholds.minimumErrors > 0
    ? thresholds.minimumErrors : DEFAULTS.minimumErrors;
  const safeMinimumRate = Number.isFinite(thresholds.minimumErrorRate) && thresholds.minimumErrorRate > 0 && thresholds.minimumErrorRate <= 1
    ? thresholds.minimumErrorRate : DEFAULTS.minimumErrorRate;
  const safeMinimumOpen = Number.isSafeInteger(thresholds.minimumOpenItems) && thresholds.minimumOpenItems > 0
    ? thresholds.minimumOpenItems : DEFAULTS.minimumOpenItems;
  return clusterObservedMistakes(items).map((cluster) => {
    const relevant = items.filter(item => (item.exercise_type.startsWith('confusable_') ? 'CONFUSABLE' : item.skill_type) === cluster.key);
    const exerciseTypes = [...new Set(relevant.map((item) => item.exercise_type))];
    const attempts30d = relevant.reduce((sum,item) => sum + (Number.isSafeInteger(item.attempts_30d) && item.attempts_30d >= 0 ? item.attempts_30d : 0),0);
    const errors30d = relevant.reduce((sum,item) => sum + (Number.isSafeInteger(item.errors_30d) && item.errors_30d >= 0 ? item.errors_30d : 0),0);
    const validRateEvidence = errors30d <= attempts30d;
    const errorRate30d = attempts30d > 0 && validRateEvidence ? errors30d / attempts30d : null;
    const enoughAttempts = attempts30d >= safeMinimumAttempts;
    const enoughErrors = errors30d >= safeMinimumErrors;
    const enoughRate = errorRate30d !== null && errorRate30d >= safeMinimumRate;
    const enoughItems = cluster.openItems >= safeMinimumOpen;
    const practiceItemIds = relevant.filter(item => item.vocabulary_id !== null).slice(0,5).map(item => item.id);
    const enoughPracticeItems = practiceItemIds.length >= safeMinimumOpen;
    const eligible = enoughAttempts && enoughErrors && enoughRate && enoughItems && enoughPracticeItems;
    const thresholdReason = eligible
      ? `Có bằng chứng gần đây: ${errors30d}/${attempts30d} lần sai (${Math.round(errorRate30d! * 100)}%), ${cluster.openItems} mục đang mở.`
      : !enoughPracticeItems
        ? 'Chưa đủ mục từ vựng có thể mở trong chuỗi luyện hiện tại.'
        : `Chưa đủ bằng chứng 30 ngày: cần ${safeMinimumAttempts} lượt, ${safeMinimumErrors} lỗi, tỷ lệ ${Math.round(safeMinimumRate * 100)}% và ${safeMinimumOpen} mục mở.`;
    return {
      ...cluster,
      skill: cluster.key,
      exerciseTypes,
      attempts30d,
      errors30d: validRateEvidence ? errors30d : 0,
      errorRate30d,
      supportedPracticeItems: practiceItemIds.length,
      eligible,
      thresholdReason,
      microLesson: eligible ? buildLesson(cluster,practiceItemIds) : null,
    };
  });
}

