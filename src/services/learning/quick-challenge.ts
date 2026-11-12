import { practiceScenes, sentenceRepairs, shuffled, type SceneId } from './interactive-content';

import { normalizePinyinInput } from '@/services/pinyin/pinyin';

export type ChallengeMode = 'listen' | 'pairs' | 'context' | 'repair';
export type PracticeWord = { id: string; simplified: string; pinyin: string; primaryMeaningVi: string };
export type ChallengeQuestion = { id: string; prompt: string; audio?: string; chinese?: string; choices: string[]; answer: number; explanation: string };

export function practiceWordPool(words: readonly PracticeWord[]): PracticeWord[] {
  const texts = new Set<string>(), meanings = new Set<string>();
  return words.filter(word => {
    const text = word.simplified.trim(), meaning = word.primaryMeaningVi.trim().toLocaleLowerCase('vi');
    if (!text || !meaning || texts.has(text) || meanings.has(meaning)) return false;
    texts.add(text); meanings.add(meaning); return true;
  });
}

export function scenePracticeWords(scene?: SceneId): PracticeWord[] {
  return practiceScenes.filter(item => !scene || item.id === scene).flatMap(item => item.words.map(word => ({ id: `${item.id}-${word.id}`, simplified: word.hanzi, pinyin: word.pinyin, primaryMeaningVi: word.meaning })));
}

export function buildChallenges(mode: Exclude<ChallengeMode, 'pairs'>, words: readonly PracticeWord[], limit: number, random = Math.random): ChallengeQuestion[] {
  if (mode === 'context') return shuffled(practiceScenes.flatMap(scene => scene.dialogue.map((turn, i) => ({ id: `${scene.id}-${i}`, prompt: `Bạn sẽ đáp lại thế nào?\n${turn.meaning}`, chinese: turn.prompt, audio: turn.prompt, choices: turn.choices, answer: turn.answer, explanation: turn.explanation }))), random).slice(0, limit);
  if (mode === 'repair') return shuffled(sentenceRepairs.map((item, i) => ({ id: `repair-${i}`, prompt: 'Chọn cách sửa câu cho phù hợp.', chinese: item.wrong, choices: item.choices, answer: item.answer, explanation: `${item.correct}\n${item.explanation}` })), random).slice(0, limit);
  const pool = practiceWordPool(words);
  if (pool.length < 3) return [];
  return shuffled(pool, random).flatMap(word => {
    const pronunciation = normalizePinyinInput(word.pinyin);
    if (!pronunciation) return [];
    const distractors = pool.filter(other => other.id !== word.id && normalizePinyinInput(other.pinyin) !== pronunciation);
    if (distractors.length < 2) return [];
    const choices = shuffled([word.primaryMeaningVi, ...shuffled(distractors, random).slice(0, 2).map(other => other.primaryMeaningVi)], random);
    return [{ id: word.id, prompt: 'Nghe từ tiếng Trung và chọn nghĩa.', audio: word.simplified, choices, answer: choices.indexOf(word.primaryMeaningVi), explanation: `${word.simplified} · ${word.pinyin}\n${word.primaryMeaningVi}` }];
  }).slice(0, limit);
}
