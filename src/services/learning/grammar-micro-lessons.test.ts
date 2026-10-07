import { describe, expect, it } from "vitest";

import {
  recommendGrammarMicroLessons,
  type GrammarEvidence,
} from "./grammar-micro-lessons";

const now = Date.parse("2026-10-01T00:00:00Z");
const events = (results: boolean[]): GrammarEvidence[] =>
  results.map((correct, i) => ({
    id: `e-${i}`,
    grammarId: "g",
    exerciseType: i % 2 ? "choice" : "fill",
    correct,
    createdAt: new Date(now - (results.length - i) * 1000).toISOString(),
  }));
describe("evidence-gated micro lessons", () => {
  it("never diagnoses a skill from one or two errors, duplicate events or one format", () => {
    expect(recommendGrammarMicroLessons(events([false, false]), now)).toEqual(
      [],
    );
    const one = events([false])[0]!;
    expect(recommendGrammarMicroLessons(Array(8).fill(one), now)).toEqual([]);
    expect(
      recommendGrammarMicroLessons(
        events([false, false, false, false, false]).map((item) => ({
          ...item,
          exerciseType: "choice",
        })),
        now,
      ),
    ).toEqual([]);
  });
  it("recommends only repeated recent errors and retires after three recent successes", () => {
    expect(
      recommendGrammarMicroLessons(
        events([false, true, false, true, false]),
        now,
      ),
    ).toMatchObject([
      { grammarId: "g", samples: 5, wrong: 3, exerciseTypes: 2 },
    ]);
    expect(
      recommendGrammarMicroLessons(
        events([false, false, false, false, false, true, true, true]),
        now,
      ),
    ).toEqual([]);
    expect(
      recommendGrammarMicroLessons(
        events([false, false, false, false, false]).map((item) => ({
          ...item,
          createdAt: "2020-01-01",
        })),
        now,
      ),
    ).toEqual([]);
    expect(
      recommendGrammarMicroLessons(
        events([false, false, false, false, false]).map((item) => ({
          ...item,
          createdAt: "2027-01-01",
        })),
        now,
      ),
    ).toEqual([]);
  });
});
