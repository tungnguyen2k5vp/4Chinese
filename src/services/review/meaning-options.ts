import type { Vocabulary } from "@/types/models";

export type ReviewMeaningCandidate = Pick<
  Vocabulary,
  "id" | "primaryMeaningVi" | "hskBand"
>;
export type ReviewPinyinCandidate = Pick<Vocabulary, "id" | "pinyin" | "hskBand">;
export type ReviewChoiceCandidate = ReviewMeaningCandidate & ReviewPinyinCandidate;

function normalize(value: string) {
  return value.normalize("NFC").trim().toLocaleLowerCase("vi").replace(/\s+/gu, " ");
}

/**
 * Build a four-choice meaning question. Prefer distractors from the same HSK
 * band, then fall back to the remaining vocabulary catalog if a band happens
 * to contain too few distinct translations.
 */
export function buildReviewMeaningOptions(
  target: ReviewMeaningCandidate,
  sessionWords: ReviewMeaningCandidate[],
  catalog: ReviewMeaningCandidate[],
): string[] {
  return buildOptions(target, sessionWords, catalog, row => row.primaryMeaningVi);
}

export function buildReviewPinyinOptions(
  target: ReviewPinyinCandidate,
  sessionWords: ReviewPinyinCandidate[],
  catalog: ReviewPinyinCandidate[],
): string[] {
  return buildOptions(target, sessionWords, catalog, row => row.pinyin);
}

function buildOptions<T extends Pick<Vocabulary, "id" | "hskBand">>(
  target: T,
  sessionWords: T[],
  catalog: T[],
  value: (row: T) => string,
): string[] {
  const correct = value(target).trim();
  if (!correct) return [];
  const seen = new Set([normalize(correct)]);
  const distractors: string[] = [];
  const addFrom = (rows: T[], sameBandOnly: boolean) => {
    if (distractors.length >= 3) return;
    for (const row of rows) {
      if (row.id === target.id) continue;
      if (sameBandOnly && String(row.hskBand) !== String(target.hskBand)) continue;
      const meaning = value(row).trim();
      const key = normalize(meaning);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      distractors.push(meaning);
      if (distractors.length >= 3) return;
    }
  };

  addFrom(sessionWords, true);
  addFrom(catalog, true);
  if (distractors.length < 3) {
    addFrom(sessionWords, false);
    addFrom(catalog, false);
  }
  if (distractors.length < 3) return [];

  const choices = [correct, ...distractors];
  // A stable per-word rotation keeps answer placement varied but reproducible.
  const seed = Array.from(target.id).reduce(
    (sum, character) => sum + (character.codePointAt(0) ?? 0),
    0,
  );
  const offset = seed % choices.length;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}
