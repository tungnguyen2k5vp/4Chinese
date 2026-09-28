import type { Vocabulary } from "@/types/models";

export type PronunciationProviderKind = "native" | "local" | "ai";

export type PronunciationTarget = Pick<Vocabulary, "simplified" | "traditional" | "pinyin">;

/**
 * A recognition result is intentionally different from an acoustic score.
 * Native/system recognition can tell us which word it heard, but cannot make
 * a reliable 0-100 judgement about tones or accent.
 */
export interface PronunciationResult {
  transcript?: string;
  normalizedTranscript?: string;
  expected: string;
  recognitionScore?: number;
  exactMatch: boolean;
  partialMatch: boolean;
  feedback: string;
  provider: PronunciationProviderKind;
  confidence?: number;
  isPronunciationScore: boolean;
}

export interface PronunciationProvider {
  readonly kind: PronunciationProviderKind;
  isAvailable(): boolean;
}

const NON_WORD = /[\s\p{P}\p{S}]+/gu;

export function normalizeMandarinTranscript(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("zh-CN").replace(NON_WORD, "").trim();
}

export function normalizePinyinForComparison(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[0-5]/gu, "")
    .toLocaleLowerCase("zh-CN")
    .replace(NON_WORD, "")
    .trim();
}

export function compareRecognizedMandarin(
  transcript: string,
  target: PronunciationTarget,
  confidence?: number,
): PronunciationResult {
  const normalizedTranscript = normalizeMandarinTranscript(transcript);
  const expectedSimplified = normalizeMandarinTranscript(target.simplified);
  const expectedTraditional = normalizeMandarinTranscript(target.traditional);
  const transcriptPinyin = normalizePinyinForComparison(transcript);
  const expectedPinyin = normalizePinyinForComparison(target.pinyin);
  const exactMatch = Boolean(normalizedTranscript) && (
    normalizedTranscript === expectedSimplified
    || normalizedTranscript === expectedTraditional
    || transcriptPinyin === expectedPinyin
  );
  const partialMatch = !exactMatch && Boolean(normalizedTranscript) && (
    normalizedTranscript.includes(expectedSimplified)
    || normalizedTranscript.includes(expectedTraditional)
  );
  const expected = target.simplified;
  const feedback = exactMatch
    ? "Máy đã nhận đúng từ mục tiêu. Hãy tiếp tục nghe mẫu và chú ý thanh điệu."
    : partialMatch
      ? "Máy nhận được một cụm có chứa từ mục tiêu. Hãy thử đọc riêng từng âm tiết rõ hơn."
      : transcript.trim()
        ? "Máy nhận được từ khác. Hãy nghe mẫu, đọc chậm từng âm tiết rồi thử lại."
        : "Chưa nghe rõ. Hãy nói gần micro, đọc chậm và thử lại.";

  return {
    transcript: transcript.trim() || undefined,
    normalizedTranscript: normalizedTranscript || undefined,
    expected,
    exactMatch,
    partialMatch,
    feedback,
    provider: "native",
    confidence: typeof confidence === "number" && confidence >= 0 ? confidence : undefined,
    isPronunciationScore: false,
  };
}
