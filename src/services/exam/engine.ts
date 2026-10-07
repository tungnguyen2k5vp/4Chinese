import type { HskLevel } from "../hsk/alignment";

export type ExamSkill =
  "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "TRANSLATION";
export const examSkillLabels: Record<ExamSkill, string> = {
  READING: "Đọc",
  LISTENING: "Nghe",
  WRITING: "Viết",
  SPEAKING: "Nói",
  TRANSLATION: "Dịch",
};
export type ExamQuestionType =
  | "READING_COMPREHENSION"
  | "LANGUAGE_IN_CONTEXT"
  | "VOCABULARY_CHOICE"
  | "GRAMMAR_CLOZE"
  | "LISTENING_CHOICE";
export interface ExamQuestionMetadata {
  contentVersion: number;
  level: HskLevel;
  difficulty: 1 | 2 | 3;
  questionType: ExamQuestionType;
  section: ExamSkill;
  skills: ExamSkill[];
  targetVocabularyIds: string[];
  targetGrammarIds: string[];
  sourceType: "ORIGINAL" | "LICENSED" | "OFFICIAL";
  reviewStatus: "DRAFT" | "LEGACY_CURATED" | "REVIEWED" | "VERIFIED";
  review?: {
    reviewer: string;
    reviewedAt: string;
    sourceRef: string;
    licenseRef: string;
  };
  audio?: {
    source:
      "SYSTEM_TTS" | "CLOUD_TTS" | "NATIVE_RECORDING" | "LICENSED_RECORDING";
    transcript: string;
    assetId?: string;
  };
}
export interface ExamProfile {
  id: string;
  name: string;
  level: HskLevel;
  standardVersionId: string | null;
  kind: "ORIGINAL_PRACTICE" | "OFFICIAL_STRUCTURE";
  verified: boolean;
  sourceRef: string | null;
  durationSeconds: number;
  navigation?: "FREE" | "SECTION_TIMED";
  backNavigation?: "ALLOW" | "NO_BACK";
  /** Additive metadata only; omission is the legacy V4 contract. */
  metadataVersion?: 1;
  scoring?: "PRACTICE_ACCURACY";
  questionTypes?: ExamQuestionType[];
  references?: {
    vocabularyIds: string[];
    grammarIds: string[];
    audioIds: string[];
  };
  sections: {
    skill: ExamSkill;
    durationSeconds: number;
    questionCount: number;
  }[];
}
export interface ExamQuestion {
  id: string;
  profileId: string;
  skill: ExamSkill;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanationVi: string;
  provenance: "CURATED" | "LICENSED" | "OFFICIAL" | "AI_DRAFT";
  metadata?: ExamQuestionMetadata;
}
const nonblank = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const questionTypes: ExamQuestionType[] = [
  "READING_COMPREHENSION",
  "LANGUAGE_IN_CONTEXT",
  "VOCABULARY_CHOICE",
  "GRAMMAR_CLOZE",
  "LISTENING_CHOICE",
];
const skills: ExamSkill[] = [
  "READING",
  "LISTENING",
  "WRITING",
  "SPEAKING",
  "TRANSLATION",
];
const uniqueStrings = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every(nonblank) &&
  new Set(value).size === value.length;
export function assertExamProfileValid(profile: ExamProfile): void {
  if (
    !profile ||
    typeof profile !== "object" ||
    !Array.isArray(profile.sections) ||
    !["ORIGINAL_PRACTICE", "OFFICIAL_STRUCTURE"].includes(profile.kind) ||
    typeof profile.verified !== "boolean" ||
    (profile.sourceRef !== null && !nonblank(profile.sourceRef)) ||
    (profile.standardVersionId !== null &&
      !nonblank(profile.standardVersionId)) ||
    (profile.backNavigation !== undefined &&
      !["ALLOW", "NO_BACK"].includes(profile.backNavigation)) ||
    (profile.metadataVersion !== undefined && profile.metadataVersion !== 1)
  )
    throw new Error("INVALID_EXAM_PROFILE");
  if (
    (profile.scoring !== undefined &&
      profile.scoring !== "PRACTICE_ACCURACY") ||
    (profile.metadataVersion === 1 && profile.scoring !== "PRACTICE_ACCURACY")
  )
    throw new Error("UNSUPPORTED_EXAM_SCORING");
  if (
    profile.navigation !== undefined &&
    !["FREE", "SECTION_TIMED"].includes(profile.navigation)
  )
    throw new Error("INVALID_EXAM_NAVIGATION");
  if (
    !nonblank(profile.id) ||
    !nonblank(profile.name) ||
    !["1", "2", "3", "4", "5", "6", "7-9"].includes(profile.level)
  )
    throw new Error("INVALID_EXAM_PROFILE");
  if (
    !Number.isSafeInteger(profile.durationSeconds) ||
    profile.durationSeconds <= 0 ||
    profile.sections.length === 0
  )
    throw new Error("INVALID_EXAM_DURATION");
  const skills = new Set<ExamSkill>();
  for (const section of profile.sections) {
    if (
      !section ||
      !["READING", "LISTENING", "WRITING", "SPEAKING", "TRANSLATION"].includes(
        section.skill,
      ) ||
      skills.has(section.skill)
    )
      throw new Error("INVALID_EXAM_SECTION");
    skills.add(section.skill);
    if (
      !Number.isSafeInteger(section.durationSeconds) ||
      section.durationSeconds <= 0 ||
      !Number.isSafeInteger(section.questionCount) ||
      section.questionCount <= 0
    )
      throw new Error("INVALID_EXAM_SECTION");
  }
  if (
    profile.sections.reduce(
      (sum, section) => sum + section.durationSeconds,
      0,
    ) !== profile.durationSeconds
  )
    throw new Error("EXAM_DURATION_MISMATCH");
  if (
    (profile.kind === "OFFICIAL_STRUCTURE" || profile.verified) &&
    (!profile.verified ||
      !nonblank(profile.sourceRef) ||
      !nonblank(profile.standardVersionId) ||
      profile.metadataVersion !== 1)
  )
    throw new Error("UNVERIFIED_OFFICIAL_EXAM_PROFILE");
  if (
    profile.metadataVersion === 1 &&
    (!Array.isArray(profile.questionTypes) ||
      profile.questionTypes.length === 0 ||
      new Set(profile.questionTypes).size !== profile.questionTypes.length ||
      profile.questionTypes.some((type) => !questionTypes.includes(type)))
  )
    throw new Error("INVALID_EXAM_QUESTION_TYPES");
  if (
    profile.references &&
    ![
      profile.references.vocabularyIds,
      profile.references.grammarIds,
      profile.references.audioIds,
    ].every(uniqueStrings)
  )
    throw new Error("INVALID_EXAM_REFERENCES");
}
/** Drafts may be audited, but never enter a playable test or an attempt snapshot. */
export function assertExamQuestionValid(
  profile: ExamProfile,
  question: ExamQuestion,
  allowDraft = false,
): void {
  if (
    !question ||
    !nonblank(question.id) ||
    question.profileId !== profile.id ||
    !nonblank(question.prompt) ||
    !nonblank(question.explanationVi) ||
    !["CURATED", "LICENSED", "OFFICIAL", "AI_DRAFT"].includes(
      question.provenance,
    )
  )
    throw new Error("INVALID_QUESTION_REFERENCE");
  if (
    !Array.isArray(question.choices) ||
    question.choices.length < 2 ||
    !question.choices.every(nonblank) ||
    new Set(
      question.choices.map((choice) =>
        choice.trim().normalize("NFKC").toLocaleLowerCase(),
      ),
    ).size !== question.choices.length ||
    !Number.isInteger(question.correctIndex) ||
    question.correctIndex < 0 ||
    question.correctIndex >= question.choices.length
  )
    throw new Error("INVALID_QUESTION_ANSWER");
  if (!profile.sections.some((section) => section.skill === question.skill))
    throw new Error("INVALID_QUESTION_SKILL");
  const meta = question.metadata;
  if (
    !meta &&
    (profile.metadataVersion === 1 ||
      profile.verified ||
      question.skill === "LISTENING")
  )
    throw new Error("MISSING_QUESTION_METADATA");
  if (
    question.provenance === "AI_DRAFT" &&
    (!allowDraft || meta?.reviewStatus !== "DRAFT")
  )
    throw new Error("UNREVIEWED_QUESTION");
  if (!meta) return; // Existing V4 snapshots are not retroactively promoted or rekeyed.
  if (
    !Number.isSafeInteger(meta.contentVersion) ||
    meta.contentVersion < 1 ||
    meta.level !== profile.level ||
    ![1, 2, 3].includes(meta.difficulty) ||
    !questionTypes.includes(meta.questionType) ||
    meta.section !== question.skill ||
    !Array.isArray(meta.skills) ||
    !meta.skills.includes(question.skill) ||
    new Set(meta.skills).size !== meta.skills.length ||
    meta.skills.some((skill) => !skills.includes(skill)) ||
    ![meta.targetVocabularyIds, meta.targetGrammarIds].every(uniqueStrings) ||
    !["ORIGINAL", "LICENSED", "OFFICIAL"].includes(meta.sourceType) ||
    !["DRAFT", "LEGACY_CURATED", "REVIEWED", "VERIFIED"].includes(
      meta.reviewStatus,
    ) ||
    (profile.questionTypes &&
      !profile.questionTypes.includes(meta.questionType))
  )
    throw new Error("INVALID_QUESTION_METADATA");
  if (meta.reviewStatus === "DRAFT" && !allowDraft)
    throw new Error("UNREVIEWED_QUESTION");
  if (
    meta.reviewStatus === "LEGACY_CURATED" &&
    (question.provenance !== "CURATED" ||
      meta.sourceType !== "ORIGINAL" ||
      meta.contentVersion !== 1)
  )
    throw new Error("INVALID_QUESTION_REVIEW");
  if (
    (meta.reviewStatus === "REVIEWED" ||
      meta.reviewStatus === "VERIFIED" ||
      meta.sourceType !== "ORIGINAL") &&
    (!meta.review ||
      !nonblank(meta.review.reviewer) ||
      !nonblank(meta.review.reviewedAt) ||
      !Number.isFinite(Date.parse(meta.review.reviewedAt)) ||
      !nonblank(meta.review.sourceRef) ||
      !nonblank(meta.review.licenseRef))
  )
    throw new Error("MISSING_QUESTION_REVIEW");
  if (
    (meta.sourceType === "OFFICIAL" && question.provenance !== "OFFICIAL") ||
    (meta.sourceType === "LICENSED" && question.provenance !== "LICENSED")
  )
    throw new Error("INVALID_QUESTION_SOURCE");
  if (
    meta.targetVocabularyIds.some(
      (id) => !profile.references?.vocabularyIds.includes(id),
    ) ||
    meta.targetGrammarIds.some(
      (id) => !profile.references?.grammarIds.includes(id),
    )
  )
    throw new Error("BROKEN_QUESTION_REFERENCE");
  if (
    (meta.questionType === "LISTENING_CHOICE") !==
    (question.skill === "LISTENING")
  )
    throw new Error("INVALID_QUESTION_SKILL");
  if (question.skill === "LISTENING" || meta.audio) {
    const audio = meta.audio;
    if (
      !audio ||
      !nonblank(audio.transcript) ||
      ![
        "SYSTEM_TTS",
        "CLOUD_TTS",
        "NATIVE_RECORDING",
        "LICENSED_RECORDING",
      ].includes(audio.source)
    )
      throw new Error("MISSING_QUESTION_AUDIO");
    if (
      audio.source !== "SYSTEM_TTS" &&
      (!nonblank(audio.assetId) ||
        !profile.references?.audioIds.includes(audio.assetId))
    )
      throw new Error("BROKEN_QUESTION_AUDIO");
    if (
      profile.verified &&
      (audio.source === "SYSTEM_TTS" || audio.source === "CLOUD_TTS")
    )
      throw new Error("UNVERIFIED_EXAM_AUDIO");
  }
  if (
    profile.verified &&
    (meta.reviewStatus !== "VERIFIED" ||
      meta.review?.sourceRef !== profile.sourceRef)
  )
    throw new Error("UNREVIEWED_VERIFIED_MOCK");
}
export function assertQuestionBankReferencesValid(
  profile: ExamProfile,
  questions: readonly ExamQuestion[],
): void {
  assertExamProfileValid(profile);
  if (!Array.isArray(questions)) throw new Error("INVALID_QUESTION_REFERENCE");
  const ids = new Set<string>();
  for (const question of questions) {
    assertExamQuestionValid(profile, question);
    if (ids.has(question.id)) throw new Error("INVALID_QUESTION_REFERENCE");
    ids.add(question.id);
  }
  for (const section of profile.sections)
    if (
      questions.filter((question) => question.skill === section.skill)
        .length !== section.questionCount
    )
      throw new Error("QUESTION_COUNT_MISMATCH");
  if (profile.navigation === "SECTION_TIMED") {
    let offset = 0;
    for (const section of profile.sections) {
      if (
        questions
          .slice(offset, offset + section.questionCount)
          .some((question) => question.skill !== section.skill)
      )
        throw new Error("INVALID_SECTION_ORDER");
      offset += section.questionCount;
    }
  }
  if (
    profile.questionTypes?.some(
      (type) =>
        !questions.some((question) => question.metadata?.questionType === type),
    )
  )
    throw new Error("MISSING_QUESTION_TYPE");
}
/** Fixed sequential windows; app backgrounding never pauses a section clock. */
export function getExamSectionWindow(
  profile: ExamProfile,
  startedAtMs: number,
  nowMs: number,
) {
  assertExamProfileValid(profile);
  remainingExamSeconds(startedAtMs, nowMs, profile.durationSeconds);
  const elapsed = Math.max(0, (nowMs - startedAtMs) / 1000);
  let startsAt = 0;
  let firstQuestionIndex = 0;
  for (const [index, section] of profile.sections.entries()) {
    const endsAt = startsAt + section.durationSeconds;
    if (elapsed < endsAt)
      return {
        index,
        skill: section.skill,
        firstQuestionIndex,
        lastQuestionIndex: firstQuestionIndex + section.questionCount - 1,
        remainingSeconds: Math.ceil(endsAt - elapsed),
      };
    startsAt = endsAt;
    firstQuestionIndex += section.questionCount;
  }
  return null;
}
export function remainingExamSeconds(
  startedAtMs: number,
  nowMs: number,
  durationSeconds: number,
): number {
  if (
    ![startedAtMs, nowMs, durationSeconds].every(Number.isFinite) ||
    durationSeconds <= 0
  )
    throw new Error("INVALID_EXAM_CLOCK");
  return Math.max(
    0,
    Math.ceil(durationSeconds - Math.max(0, nowMs - startedAtMs) / 1000),
  );
}
export function scorePractice(
  questions: readonly ExamQuestion[],
  answers: Readonly<Record<string, number>>,
) {
  const correct = questions.filter(
    (question) => answers[question.id] === question.correctIndex,
  ).length;
  return {
    correct,
    total: questions.length,
    percent: questions.length
      ? Math.round((correct / questions.length) * 100)
      : 0,
    wrongIds: questions
      .filter((question) => answers[question.id] !== question.correctIndex)
      .map((question) => question.id),
  };
}
