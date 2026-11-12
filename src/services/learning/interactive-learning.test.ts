import { describe, expect, it } from 'vitest';

import { practiceScenes, sentenceMatches, sentenceRepairs, shuffled } from './interactive-content';
import { buildChallenges, practiceWordPool, scenePracticeWords } from './quick-challenge';

import { decodeLearningQuiz, encodeLearningQuiz, quizTemplates } from '@/services/community/learning-quiz';

describe('interactive learning content and safe community quizzes', () => {
  it('provides complete scenes, reconstructable sentences and answerable dialogue', () => {
    expect(new Set(practiceScenes.map(scene => scene.id)).size).toBe(4);
    for (const scene of practiceScenes) {
      expect(scene.words).toHaveLength(5);
      expect(scene.dialogue).toHaveLength(3);
      expect(new Set(scene.words.map(word => word.id)).size).toBe(scene.words.length);
      for (const word of scene.words) {
        expect(word.sentence.replace(/[。？！]/gu, '')).toBe(word.tokens.join(''));
        expect(sentenceMatches(word.tokens, word)).toBe(true);
        expect(sentenceMatches([...word.tokens].reverse(), word)).toBe(false);
        expect(word.sentencePinyin.length).toBeGreaterThan(6);
        expect(word.translation.length).toBeGreaterThan(8);
        expect(word.x).toBeGreaterThan(8); expect(word.x).toBeLessThan(92);
        expect(word.y).toBeGreaterThan(9); expect(word.y).toBeLessThan(85);
      }
      for (const turn of scene.dialogue) {
        expect(new Set(turn.choices).size).toBe(turn.choices.length);
        expect(turn.choices[turn.answer]).toBeTruthy();
        expect(turn.explanation.replace(/[。，！]/gu, '')).toContain(turn.choices[turn.answer]!.replace(/[。，！]/gu, ''));
      }
    }
    for (const repair of sentenceRepairs) {
      expect(repair.wrong).not.toBe(repair.correct);
      expect(repair.choices[repair.answer]).toBeTruthy();
    }
  });

  it('keeps matching and listening unambiguous without mutating vocabulary', () => {
    const words = scenePracticeWords(), snapshot = JSON.stringify(words);
    expect(practiceWordPool([...words, words[0]!, { ...words[0]!, id: 'duplicate-meaning', simplified: '別' }])).toHaveLength(20);
    expect(buildChallenges('listen', words.slice(0, 2), 5)).toEqual([]);
    for (const mode of ['listen', 'context', 'repair'] as const) {
      const questions = buildChallenges(mode, words, 10, () => 0.42);
      expect(questions.length).toBe(Math.min(10, mode === 'repair' ? 8 : mode === 'context' ? 12 : 20));
      expect(new Set(questions.map(q => q.id)).size).toBe(questions.length);
      for (const question of questions) {
        expect(new Set(question.choices).size).toBe(question.choices.length);
        expect(question.choices[question.answer]).toBeTruthy();
        if (mode === 'listen') expect(question.chinese).toBeUndefined();
      }
    }
    shuffled(words, () => 0.3);
    expect(JSON.stringify(words)).toBe(snapshot);
  });

  it('round-trips every quiz template through the existing post body limits', () => {
    for (const { quiz } of quizTemplates) {
      const body = encodeLearningQuiz(quiz, 'Cùng thử một câu nhé!');
      expect(body.length).toBeLessThanOrEqual(3000);
      expect(decodeLearningQuiz(body)).toEqual({ quiz, introduction: 'Cùng thử một câu nhé!' });
      expect(body).toContain(quiz.question);
    }
    expect(decodeLearningQuiz('Bài viết cũ — không có bài đố')).toBeNull();
    expect(decodeLearningQuiz('test\n\n[4CHINESE_QUIZ_V1]\n{invalid')).toBeNull();
  });

  it('keeps homophones out of listening distractors and skips unanswerable pools', () => {
    const words = [
      { id: 'a', simplified: '是', pinyin: 'shì', primaryMeaningVi: 'là' },
      { id: 'b', simplified: '事', pinyin: 'shi4', primaryMeaningVi: 'việc' },
      { id: 'c', simplified: '市', pinyin: 'shì', primaryMeaningVi: 'thành phố' },
      { id: 'd', simplified: '书', pinyin: 'shū', primaryMeaningVi: 'sách' },
      { id: 'e', simplified: '茶', pinyin: 'chá', primaryMeaningVi: 'trà' },
    ];
    expect(buildChallenges('listen', words.slice(0, 3), 5)).toEqual([]);
    for (const question of buildChallenges('listen', words, 5)) {
      if (question.id !== 'd' && question.id !== 'e') expect(question.choices.filter(value => ['là', 'việc', 'thành phố'].includes(value))).toHaveLength(1);
    }
    expect(buildChallenges('listen', words.map(word => ({ ...word, pinyin: '' })), 5)).toEqual([]);
  });

  it('rejects malformed, oversized or ambiguous user-authored quiz payloads', () => {
    const quiz = quizTemplates[0]!.quiz;
    for (const changed of [
      { ...quiz, answer: 10 }, { ...quiz, answer: -1 }, { ...quiz, answer: 0.5 },
      { ...quiz, choices: ['A', 'a'] }, { ...quiz, choices: ['', 'A'] },
      { ...quiz, choices: ['A'] }, { ...quiz, explanation: '' },
      { ...quiz, kind: 'listen', chinese: '' }, { ...quiz, question: 'a'.repeat(241) },
    ]) expect(() => encodeLearningQuiz(changed as typeof quiz)).toThrow();
    expect(() => encodeLearningQuiz(quiz, 'x'.repeat(601))).toThrow();
    expect(() => encodeLearningQuiz(quiz, '[4CHINESE_QUIZ_V1]')).toThrow();
    expect(decodeLearningQuiz('x'.repeat(3001))).toBeNull();
    expect(decodeLearningQuiz(`x\n\n[4CHINESE_QUIZ_V1]\n${JSON.stringify({ quiz: { ...quiz, version: 2 }, introduction: '' })}`)).toBeNull();
  });
});
