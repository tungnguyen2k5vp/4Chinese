import type { HskBand, Vocabulary } from '@/types/models';

export function filterVocabularyByHsk(words: Vocabulary[], band: HskBand | 'all'): Vocabulary[] {
  return band === 'all' ? words : words.filter((word) => word.hskBand === band);
}
