import { describe, expect, it } from 'vitest';

import { buildDailySessionPlan } from './daily-session';

import type { LearningSkill, SkillMasteryMetric, Vocabulary } from '@/types/models';

const word = (id: string): Vocabulary => ({
  id, simplified: id, traditional: id, pinyin: id, pinyinNumeric: id, primaryMeaningVi: id,
  meaningsVi: [id], meaningsEn: [id], pos: [], hskBand: 1, frequencyRank: null,
  classifiers: [], radical: null, strokeCount: null, visualType: 'none', imageUri: null,
  imageSource: null, imageLicense: null, imageAttribution: null, audioUri: null,
  source: 'test', sourceVersion: '1', sourceUrl: '', translationStatus: 'verified', examples: [],
});

const skillNames: LearningSkill[] = ['meaning', 'hanziRecall', 'pinyin', 'listening', 'writing', 'tone'];
const skills: SkillMasteryMetric[] = skillNames
  .map((skill) => ({ skill, attempts: 0, accuracy: null, status: 'no-data' as const }));

describe('daily mistake focus recommendation', () => {
  it('names the focused mistake group without putting a non-due word into SRS', () => {
    const plan = buildDailySessionPlan({
      dueWords: [word('due')], weakWords: [{ word: word('later'), isDue: false, score: 90 }],
      unlearnedWords: [], dailyNewWordGoal: 10, learnedToday: 0, learnSessionSize: 10,
      reviewSessionSize: 10, studyTimeGoalMinutes: 20, recentMistakeCount: 2,
      mistakeFocusLabel: 'pinyin (2 mục, 5 lần sai)', skillStats: skills,
    });

    expect(plan.dueWords.map((item) => item.id)).toEqual(['due']);
    expect(plan.weakPracticeWords.map((item) => item.id)).toEqual(['later']);
    expect(plan.recommendations).toContain('Ưu tiên sổ lỗi pinyin (2 mục, 5 lần sai) trước khi học thêm từ mới.');
  });
});

