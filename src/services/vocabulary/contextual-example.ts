import type { ExampleSentence, Vocabulary } from "@/types/models";

type ExampleSource = Pick<
  Vocabulary,
  "id" | "simplified" | "pinyin" | "primaryMeaningVi" | "pos" | "hskBand"
>;

/**
 * Gives every word one usable offline context when the imported dictionary has
 * no curated sentence. The sentence deliberately frames the word as a phrase
 * being learned, so it remains grammatical for nouns, verbs, adjectives and
 * fixed expressions alike. Curated sentences always take precedence.
 */
export function createContextualExample(word: ExampleSource): ExampleSentence {
  const category = word.pos.some((item) => item.includes("động từ"))
    ? "cách dùng"
    : "ý nghĩa";
  return {
    id: `${word.id}-generated-context`,
    vocabularyId: word.id,
    chinese: `我正在学习“${word.simplified}”这个词。`,
    pinyin: `Wǒ zhèngzài xuéxí “${word.pinyin}” zhège cí.`,
    vietnamese: `Tôi đang học ${category} của từ “${word.primaryMeaningVi}”.`,
    difficulty: typeof word.hskBand === "number" ? word.hskBand : 7,
  };
}

export function withSingleContextualExample<T extends Vocabulary>(word: T): T {
  return {
    ...word,
    examples: word.examples.length ? [word.examples[0]!] : [createContextualExample(word)],
  };
}
