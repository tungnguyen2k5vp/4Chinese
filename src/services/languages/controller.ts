import type {
  LearningLanguage,
  LearningSessionContext,
  PronunciationVariant,
  UiLocale,
} from "./config";

export interface LanguagePreferences {
  uiLocale: UiLocale;
  learningLanguage: LearningLanguage;
  englishVariant: "en-US" | "en-GB";
}
export const defaultLanguagePreferences: LanguagePreferences = {
  uiLocale: "vi",
  learningLanguage: "zh",
  englishVariant: "en-US",
};
export interface LanguagePreferenceStore {
  read(): Promise<LanguagePreferences>;
  write(value: LanguagePreferences): Promise<void>;
}
export type SwitchBlocker = "SESSION" | "DRAFT" | "RECORDING";
export type SwitchResult =
  | { status: "CHANGED" | "UNCHANGED" }
  | { status: "BLOCKED"; reasons: readonly SwitchBlocker[] };

export function validateLanguagePreferences(
  value: unknown,
): LanguagePreferences {
  if (!value || typeof value !== "object")
    throw new Error("INVALID_LANGUAGE_PREFERENCES");
  const row = value as Record<string, unknown>;
  if (
    row.uiLocale !== "vi" ||
    !["zh", "en"].includes(String(row.learningLanguage)) ||
    !["en-US", "en-GB"].includes(String(row.englishVariant))
  ) {
    throw new Error("INVALID_LANGUAGE_PREFERENCES");
  }
  return {
    uiLocale: "vi",
    learningLanguage: row.learningLanguage as LearningLanguage,
    englishVariant: row.englishVariant as "en-US" | "en-GB",
  };
}

/** Persist first; failed writes never switch the visible context. No queue is cleared. */
export class LanguageController {
  private current: LanguagePreferences;
  private busy = false;
  private blockers = new Map<symbol, SwitchBlocker>();
  private listeners = new Set<() => void>();
  constructor(
    private readonly store: LanguagePreferenceStore,
    initial: LanguagePreferences,
  ) {
    this.current = Object.freeze(validateLanguagePreferences(initial));
  }
  getSnapshot = (): Readonly<LanguagePreferences> => this.current;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  /** A guard stays owned by its session/draft until that owner saves or cancels it. */
  protect(reason: SwitchBlocker): () => void {
    if (this.busy) throw new Error("LANGUAGE_SWITCH_IN_PROGRESS");
    const token = Symbol(reason);
    this.blockers.set(token, reason);
    return () => {
      this.blockers.delete(token);
    };
  }
  sessionContext(sessionId: string): LearningSessionContext {
    if (this.busy) throw new Error("LANGUAGE_SWITCH_IN_PROGRESS");
    if (!sessionId.trim()) throw new Error("INVALID_SESSION_ID");
    const pronunciationVariant: PronunciationVariant =
      this.current.learningLanguage === "zh"
        ? "zh-CN"
        : this.current.englishVariant;
    return Object.freeze({
      sessionId,
      learningLanguage: this.current.learningLanguage,
      uiLocale: this.current.uiLocale,
      pronunciationVariant,
    });
  }
  async update(
    patch: Partial<
      Pick<LanguagePreferences, "learningLanguage" | "englishVariant">
    >,
  ): Promise<SwitchResult> {
    if (this.busy) throw new Error("LANGUAGE_SWITCH_IN_PROGRESS");
    const next = validateLanguagePreferences({ ...this.current, ...patch });
    if (
      next.learningLanguage === this.current.learningLanguage &&
      next.englishVariant === this.current.englishVariant
    )
      return { status: "UNCHANGED" };
    const reasons = [...new Set(this.blockers.values())];
    if (reasons.length) return { status: "BLOCKED", reasons };
    this.busy = true;
    try {
      await this.store.write(next);
      this.current = Object.freeze(next);
    } finally {
      this.busy = false;
    }
    this.listeners.forEach((listener) => listener());
    return { status: "CHANGED" };
  }
}
