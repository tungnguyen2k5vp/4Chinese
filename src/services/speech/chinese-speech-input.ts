import type { Vocabulary } from "@/types/models";

const HANZI_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/u;

/**
 * Converts a final speech transcript into text that the existing pinyin IME
 * can search. A Hanzi transcript is only accepted when it is the current
 * answer; this prevents an unrelated recognizer result from selecting a word.
 */
export function pinyinInputFromSpeechTranscript(
  transcript: string,
  targetWord: Pick<Vocabulary, "simplified" | "traditional" | "pinyin">,
): string | null {
  const normalized = transcript.trim();
  if (!normalized) return null;

  const compact = normalized.replace(/[\s·・，,。.!！?？'’-]/gu, "");
  if (compact.includes(targetWord.simplified) || compact.includes(targetWord.traditional)) {
    return targetWord.pinyin;
  }

  // Android normally returns Hanzi for zh-CN. Do not pretend unrelated Hanzi
  // is pinyin: the learner must retry or choose a candidate deliberately.
  if (HANZI_PATTERN.test(normalized)) return null;

  const pinyinLike = normalized
    .replace(/[^a-zA-ZüÜvV\u00c0-\u024f\s'’-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return pinyinLike || null;
}

export interface SpeechVocabularyHint {
  simplified: string;
  traditional: string;
  pinyin: string;
}

/** Keeps the native recognizer's language bias focused and bounded. */
export function buildChineseSpeechContext(
  targetWord: SpeechVocabularyHint,
  hskHints: SpeechVocabularyHint[],
  maximum = 240,
): string[] {
  const values = [
    targetWord.simplified,
    targetWord.traditional,
    targetWord.pinyin,
    ...hskHints.flatMap((word) => [word.simplified, word.pinyin]),
  ];
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLocaleLowerCase();
    if (!key || seen.has(key) || seen.size >= maximum) return false;
    seen.add(key);
    return true;
  });
}
