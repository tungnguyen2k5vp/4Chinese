import type { Vocabulary } from "@/types/models";

export type DeckClozeQuestion = {
  target: Vocabulary;
  /** One contextual sentence with the target word hidden. */
  sentence: string;
  choices: Vocabulary[];
};

function shuffled<T>(items: T[], random: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [next[index], next[swap]] = [next[swap]!, next[index]!];
  }
  return next;
}

function sentenceWithBlank(word: Vocabulary): string | null {
  const example = word.examples.find((item) => item.chinese.includes(word.simplified));
  if (!example) return null;
  return example.chinese.replaceAll(word.simplified, "＿＿");
}

/**
 * Builds a self-contained cloze quiz exclusively from words in one personal
 * deck. A word is omitted when there is no usable example sentence for it.
 */
export function buildDeckClozeQuiz(
  words: Vocabulary[],
  limit = 10,
  random: () => number = Math.random,
): DeckClozeQuestion[] {
  const uniqueWords = words.filter(
    (word, index, items) => items.findIndex((item) => item.simplified === word.simplified) === index,
  );
  if (uniqueWords.length < 2) return [];

  return shuffled(uniqueWords, random)
    .map((target) => ({ target, sentence: sentenceWithBlank(target) }))
    .filter((item): item is { target: Vocabulary; sentence: string } => Boolean(item.sentence))
    .slice(0, Math.max(1, limit))
    .map(({ target, sentence }) => {
      const distractors = shuffled(
        uniqueWords.filter((word) => word.id !== target.id),
        random,
      ).slice(0, 3);
      return { target, sentence, choices: shuffled([target, ...distractors], random) };
    });
}
