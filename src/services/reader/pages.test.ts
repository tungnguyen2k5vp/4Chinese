import { describe, expect, it } from 'vitest';

import { decodeReaderPosition, encodeReaderCharacterPosition, locateReaderTokens, readerTokenPage,
  sentenceAtCharacter, splitReaderChunks } from './pages';

import type { Vocabulary } from '@/types/models';

describe('bounded reader pages and stable locations', () => {
  it('preserves all 100k code points, whitespace, order and surrogate pairs across 50 chunks', () => {
    const text = '你👋\n好'.repeat(25_000);
    const chunks = splitReaderChunks(text);
    expect(chunks).toHaveLength(50);
    expect(chunks.map((chunk) => chunk.content).join('')).toBe(text);
    for (const [index, chunk] of chunks.entries()) {
      expect(chunk).toMatchObject({ chunk_index: index, char_start: index * 2000, char_end: (index + 1) * 2000 });
      expect(Array.from(chunk.content)).toHaveLength(2000);
    }
  });
  it('distinguishes existing token positions from V5 stable character offsets', () => {
    expect(decodeReaderPosition(159)).toEqual({ characterOffset: null, legacyTokenIndex: 159 });
    for (const offset of [0, 1999, 2000, 67123, 99999, 100000]) {
      expect(decodeReaderPosition(encodeReaderCharacterPosition(offset)).characterOffset).toBe(offset);
    }
    for (const invalid of [NaN, Infinity, -1, 0.1, 100001]) expect(() => encodeReaderCharacterPosition(invalid)).toThrow();
    expect(decodeReaderPosition(NaN).legacyTokenIndex).toBe(0);
  });
  it('locates tokens in original text including ignored punctuation, decomposed Vietnamese and emoji', () => {
    const word = { id: 'nihao', simplified: '你好', traditional: '你好' } as Vocabulary;
    const text = '👋 a\u0301。你好！\n你好。';
    const tokens = locateReaderTokens(text, [word]);
    expect(tokens.map(({ charStart, charEnd }) => Array.from(text).slice(charStart, charEnd).join(''))).toEqual(['你好', '你好']);
    expect(tokens.map(({ charStart }) => charStart)).toEqual([5, 9]);
    expect(sentenceAtCharacter(text, tokens[1]!.charStart).sentence).toBe('你好。');
  });
  it('resumes the exact bounded token page even when longest-match vocabulary changes', () => {
    const tokens = locateReaderTokens('你'.repeat(2000), []);
    expect(readerTokenPage(tokens, 159)).toBe(0);
    expect(readerTokenPage(tokens, 160)).toBe(1);
    expect(readerTokenPage(tokens, -1, 321)).toBe(2);
    expect(readerTokenPage([], 0)).toBe(0);
    const merged = locateReaderTokens('你'.repeat(2000), [{ simplified: '你你', traditional: '你你' } as Vocabulary]);
    expect(merged.find((token) => token.charEnd > 321)?.charStart).toBe(320);
  });
});
