import type { PersonalDeck, Vocabulary } from "@/types/models";

/**
 * A self-contained deck export.  The app is offline-first, so a plain deck id
 * would not be useful on a friend's phone.  The share code therefore carries
 * the deck metadata and the vocabulary records needed to recreate it locally.
 */
export const DECK_SHARE_PREFIX = "HZD1.";
const MAX_CODE_LENGTH = 1_000_000;
const MAX_WORDS = 500;

export interface SharedDeckWord {
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyinNumeric: string;
  primaryMeaningVi: string;
  meaningsVi: string[];
  meaningsEn: string[];
  pos: string[];
  hskBand: Vocabulary["hskBand"];
  imageUri: string | null;
  imageSource: string | null;
  imageLicense: string | null;
  imageAttribution: string | null;
  examples: {
    chinese: string;
    pinyin: string;
    vietnamese: string;
    english?: string;
  }[];
}

export interface SharedDeckPayload {
  version: 1;
  name: string;
  words: SharedDeckWord[];
}

function wordToSharedWord(word: Vocabulary): SharedDeckWord {
  return {
    simplified: word.simplified,
    traditional: word.traditional || word.simplified,
    pinyin: word.pinyin,
    pinyinNumeric: word.pinyinNumeric || word.pinyin,
    primaryMeaningVi: word.primaryMeaningVi,
    meaningsVi: word.meaningsVi,
    meaningsEn: word.meaningsEn,
    pos: word.pos,
    hskBand: word.hskBand,
    imageUri: word.imageUri,
    imageSource: word.imageSource,
    imageLicense: word.imageLicense,
    imageAttribution: word.imageAttribution,
    examples: word.examples.slice(0, 1).map((example) => ({
      chinese: example.chinese,
      pinyin: example.pinyin,
      vietnamese: example.vietnamese,
      english: example.english,
    })),
  };
}

export function createSharedDeckPayload(
  deck: Pick<PersonalDeck, "name">,
  words: Vocabulary[],
): SharedDeckPayload {
  return {
    version: 1,
    name: deck.name.trim().slice(0, 80) || "Bộ từ của bạn",
    words: words.slice(0, MAX_WORDS).map(wordToSharedWord),
  };
}

/** Encode UTF-8 safely without adding another native dependency. */
export function encodeDeckShareCode(payload: SharedDeckPayload): string {
  const json = JSON.stringify(payload);
  return `${DECK_SHARE_PREFIX}${encodeURIComponent(json)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanStringArray(value: unknown, maxItems = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, 240))
    .filter(Boolean)
    .slice(0, maxItems);
}

function decodeWord(value: unknown): SharedDeckWord | null {
  if (!isRecord(value)) return null;
  const simplified = cleanString(value.simplified, 40);
  const pinyin = cleanString(value.pinyin, 120);
  const primaryMeaningVi = cleanString(value.primaryMeaningVi, 240);
  if (!simplified || !pinyin || !primaryMeaningVi) return null;

  const hskValue = value.hskBand;
  const hskBand: Vocabulary["hskBand"] =
    hskValue === "7-9" || [1, 2, 3, 4, 5, 6].includes(Number(hskValue))
      ? (hskValue === "7-9" ? "7-9" : Number(hskValue) as Vocabulary["hskBand"])
      : 1;
  const examples = Array.isArray(value.examples)
    ? value.examples
        .filter(isRecord)
        .map((example) => ({
          chinese: cleanString(example.chinese, 240),
          pinyin: cleanString(example.pinyin, 240),
          vietnamese: cleanString(example.vietnamese, 300),
          english: cleanString(example.english, 300) || undefined,
        }))
        .filter((example) => example.chinese && example.pinyin && example.vietnamese)
        .slice(0, 1)
    : [];
  return {
    simplified,
    traditional: cleanString(value.traditional, 40) || simplified,
    pinyin,
    pinyinNumeric: cleanString(value.pinyinNumeric, 120) || pinyin,
    primaryMeaningVi,
    meaningsVi: cleanStringArray(value.meaningsVi).length
      ? cleanStringArray(value.meaningsVi)
      : [primaryMeaningVi],
    meaningsEn: cleanStringArray(value.meaningsEn),
    pos: cleanStringArray(value.pos, 8),
    hskBand,
    imageUri: cleanString(value.imageUri, 2000) || null,
    imageSource: cleanString(value.imageSource, 240) || null,
    imageLicense: cleanString(value.imageLicense, 240) || null,
    imageAttribution: cleanString(value.imageAttribution, 240) || null,
    examples,
  };
}

export function decodeSharedDeckPayload(value: unknown): SharedDeckPayload | null {
  if (!isRecord(value) || value.version !== 1) return null;
  const words = Array.isArray(value.words)
    ? value.words.map(decodeWord).filter((word): word is SharedDeckWord => Boolean(word)).slice(0, MAX_WORDS)
    : [];
  if (!words.length) return null;
  return {
    version: 1,
    name: cleanString(value.name, 80) || "Bộ từ của bạn",
    words,
  };
}

function decodePayload(encoded: string): SharedDeckPayload | null {
  if (!encoded || encoded.length > MAX_CODE_LENGTH) return null;
  try {
    return decodeSharedDeckPayload(JSON.parse(decodeURIComponent(encoded)) as unknown);
  } catch {
    return null;
  }
}

/**
 * Accepts either the code itself or the complete text copied from a share
 * sheet.  This makes importing resilient to a user pasting a sentence around
 * the code.
 */
export function decodeDeckShareCode(input: string): SharedDeckPayload | null {
  const match = input.trim().match(new RegExp(`${DECK_SHARE_PREFIX.replace(".", "\\.")}[^\\s]+`, "i"));
  if (!match) return null;
  const encoded = match[0]
    .slice(DECK_SHARE_PREFIX.length)
    .replace(/[.,;!?]+$/u, "");
  return decodePayload(encoded);
}

export function sharedWordToVocabulary(
  word: SharedDeckWord,
  id: string,
  deckId: string,
): Vocabulary {
  return {
    id,
    simplified: word.simplified,
    traditional: word.traditional,
    pinyin: word.pinyin,
    pinyinNumeric: word.pinyinNumeric,
    primaryMeaningVi: word.primaryMeaningVi,
    meaningsVi: word.meaningsVi,
    meaningsEn: word.meaningsEn,
    pos: word.pos,
    hskBand: word.hskBand,
    frequencyRank: null,
    classifiers: [],
    radical: null,
    strokeCount: null,
    visualType: word.imageUri ? "image" : "none",
    imageUri: word.imageUri,
    imageSource: word.imageSource,
    imageLicense: word.imageLicense,
    imageAttribution: word.imageAttribution,
    audioUri: null,
    source: "Bộ từ được bạn bè chia sẻ",
    sourceVersion: "1",
    sourceUrl: "local://shared-deck",
    translationStatus: "verified",
    examples: word.examples.map((example, index) => ({
      id: `${id}-ex-${index + 1}`,
      vocabularyId: id,
      chinese: example.chinese,
      pinyin: example.pinyin,
      vietnamese: example.vietnamese,
      english: example.english,
      difficulty: 1,
    })),
    isCustom: true,
    deckId,
  };
}
