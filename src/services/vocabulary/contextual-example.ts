import { curatedExamples } from "./curated-examples";

import type { ExampleSentence, Vocabulary } from "@/types/models";


type ExampleSource = Pick<
  Vocabulary,
  "id" | "simplified" | "pinyin" | "primaryMeaningVi" | "pos" | "hskBand"
> & Pick<Vocabulary, "pinyinNumeric">;

const readingSensitive: Record<string, string> = {
  听: "ting1", 说: "shuo1", 读: "du2",
};

/** Never mistake an auto-written metalinguistic sentence for real usage. */
export function isGenericContextualExample(word: Pick<ExampleSource, "simplified">, example: ExampleSentence): boolean {
  return example.chinese.trim() === `我正在学习“${word.simplified}”这个词。`
    || (/^我正在学习“.+”这个词。$/.test(example.chinese.trim())
      && /^Tôi đang học (ý nghĩa|cách dùng) của từ “.+”\.$/.test(example.vietnamese.trim()));
}

/** Returns null instead of inventing a potentially wrong sentence for an unreviewed sense. */
export function createContextualExample(word: ExampleSource): ExampleSentence | null {
  if (/biến thể|viết tắt|chữ cổ|dạng chữ/i.test(word.primaryMeaningVi)) return null;
  const requiredReading = readingSensitive[word.simplified];
  if (requiredReading && word.pinyinNumeric.toLowerCase().replace(/\s+/g, "") !== requiredReading) return null;
  // The bundled dictionary assigns the existential sense to 在, not the
  // locative sense used in the authored example. Do not teach a mismatched sense.
  if (word.simplified === "在" && (
    /tồn tại/i.test(word.primaryMeaningVi)
    || !/(^|[\s,;])(?:ở|tại|trong)(?=$|[\s,;])/i.test(word.primaryMeaningVi)
  )) return null;
  if (word.simplified === "本子" && !/vở|sổ/i.test(word.primaryMeaningVi)) return null;
  const entry = curatedExamples[word.simplified];
  if (!entry) return null;
  return {
    id: `${word.id}-curated-context-v1`,
    vocabularyId: word.id,
    chinese: entry[0],
    pinyin: entry[1],
    vietnamese: entry[2],
    difficulty: typeof word.hskBand === "number" ? word.hskBand : 7,
  };
}

export function withSingleContextualExample<T extends Vocabulary>(word: T): T {
  const contextual = withContextualExamples(word);
  return {
    ...contextual,
    examples: contextual.examples.slice(0, 1),
  };
}

/** Preserves all curated examples and only synthesizes one when none exists. */
export function withContextualExamples<T extends Vocabulary>(word: T): T {
  const realExamples = word.examples.filter((example) => !isGenericContextualExample(word, example));
  const curated = realExamples.length ? null : createContextualExample(word);
  return {
    ...word,
    examples: realExamples.length ? realExamples : curated ? [curated] : [],
  };
}
