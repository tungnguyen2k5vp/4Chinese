import { assertQuestionBankReferencesValid, type ExamProfile, type ExamQuestion } from './engine';
import type { PracticeDuration } from './practice-bank';

import type { Vocabulary, HskBand } from '@/types/models';

export function buildVocabularyPractice(words: readonly Vocabulary[], band: HskBand, minutes: PracticeDuration, noBack = false) {
  const unique = new Map<string, Vocabulary>();
  for (const word of words) {
    const meaning = word.primaryMeaningVi.trim();
    if (meaning && !/biến thể|viết tắt|\[.*\]|\\u[0-9a-f]/i.test(meaning) && !unique.has(meaning.toLocaleLowerCase('vi'))) unique.set(meaning.toLocaleLowerCase('vi'), word);
  }
  const pool = [...unique.values()];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  if (pool.length < 3) throw new Error('INSUFFICIENT_VOCABULARY');
  const count = Math.min(minutes === 5 ? 10 : 20, pool.length);
  const id = `vocabulary-${band}-${minutes}m-${Date.now()}`;
  const profile: ExamProfile = { id, name: 'Kiểm tra nghĩa từ', level: String(band) as ExamProfile['level'], standardVersionId: null, kind: 'ORIGINAL_PRACTICE', verified: false, sourceRef: null, durationSeconds: minutes * 60, backNavigation: noBack ? 'NO_BACK' : 'ALLOW', references: { vocabularyIds: pool.slice(0, count).map(word => word.id), grammarIds: [], audioIds: [] }, sections: [{ skill: 'READING', durationSeconds: minutes * 60, questionCount: count }] };
  const questions: ExamQuestion[] = pool.slice(0, count).map((word, index) => {
    const choices = [word.primaryMeaningVi, pool[(index + 1) % pool.length]!.primaryMeaningVi, pool[(index + 2) % pool.length]!.primaryMeaningVi];
    const correctIndex = Math.floor(Math.random() * 3);
    [choices[0], choices[correctIndex]] = [choices[correctIndex]!, choices[0]!];
    return { id: `${id}-${index}`, profileId: id, skill: 'READING', prompt: `Chọn nghĩa phù hợp của “${word.simplified}” (${word.pinyin}).`, choices, correctIndex, explanationVi: `${word.simplified} (${word.pinyin}): ${word.primaryMeaningVi}.`, provenance: 'CURATED', metadata: { contentVersion: 1, level: profile.level, difficulty: 1, questionType: 'VOCABULARY_CHOICE', section: 'READING', skills: ['READING'], targetVocabularyIds: [word.id], targetGrammarIds: [], sourceType: 'ORIGINAL', reviewStatus: 'LEGACY_CURATED' } };
  });
  assertQuestionBankReferencesValid(profile, questions);
  return { profile, questions };
}
