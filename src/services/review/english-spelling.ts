import { normalizeEnglishHeadword } from "@/services/languages/config";

/** Case/outer whitespace/typographic apostrophes may vary; no guessed inflections. */
export function isEnglishSpellingCorrect(
  expected: string,
  answer: string,
): boolean {
  if (
    !expected.trim() ||
    !answer.trim() ||
    expected.length > 300 ||
    answer.length > 300
  )
    return false;
  return (
    normalizeEnglishHeadword(expected) === normalizeEnglishHeadword(answer)
  );
}
