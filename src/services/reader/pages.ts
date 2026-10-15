import { segmentReaderText, type ReaderToken } from './segment';

import type { Vocabulary } from '@/types/models';

export const READER_CHUNK_CHARACTERS = 2_000;
export const MAX_READER_CHARACTERS = 100_000;
export const READER_TOKEN_PAGE_SIZE = 160;
// Positive tagged offsets preserve pre-V5 nonnegative token indices and existing backup fields.
const CHARACTER_POSITION_TAG = 1_000_000_000;

export type ReaderChunk = { chunk_index: number; content: string; char_start: number; char_end: number };
export type LocatedReaderToken = ReaderToken & { charStart: number; charEnd: number };
export type ReaderTextSegment = { text: string; token?: LocatedReaderToken };
export type ReaderResume = { characterOffset: number | null; legacyTokenIndex: number };

/** Split exact reader text around recognized words, preserving punctuation and whitespace. */
export function splitReaderTextWithTokens(text: string, tokens: LocatedReaderToken[]): ReaderTextSegment[] {
  const characters = Array.from(text);
  const segments: ReaderTextSegment[] = [];
  let cursor = 0;
  for (const token of tokens) {
    if (token.charStart < cursor || token.charEnd <= token.charStart || token.charEnd > characters.length) continue;
    if (token.charStart > cursor) segments.push({ text: characters.slice(cursor, token.charStart).join('') });
    segments.push({ text: characters.slice(token.charStart, token.charEnd).join(''), token });
    cursor = token.charEnd;
  }
  if (cursor < characters.length) segments.push({ text: characters.slice(cursor).join('') });
  return segments;
}

/** No normalization here: offsets refer to the exact stored Unicode code points. */
export function splitReaderChunks(text: string): ReaderChunk[] {
  const chunks: ReaderChunk[] = [];
  let content = '';
  let start = 0;
  let count = 0;
  for (const character of text) {
    content += character;
    count++;
    if (count - start === READER_CHUNK_CHARACTERS) {
      chunks.push({ chunk_index: chunks.length, content, char_start: start, char_end: count });
      start = count; content = '';
    }
  }
  if (content) chunks.push({ chunk_index: chunks.length, content, char_start: start, char_end: count });
  return chunks;
}

export function encodeReaderCharacterPosition(offset: number): number {
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_READER_CHARACTERS) throw new Error('INVALID_READING_POSITION');
  return CHARACTER_POSITION_TAG + offset;
}

export function decodeReaderPosition(value: number): ReaderResume {
  if (!Number.isSafeInteger(value) || value < 0) return { characterOffset: null, legacyTokenIndex: 0 };
  if (value >= CHARACTER_POSITION_TAG && value <= CHARACTER_POSITION_TAG + MAX_READER_CHARACTERS) {
    return { characterOffset: value - CHARACTER_POSITION_TAG, legacyTokenIndex: 0 };
  }
  return { characterOffset: null, legacyTokenIndex: value < CHARACTER_POSITION_TAG ? value : 0 };
}

/** Segment bounded NFC runs, but map their tokens back to unmodified stored text. */
export function locateReaderTokens(text: string, vocabulary: Vocabulary[]): LocatedReaderToken[] {
  const characters = Array.from(text);
  const tokens: LocatedReaderToken[] = [];
  const hanzi = /[\u3400-\u9fff]/u;
  for (let start = 0; start < characters.length;) {
    if (!hanzi.test(characters[start]!)) { start++; continue; }
    let end = start + 1;
    while (end < characters.length && hanzi.test(characters[end]!)) end++;
    let offset = start;
    for (const token of segmentReaderText(characters.slice(start, end).join(''), vocabulary)) {
      const charEnd = offset + Array.from(token.text).length;
      tokens.push({ ...token, charStart: offset, charEnd });
      offset = charEnd;
    }
    start = end;
  }
  return tokens;
}

export function readerTokenPage(tokens: LocatedReaderToken[], characterOffset: number, legacyTokenIndex = 0): number {
  const index = characterOffset >= 0 ? tokens.findIndex((token) => token.charEnd > characterOffset) : legacyTokenIndex;
  const bounded = index < 0 ? Math.max(0, tokens.length - 1) : Math.min(index, Math.max(0, tokens.length - 1));
  return Math.floor(bounded / READER_TOKEN_PAGE_SIZE);
}

export function sentenceAtCharacter(text: string, offset: number): { sentence: string; start: number; end: number } {
  const characters = Array.from(text);
  const boundary = /[。！？!?\n]/u;
  let start = Math.min(Math.max(0, offset), Math.max(0, characters.length - 1));
  let end = start;
  while (start > 0 && !boundary.test(characters[start - 1]!)) start--;
  while (end < characters.length && !boundary.test(characters[end]!)) end++;
  if (end < characters.length) end++;
  return { sentence: characters.slice(start, end).join(''), start, end };
}
