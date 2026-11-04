import type { AIContext } from './gateway';

import type { MemoryCandidate } from '@/db/hanzi-memory';
import type { Mistake } from '@/db/mistakes';

const count = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1000000, Math.trunc(n))) : 0;
/** Read-only projection. IDs, dates, personal sentences, decks, notes and whole records never leave this boundary. */
export function learnerAIContext(goal: string, minutes: number, words: MemoryCandidate[], mistakes: Mistake[]): Extract<AIContext, { kind: 'learner' }> {
  return { kind: 'learner', goal: goal.trim(), minutes,
    words: words.slice(0, 6).map(({ word, wrongCount, lapseCount }) => ({ hanzi: word.simplified.slice(0, 40), pinyin: word.pinyin.slice(0, 180),
      meanings: [...new Set((word.meaningsVi.length ? word.meaningsVi : [word.primaryMeaningVi]).flatMap(m => m.split(/\r?\n+/u)).map(m => m.trim()).filter(Boolean))].slice(0, 3).map(m => m.slice(0, 160)),
      wrongAttempts: count(wrongCount), lapses: count(lapseCount) })),
    mistakes: mistakes.slice(0, 8).map(m => ({ title: m.title.slice(0, 150), skill: m.skill_type, exercise: m.exercise_type.slice(0, 100), wrongAttempts: count(m.wrong_count) })) };
}
