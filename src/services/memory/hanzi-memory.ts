import type { Mistake, PracticeSkill } from "@/db/mistakes";
import { clusterObservedMistakesV2 } from "@/services/learning/error-intelligence-v2";
import { contextualReviewPrompt } from "@/services/review/contextual-prompt";
import {
  buildReviewMeaningOptions,
  buildReviewPinyinOptions,
} from "@/services/review/meaning-options";
import type { ReviewExerciseType, Vocabulary } from "@/types/models";

export type MemoryErrorKind =
  | "VISUAL_CONFUSION"
  | "MEANING_RECALL"
  | "PRONUNCIATION"
  | "TONE"
  | "HANDWRITING"
  | "CONTEXT_USAGE"
  | "UNKNOWN";
export type MemoryMode = "mixed" | "writing" | "weak" | "old";
export const errorLabels: Record<MemoryErrorKind, string> = {
  VISUAL_CONFUSION: "Nhầm mặt chữ",
  MEANING_RECALL: "Nhớ nghĩa",
  PRONUNCIATION: "Nhớ âm đọc",
  TONE: "Thanh điệu",
  HANDWRITING: "Bài viết",
  CONTEXT_USAGE: "Dùng trong câu",
  UNKNOWN: "Chưa rõ nguyên nhân",
};

/** A failed task is evidence, not a diagnosis. Broad HANZI/listening errors stay UNKNOWN. */
export function classifyMemoryError(
  item: Pick<
    Mistake,
    "exercise_type" | "wrong_count" | "attempts_30d" | "errors_30d"
  >,
): MemoryErrorKind {
  if (
    ![item.wrong_count, item.attempts_30d, item.errors_30d].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    item.wrong_count < 2 ||
    item.attempts_30d < 3 ||
    item.errors_30d < 2 ||
    item.errors_30d > item.attempts_30d
  )
    return "UNKNOWN";
  const type = item.exercise_type;
  if (type === "memory_visual_choice") return "VISUAL_CONFUSION";
  if (
    ["hanzi_to_meaning", "meaning_choice", "memory_meaning_choice"].includes(
      type,
    )
  )
    return "MEANING_RECALL";
  if (
    ["hanzi_to_pinyin", "pinyin_choice", "memory_pinyin_choice"].includes(type)
  )
    return "PRONUNCIATION";
  if (
    ["tone_choice", "tone_identification", "memory_tone_choice"].includes(type)
  )
    return "TONE";
  if (["memory_stroke_count", "stroke_order"].includes(type))
    return "HANDWRITING";
  if (
    [
      "cloze",
      "confusable_context",
      "meaning_in_context",
      "memory_cloze",
    ].includes(type)
  )
    return "CONTEXT_USAGE";
  return "UNKNOWN";
}

export function memoryRescueEvidence(items: readonly Mistake[]) {
  // Reuse the existing evidence thresholds and micro-lesson summaries.
  const clusters = clusterObservedMistakesV2(items);
  return items
    .filter(
      (item) =>
        item.vocabulary_id && item.resolved === 0 && item.wrong_count >= 2,
    )
    .map((item) => ({
      item,
      kind: classifyMemoryError(item),
      recurring: item.wrong_count >= 3,
      cluster:
        clusters.find((cluster) =>
          cluster.exerciseTypes.includes(item.exercise_type),
        ) ?? null,
    }));
}

export type MemoryQuestion = {
  word: Vocabulary;
  type: ReviewExerciseType;
  prompt: string;
  choices: string[];
  expected: string;
  contextSource?: string;
};
const directions: ReviewExerciseType[] = [
  "hanzi_to_meaning",
  "meaning_to_hanzi",
  "pinyin_to_hanzi",
  "audio_to_hanzi",
  "hanzi_to_pinyin",
  "cloze",
  "writing",
];

export function chooseMemoryDirection(
  mistakes: readonly Mistake[],
  index: number,
): ReviewExerciseType {
  const observed = [...mistakes]
    .filter((m) => m.resolved === 0)
    .sort((a, b) => b.wrong_count - a.wrong_count);
  const reliable = observed.find((m) => classifyMemoryError(m) !== "UNKNOWN");
  if (reliable) {
    const kind = classifyMemoryError(reliable);
    if (kind === "PRONUNCIATION" || kind === "TONE") return "hanzi_to_pinyin";
    if (kind === "MEANING_RECALL") return "hanzi_to_meaning";
    if (kind === "CONTEXT_USAGE") return "cloze";
    return "writing";
  }
  return directions[Math.max(0, Math.trunc(index)) % directions.length]!;
}

const normalize = (text: string) =>
  text.normalize("NFC").trim().toLocaleLowerCase("vi").replace(/\s+/gu, " ");
export function buildMemoryQuestion(
  word: Vocabulary,
  requested: ReviewExerciseType,
  catalog: Vocabulary[],
  personalSentence: string | null,
): MemoryQuestion {
  let type = requested;
  let prompt = "";
  let contextSource: string | undefined;
  if (type === "cloze") {
    const context = contextualReviewPrompt(
      personalSentence,
      word.examples.map((e) => e.chinese),
      [word.simplified, word.traditional],
    );
    if (context.prompt) {
      prompt = context.prompt;
      contextSource = context.source;
    } else type = "meaning_to_hanzi";
  }
  let choices: string[] = [];
  if (type === "hanzi_to_meaning") {
    // Avoid distractors that are an explicitly accepted meaning of the target.
    const accepted = new Set(
      [word.primaryMeaningVi, ...word.meaningsVi].map(normalize),
    );
    const pool = catalog.filter(
      (w) =>
        w.id === word.id ||
        ![w.primaryMeaningVi, ...w.meaningsVi].some((m) =>
          accepted.has(normalize(m)),
        ),
    );
    choices = buildReviewMeaningOptions(word, [], pool);
    if (choices.length !== 4) {
      type = "meaning_to_hanzi";
      choices = [];
    }
  }
  if (type === "hanzi_to_pinyin") {
    choices = buildReviewPinyinOptions(word, [], catalog);
    if (choices.length !== 4) {
      type = "meaning_to_hanzi";
      choices = [];
    }
  }
  if (!prompt)
    prompt =
      type === "hanzi_to_meaning" || type === "hanzi_to_pinyin"
        ? word.simplified
        : type === "pinyin_to_hanzi"
          ? word.pinyin
          : type === "audio_to_hanzi"
            ? "Nghe và viết Hán tự"
            : word.primaryMeaningVi;
  if (!["hanzi_to_meaning", "hanzi_to_pinyin"].includes(type)) {
    for (const answer of [word.simplified, word.traditional].filter(Boolean))
      prompt = prompt.split(answer).join("＿＿");
  }
  return {
    word,
    type,
    prompt,
    choices,
    expected:
      type === "hanzi_to_meaning"
        ? word.primaryMeaningVi
        : type === "hanzi_to_pinyin"
          ? word.pinyin
          : word.simplified,
    contextSource,
  };
}

export function checkMemoryAnswer(
  question: MemoryQuestion,
  answer: string,
): boolean {
  if (
    question.type === "hanzi_to_meaning" ||
    question.type === "hanzi_to_pinyin"
  )
    return question.choices.includes(answer) && answer === question.expected;
  return [question.word.simplified, question.word.traditional].includes(
    answer.normalize("NFC").trim().replace(/\s+/gu, ""),
  );
}

export type InkEvidence = {
  source: "DIGITAL_INK" | "MANUAL";
  strokeCounts: number[];
  candidates: string[][];
};
export type InkAssessment = {
  face: "MATCH" | "DIFFERENT" | "UNVERIFIED";
  issues: string[];
  strokeOrderVerified: false;
};
export function assessRecallInk(
  target: string,
  evidence: InkEvidence | null,
  counts: readonly number[],
): InkAssessment {
  const characters = Array.from(target);
  const issues: string[] = [];
  if (
    !evidence ||
    evidence.source !== "DIGITAL_INK" ||
    evidence.strokeCounts.length !== characters.length ||
    evidence.candidates.length !== characters.length
  )
    return {
      face: "UNVERIFIED",
      issues: ["Chưa có bằng chứng nhận diện nét viết. Hãy tự đối chiếu mẫu."],
      strokeOrderVerified: false,
    };
  characters.forEach((_character, index) => {
    const expected = counts[index] ?? 0;
    const actual = evidence.strokeCounts[index] ?? 0;
    if (!expected)
      issues.push(`Chữ ${index + 1}: chưa có dữ liệu nét ngoại tuyến.`);
    else if (actual !== expected)
      issues.push(
        `Chữ ${index + 1}: đã viết ${actual} nét; mẫu có ${expected} nét. Kiểm tra nét thiếu, thừa hoặc nối liền.`,
      );
  });
  const top = evidence.candidates.map((row) => row[0] ?? "").join("");
  return {
    face:
      !top || evidence.strokeCounts.some((count) => count === 0)
        ? "UNVERIFIED"
        : top === target
          ? "MATCH"
          : "DIFFERENT",
    issues,
    strokeOrderVerified: false,
  };
}

export type MemoryOutcome =
  "UNASSISTED" | "ASSISTED" | "NOT_RECALLED" | "UNVERIFIED";
export function recallOutcome(
  correct: boolean | null,
  hinted: boolean,
): MemoryOutcome {
  return correct === null
    ? "UNVERIFIED"
    : !correct
      ? "NOT_RECALLED"
      : hinted
        ? "ASSISTED"
        : "UNASSISTED";
}
export function practiceSkillForMemory(
  type: ReviewExerciseType,
): PracticeSkill {
  return type === "hanzi_to_meaning"
    ? "MEANING"
    : type === "hanzi_to_pinyin"
      ? "PINYIN"
      : type === "audio_to_hanzi"
        ? "LISTENING"
        : type === "cloze"
          ? "WRITING"
          : "HANZI";
}

export function adaptiveMemoryPlan(input: {
  due: number;
  weakWords: number;
  attempts: number;
  errors: number;
  newGoal: number;
  minuteGoal: number;
  studySeconds: number;
}) {
  const safe = (value: number) =>
    Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const due = safe(input.due),
    goal = safe(input.newGoal),
    remainingMinutes = Math.max(
      0,
      safe(input.minuteGoal) - safe(input.studySeconds) / 60,
    );
  const recentErrorRate =
    input.attempts >= 8 && input.errors >= 0 && input.errors <= input.attempts
      ? input.errors / input.attempts
      : null;
  const heavy = due >= Math.max(20, goal * 3),
    struggling =
      (recentErrorRate !== null && recentErrorRate >= 0.35) ||
      safe(input.weakWords) >= 10;
  const reviewWords = Math.min(due, Math.floor((remainingMinutes * 60) / 25));
  const budget = Math.max(0, remainingMinutes * 60 - reviewWords * 25);
  const newWords = Math.min(
    goal,
    heavy ? 0 : struggling ? Math.min(5, Math.ceil(goal / 2)) : goal,
    Math.floor(budget / 45),
  );
  return {
    newWords,
    reviewWords,
    estimatedMinutes: Math.ceil((reviewWords * 25 + newWords * 45) / 60),
    recentErrorRate,
    reason: heavy
      ? "Nhiều từ đến hạn: ưu tiên ôn trước khi thêm từ mới."
      : struggling
        ? "Có tín hiệu cần củng cố: cân nhắc giảm từ mới hôm nay."
        : remainingMinutes === 0
          ? "Bạn đã đạt thời lượng hôm nay; có thể nghỉ hoặc tự chọn luyện thêm."
          : "Khối lượng gợi ý dựa trên lịch ôn và thời gian còn lại.",
    assumptions:
      "Ước tính 25 giây/từ ôn và 45 giây/từ mới; thời gian thực tế có thể khác.",
  };
}
