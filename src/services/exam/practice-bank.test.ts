import { describe, expect, it } from "vitest";

import { assertQuestionBankReferencesValid } from "./engine";
import {
  buildOriginalPractice,
  getPracticeEvidence,
  originalPracticeBank,
} from "./practice-bank";

describe("original mini practice content", () => {
  it("has seven independent levels, stable unique IDs and explained answers", () => {
    expect(originalPracticeBank).toHaveLength(7);
    const questions = originalPracticeBank.flatMap((item) => item.questions);
    expect(questions).toHaveLength(28);
    expect(new Set(questions.map((item) => item.id)).size).toBe(28);
    for (const { profile, questions } of originalPracticeBank) {
      expect(() =>
        assertQuestionBankReferencesValid(profile, questions),
      ).not.toThrow();
      expect(profile.kind).toBe("ORIGINAL_PRACTICE");
      expect(profile.verified).toBe(false);
      expect(profile.standardVersionId).toBeNull();
    }
  });
});

describe("honest section evidence and targeted next practice", () => {
  it("distinguishes unmeasured skills from zero accuracy and unanswered items", () => {
    const { questions } = buildOriginalPractice("original-reading-1-v1", 5);
    const evidence = getPracticeEvidence(questions, {});
    expect(evidence.sections[0]).toMatchObject({
      skill: "READING",
      total: 4,
      answered: 0,
      unanswered: 4,
      percent: 0,
    });
    expect(evidence.sections[1]).toMatchObject({
      skill: "LISTENING",
      total: 0,
      percent: null,
      evidence: "MISSING",
    });
    expect(evidence.missingSkills).toEqual([
      "LISTENING",
      "WRITING",
      "SPEAKING",
      "TRANSLATION",
    ]);
    expect(evidence.confidence).toBe("LIMITED_PRACTICE_ONLY");
  });
  it("recommends the weakest measured group without altering IDs or answers", () => {
    const { questions } = buildOriginalPractice("original-reading-1-v1", 5);
    const answers = Object.fromEntries(
      questions.slice(0, 2).map((q) => [q.id, q.correctIndex]),
    );
    const before = JSON.stringify({ questions, answers });
    expect(getPracticeEvidence(questions, answers).recommendedFocus).toBe(
      "LANGUAGE",
    );
    const reverse = Object.fromEntries(
      questions.slice(2).map((q) => [q.id, q.correctIndex]),
    );
    expect(getPracticeEvidence(questions, reverse).recommendedFocus).toBe(
      "READING",
    );
    expect(JSON.stringify({ questions, answers })).toBe(before);
  });
  it("does not claim readiness after a perfect or empty sample", () => {
    const { questions } = buildOriginalPractice("original-reading-1-v1", 5);
    const answers = Object.fromEntries(
      questions.map((q) => [q.id, q.correctIndex]),
    );
    expect(getPracticeEvidence(questions, answers)).toMatchObject({
      recommendedFocus: "ALL",
      weakestType: null,
      confidence: "LIMITED_PRACTICE_ONLY",
    });
    expect(
      getPracticeEvidence([], {}).sections.every((s) => s.percent === null),
    ).toBe(true);
  });
});
