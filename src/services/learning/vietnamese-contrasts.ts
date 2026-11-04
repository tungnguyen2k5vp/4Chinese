import { buildGrammarExercises, type GrammarExercise } from './grammar-exercises';

import { listAdvancedGrammarV5ReviewQueue } from '@/data/grammar-v5-advanced-drafts';
import { grammarV5Expansion, type GrammarV5Draft } from '@/data/grammar-v5-expansion';
import { grammarSeed } from '@/db/grammar';
import type { ReviewedContent } from '@/services/content/review-workflow';

export type GrammarV5ReviewPreview = {
  point: GrammarV5Draft;
  review: ReviewedContent;
  exercises: GrammarExercise[];
  learnerVisible: false;
};

/** Source-only editorial preview. No writes, review promotion, XP or learner authorization. */
export function buildGrammarV5ReviewPreview(id: string): GrammarV5ReviewPreview | null {
  const advancedDrafts = listAdvancedGrammarV5ReviewQueue();
  const point = [...grammarV5Expansion, ...advancedDrafts].find((item) => item.id === id);
  if (!point) return null;
  // Editorial preview retains one representative of each form, independent of learner pool size.
  const pool = buildGrammarExercises(point, [...grammarSeed, ...grammarV5Expansion, ...advancedDrafts]);
  const exercises = pool.filter((exercise, index) => exercise.kind !== 'correction' &&
    pool.findIndex((candidate) => candidate.kind === exercise.kind) === index);
  const { wrong, correct, why } = point.commonMistake;
  exercises.push({ id: `${id}-correction`, kind: 'correction', label: 'Sửa câu sai · bản nháp',
    prompt: wrong, answer: correct, explanation: why, options: [wrong, correct], tokens: [] });
  return { point, review: { id, revision: 0, state: 'DRAFT', origin: 'AI_ASSISTED' }, exercises, learnerVisible: false };
}
