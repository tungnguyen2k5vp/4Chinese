import { describe, expect, it } from "vitest";

import { buildDeckListeningSession } from "./deck-listening";

const words = ["书", "学校", "朋友", "银行"].map((simplified, index) => ({
  id: String(index),
  simplified,
}));

describe("deck listening session", () => {
  it("uses only deck words and keeps the spoken answer among choices", () => {
    const questions = buildDeckListeningSession(words as never, 10, () => 0.4);

    expect(questions).toHaveLength(4);
    questions.forEach((question) => {
      expect(question.choices.map((choice) => choice.id)).toContain(question.target.id);
      expect(question.choices.every((choice) => words.some((word) => word.id === choice.id))).toBe(true);
    });
  });

  it("needs at least two distinct deck words", () => {
    expect(buildDeckListeningSession([words[0]!] as never)).toEqual([]);
  });
});
