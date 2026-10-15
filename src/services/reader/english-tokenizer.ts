export interface EnglishReadingToken {
  text: string;
  start: number;
  end: number;
  word: boolean;
}
/** Unicode word boundaries, internal apostrophes/hyphens; punctuation is never discarded. */
export function tokenizeEnglishReading(text: string): EnglishReadingToken[] {
  if (typeof text !== "string" || text.length > 100_000)
    throw new Error("ENGLISH_READER_TEXT_LIMIT");
  const result: EnglishReadingToken[] = [];
  const pattern = /[\p{L}\p{M}]+(?:['’ʼ\-‐‑][\p{L}\p{M}]+)*/gu;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (offset < start)
      result.push({
        text: text.slice(offset, start),
        start: offset,
        end: start,
        word: false,
      });
    offset = start + match[0].length;
    // Overlong runs remain literal text; never expand one reading window to 100k characters.
    result.push({
      text: match[0],
      start,
      end: offset,
      word: match[0].length <= 300,
    });
  }
  if (offset < text.length)
    result.push({
      text: text.slice(offset),
      start: offset,
      end: text.length,
      word: false,
    });
  return result;
}
/** Bounded visible window, ends at whole-token boundary, position is a UTF-16 source offset. */
export function englishReadingWindow(text: string, start: number, size = 1800) {
  if (
    !Number.isSafeInteger(start) ||
    start < 0 ||
    start > text.length ||
    !Number.isSafeInteger(size) ||
    size < 300 ||
    size > 5000
  )
    throw new Error("INVALID_ENGLISH_READING_POSITION");
  const tokens = tokenizeEnglishReading(text);
  if (
    tokens.some(
      (token) => token.word && token.start < start && token.end > start,
    )
  )
    throw new Error("READING_POSITION_INSIDE_WORD");
  const end = Math.min(text.length, start + size);
  const crossed = tokens.find(
    (token) => token.word && token.start < end && token.end > end,
  );
  const boundary = crossed?.end ?? end;
  return {
    tokens: tokens
      .filter((token) => token.end > start && token.start < boundary)
      .map((token) => ({
        ...token,
        text: text.slice(
          Math.max(start, token.start),
          Math.min(boundary, token.end),
        ),
        start: Math.max(start, token.start),
        end: Math.min(boundary, token.end),
      })),
    next: boundary < text.length ? boundary : null,
  };
}
