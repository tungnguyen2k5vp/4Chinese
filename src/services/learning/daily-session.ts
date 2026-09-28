import type { LearningSkill, ReviewMode, SkillMasteryMetric, Vocabulary } from "@/types/models";

export type DailySessionWeakWord = {
  word: Vocabulary;
  isDue: boolean;
  score: number;
};

export type DailySkillPractice = {
  skill: LearningSkill;
  mode: ReviewMode;
  wordCount: number;
};

export type DailySessionPlan = {
  remainingSeconds: number;
  estimatedSeconds: number;
  activities: { kind: "mistakes" | "reading" | "writing"; minutes: number }[];
  recommendations: string[];
  dueWords: Vocabulary[];
  /** Weak cards which are already included in the due review queue. */
  weakDueWords: Vocabulary[];
  /** Weak cards shown as a safe follow-up only; they never enter an SRS queue early. */
  weakPracticeWords: Vocabulary[];
  newWords: Vocabulary[];
  skillPractices: DailySkillPractice[];
  primaryReviewMode: ReviewMode;
  remainingNewToday: number;
};

export type DailySessionInput = {
  dueWords: Vocabulary[];
  weakWords: DailySessionWeakWord[];
  unlearnedWords: Vocabulary[];
  dailyNewWordGoal: number;
  learnedToday: number;
  learnSessionSize: number;
  reviewSessionSize: number;
  studyTimeGoalMinutes: number;
  studiedSecondsToday?: number;
  recentMistakeCount?: number;
  totalDueCount?: number;
  skillStats: SkillMasteryMetric[];
};

const reviewModeForSkill: Partial<Record<LearningSkill, ReviewMode>> = {
  meaning: "hanzi-meaning",
  hanziRecall: "meaning-hanzi",
  pinyin: "hanzi-recall-pinyin-compose",
  listening: "audio-hanzi",
  writing: "writing",
};

function uniqueWords(words: Vocabulary[], limit: number, excludedIds = new Set<string>()): Vocabulary[] {
  const selected: Vocabulary[] = [];
  for (const word of words) {
    if (selected.length >= limit || excludedIds.has(word.id)) continue;
    excludedIds.add(word.id);
    selected.push(word);
  }
  return selected;
}

/**
 * Builds a local-only daily plan from existing SRS and progress data.
 * It never reschedules a card: only already-due words can enter dueWords.
 */
export function buildDailySessionPlan(input: DailySessionInput): DailySessionPlan {
  const safeNumber = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const remainingSeconds = Math.max(0, Math.floor(safeNumber(input.studyTimeGoalMinutes) * 60
    - safeNumber(input.studiedSecondsToday ?? 0)));
  let budget = remainingSeconds;
  // Estimates, not a promise of completion time. Never change a card's due date.
  const reviewSeconds = 45;
  const newWordSeconds = 90;
  const dueLimit = Math.min(Math.trunc(safeNumber(input.reviewSessionSize)), Math.floor(budget / reviewSeconds));
  const dueWords = uniqueWords(input.dueWords, dueLimit);
  budget -= dueWords.length * reviewSeconds;
  const dueIds = new Set(dueWords.map((word) => word.id));
  const weakDueWords = uniqueWords(
    input.weakWords.filter((item) => item.isDue).map((item) => item.word),
    dueWords.length,
  ).filter((word) => dueIds.has(word.id));

  const remainingNewToday = Math.max(
    0,
    Math.trunc(input.dailyNewWordGoal) - Math.max(0, Math.trunc(input.learnedToday)),
  );
  const newWords = uniqueWords(
    input.unlearnedWords,
    Math.min(Math.max(0, Math.trunc(input.learnSessionSize)), remainingNewToday, Math.floor(budget / newWordSeconds)),
    new Set(dueIds),
  );
  budget -= newWords.length * newWordSeconds;
  const weakPracticeWords = uniqueWords(
    input.weakWords.filter((item) => !item.isDue).map((item) => item.word),
    4,
    new Set(dueIds),
  );
  const skillPractices = input.skillStats
    .filter((metric) => metric.status === "weak" || metric.status === "building")
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "weak" ? -1 : 1;
      return (left.accuracy ?? 101) - (right.accuracy ?? 101);
    })
    .flatMap((metric) => {
      const mode = reviewModeForSkill[metric.skill];
      return mode ? [{ skill: metric.skill, mode, wordCount: metric.status === "weak" ? 4 : 3 }] : [];
    })
    .slice(0, 2);
  const primaryReviewMode = skillPractices[0]?.mode ?? "meaning-hanzi";
  const activities: DailySessionPlan["activities"] = [];
  const addActivity = (kind: DailySessionPlan["activities"][number]["kind"], maxMinutes: number) => {
    const minutes = Math.min(maxMinutes, Math.floor(budget / 60));
    if (minutes > 0) { activities.push({ kind, minutes }); budget -= minutes * 60; }
  };
  if ((input.recentMistakeCount ?? 0) > 0) addActivity("mistakes", 3);
  if (skillPractices.some((item) => item.skill === "writing" || item.skill === "hanziRecall")) addActivity("writing", 4);
  addActivity("reading", 5);
  const recommendations: string[] = [];
  if ((input.totalDueCount ?? input.dueWords.length) > 10) recommendations.push("Ưu tiên ôn từ đến hạn trước khi học thêm từ mới.");
  const meaning = input.skillStats.find((item) => item.skill === "meaning");
  const listening = input.skillStats.find((item) => item.skill === "listening");
  if (meaning?.accuracy != null && listening?.accuracy != null && meaning.accuracy - listening.accuracy > 20)
    recommendations.push("Khả năng nghe thấp hơn hiểu nghĩa trên 20 điểm; nên luyện nghe thêm.");
  if ((input.recentMistakeCount ?? 0) > 0) recommendations.push("Mở sổ lỗi để xem các nội dung còn cần củng cố.");

  return {
    remainingSeconds,
    estimatedSeconds: remainingSeconds - budget,
    activities,
    recommendations,
    dueWords,
    weakDueWords,
    weakPracticeWords,
    newWords,
    skillPractices,
    primaryReviewMode,
    remainingNewToday,
  };
}
