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

export function buildGrammarExercises(seed: GrammarSeed, bank: GrammarSeed[]): GrammarExercise[] {
  const example = seed.examples[0];
  if (!example) return [];
  const base = { explanation: seed.explanation, tokens: [] as string[] };
  const translationOptions = [...new Set([example.hanzi, ...bank.filter((item) => item.id !== seed.id)
    .map((item) => item.examples[0]?.hanzi).filter((value): value is string => !!value)])].slice(0, 4);
  // Deterministic rotation prevents every correct answer occupying the first slot.
  const rotated = (values: string[]) => values.length > 1 ? [...values.slice(1), values[0]!] : values;
  const exercises: GrammarExercise[] = [
    { ...base, id: `${seed.id}-choice`, kind: 'choice', label: 'Chọn đáp án', prompt: seed.quiz, answer: seed.answer, options: seed.options },
    { ...base, id: `${seed.id}-fill`, kind: 'fill_blank', label: 'Tự điền từ', prompt: seed.quiz, answer: seed.answer, options: [] },
    { ...base, id: `${seed.id}-reorder`, kind: 'reorder', label: 'Sắp xếp câu', prompt: example.vi, answer: example.words.join(''), options: [], tokens: rotated(example.words) },
    { ...base, id: `${seed.id}-translation`, kind: 'translation', label: 'Chọn câu dịch', prompt: example.vi, answer: example.hanzi, options: rotated(translationOptions) },
  ];
  const contrast = vietnameseContrasts.find((item) => item.seed.id === seed.id);
  const correction = contrast ? { wrong: contrast.incorrect, correct: contrast.corrected, explanation: contrast.why } : corrections[seed.id] ?? (example.hanzi.includes(seed.answer) ? {
    wrong: example.hanzi.replace(seed.answer, ''),
    correct: example.hanzi,
    explanation: `\u0110i\u1ec1n ${seed.answer} \u0111\u00fang theo c\u1ea5u tr\u00fac: ${seed.pattern}.`,
  } : null);
  if (correction) exercises.push({ ...base, id: `${seed.id}-correction`, kind: 'correction', label: 'Sửa câu sai', prompt: correction.wrong,
    answer: correction.correct, explanation: correction.explanation,
    options: rotated([...new Set([correction.correct, correction.wrong, ...translationOptions.filter((text) =>
      text !== correction.correct && text !== correction.wrong)])].slice(0, 4)) });
  return exercises;
}
