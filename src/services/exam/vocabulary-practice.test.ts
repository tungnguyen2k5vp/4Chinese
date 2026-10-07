import { describe, expect, it } from 'vitest';
import { buildVocabularyPractice } from './vocabulary-practice';
import { assertQuestionBankReferencesValid } from './engine';
import type { Vocabulary } from '@/types/models';
const words = Array.from({ length: 30 }, (_, i) => ({ id: `word-${i}`, simplified: `字${i}`, pinyin: 'zì', primaryMeaningVi: `nghĩa ${i}` } as Vocabulary));
describe('vocabulary practice', () => {
  it('creates a valid saved question snapshot with references and correct answers after shuffling', () => {
    const { profile, questions } = buildVocabularyPractice(words, 4, 10, true);
    assertQuestionBankReferencesValid(profile, questions);
    expect(questions).toHaveLength(20);
    expect(profile.backNavigation).toBe('NO_BACK');
    expect(profile.verified).toBe(false);
    for (const question of questions) {
      const source = words.find(word => word.id === question.metadata?.targetVocabularyIds[0])!;
      expect(question.choices[question.correctIndex]).toBe(source.primaryMeaningVi);
      expect(new Set(question.choices).size).toBe(3);
    }
  });
  it('deduplicates meanings and refuses a pool without two distinct distractors', () => {
    const duplicate = words.map(word => ({ ...word, primaryMeaningVi: 'cùng nghĩa' }));
    expect(() => buildVocabularyPractice(duplicate, 1, 5)).toThrow('INSUFFICIENT_VOCABULARY');
    expect(buildVocabularyPractice(words, 1, 5).questions).toHaveLength(10);
  });
});
