import { describe, expect, it } from "vitest";

import {
  assertExamProfileValid,
  assertQuestionBankReferencesValid,
  remainingExamSeconds,
  scorePractice,
  getExamSectionWindow,
  type ExamProfile,
  type ExamQuestion,
} from "./engine";

const profile: ExamProfile = {
  id: "fixture",
  name: "Fixture only",
  level: "1",
  standardVersionId: null,
  kind: "ORIGINAL_PRACTICE",
  verified: false,
  sourceRef: null,
  durationSeconds: 300,
  sections: [{ skill: "READING", durationSeconds: 300, questionCount: 1 }],
};
const questions: [ExamQuestion] = [
  {
    id: "fixture-q",
    profileId: "fixture",
    skill: "READING",
    prompt: "Fixture prompt",
    choices: ["A", "B"],
    correctIndex: 0,
    explanationVi: "Fixture explanation",
    provenance: "CURATED",
  },
];
describe("exam engine safeguards", () => {
  it("advances fixed section windows at exact boundaries and after backgrounding", () => {
    const multi: ExamProfile = {
      ...profile,
      navigation: "SECTION_TIMED",
      durationSeconds: 30,
      sections: [
        { skill: "READING", durationSeconds: 10, questionCount: 2 },
        { skill: "WRITING", durationSeconds: 20, questionCount: 1 },
      ],
    };
    expect(getExamSectionWindow(multi, 1000, 1000)).toMatchObject({
      firstQuestionIndex: 0,
      lastQuestionIndex: 1,
      remainingSeconds: 10,
    });
    expect(getExamSectionWindow(multi, 1000, 11000)).toMatchObject({
      skill: "WRITING",
      firstQuestionIndex: 2,
      remainingSeconds: 20,
    });
    expect(getExamSectionWindow(multi, 1000, 30000)?.remainingSeconds).toBe(1);
    expect(getExamSectionWindow(multi, 1000, 31000)).toBeNull();
  });
  it("validates original practice without pretending it is official", () => {
    expect(() =>
      assertQuestionBankReferencesValid(profile, questions),
    ).not.toThrow();
  });
  it("blocks unverified official structure", () => {
    expect(() =>
      assertExamProfileValid({ ...profile, kind: "OFFICIAL_STRUCTURE" }),
    ).toThrow("UNVERIFIED_OFFICIAL_EXAM_PROFILE");
  });
  it("rejects wrong total duration and duplicate sections", () => {
    expect(() =>
      assertExamProfileValid({ ...profile, durationSeconds: 2 }),
    ).toThrow("EXAM_DURATION_MISMATCH");
    expect(() =>
      assertExamProfileValid({
        ...profile,
        sections: [
          ...profile.sections,
          { skill: "READING", durationSeconds: 300, questionCount: 1 },
        ],
      }),
    ).toThrow("INVALID_EXAM_SECTION");
  });
  it("rejects broken references, answer indexes and drafts", () => {
    expect(() =>
      assertQuestionBankReferencesValid(profile, [
        { ...questions[0], profileId: "wrong" },
      ]),
    ).toThrow("INVALID_QUESTION_REFERENCE");
    expect(() =>
      assertQuestionBankReferencesValid(profile, [
        { ...questions[0], correctIndex: 99 },
      ]),
    ).toThrow("INVALID_QUESTION_ANSWER");
    expect(() =>
      assertQuestionBankReferencesValid(profile, [
        { ...questions[0], provenance: "AI_DRAFT" },
      ]),
    ).toThrow("UNREVIEWED_QUESTION");
    expect(() => assertQuestionBankReferencesValid(profile, [])).toThrow(
      "QUESTION_COUNT_MISMATCH",
    );
  });
  it("uses wall time after backgrounding and never returns negative time", () => {
    expect(remainingExamSeconds(1000, 61000, 300)).toBe(240);
    expect(remainingExamSeconds(1000, 500000, 300)).toBe(0);
    expect(remainingExamSeconds(1000, 0, 300)).toBe(300);
  });
  it("scores unanswered as wrong, not as official scaled points", () => {
    expect(scorePractice(questions, {})).toEqual({
      correct: 0,
      total: 1,
      percent: 0,
      wrongIds: ["fixture-q"],
    });
    expect(scorePractice(questions, { "fixture-q": 0 }).percent).toBe(100);
  });
});
