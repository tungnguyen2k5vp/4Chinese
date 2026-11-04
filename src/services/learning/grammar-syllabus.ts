import type { GrammarExercise } from './grammar-exercises';
import { normalizeGrammarAnswer } from './grammar-exercises';

import syllabus from '@/data/hsk30-2025-11.json';


export type SyllabusGrammarPoint = {
  id: string; title: string; pattern: string; level: string; category: string; detail: string;
  examples: { id: string; hanzi: string; vi: string }[];
};

// Source-only records deliberately have no GrammarSeed or persisted progress identity.
const examples = new Map<string, SyllabusGrammarPoint['examples']>();
for (const example of syllabus.examples) {
  const group = examples.get(example.grammar_id) ?? [];
  group.push({ id: `${example.grammar_id}-${example.example_index}`, hanzi: example.example_zh, vi: example.example_vi });
  examples.set(example.grammar_id, group);
}
export const syllabusGrammar: SyllabusGrammarPoint[] = syllabus.rows.grammar.map(point => ({
  id: point.id, title: point.title_zh || point.category_zh, pattern: point.pattern_zh || point.title_zh || point.category_zh,
  level: point.hsk_level.replace('HSK', ''), category: [point.grammar_type_zh, point.category_zh].filter(Boolean).join(' · '),
  detail: point.detail_zh, examples: examples.get(point.id) ?? [],
}));

/** Exact-source memory practice, not an assessment of alternate grammatical sentences. */
export function buildSyllabusGrammarExercises(point: SyllabusGrammarPoint): GrammarExercise[] {
  return point.examples.filter(example => example.hanzi.trim()).flatMap(example => {
    // At most twelve source fragments, not claimed to be lexical word segmentation.
    const characters = Array.from(example.hanzi);
    const size = Math.ceil(characters.length / 12);
    const tokens = Array.from({ length: Math.ceil(characters.length / size) }, (_, index) => characters.slice(index * size, (index + 1) * size).join(''));
    const offset = Math.max(1, Math.floor(tokens.length / 2));
    const explanation = `Luyện nhớ nguyên văn ví dụ của đề cương; không chấm các cách diễn đạt khác.\n${example.hanzi}`;
    const reorder: GrammarExercise = {
      id: `${example.id}-memory`, kind: 'reorder', label: 'Nhớ câu mẫu',
      prompt: `Khôi phục nguyên văn câu mẫu đã đọc: ${point.pattern}\nCác ô là mảnh văn bản, không phải từ đã phân tích.`,
      answer: example.hanzi, options: [], tokens: [...tokens.slice(offset), ...tokens.slice(0, offset)],
      explanation,
    };
    const targetIndex = tokens.findIndex((token, index) => index >= Math.floor(tokens.length / 3) && /\p{Script=Han}/u.test(token));
    if (targetIndex < 0) return [reorder];
    const answer = tokens[targetIndex]!;
    const prompt = `Theo đúng câu mẫu đã đọc, khôi phục phần bị ẩn (luyện nhớ nguyên văn):\n${tokens.map((token, index) => index === targetIndex ? '___' : token).join('')}`;
    const fill: GrammarExercise = { id: `${example.id}-memory-fill`, kind: 'fill_blank', label: 'Điền theo câu mẫu', prompt,
      answer, tokens: [], options: [], explanation };
    const options = [answer, ...tokens].filter(token => /\p{Script=Han}/u.test(token)).filter((token, index, values) =>
      values.findIndex(value => normalizeGrammarAnswer(value) === normalizeGrammarAnswer(token)) === index).slice(0, 4);
    const choice: GrammarExercise = { ...fill, id: `${example.id}-memory-choice`, kind: 'choice', label: 'Chọn theo câu mẫu', options: [...options.slice(1), options[0]!] };
    return options.length > 1 ? [reorder, fill, choice] : [reorder, fill];
  });
}
