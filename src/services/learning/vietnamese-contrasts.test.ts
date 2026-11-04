import { describe, expect, it } from "vitest";

import { buildGrammarExercises } from "./grammar-exercises";

import { vietnameseContrasts } from "@/data/vietnamese-contrasts";
import { grammarSeed } from "@/db/grammar";

describe("Vietnamese contrast practice", () => {
  it("covers twelve explicit contrasts with unique stable grammar IDs and valid choices", () => {
    expect(vietnameseContrasts).toHaveLength(12);
    expect(new Set(grammarSeed.map((seed) => seed.id)).size).toBe(
      grammarSeed.length,
    );
    for (const item of vietnameseContrasts) {
      expect(item.seed.options).toContain(item.seed.answer);
      expect(item.seed.examples[0]!.words.join("")).toBe(
        item.seed.examples[0]!.hanzi.replace(/。/gu, ""),
      );
      expect(item.incorrect).not.toBe(item.corrected);
      const correction = buildGrammarExercises(item.seed, grammarSeed).find(
        (exercise) => exercise.kind === "correction",
      )!;
      expect(correction.prompt).toContain(item.incorrect);
      expect(correction.answer).toBe(item.corrected);
      expect(correction.explanation).toBe(item.why);
      expect(item.reviewStatus).toBe("UNREVIEWED");
    }
  });
});
