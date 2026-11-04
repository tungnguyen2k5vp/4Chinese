import { describe, expect, it } from "vitest";

import { resolveReviewSelection, reviewModeForTurn, reviewSelections, reviewSelectionLabel } from "./review-selection";

import { exerciseForReviewMode, standardReviewModes } from "@/services/review/exercise";
import { buildInterleavedReviewQueue } from "@/services/review/interleaved-session";
import type { Vocabulary } from "@/types/models";


describe("expanded Chinese review selection", () => {
  it("exposes existing exercises plus a presentation-only mixed option", () => {
    expect(new Set(reviewSelections).size).toBe(10);
    expect(reviewSelections.filter(mode => mode !== "mixed")).toEqual(standardReviewModes);
    for (const mode of reviewSelections) {
      expect(reviewSelectionLabel(mode).length).toBeGreaterThan(0);
      if (mode !== "mixed") expect(exerciseForReviewMode(mode).type).toBeTruthy();
    }
  });
  it("keeps legacy audio links, defaults and array parameters compatible", () => {
    expect(resolveReviewSelection("audio")).toBe("audio-meaning");
    expect(resolveReviewSelection(["mixed", "audio"])).toBe("mixed");
    expect(resolveReviewSelection("invalid")).toBe("meaning-hanzi");
    expect(resolveReviewSelection(undefined)).toBe("meaning-hanzi");
  });
  it.each([5, 10, 15, 20])("preserves %i words and three rounds, without storing mixed", count => {
    const words = Array.from({ length: count }, (_, index) => ({ id: `word-${index}` }) as Vocabulary);
    const queue = buildInterleavedReviewQueue(words);
    expect(queue).toHaveLength(count * 3);
    const modes = queue.map(entry => reviewModeForTurn("mixed", words.findIndex(word => word.id === entry.word.id), entry.pass));
    expect(modes).not.toContain("mixed");
    expect(modes).toContain("audio-meaning");
    expect(modes).toContain("cloze");
    expect(modes).toContain("hanzi-pinyin");
    for (let index = 0; index < count; index++) {
      expect(new Set([1, 2, 3].map(pass => reviewModeForTurn("mixed", index, pass))).size).toBe(3);
    }
  });
  it("keeps a single selected exercise fixed across every turn", () => {
    for (const selection of reviewSelections.filter(mode => mode !== "mixed")) {
      for (const pass of [1, 2, 3]) expect(reviewModeForTurn(selection, 7, pass)).toBe(selection);
    }
  });
  it("gives a one-word mixed session meaning, listening and contextual recall", () => {
    expect([1, 2, 3].map(pass => reviewModeForTurn("mixed", 0, pass))).toEqual(["hanzi-meaning", "audio-meaning", "cloze"]);
  });
});
