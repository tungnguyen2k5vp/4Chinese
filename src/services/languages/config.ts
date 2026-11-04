export type LearningLanguage = "zh" | "en";
export type UiLocale = "vi";
export type PronunciationVariant = "zh-CN" | "en-US" | "en-GB";
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface LanguageConfig {
  learningLanguage: LearningLanguage;
  label: string;
  levelSystem: "HSK" | "CEFR";
  pronunciationVariants: readonly PronunciationVariant[];
  capabilities: {
    hanzi: boolean;
    tones: boolean;
    ipa: boolean;
    spelling: boolean;
  };
}
export const languageConfigs: Record<LearningLanguage, LanguageConfig> = {
  zh: {
    learningLanguage: "zh",
    label: "Tiếng Trung",
    levelSystem: "HSK",
    pronunciationVariants: ["zh-CN"],
    capabilities: { hanzi: true, tones: true, ipa: false, spelling: false },
  },
  en: {
    learningLanguage: "en",
    label: "Tiếng Anh",
    levelSystem: "CEFR",
    pronunciationVariants: ["en-US", "en-GB"],
    capabilities: { hanzi: false, tones: false, ipa: true, spelling: true },
  },
};

/** Language, UI locale and accent are deliberately separate. */
export interface LearningSessionContext {
  learningLanguage: LearningLanguage;
  uiLocale: UiLocale;
  pronunciationVariant: PronunciationVariant;
  sessionId: string;
}
export function assertSessionLanguage(
  context: LearningSessionContext,
  language: LearningLanguage,
): void {
  if (context.learningLanguage !== language)
    throw new Error("SESSION_LANGUAGE_MISMATCH");
  if (
    !languageConfigs[language].pronunciationVariants.includes(
      context.pronunciationVariant,
    )
  )
    throw new Error("PRONUNCIATION_LANGUAGE_MISMATCH");
}

/** Keeps contractions and hyphens intact; does not rewrite display values. */
export function normalizeEnglishHeadword(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[’‘]/gu, "'")
    .trim()
    .replace(/\s+/gu, " ")
    .toLowerCase();
}
export function normalizeEnglishMeaning(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/giu, "d")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}
