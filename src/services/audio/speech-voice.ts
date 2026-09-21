export type SpeechVoiceLike = {
  identifier: string;
  language: string;
  name: string;
  quality: string;
};

const MANDARIN_LANGUAGE_PATTERN =
  /^(zh(?:-hans)?(?:-cn|-sg)?|cmn(?:-hans)?(?:-cn|-sg)?)$/i;
const CHINESE_LANGUAGE_PATTERN = /^(zh|cmn)(?:-|$)/i;
const NON_MANDARIN_PATTERN = /(?:^|[-_])(yue|hk|tw|hant)(?:[-_]|$)/i;

export function normalizeSpeechLocale(locale: string): string {
  return locale.trim().replace(/_/g, "-").toLowerCase();
}

export function isChineseSpeechVoice(voice: SpeechVoiceLike): boolean {
  const locale = normalizeSpeechLocale(voice.language);
  const searchable = `${locale}-${voice.identifier}-${voice.name}`;
  return (
    CHINESE_LANGUAGE_PATTERN.test(locale) ||
    /(?:^|[-_])cmn(?:[-_]|$)/i.test(searchable)
  );
}

export function scoreMandarinVoice(voice: SpeechVoiceLike): number {
  const locale = normalizeSpeechLocale(voice.language);
  const searchable = `${locale}-${voice.identifier}-${voice.name}`;
  let score = 0;

  if (MANDARIN_LANGUAGE_PATTERN.test(locale)) score += 100;
  if (/^(zh|cmn)(?:-hans)?-cn$/i.test(locale)) score += 60;
  if (/(?:^|[-_])cmn(?:[-_]|$)/i.test(searchable)) score += 5;
  if (/hans/i.test(searchable)) score += 20;
  if (/enhanced/i.test(voice.quality)) score += 12;
  if (/(?:^|[-_])(local|embedded)(?:[-_]|$)/i.test(searchable)) score += 20;
  if (/(?:^|[-_])network(?:[-_]|$)/i.test(searchable)) score -= 10;
  if (NON_MANDARIN_PATTERN.test(searchable)) score -= 120;

  return score;
}

export function selectBestMandarinVoice<T extends SpeechVoiceLike>(
  voices: T[],
): T | null {
  const candidates = voices.filter(isChineseSpeechVoice);
  if (candidates.length === 0) return null;

  return [...candidates].sort((left, right) => {
    const scoreDifference =
      scoreMandarinVoice(right) - scoreMandarinVoice(left);
    if (scoreDifference !== 0) return scoreDifference;
    return left.identifier.localeCompare(right.identifier);
  })[0] ?? null;
}

export function clampSpeechRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0.82;
  return Math.min(1, Math.max(0.6, rate));
}
