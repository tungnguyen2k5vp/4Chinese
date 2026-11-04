import type { EnglishReviewBatchSize } from "@/db/english/flashcard-settings";
import type { EnglishCard } from "@/db/english/learner";

export type EnglishReviewExercise = "CHOICE" | "LISTEN_CLOZE";
export type EnglishReviewMode = "MIXED" | "MEANING" | "SPELLING" | "LISTENING";

export function nextReviewProgress(
  current: number,
  total: number,
  correct: boolean,
): number {
  const safeTotal = Math.max(0, Math.trunc(total));
  const safeCurrent = Math.min(safeTotal, Math.max(0, Math.trunc(current)));
  return Math.min(safeTotal, Math.max(0, safeCurrent + (correct ? 1 : -1)));
}

export function exerciseForQuestion(
  questionIndex: number,
  mode: EnglishReviewMode,
): EnglishReviewExercise {
  if (mode === "MEANING") return "CHOICE";
  if (mode === "SPELLING" || mode === "LISTENING") return "LISTEN_CLOZE";
  return Math.max(0, Math.trunc(questionIndex)) % 2 === 0
    ? "CHOICE"
    : "LISTEN_CLOZE";
}

export interface EnglishMeaningChoice {
  cardId: string;
  meaning: string;
  correct: boolean;
}

function normalizedMeaning(value: string) {
  return value.normalize("NFC").trim().toLocaleLowerCase("vi").replace(/\s+/gu, " ");
}

/** Distractors always come from other cards in this same review batch. */
export function buildMeaningChoices(
  card: EnglishCard,
  cards: EnglishCard[],
  questionIndex = 0,
): EnglishMeaningChoice[] {
  const seen = new Set([normalizedMeaning(card.meaning_vi)]);
  const distractors: EnglishMeaningChoice[] = [];
  for (const candidate of cards) {
    if (candidate.id === card.id) continue;
    const key = normalizedMeaning(candidate.meaning_vi);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    distractors.push({ cardId: candidate.id, meaning: candidate.meaning_vi, correct: false });
    if (distractors.length === 3) break;
  }
  const choices = [
    { cardId: card.id, meaning: card.meaning_vi, correct: true },
    ...distractors,
  ];
  // Stable per-card rotation avoids always placing the answer first while keeping QA reproducible.
  if (choices.length > 1) {
    const offset = Math.abs(Math.trunc(questionIndex)) % choices.length;
    return [...choices.slice(offset), ...choices.slice(0, offset)];
  }
  return choices;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export interface EnglishClozePrompt {
  sentence: string;
  answer: string;
}

/** Replace only a whole-word/whole-phrase match; never invent an example sentence. */
export function makeEnglishCloze(
  sentence: string,
  expected: string,
): EnglishClozePrompt | null {
  const cleanSentence = sentence.trim().slice(0, 600);
  const cleanExpected = expected.trim().slice(0, 300);
  if (!cleanSentence || !cleanExpected) return null;
  const phrase = escapeRegExp(cleanExpected).replace(/\s+/gu, "\\s+");
  const match = new RegExp(`(^|[^\\p{L}\\p{N}])(${phrase})(?=$|[^\\p{L}\\p{N}])`, "iu").exec(cleanSentence);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[1]!.length;
  const end = start + match[2]!.length;
  return {
    sentence: `${cleanSentence.slice(0, start)}____${cleanSentence.slice(end)}`,
    answer: match[2]!,
  };
}

/** English personal cards keep source examples in a labelled, user-visible note line. */
export function readEnglishExampleNote(notes: string): string | null {
  if (typeof notes !== "string" || notes.length > 10_000) return null;
  for (const line of notes.split(/\r?\n/u)) {
    const match = /^\s*(?:ví dụ|example)\s*:\s*(.+?)\s*$/iu.exec(line);
    const sentence = match?.[1]?.trim();
    if (sentence && sentence.length <= 600) return sentence;
  }
  return null;
}

export function englishClozeForCard(
  card: EnglishCard,
  savedContext: { sentence: string; surface: string } | null,
): EnglishClozePrompt | null {
  if (savedContext) {
    const prompt = makeEnglishCloze(savedContext.sentence, savedContext.surface);
    if (prompt) return prompt;
  }
  const example = readEnglishExampleNote(card.notes);
  return example ? makeEnglishCloze(example, card.headword) : null;
}

export function safeReviewBatchSize(value: unknown): EnglishReviewBatchSize {
  return value === 10 || value === 15 || value === 20 ? value : 5;
}
