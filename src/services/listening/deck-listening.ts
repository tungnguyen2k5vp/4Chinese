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

export type ListeningMatchRound = {
  pairs: Vocabulary[];
  audioOrder: string[];
  meaningOrder: string[];
};

/** Builds compact, shuffled audio-to-meaning matching rounds. */
export function buildListeningMatchRounds(
  words: Vocabulary[],
  roundSize = 4,
  random: () => number = Math.random,
): ListeningMatchRound[] {
  const uniqueWords = words.filter(
    (word, index, items) => items.findIndex((item) => item.simplified === word.simplified) === index,
  );
  if (uniqueWords.length < 2) return [];

  const size = Math.min(6, Math.max(2, Math.trunc(roundSize) || 4));
  const shuffledWords = shuffled(uniqueWords, random);
  const groups: Vocabulary[][] = [];
  for (let offset = 0; offset < shuffledWords.length; offset += size) {
    groups.push(shuffledWords.slice(offset, offset + size));
  }

  // Never strand one word in the final round: move one item from the previous
  // round so every round remains a real matching exercise with at least 2 pairs.
  if (groups.length > 1 && groups.at(-1)?.length === 1) {
    const previous = groups.at(-2)!;
    const last = groups.at(-1)!;
    if (previous.length > 2) last.unshift(previous.pop()!);
    else previous.push(...last.splice(0));
  }

  return groups.map((pairs) => ({
    pairs,
    audioOrder: shuffled(pairs, random).map((word) => word.id),
    meaningOrder: shuffled(pairs, random).map((word) => word.id),
  }));
}
