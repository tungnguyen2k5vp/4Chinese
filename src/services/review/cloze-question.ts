import type { ClozePractice } from './cloze-contexts';

import { contextCloze } from '@/db/vocabulary-context';
import { withContextualExamples } from '@/services/vocabulary/contextual-example';
import type { Vocabulary } from '@/types/models';

export type ClozeChoiceWord = Pick<Vocabulary, 'id' | 'simplified' | 'traditional' | 'primaryMeaningVi' | 'hskBand'>;
export type ClozeQuestion = { prompt: string; sentence: string; translation: string | null; answer: string; options: string[]; source: 'personal' | 'example' | 'practice' | 'syllabus'; support: { text: string; meaning: string }[] };

/** Read-only question: use a real encounter/example, never invent a sentence from a gloss. */
export function buildClozeQuestion(word: Vocabulary, personalSentence: string | readonly string[] | null, catalog: readonly ClozeChoiceWord[], traditional = false, practice?: ClozePractice): ClozeQuestion | null {
  const answer = (traditional ? word.traditional : word.simplified).trim();
  if (!answer) return null;
  const examples = withContextualExamples(word).examples;
  const sources: { chinese: string; vietnamese: string; source: ClozeQuestion['source']; readings?: Record<string, string> }[] = [
    ...(typeof personalSentence === 'string' ? [personalSentence] : personalSentence ?? []).map(chinese => ({ chinese, vietnamese: '', source: 'personal' as const })),
    ...examples.map(example => ({ ...example, source: 'example' as const })),
    ...(practice?.contexts.get(word.simplified) ?? []),
    ...(word.traditional !== word.simplified ? practice?.contexts.get(word.traditional) ?? [] : []),
  ];
  let context: { prompt: string; translation: string | null; source: ClozeQuestion['source']; support: ClozeQuestion['support'] } | null = null;
  let bestScore = Infinity;
  for (const sentence of sources) {
    if (!sentence.chinese.trim() || sentence.chinese.length > 2000 || /我正在学习[“「]/u.test(sentence.chinese)) continue;
    let prompt = contextCloze(sentence.chinese, [word.simplified, word.traditional]);
    // ponytail: one blank per question; multiple-occurrence passages need authored exercises.
    if (!prompt || prompt.split('＿＿').length !== 2 || !/[\u3400-\u9fff]/u.test(prompt.replace('＿＿', ''))) continue;
    const tokens = practice?.tokenize(sentence.chinese) ?? [];
    if (practice && !tokens.some(text => text === word.simplified || text === word.traditional)) continue;
    const reading = sentence.readings?.[word.simplified] ?? sentence.readings?.[word.traditional];
    if (reading && reading !== word.pinyinNumeric.toLowerCase().replace(/\s/gu, '')) continue;
    const support = [...new Set(tokens)].filter(text => text !== word.simplified && text !== word.traditional && !practice?.known.has(text))
      .map(text => ({ text, meaning: practice?.lexicon.get(text)?.primaryMeaningVi ?? '' }));
    const score = support.reduce((sum, token) => sum + token.text.length, 0) * 100 + sentence.chinese.length + (sentence.source === 'personal' ? -0.5 : 0);
    if (practice && score >= bestScore) continue;
    if (traditional && practice) prompt = prompt.replace(/[\u3400-\u9fff]+/gu, text => practice.tokenize(text).map(token => practice.lexicon.get(token)?.traditional ?? token).join(''));
    bestScore = score;
    context = { prompt, translation: sentence.vietnamese.trim() || null, source: sentence.source, support };
    if (!practice) break;
  }
  if (!context) return null;

  const normalize = (text: string) => text.normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/gu, ' ');
  const meanings = new Set(word.primaryMeaningVi.split(/[,;\n]/u).map(normalize).filter(Boolean));
  const seen = new Set([normalize(word.simplified), normalize(word.traditional)]);
  const distractors: string[] = [];
  for (const knownFirst of practice ? [true, false] : [false]) {
   for (const sameBand of [true, false]) {
    for (const candidate of catalog) {
      if (distractors.length === 3) break;
      if (practice && practice.known.has(candidate.simplified) !== knownFirst) continue;
      if (candidate.id === word.id || (sameBand && String(candidate.hskBand) !== String(word.hskBand))) continue;
      const value = (traditional ? candidate.traditional : candidate.simplified)?.trim();
      if (!value || seen.has(normalize(value)) || !/^[\u3400-\u9fff·]+$/u.test(value)) continue;
      if (candidate.primaryMeaningVi.split(/[,;\n]/u).some(meaning => meanings.has(normalize(meaning)))) continue;
      seen.add(normalize(value));
      distractors.push(value);
    }
   }
  }
  if (distractors.length !== 3) return null;
  const choices = [answer, ...distractors];
  const offset = Array.from(word.id).reduce((sum, character) => sum + character.codePointAt(0)!, 0) % 4;
  return { ...context, answer, sentence: context.prompt.replace('＿＿', answer), options: [...choices.slice(offset), ...choices.slice(0, offset)] };
}
