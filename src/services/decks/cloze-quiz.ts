import type { Vocabulary } from "@/types/models";

export type DeckClozeQuestion = {
  target: Vocabulary;
  /** One contextual sentence with the target word hidden. */
  sentence: string;
  example: Vocabulary["examples"][number];
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

function clozeExample(word: Vocabulary): Vocabulary["examples"][number] | null {
  const example = word.examples.find((item) => item.chinese.includes(word.simplified));
  return example ?? null;
}

/** Explain the expected meaning from the saved example, without claiming that
 * every distractor would be grammatically impossible in another context. */
export function explainDeckClozeAnswer(question: DeckClozeQuestion, selectedId: string) {
  const { target, example } = question;
  const apologyForBeingLate = target.simplified === "对不起" && example.chinese.includes("我来晚了");
  const correctReason = apologyForBeingLate
    ? `“我来晚了” nói rằng người nói đến muộn, nên chỗ trống cần lời xin lỗi. “${target.simplified}” nghĩa là “${target.primaryMeaningVi}”, phù hợp với tình huống này.`
    : `“${target.simplified}” nghĩa là “${target.primaryMeaningVi}”. Đây là từ được dùng ở chỗ trống trong câu ví dụ gốc${example.vietnamese.trim() ? `, diễn đạt ý “${example.vietnamese.trim()}”` : ""}. Điền từ này giữ đúng ý của câu đang học.`;
  return {
    correctReason,
    alternatives: question.choices.filter(choice => choice.id !== target.id).map(choice => ({
      word: choice,
      selected: choice.id === selectedId,
      reason: `“${choice.simplified}” nghĩa là “${choice.primaryMeaningVi}”${apologyForBeingLate ? ", không diễn đạt lời xin lỗi khi đến muộn" : `, khác với ý “${target.primaryMeaningVi}” cần điền theo câu ví dụ này`}.`,
    })),
  };
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
    .map((target) => ({ target, example: clozeExample(target) }))
    .filter((item): item is { target: Vocabulary; example: Vocabulary["examples"][number] } => Boolean(item.example))
    .slice(0, Math.max(1, limit))
    .map(({ target, example }) => {
      const distractors = shuffled(
        uniqueWords.filter((word) => word.id !== target.id),
        random,
      ).slice(0, 3);
      return { target, example, sentence: example.chinese.replaceAll(target.simplified, "＿＿"), choices: shuffled([target, ...distractors], random) };
    });
}
