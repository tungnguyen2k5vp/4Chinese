import { additionalGrammarExamples, additionalGrammarCorrections } from './grammar-practice-examples';

import { vietnameseContrasts } from '@/data/vietnamese-contrasts';
import type { GrammarSeed } from '@/db/grammar';

export type GrammarExerciseKind = 'choice' | 'fill_blank' | 'reorder' | 'translation' | 'correction';
export type GrammarExercise = { id: string; kind: GrammarExerciseKind; label: string; prompt: string;
  answer: string; options: string[]; tokens: string[]; explanation: string };
const corrections: Record<string, { wrong: string; correct: string; explanation: string }> = {
  'gram-shi': { wrong: '我是很高。', correct: '我很高。', explanation: 'Tính từ 高 làm vị ngữ với 很, không thêm 是 như trước danh từ.' },
  'gram-bu': { wrong: '我不有书。', correct: '我没有书。', explanation: 'Phủ định 有 dùng 没有, không dùng 不有.' },
  'gram-ma': { wrong: '你吗是学生？', correct: '你是学生吗？', explanation: '吗 đặt cuối câu hỏi có/không.' },
  'gram-you': { wrong: '她不有猫。', correct: '她没有猫。', explanation: 'Sở hữu được phủ định bằng 没有.' },
  'gram-zai': { wrong: '我学校在。', correct: '我在学校。', explanation: '在 đứng trước địa điểm 学校.' },
  'gram-de': { wrong: '这是我书的。', correct: '这是我的书。', explanation: '的 nối người sở hữu 我 với danh từ 书.' },
  'gram-bi': { wrong: '他高比我。', correct: '他比我高。', explanation: '比 đứng giữa hai đối tượng, tính từ 高 ở sau.' },
  'gram-zai-progressive': { wrong: '她正在写字的。', correct: '她正在写字。', explanation: '正在 đứng trước hành động đang diễn ra. Trong câu trần thuật này không thêm 的 vào cuối.' },
};

/** Whitespace and sentence punctuation do not change an otherwise exact
 * Chinese answer. Do not fuzzy-grade alternate translations as wrong. */
export function normalizeGrammarAnswer(value: string): string {
  return value.normalize('NFKC').replace(/[\s。！？!?.,，；;：:]/gu, '');
}
export function isGrammarAnswerCorrect(exercise: GrammarExercise, answer: string): boolean {
  return normalizeGrammarAnswer(answer) === normalizeGrammarAnswer(exercise.answer);
}

const rotated = (values: string[]) => values.length > 1 ? [...values.slice(1), values[0]!] : values;
const uniqueAnswers = (values: string[]) => values.filter((value, index) => values.findIndex(other => normalizeGrammarAnswer(other) === normalizeGrammarAnswer(value)) === index);

export function selectGrammarExercise(exercises: GrammarExercise[], kind: GrammarExerciseKind, round = 0): GrammarExercise | undefined {
  const candidates = exercises.filter(exercise => exercise.kind === kind);
  return candidates[Math.max(0, Math.floor(round)) % candidates.length];
}

export function buildGrammarExercises(seed: GrammarSeed, bank: GrammarSeed[]): GrammarExercise[] {
  if (!seed.examples.length) return [];
  const base = { explanation: seed.explanation, tokens: [] as string[] };
  const exercises: GrammarExercise[] = [
    { ...base, id: `${seed.id}-choice`, kind: 'choice', label: 'Chọn đáp án', prompt: seed.quiz, answer: seed.answer, options: seed.options },
    { ...base, id: `${seed.id}-fill`, kind: 'fill_blank', label: 'Tự điền từ', prompt: seed.quiz, answer: seed.answer, options: [] },
  ];
  const examples = [...seed.examples, ...(additionalGrammarExamples[seed.id] ?? []).map(example => ({
    ...example, words: Array.from(normalizeGrammarAnswer(example.hanzi)),
  }))];
  for (const [index, example] of examples.entries()) {
    const suffix = index ? `-${index + 1}` : '';
    // Translation distractors exclude equivalent translations, not merely matching IDs.
    const translationOptions = uniqueAnswers([example.hanzi, ...bank.flatMap(item => item.examples)
      .filter(other => other.vi !== example.vi).map(other => other.hanzi)]).slice(0, 4);
    // Some older authored token lists omit repeated connectors; fall back to exact source characters.
    const words = normalizeGrammarAnswer(example.words.join('')) === normalizeGrammarAnswer(example.hanzi)
      ? example.words : Array.from(normalizeGrammarAnswer(example.hanzi));
    if (words.length > 1) {
      exercises.push({ ...base, id: `${seed.id}-reorder${suffix}`, kind: 'reorder', label: 'Sắp xếp câu',
        prompt: `${example.vi} (Dùng đủ các ô cho sẵn theo câu mẫu.)`, answer: words.join(''), options: [], tokens: rotated(words) });
    }
    if (translationOptions.length > 1) exercises.push({ ...base, id: `${seed.id}-translation${suffix}`, kind: 'translation', label: 'Chọn câu dịch',
      prompt: example.vi, answer: example.hanzi, options: rotated(translationOptions) });
    // Explicit source restoration avoids claiming that an omitted optional connector makes Chinese ungrammatical.
    const targets = [...new Set([seed.answer, ...example.words])].filter(word => /\p{Script=Han}/u.test(word) && example.hanzi.includes(word)).slice(0, 3);
    for (const [targetIndex, answer] of targets.entries()) {
      const prompt = `Theo câu mẫu: ${example.vi}\n${example.hanzi.replace(answer, '___')}\nĐiền đúng phần đã ẩn trong câu mẫu.`;
      if (normalizeGrammarAnswer(example.hanzi.replace(answer, '___')) === normalizeGrammarAnswer(seed.quiz) && answer === seed.answer) continue;
      const id = `${seed.id}-example-${index + 1}-${targetIndex + 1}`;
      // Full source sentence is shown after grading through the explanation, never as a fabricated error.
      const explanation = `${seed.explanation}\nCâu mẫu: ${example.hanzi}`;
      const options = uniqueAnswers([answer, ...seed.options, ...example.words]).slice(0, 4);
      if (options.length > 1) exercises.push({ ...base, id: `${id}-choice`, kind: 'choice', label: 'Chọn phần đã ẩn', prompt, answer, options: rotated(options), explanation });
      exercises.push({ ...base, id: `${id}-fill`, kind: 'fill_blank', label: 'Khôi phục câu mẫu', prompt, answer, options: [], explanation });
    }
  }
  const contrast = vietnameseContrasts.find(item => item.seed.id === seed.id);
  const correction = contrast ? { wrong: contrast.incorrect, correct: contrast.corrected, explanation: contrast.why } : corrections[seed.id];
  for (const [index, item] of [correction, additionalGrammarCorrections[seed.id]].filter((item): item is NonNullable<typeof item> => !!item).entries()) {
    exercises.push({ ...base, id: `${seed.id}-correction${index ? `-${index + 1}` : ''}`, kind: 'correction', label: 'Sửa câu sai',
      prompt: `Sửa theo mẫu câu trần thuật trung tính và ý nghĩa trong phần giải thích:\n${item.wrong}`, answer: item.correct, explanation: item.explanation, options: rotated([item.correct, item.wrong]) });
  }
  return exercises;
}
