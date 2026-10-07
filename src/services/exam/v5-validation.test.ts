import { describe, expect, it } from "vitest";

import { draftPracticeBank } from "./draft-bank";
import {
  assertExamProfileValid,
  assertExamQuestionValid,
  assertQuestionBankReferencesValid,
  type ExamProfile,
  type ExamQuestion,
} from "./engine";
import {
  buildOriginalPractice,
  originalPracticeBank,
  practiceDurations,
  type PracticeDuration,
} from "./practice-bank";
import {
  getExamCurrentIndex,
  validateExamSnapshot,
  type ExamAttempt,
} from "./session";

const bank = buildOriginalPractice("original-reading-1-v1", 5);
const item = bank.questions[0]!;
const reviewed: ExamQuestion = {
  ...item,
  metadata: {
    ...item.metadata!,
    reviewStatus: "VERIFIED",
    review: {
      reviewer: "fixture-reviewer",
      reviewedAt: "2026-10-01",
      sourceRef: "fixture-source",
      licenseRef: "fixture-license",
    },
  },
};

describe("V5 question/profile validation", () => {
  it.each([0, -5, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid duration %s",
    (durationSeconds) => {
      expect(() =>
        assertExamProfileValid({ ...bank.profile, durationSeconds }),
      ).toThrow("INVALID_EXAM_DURATION");
    },
  );
  it("rejects malformed profile navigation, references and unsupported metadata versions", () => {
    expect(() =>
      assertExamProfileValid({ ...bank.profile, scoring: undefined }),
    ).toThrow("UNSUPPORTED_EXAM_SCORING");
    expect(() =>
      assertExamProfileValid({
        ...bank.profile,
        scoring: "OFFICIAL_HSK_SCORE",
      } as unknown as ExamProfile),
    ).toThrow("UNSUPPORTED_EXAM_SCORING");
    expect(() =>
      assertExamProfileValid({
        ...bank.profile,
        backNavigation: "SOMETIMES",
      } as unknown as ExamProfile),
    ).toThrow("INVALID_EXAM_PROFILE");
    expect(() =>
      assertExamProfileValid({
        ...bank.profile,
        metadataVersion: 2,
      } as unknown as ExamProfile),
    ).toThrow("INVALID_EXAM_PROFILE");
    expect(() =>
      assertExamProfileValid({
        ...bank.profile,
        references: {
          vocabularyIds: ["same", "same"],
          grammarIds: [],
          audioIds: [],
        },
      }),
    ).toThrow("INVALID_EXAM_REFERENCES");
  });
  it.each([
    [{ ...item, choices: [" A ", "a"] }, "INVALID_QUESTION_ANSWER"],
    [{ ...item, correctIndex: undefined }, "INVALID_QUESTION_ANSWER"],
    [{ ...item, explanationVi: " " }, "INVALID_QUESTION_REFERENCE"],
    [{ ...item, metadata: undefined }, "MISSING_QUESTION_METADATA"],
    [
      { ...item, metadata: { ...item.metadata!, level: "9" } },
      "INVALID_QUESTION_METADATA",
    ],
    [
      { ...item, metadata: { ...item.metadata!, section: "WRITING" } },
      "INVALID_QUESTION_METADATA",
    ],
    [
      { ...item, metadata: { ...item.metadata!, contentVersion: 0 } },
      "INVALID_QUESTION_METADATA",
    ],
    [
      {
        ...item,
        metadata: { ...item.metadata!, targetVocabularyIds: ["missing"] },
      },
      "BROKEN_QUESTION_REFERENCE",
    ],
    [
      {
        ...item,
        metadata: { ...item.metadata!, targetGrammarIds: ["missing"] },
      },
      "BROKEN_QUESTION_REFERENCE",
    ],
    [
      { ...item, metadata: { ...item.metadata!, reviewStatus: "DRAFT" } },
      "UNREVIEWED_QUESTION",
    ],
    [
      { ...item, metadata: { ...item.metadata!, reviewStatus: "REVIEWED" } },
      "MISSING_QUESTION_REVIEW",
    ],
    [{ ...item, provenance: "BAD" }, "INVALID_QUESTION_REFERENCE"],
  ] as const)("rejects invalid item %#", (question, message) => {
    expect(() =>
      assertExamQuestionValid(bank.profile, question as ExamQuestion),
    ).toThrow(message);
  });
  it("resolves target references only against the supplied immutable reference inventory", () => {
    const profile = {
      ...bank.profile,
      references: {
        vocabularyIds: ["word-1"],
        grammarIds: ["grammar-1"],
        audioIds: [],
      },
    };
    const question = {
      ...item,
      metadata: {
        ...item.metadata!,
        targetVocabularyIds: ["word-1"],
        targetGrammarIds: ["grammar-1"],
      },
    };
    expect(() => assertExamQuestionValid(profile, question)).not.toThrow();
    expect(() =>
      assertExamQuestionValid({ ...profile, references: undefined }, question),
    ).toThrow("BROKEN_QUESTION_REFERENCE");
  });
  it("requires independent recorded review/source evidence for verified mock items", () => {
    const profile: ExamProfile = {
      ...bank.profile,
      kind: "OFFICIAL_STRUCTURE",
      verified: true,
      standardVersionId: "fixture-standard",
      sourceRef: "fixture-source",
    };
    expect(() => assertExamQuestionValid(profile, item)).toThrow(
      "UNREVIEWED_VERIFIED_MOCK",
    );
    expect(() => assertExamQuestionValid(profile, reviewed)).not.toThrow();
    expect(() =>
      assertExamQuestionValid(profile, { ...reviewed, provenance: "AI_DRAFT" }),
    ).toThrow("UNREVIEWED_QUESTION");
    expect(() =>
      assertExamQuestionValid(profile, {
        ...reviewed,
        metadata: {
          ...reviewed.metadata!,
          review: { ...reviewed.metadata!.review!, sourceRef: "different" },
        },
      }),
    ).toThrow("UNREVIEWED_VERIFIED_MOCK");
    expect(() =>
      assertExamProfileValid({ ...profile, metadataVersion: undefined }),
    ).toThrow("UNVERIFIED_OFFICIAL_EXAM_PROFILE");
  });
  it("requires real referenced audio or honestly tagged TTS and blocks TTS in verified mocks", () => {
    const profile: ExamProfile = {
      ...bank.profile,
      questionTypes: ["LISTENING_CHOICE"],
      sections: [
        { skill: "LISTENING", durationSeconds: 300, questionCount: 1 },
      ],
      references: { vocabularyIds: [], grammarIds: [], audioIds: ["clip-1"] },
    };
    const question: ExamQuestion = {
      ...reviewed,
      skill: "LISTENING",
      metadata: {
        ...reviewed.metadata!,
        section: "LISTENING",
        skills: ["LISTENING"],
        questionType: "LISTENING_CHOICE",
      },
    };
    expect(() => assertExamQuestionValid(profile, question)).toThrow(
      "MISSING_QUESTION_AUDIO",
    );
    const withAudio = (
      source: "SYSTEM_TTS" | "LICENSED_RECORDING",
      assetId?: string,
    ): ExamQuestion => ({
      ...question,
      metadata: {
        ...question.metadata!,
        audio: { source, assetId, transcript: "你好。" },
      },
    });
    expect(() =>
      assertExamQuestionValid(
        profile,
        withAudio("LICENSED_RECORDING", "missing"),
      ),
    ).toThrow("BROKEN_QUESTION_AUDIO");
    expect(() =>
      assertExamQuestionValid(
        profile,
        withAudio("LICENSED_RECORDING", "clip-1"),
      ),
    ).not.toThrow();
    expect(() =>
      assertExamQuestionValid(profile, withAudio("SYSTEM_TTS")),
    ).not.toThrow();
    expect(() =>
      assertExamQuestionValid(
        {
          ...profile,
          verified: true,
          standardVersionId: "fixture",
          sourceRef: "fixture-source",
        },
        withAudio("SYSTEM_TTS"),
      ),
    ).toThrow("UNVERIFIED_EXAM_AUDIO");
  });
  it("checks counts, section order, declared type coverage and normalized duplicate answers", () => {
    expect(() =>
      assertQuestionBankReferencesValid(bank.profile, bank.questions.slice(1)),
    ).toThrow("QUESTION_COUNT_MISMATCH");
    expect(() =>
      assertQuestionBankReferencesValid(
        {
          ...bank.profile,
          questionTypes: [...bank.profile.questionTypes!, "GRAMMAR_CLOZE"],
        },
        bank.questions,
      ),
    ).toThrow("MISSING_QUESTION_TYPE");
    const profile: ExamProfile = {
      ...originalPracticeBank[0]!.profile,
      navigation: "SECTION_TIMED",
      sections: [
        { skill: "READING", durationSeconds: 100, questionCount: 1 },
        { skill: "WRITING", durationSeconds: 200, questionCount: 1 },
      ],
    };
    const q = originalPracticeBank[0]!.questions[0]!;
    expect(() =>
      assertQuestionBankReferencesValid(profile, [
        { ...q, id: "w", skill: "WRITING" },
        q,
      ]),
    ).toThrow("INVALID_SECTION_ORDER");
  });
  it("rejects malformed snapshot state and unsupported versions before persistence", () => {
    const snapshot = {
      contentVersion: 1 as const,
      ...bank,
      answers: {},
      flaggedIds: [],
      currentIndex: 0,
    };
    expect(() => validateExamSnapshot(snapshot)).not.toThrow();
    expect(() =>
      validateExamSnapshot({
        ...snapshot,
        answers: [],
      } as unknown as typeof snapshot),
    ).toThrow("INVALID_EXAM_ANSWER");
    expect(() =>
      validateExamSnapshot({
        ...snapshot,
        contentVersion: 2,
      } as unknown as typeof snapshot),
    ).toThrow("UNSUPPORTED_EXAM_SNAPSHOT");
    expect(() =>
      validateExamSnapshot({ ...snapshot, furthestIndex: 9 }),
    ).toThrow("INVALID_EXAM_POSITION");
  });
});

describe("bounded original practice selection", () => {
  it("offers only 5/10/15 minutes, with honest reused counts and stable base IDs", () => {
    expect(practiceDurations).toEqual([5, 10, 15]);
    for (const base of originalPracticeBank) {
      expect(base.profile.id).toBe(`original-reading-${base.profile.level}-v1`);
      for (const duration of practiceDurations) {
        for (const focus of ["ALL", "READING", "LANGUAGE"] as const) {
          const selected = buildOriginalPractice(
            base.profile.id,
            duration,
            focus,
          );
          expect(selected.questions).toHaveLength(focus === "ALL" ? 4 : 2);
          expect(selected.profile.durationSeconds).toBe(duration * 60);
          expect(selected.profile.verified).toBe(false);
          expect(
            selected.questions.every(
              (q) => q.metadata?.reviewStatus === "LEGACY_CURATED",
            ),
          ).toBe(true);
          expect(() =>
            assertQuestionBankReferencesValid(
              selected.profile,
              selected.questions,
            ),
          ).not.toThrow();
          expect(
            buildOriginalPractice(base.profile.id, duration, focus),
          ).toEqual(selected);
        }
      }
    }
    expect(() => buildOriginalPractice(bank.profile.id, 5)).toThrow(
      "UNKNOWN_PRACTICE_PROFILE",
    );
    expect(() =>
      buildOriginalPractice("original-reading-1-v1", 7 as PracticeDuration),
    ).toThrow("INVALID_PRACTICE_DURATION");
    expect(originalPracticeBank.flatMap((b) => b.questions)).toHaveLength(28);
  });
  it("audits 84 original candidates but rejects all of them from playable banks", () => {
    const questions = draftPracticeBank.flatMap((entry) => entry.questions);
    expect(questions).toHaveLength(84);
    expect(new Set(questions.map((q) => q.id)).size).toBe(84);
    for (const draft of draftPracticeBank) {
      expect(() =>
        assertQuestionBankReferencesValid(draft.profile, draft.questions),
      ).toThrow("UNREVIEWED_QUESTION");
      for (const q of draft.questions) {
        expect(q.metadata?.reviewStatus).toBe("DRAFT");
        expect(() =>
          assertExamQuestionValid(draft.profile, q, true),
        ).not.toThrow();
      }
    }
  });
  it("resolves fixed section positions on boundary/resume without mutating a snapshot", () => {
    const profile: ExamProfile = {
      ...originalPracticeBank[0]!.profile,
      navigation: "SECTION_TIMED",
      durationSeconds: 30,
      sections: [
        { skill: "READING", durationSeconds: 10, questionCount: 2 },
        { skill: "WRITING", durationSeconds: 20, questionCount: 2 },
      ],
    };
    const attempt: ExamAttempt = {
      id: "fixture",
      startedAtMs: 1000,
      submittedAtMs: null,
      status: "IN_PROGRESS",
      revision: 0,
      snapshot: {
        contentVersion: 1,
        profile,
        questions: [],
        answers: {},
        flaggedIds: [],
        currentIndex: 1,
      },
    };
    expect(getExamCurrentIndex(attempt, 10999)).toBe(1);
    expect(getExamCurrentIndex(attempt, 11000)).toBe(2);
    expect(getExamCurrentIndex(attempt, 30000)).toBe(2);
    expect(attempt.snapshot.currentIndex).toBe(1);
  });
});
