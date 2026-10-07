import { describe, expect, it } from "vitest";

import {
  draftPracticeBank,
  previewDraftBankImport,
  validateDraftBank,
} from "./draft-bank";
import { assertQuestionBankReferencesValid } from "./engine";
import { validateExamSnapshot } from "./session";

const clone = () => structuredClone(draftPracticeBank);
describe("isolated V5 editorial candidates", () => {
  it("has 84 unique candidates with 14 per estimated band and 24 truthful TTS transcripts", () => {
    expect(draftPracticeBank.map(({ profile }) => profile.level)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    const questions = draftPracticeBank.flatMap(({ questions }) => questions);
    expect(questions).toHaveLength(84);
    expect(new Set(questions.map((q) => q.id)).size).toBe(84);
    expect(
      new Set(
        questions.map((q) => q.prompt + (q.metadata?.audio?.transcript ?? "")),
      ).size,
    ).toBe(84);
    expect(questions.filter((q) => q.skill === "LISTENING")).toHaveLength(24);
    expect(() => validateDraftBank(draftPracticeBank)).not.toThrow();
    for (const { profile, questions } of draftPracticeBank) {
      expect(questions).toHaveLength(14);
      expect(
        questions.filter(
          (q) => q.metadata?.questionType === "VOCABULARY_CHOICE",
        ),
      ).toHaveLength(3);
      expect(
        questions.filter((q) => q.metadata?.questionType === "GRAMMAR_CLOZE"),
      ).toHaveLength(3);
      expect(
        questions.filter(
          (q) => q.metadata?.questionType === "READING_COMPREHENSION",
        ),
      ).toHaveLength(4);
      expect(
        questions.filter(
          (q) => q.metadata?.questionType === "LISTENING_CHOICE",
        ),
      ).toHaveLength(4);
      for (const question of questions) {
        expect(question.explanationVi.length).toBeGreaterThan(25);
        expect(question.metadata?.targetVocabularyIds).toEqual([]);
        expect(question.metadata?.targetGrammarIds).toEqual([]);
        if (question.skill === "LISTENING")
          expect(question.metadata?.audio).toMatchObject({
            source: "SYSTEM_TTS",
          });
      }
      expect(() =>
        assertQuestionBankReferencesValid(profile, questions),
      ).toThrow("UNREVIEWED_QUESTION");
      expect(() =>
        validateExamSnapshot({
          contentVersion: 1,
          profile,
          questions,
          answers: {},
          flaggedIds: [],
          currentIndex: 0,
        }),
      ).toThrow("UNREVIEWED_QUESTION");
    }
  });
  it("preserves IDs of the original eighteen candidates", () => {
    for (const { profile, questions } of draftPracticeBank.slice(0, 3)) {
      expect(questions.slice(0, 6).map((q) => q.id)).toEqual(
        Array.from(
          { length: 6 },
          (_, i) => `original-candidates-${profile.level}-v5-q${i + 1}`,
        ),
      );
    }
    expect(draftPracticeBank[0]!.questions[0]!.prompt).toContain("医院");
  });
  it("roundtrips an isolated preview without mutating the built-in bank", () => {
    const before = JSON.stringify(draftPracticeBank);
    const preview = previewDraftBankImport(before);
    expect(preview).toEqual(draftPracticeBank);
    preview[0]!.questions[0]!.prompt = "modified local preview";
    expect(JSON.stringify(draftPracticeBank)).toBe(before);
  });
  it.each(["null", "{}", "[]", "[null]", "invalid"])(
    "rejects malformed input %s",
    (json) => {
      expect(() => previewDraftBankImport(json)).toThrow();
    },
  );
  it("bounds import size", () => {
    expect(() => previewDraftBankImport(" ".repeat(2_000_001))).toThrow(
      "INVALID_DRAFT_IMPORT",
    );
  });
  it("rejects duplicate IDs and normalized prompts", () => {
    const data = clone();
    data[0]!.questions[1]!.id = data[0]!.questions[0]!.id;
    expect(() => validateDraftBank(data)).toThrow("DUPLICATE_DRAFT_ID");
    const prompts = clone();
    prompts[0]!.questions[1]!.prompt = `  ${prompts[0]!.questions[0]!.prompt}  `;
    expect(() => validateDraftBank(prompts)).toThrow("DUPLICATE_DRAFT_PROMPT");
  });
  it("rejects duplicate choices, invalid answers, blank explanations and broken targets", () => {
    const data = clone();
    data[0]!.questions[0]!.choices = [" Ａ ", "a", "B"];
    expect(() => validateDraftBank(data)).toThrow("INVALID_QUESTION_ANSWER");
    data[0]!.questions[0]!.choices = ["A", "B", "C"];
    data[0]!.questions[0]!.correctIndex = 99;
    expect(() => validateDraftBank(data)).toThrow("INVALID_QUESTION_ANSWER");
    data[0]!.questions[0]!.correctIndex = 0;
    data[0]!.questions[0]!.explanationVi = " ";
    expect(() => validateDraftBank(data)).toThrow("INVALID_QUESTION_REFERENCE");
    data[0]!.questions[0]!.explanationVi = "A valid proposed explanation";
    data[0]!.questions[0]!.metadata!.targetVocabularyIds = ["not-in-profile"];
    expect(() => validateDraftBank(data)).toThrow("BROKEN_QUESTION_REFERENCE");
  });
  it("checks profile references against a real supplied inventory, not self-declarations", () => {
    const data = clone();
    data[0]!.profile.references!.vocabularyIds = ["self-declared-id"];
    data[0]!.questions[0]!.metadata!.targetVocabularyIds = ["self-declared-id"];
    expect(() => validateDraftBank(data)).toThrow("UNKNOWN_DRAFT_REFERENCE");
    expect(() =>
      validateDraftBank(data, {
        vocabularyIds: ["self-declared-id"],
        grammarIds: [],
        audioIds: [],
      }),
    ).not.toThrow();
  });
  it("checks counts, type coverage and timed section ordering", () => {
    const data = clone();
    data[0]!.profile.sections[0]!.questionCount = 11;
    expect(() => validateDraftBank(data)).toThrow("QUESTION_COUNT_MISMATCH");
    const types = clone();
    types[0]!.profile.questionTypes!.push("LANGUAGE_IN_CONTEXT");
    expect(() => validateDraftBank(types)).toThrow("MISSING_QUESTION_TYPE");
    const order = clone();
    order[0]!.profile.navigation = "SECTION_TIMED";
    [order[0]!.questions[0]!, order[0]!.questions[13]!] = [
      order[0]!.questions[13]!,
      order[0]!.questions[0]!,
    ];
    expect(() => validateDraftBank(order)).toThrow("INVALID_SECTION_ORDER");
  });
  it("never permits promotion or undocumented audio claims in a draft import", () => {
    const data = clone();
    data[0]!.profile.standardVersionId = "pretend-standard";
    expect(() => validateDraftBank(data)).toThrow("DRAFT_PROMOTION_FORBIDDEN");
    const review = clone();
    review[0]!.questions[0]!.metadata!.reviewStatus = "VERIFIED";
    expect(() => validateDraftBank(review)).toThrow();
    const audio = clone();
    audio[0]!.questions[10]!.metadata!.audio!.transcript = " ";
    expect(() => validateDraftBank(audio)).toThrow("MISSING_QUESTION_AUDIO");
    const claim = clone();
    claim[0]!.questions[10]!.metadata!.audio!.assetId = "made-up";
    expect(() => validateDraftBank(claim)).toThrow(
      "DRAFT_AUDIO_REQUIRES_SEPARATE_REVIEW",
    );
  });
});
