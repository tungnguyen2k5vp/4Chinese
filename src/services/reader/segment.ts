import type { Vocabulary } from "@/types/models";

export type ReaderToken = {
  text: string;
  vocabulary: Vocabulary | null;
};

const HANZI = /[\u3400-\u9fff]/u;

export function readerHanziTerms(text: string, maxWordLength = 6, limit = 12_000): string[] {
  const characters = Array.from(text.normalize("NFC"));
  const terms = new Set<string>();
  for (let start = 0; start < characters.length && terms.size < limit; start += 1) {
    if (!HANZI.test(characters[start] ?? "")) continue;
    let run = "";
    for (let index = start; index < characters.length && index < start + maxWordLength; index += 1) {
      const character = characters[index] ?? "";
      if (!HANZI.test(character)) break;
      run += character;
      terms.add(run);
      if (terms.size >= limit) break;
    }
  }
  return Array.from(terms);
}

/** Longest-match segmentation using only vocabulary already found in SQLite. */
export function segmentReaderText(text: string, vocabulary: Vocabulary[], maxWordLength = 6): ReaderToken[] {
  const byHanzi = new Map<string, Vocabulary>();
  vocabulary.forEach((word) => {
    [word.simplified, word.traditional].forEach((value) => {
      if (!value) return;
      const existing = byHanzi.get(value);
      if (!existing || (word.frequencyRank ?? Number.MAX_SAFE_INTEGER) < (existing.frequencyRank ?? Number.MAX_SAFE_INTEGER)) byHanzi.set(value, word);
    });
  });
  const characters = Array.from(text.normalize("NFC"));
  const tokens: ReaderToken[] = [];
  for (let index = 0; index < characters.length;) {
    const character = characters[index] ?? "";
    if (!HANZI.test(character)) { index += 1; continue; }
    let match: Vocabulary | null = null;
    let matchLength = 0;
    for (let length = Math.min(maxWordLength, characters.length - index); length >= 1; length -= 1) {
      const value = characters.slice(index, index + length).join("");
      const candidate = byHanzi.get(value);
      if (candidate) { match = candidate; matchLength = length; break; }
    }
    if (match) {
      tokens.push({ text: characters.slice(index, index + matchLength).join(""), vocabulary: match });
      index += matchLength;
    } else {
      tokens.push({ text: character, vocabulary: null });
      index += 1;
    }
  }
  return tokens;
}
