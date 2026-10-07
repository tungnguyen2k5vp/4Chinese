import { describe, expect, it } from "vitest";

import { buildDeckListeningSession, buildListeningMatchRounds } from "./deck-listening";

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

  it("creates matched columns containing each word once", () => {
    const rounds = buildListeningMatchRounds(words as never, 4, () => 0.4);
    expect(rounds.map((round) => round.pairs.length)).toEqual([4]);
    for (const round of rounds) {
      const ids = round.pairs.map((word) => word.id).sort();
      expect([...round.audioOrder].sort()).toEqual(ids);
      expect([...round.meaningOrder].sort()).toEqual(ids);
    }
  });

  it("balances a final singleton into two valid matching rounds", () => {
    const fiveWords = [...words, { id: "4", simplified: "新" }];
    const rounds = buildListeningMatchRounds(fiveWords as never, 4, () => 0.4);
    expect(rounds.map((round) => round.pairs.length)).toEqual([3, 2]);
    expect(rounds.flatMap((round) => round.pairs.map((word) => word.id)).sort()).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("does not create a matching round with fewer than two words", () => {
    expect(buildListeningMatchRounds([words[0]!] as never)).toEqual([]);
  });
});
