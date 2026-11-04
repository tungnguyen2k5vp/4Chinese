import { describe, expect, it } from "vitest";

import {
  adaptiveMemoryPlan,
  assessRecallInk,
  buildMemoryQuestion,
  checkMemoryAnswer,
  chooseMemoryDirection,
  classifyMemoryError,
  recallOutcome,
} from "./hanzi-memory";

import type { Mistake } from "@/db/mistakes";
import type { Vocabulary } from "@/types/models";

const words = ["书", "水", "人", "家", "学校"].map(
  (simplified, index) =>
    ({
      id: String(index),
      simplified,
      traditional: simplified,
      pinyin: ["shū", "shuǐ", "rén", "jiā", "xué xiào"][index]!,
      primaryMeaningVi: ["sách", "nước", "người", "nhà", "trường học"][index]!,
      meaningsVi: [],
      examples: [],
      hskBand: 1,
    }) as unknown as Vocabulary,
);
const observed = (exercise_type: string, patch: Partial<Mistake> = {}) =>
  ({
    exercise_type,
    wrong_count: 3,
    attempts_30d: 6,
    errors_30d: 3,
    resolved: 0,
    ...patch,
  }) as Mistake;
describe("V8.3 supplemental memory policy", () => {
  it("separates unassisted, assisted, forgotten and unverified outcomes", () => {
    expect(recallOutcome(true, false)).toBe("UNASSISTED");
    expect(recallOutcome(true, true)).toBe("ASSISTED");
    expect(recallOutcome(false, false)).toBe("NOT_RECALLED");
    expect(recallOutcome(null, false)).toBe("UNVERIFIED");
  });
  it("does not claim stroke order from a recognizer or from manually typed text", () => {
    expect(
      assessRecallInk(
        "书",
        { source: "MANUAL", strokeCounts: [4], candidates: [["书"]] },
        [4],
      ).face,
    ).toBe("UNVERIFIED");
    const matched = assessRecallInk(
      "书",
      { source: "DIGITAL_INK", strokeCounts: [4], candidates: [["书"]] },
      [4],
    );
    expect(matched.face).toBe("MATCH");
    expect(matched.strokeOrderVerified).toBe(false);
    expect(
      assessRecallInk(
        "书",
        { source: "DIGITAL_INK", strokeCounts: [2], candidates: [["书"]] },
        [4],
      ).issues[0],
    ).toContain("2 nét");
    expect(
      assessRecallInk(
        "书",
        { source: "DIGITAL_INK", strokeCounts: [4], candidates: [["水"]] },
        [4],
      ).face,
    ).toBe("DIFFERENT");
    expect(
      assessRecallInk(
        "龘",
        { source: "DIGITAL_INK", strokeCounts: [4], candidates: [["龘"]] },
        [0],
      ).issues[0],
    ).toContain("chưa có dữ liệu");
  });
  it("requires explicit evidence before naming a cause", () => {
    expect(classifyMemoryError(observed("memory_visual_choice"))).toBe(
      "VISUAL_CONFUSION",
    );
    expect(classifyMemoryError(observed("confusable_context"))).toBe(
      "CONTEXT_USAGE",
    );
    expect(classifyMemoryError(observed("writing"))).toBe("UNKNOWN");
    expect(
      classifyMemoryError(observed("hanzi_to_pinyin", { attempts_30d: 1 })),
    ).toBe("UNKNOWN");
    expect(classifyMemoryError(observed("hanzi_to_meaning"))).toBe(
      "MEANING_RECALL",
    );
    expect(classifyMemoryError(observed("tone_choice"))).toBe("TONE");
    expect(classifyMemoryError(observed("audio_to_hanzi"))).toBe("UNKNOWN");
    expect(
      classifyMemoryError(
        observed("hanzi_to_pinyin", { attempts_30d: Number.NaN }),
      ),
    ).toBe("UNKNOWN");
  });
  it("picks one direction per word and only adapts to reliable task evidence", () => {
    expect(chooseMemoryDirection([observed("hanzi_to_pinyin")], 0)).toBe(
      "hanzi_to_pinyin",
    );
    expect(
      new Set(Array.from({ length: 7 }, (_, i) => chooseMemoryDirection([], i)))
        .size,
    ).toBe(7);
    expect(chooseMemoryDirection([observed("writing")], 0)).toBe(
      "hanzi_to_meaning",
    );
  });
  it("never exposes target text or its pinyin in a masked personal-context prompt", () => {
    const q = buildMemoryQuestion(
      words[0]!,
      "cloze",
      words,
      "我有书，也喜欢书。",
    );
    expect(q.prompt).toBe("我有＿＿，也喜欢＿＿。");
    expect(q.prompt).not.toContain("shū");
    expect(q.contextSource).toBe("PERSONAL_CONTEXT");
    expect(checkMemoryAnswer(q, "书")).toBe(true);
    expect(buildMemoryQuestion(words[0]!, "writing", words, null).prompt).toBe(
      "sách",
    );
    expect(
      buildMemoryQuestion(words[0]!, "audio_to_hanzi", words, null).prompt,
    ).not.toContain("书");
  });
  it("uses four verified choices, avoids synonym distractors, and safely falls back when unavailable", () => {
    const q = buildMemoryQuestion(words[0]!, "hanzi_to_meaning", words, null);
    expect(q.choices).toHaveLength(4);
    expect(checkMemoryAnswer(q, "sách")).toBe(true);
    expect(checkMemoryAnswer(q, "quyển sách")).toBe(false);
    expect(
      buildMemoryQuestion(words[0]!, "hanzi_to_meaning", [words[0]!], null)
        .type,
    ).toBe("meaning_to_hanzi");
    const sparse = buildMemoryQuestion(
      words[0]!,
      "hanzi_to_meaning",
      [words[0]!],
      null,
    );
    expect(sparse.choices).toEqual([]);
    expect(checkMemoryAnswer(sparse, "书")).toBe(true);
    expect(
      buildMemoryQuestion(words[0]!, "hanzi_to_pinyin", words, null).choices,
    ).toContain("shū");
  });
  it("reduces suggestions without mutating goals, schedules or real study time", () => {
    const input = {
      due: 100,
      weakWords: 20,
      attempts: 20,
      errors: 12,
      newGoal: 20,
      minuteGoal: 30,
      studySeconds: 0,
    };
    const before = { ...input };
    const plan = adaptiveMemoryPlan(input);
    expect(plan.newWords).toBe(0);
    expect(plan.reviewWords).toBe(72);
    expect(plan.estimatedMinutes).toBe(30);
    expect(input).toEqual(before);
    expect(
      adaptiveMemoryPlan({ ...input, attempts: 2, errors: 1 }).recentErrorRate,
    ).toBeNull();
  });
});
