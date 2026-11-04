import type { SQLiteDatabase } from 'expo-sqlite';

import { buildClozeQuestion } from './cloze-question';
import { practiceSentences, practiceSentenceReadings } from './practice-sentences';

import syllabus from '@/data/hsk30-2025-11.json';
import { listVocabularyContexts } from '@/db/vocabulary-context';
import { withContextualExamples } from '@/services/vocabulary/contextual-example';
import type { Vocabulary } from '@/types/models';

export type ClozeContext = { chinese: string; vietnamese: string; source: 'example' | 'practice' | 'syllabus'; readings?: Record<string, string> };
export type LearnedClozeWord = Pick<Vocabulary, 'id' | 'simplified' | 'traditional' | 'primaryMeaningVi' | 'hskBand'>;

/** Read only: include learned words in every active band/deck, not just this session. */
export function readLearnedClozeWords(db: SQLiteDatabase): Promise<LearnedClozeWord[]> {
  return db.getAllAsync<LearnedClozeWord>(`SELECT v.id,v.simplified,v.traditional,
    v.primary_meaning_vi AS primaryMeaningVi,v.hsk_band AS hskBand
    FROM vocabulary v JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE (p.studied=1 OR p.status='KNOWN') AND (v.deck_id IS NULL OR EXISTS (
      SELECT 1 FROM personal_deck_vocabulary m JOIN personal_deck d ON d.id=m.deck_id
      WHERE m.vocabulary_id=v.id AND d.deleted_at IS NULL))`);
}

export function createClozePractice(catalog: readonly Vocabulary[], learned: readonly Pick<Vocabulary, 'simplified' | 'traditional'>[]) {
  const known = new Set(learned.flatMap(word => [word.simplified, word.traditional]));
  const lexicon = new Map<string, Vocabulary>();
  const readings = new Map<string, Set<string>>();
  for (const word of catalog) {
    for (const text of [word.simplified, word.traditional]) {
      if (!text) continue;
      if (!lexicon.has(text)) lexicon.set(text, word);
      const values = readings.get(text) ?? new Set<string>();
      values.add(word.pinyinNumeric.toLowerCase().replace(/\s/gu, ''));
      readings.set(text, values);
    }
  }
  const maxLength = Math.max(1, ...Array.from(lexicon.keys(), text => text.length));
  const tokenize = (sentence: string) => {
    const tokens: string[] = [];
    for (let position = 0; position < sentence.length;) {
      if (!/[\u3400-\u9fff]/u.test(sentence[position]!)) { position++; continue; }
      let token = sentence[position]!;
      for (let length = Math.min(maxLength, sentence.length - position); length > 0; length--) {
        const candidate = sentence.slice(position, position + length);
        if (lexicon.has(candidate)) { token = candidate; break; }
      }
      tokens.push(token);
      position += token.length;
    }
    return tokens;
  };
  const contexts = new Map<string, ClozeContext[]>();
  const sentences: ClozeContext[] = [
    ...practiceSentences.map(([chinese, vietnamese]) => ({ chinese, vietnamese, source: 'practice' as const, readings: practiceSentenceReadings[chinese] })),
    ...catalog.flatMap(word => withContextualExamples(word).examples.map(example => ({ chinese: example.chinese, vietnamese: example.vietnamese, source: 'example' as const }))),
    ...syllabus.examples.map(example => ({ chinese: example.example_zh, vietnamese: example.example_vi, source: 'syllabus' as const })),
  ];
  const seen = new Set<string>();
  for (const sentence of sentences) {
    if (seen.has(sentence.chinese) || sentence.chinese.length > 80 || /[A-Za-z…□＿（）()]/u.test(sentence.chinese)) continue;
    seen.add(sentence.chinese);
    // Longest dictionary words prevent hiding 汤 inside 汤圆 or 上海 inside 上海市.
    for (const token of new Set(tokenize(sentence.chinese))) {
      // A sentence without a per-token reading cannot disambiguate a polyphone.
      if ((readings.get(token)?.size ?? 0) !== 1 && !sentence.readings?.[token]) continue;
      const list = contexts.get(token) ?? [];
      list.push(sentence);
      contexts.set(token, list);
    }
  }
  return { known, lexicon, tokenize, contexts };
}

export type ClozePractice = ReturnType<typeof createClozePractice>;

/** Unsupported cards stay due; never open an unanswerable cloze turn or grade it. */
export async function prepareClozeReview(db: SQLiteDatabase, words: Vocabulary[], catalog: Vocabulary[], traditional = false) {
  const [learned, personal] = await Promise.all([
    readLearnedClozeWords(db),
    Promise.all(words.map(word => listVocabularyContexts(db, word.id, 20))),
  ]);
  const practice = createClozePractice(catalog, [...learned, ...words]);
  const choices = [...words, ...learned, ...catalog];
  const eligible = words.filter((word, index) => {
    const sentences = personal[index]!.map(context => context.sentence);
    return Boolean(buildClozeQuestion(word, sentences, choices, traditional, practice));
  });
  return { words: eligible, omitted: words.length - eligible.length };
}
