import { describe, expect, it } from "vitest";

import { buildDailySessionPlan } from "./daily-session";

import type { LearningSkill, SkillMasteryMetric, Vocabulary } from "@/types/models";

function word(id: string): Vocabulary {
  return { id, simplified: id, traditional: id, pinyin: id, pinyinNumeric: id, primaryMeaningVi: id, meaningsVi: [id], meaningsEn: [id], pos: [], hskBand: 1, frequencyRank: null, classifiers: [], radical: null, strokeCount: null, visualType: "none", imageUri: null, imageSource: null, imageLicense: null, imageAttribution: null, audioUri: null, source: "test", sourceVersion: "1", sourceUrl: "", translationStatus: "verified", examples: [] };
}

const skills: LearningSkill[] = ["meaning", "hanziRecall", "pinyin", "listening", "writing", "tone"];
const noSkills: SkillMasteryMetric[] = skills.map((skill) => ({ skill, attempts: 0, accuracy: null, status: "no-data" }));

describe("buildDailySessionPlan", () => {
  const budgetInput = {
    dueWords: [word("due-1"), word("due-2")], weakWords: [],
    unlearnedWords: [word("new-1"), word("new-2")], dailyNewWordGoal: 10,
    learnedToday: 0, learnSessionSize: 10, reviewSessionSize: 20,
    studyTimeGoalMinutes: 5, skillStats: noSkills,
  };
  it("allocates remaining time to due cards first without exceeding the budget", () => {
    const plan = buildDailySessionPlan({ ...budgetInput, studiedSecondsToday: 120, recentMistakeCount: 4 });
    expect(plan.remainingSeconds).toBe(180);
    expect(plan.dueWords).toHaveLength(2);
    expect(plan.newWords).toHaveLength(1);
    expect(plan.activities).toEqual([]);
    expect(plan.estimatedSeconds).toBe(180);
  });
  it("does not propose extra cards when the time goal is reached", () => {
    const plan = buildDailySessionPlan({ ...budgetInput, studiedSecondsToday: 600 });
    expect(plan.dueWords).toEqual([]);
    expect(plan.newWords).toEqual([]);
    expect(plan.activities).toEqual([]);
    expect(plan.remainingNewToday).toBe(10);
    expect(plan.estimatedSeconds).toBe(0);
  });
  it("deduplicates cards and allocates available minutes to mistakes and reading", () => {
    const plan = buildDailySessionPlan({ ...budgetInput, studyTimeGoalMinutes: 15,
      dueWords: [word("due-1"), word("due-1")], unlearnedWords: [], recentMistakeCount: 2 });
    expect(plan.dueWords).toHaveLength(1);
    expect(plan.activities).toEqual([{ kind: "mistakes", minutes: 3 }, { kind: "reading", minutes: 5 }]);
    expect(plan.estimatedSeconds).toBeLessThanOrEqual(plan.remainingSeconds);
  });
  it("recommends listening only when measured accuracy trails meaning by over 20 points", () => {
    const plan = buildDailySessionPlan({ ...budgetInput, totalDueCount: 11,
      skillStats: noSkills.map((metric) => ({ ...metric, attempts: 10,
        accuracy: metric.skill === "meaning" ? 90 : 50, status: "building" })) });
    expect(plan.recommendations).toHaveLength(2);
    expect(plan.recommendations[1]).toContain("20 điểm");
  });
  it("prioritizes only currently due SRS cards and honors the review session limit", () => {
    const plan = buildDailySessionPlan({
      dueWords: [word("due-1"), word("due-2"), word("due-3")],
      weakWords: [{ word: word("due-1"), isDue: true, score: 90 }, { word: word("later"), isDue: false, score: 80 }],
      unlearnedWords: [word("new-1")], dailyNewWordGoal: 10, learnedToday: 0, learnSessionSize: 5, reviewSessionSize: 2, studyTimeGoalMinutes: 30, skillStats: noSkills,
    });

    expect(plan.dueWords.map((item) => item.id)).toEqual(["due-1", "due-2"]);
    expect(plan.weakDueWords.map((item) => item.id)).toEqual(["due-1"]);
    expect(plan.weakPracticeWords.map((item) => item.id)).toEqual(["later"]);
  });

  it("caps new words by the remaining daily goal without mixing them into reviews", () => {
    const plan = buildDailySessionPlan({
      dueWords: [word("due")], weakWords: [],
      unlearnedWords: [word("new-1"), word("new-2"), word("new-3")], dailyNewWordGoal: 5, learnedToday: 4, learnSessionSize: 10, reviewSessionSize: 20, studyTimeGoalMinutes: 30, skillStats: noSkills,
    });

    expect(plan.remainingNewToday).toBe(1);
    expect(plan.newWords.map((item) => item.id)).toEqual(["new-1"]);
    expect(plan.dueWords.map((item) => item.id)).toEqual(["due"]);
  });

  it("uses the weakest supported skill to choose the due-review exercise", () => {
    const plan = buildDailySessionPlan({
      dueWords: [word("due")], weakWords: [], unlearnedWords: [], dailyNewWordGoal: 10, learnedToday: 0, learnSessionSize: 10, reviewSessionSize: 20, studyTimeGoalMinutes: 30,
      skillStats: noSkills.map((metric) => metric.skill === "listening" ? { ...metric, attempts: 4, accuracy: 40, status: "weak" } : metric),
    });

    expect(plan.primaryReviewMode).toBe("audio-hanzi");
    expect(plan.skillPractices).toEqual([{ skill: "listening", mode: "audio-hanzi", wordCount: 4 }]);
  });
});
