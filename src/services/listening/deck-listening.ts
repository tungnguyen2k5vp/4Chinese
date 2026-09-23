import type { Vocabulary } from "@/types/models";

export type DeckListeningQuestion = {
  target: Vocabulary;
  choices: Vocabulary[];
};

function shuffled<T>(items: T[], random: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
  }
  return next;
}

/** Builds a listening-only session from words owned by one personal deck. */
export function buildDeckListeningSession(
  words: Vocabulary[],
  limit = 10,
  random: () => number = Math.random,
): DeckListeningQuestion[] {
  const uniqueWords = words.filter(
    (word, index, items) => items.findIndex((item) => item.simplified === word.simplified) === index,
  );
  if (uniqueWords.length < 2) return [];

  return shuffled(uniqueWords, random).slice(0, Math.max(1, limit)).map((target) => {
    const distractors = shuffled(
      uniqueWords.filter((word) => word.id !== target.id),
      random,
    ).slice(0, 3);
    return { target, choices: shuffled([target, ...distractors], random) };
  });
}
