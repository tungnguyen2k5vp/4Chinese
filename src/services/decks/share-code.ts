import { vocabularyIdentityKey } from "@/services/vocabulary/identity";
import type { PersonalDeck, ProgressRow, Vocabulary } from "@/types/models";

/**
 * A self-contained deck export.  The app is offline-first, so a plain deck id
 * would not be useful on a friend's phone.  The share code therefore carries
 * the deck metadata and the vocabulary records needed to recreate it locally.
 */
export const DECK_SHARE_PREFIX = "HZD1.";
const PROGRESS_SHARE_PREFIX = "HZD2.";
const MAX_CODE_LENGTH = 1_000_000;
export const MAX_SHARED_WORDS = 500;

/** Only learning state travels with a deck, never IDs, notes or favorites. */
export type SharedWordProgress = Omit<ProgressRow, "vocabularyId" | "isFavorite" | "lastReviewAt">;

const numberLimits = {
  state: 3, stability: 365_000, difficulty: 10, elapsedDays: 365_000,
  scheduledDays: 365_000, learningSteps: 1_000, reps: 10_000_000, lapses: 10_000_000,
  masteryLevel: 6, memoryLevel: 6, deepMemoryStage: 4,
  reviewCount: 10_000_000, correctCount: 10_000_000, wrongCount: 10_000_000,
  lapseCount: 10_000_000, consecutiveCorrect: 10_000_000, consecutiveWrong: 10_000_000,
  hintUsedCount: 10_000_000, averageResponseTimeMs: 86_400_000, lastResponseTimeMs: 86_400_000,
} as const;

function timestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= 0 && time < Date.UTC(2200, 0, 1)
    ? new Date(time).toISOString() : null;
}

export function decodeSharedWordProgress(value: unknown): SharedWordProgress | null {
  if (!isRecord(value) || !["NEW", "LEARNING", "KNOWN", "SKIPPED"].includes(String(value.status))) return null;
  if (["studied", "isKnown", "isSuspended"].some((field) => typeof value[field] !== "boolean")) return null;
  const numbers: Record<string, number> = {};
  for (const [field, max] of Object.entries(numberLimits)) {
    const number = value[field];
    if (typeof number !== "number" || !Number.isFinite(number) || number < 0 || number > max) return null;
    if (!["stability", "difficulty", "elapsedDays", "scheduledDays"].includes(field) && !Number.isInteger(number)) return null;
    numbers[field] = number;
  }
  const due = timestamp(value.due), nextReviewAt = timestamp(value.nextReviewAt);
  const lastReview = value.lastReview === null ? null : timestamp(value.lastReview);
  const learnedAt = value.learnedAt === null ? null : timestamp(value.learnedAt);
  if (!due || !nextReviewAt || (value.lastReview !== null && !lastReview) || (value.learnedAt !== null && !learnedAt)) return null;
  const learning = value.status === "LEARNING", known = value.status === "KNOWN";
  if (value.studied !== (learning || known) || value.isKnown !== known) return null;
  if (learning ? numbers.memoryLevel! < 1 : numbers.memoryLevel !== 0) return null;
  if (numbers.deepMemoryStage! > 0 && numbers.memoryLevel !== 6) return null;
  return {
    ...numbers, status: value.status, studied: value.studied, isKnown: value.isKnown,
    isSuspended: value.isSuspended, due, nextReviewAt, lastReview, learnedAt,
  } as SharedWordProgress;
}

export interface SharedDeckWord {
  /** Present for every word in v2; null means the sender has never learned it. */
  progress?: SharedWordProgress | null;
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
  version: 1 | 2;
  name: string;
  words: SharedDeckWord[];
  snapshotAt?: string;
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
  progress?: ReadonlyMap<string, SharedWordProgress | null>,
): SharedDeckPayload {
  if (words.length > MAX_SHARED_WORDS) throw new Error(`Mỗi mã hỗ trợ tối đa ${MAX_SHARED_WORDS} từ. Hãy chia thành các bộ nhỏ hơn.`);
  return {
    version: progress ? 2 : 1,
    name: deck.name.trim().slice(0, 80) || "Bộ từ của bạn",
    ...(progress ? { snapshotAt: new Date().toISOString() } : {}),
    words: words.map((word) => {
      const shared = wordToSharedWord(word);
      if (!progress) return shared;
      if (!progress.has(word.id)) throw new Error("Chưa đọc đủ tiến độ bộ từ. Hãy thử lại.");
      const source = progress.get(word.id);
      const clean = source === null ? null : decodeSharedWordProgress(source);
      if (source !== null && !clean) throw new Error("Tiến độ có dữ liệu không hợp lệ. Chưa tạo mã chia sẻ.");
      return { ...shared, progress: clean };
    }),
  };
}

/** Encode UTF-8 safely without adding another native dependency. */
export function encodeDeckShareCode(payload: SharedDeckPayload): string {
  const json = JSON.stringify(payload);
  const code = `${payload.version === 2 ? PROGRESS_SHARE_PREFIX : DECK_SHARE_PREFIX}${encodeURIComponent(json)}`;
  if (code.length > MAX_CODE_LENGTH) throw new Error("Bộ từ quá lớn để tạo mã offline. Hãy dùng mã ngắn hoặc chia bộ từ nhỏ hơn.");
  return code;
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
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2)) return null;
  if (!Array.isArray(value.words) || value.words.length > MAX_SHARED_WORDS) return null;
  const snapshotAt = value.version === 2 ? timestamp(value.snapshotAt) : null;
  if (value.version === 2 && !snapshotAt) return null;
  const words: SharedDeckWord[] = [];
  for (const item of value.words) {
    const word = decodeWord(item);
    if (!word) { if (value.version === 2) return null; continue; }
    if (value.version === 2) {
      if (!isRecord(item) || !("progress" in item)) return null;
      const progress = item.progress === null ? null : decodeSharedWordProgress(item.progress);
      if (item.progress !== null && !progress) return null;
      word.progress = progress;
    }
    words.push(word);
  }
  if (!words.length) return null;
  if (value.version === 2 && new Set(words.map(vocabularyIdentityKey)).size !== words.length) return null;
  return {
    version: value.version,
    name: cleanString(value.name, 80) || "Bộ từ của bạn",
    words,
    ...(snapshotAt ? { snapshotAt } : {}),
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
  if (input.length > MAX_CODE_LENGTH + 1_000) return null;
  const match = input.trim().match(/HZD[12]\.[^\s]+/iu);
  if (!match) return null;
  const encoded = match[0]
    .slice(DECK_SHARE_PREFIX.length)
    .replace(/[.,;!?]+$/u, "");
  const payload = decodePayload(encoded);
  return payload?.version === (match[0].slice(0, 5).toUpperCase() === PROGRESS_SHARE_PREFIX ? 2 : 1) ? payload : null;
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
