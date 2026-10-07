import { describe, expect, it } from 'vitest';

import { lexicalReadingMatches, normalizeLexicalReading } from './lexical-reading';

describe('exact lexical readings', () => {
  it.each(['xue2 xi2', 'xue2xi2', 'XUE2 XI2', "xue2'xi2", 'xue2’xi2', 'xue2-xi2', 'xuéxí', 'xué xí', 'xuéxí'])
    ('matches the whole reading %s', value => {
      expect(lexicalReadingMatches(value, 'xue2 xi2')).toBe(true);
    });
  it.each(['lü4', 'lv4', 'lu:4', 'LǛ', 'lǜ'])('preserves umlaut in %s', value => {
    expect(lexicalReadingMatches(value, 'lü4')).toBe(true);
    expect(lexicalReadingMatches(value, 'lu4')).toBe(false);
  });
  it.each(['hai2shi0', 'hai2 shi5', 'hái shi', 'háishi'])('normalizes neutral tone %s', value => {
    expect(lexicalReadingMatches(value, 'hai2 shi5')).toBe(true);
    expect(lexicalReadingMatches(value, 'hai2 shi4')).toBe(false);
  });
  it.each(['kan1 / kan4', 'kān／kàn', 'kan1,kan4', 'kan1；kan4', 'kan1; kan4', 'kan1，kan4'])
    ('accepts only complete explicitly listed alternatives: %s', value => {
      expect(lexicalReadingMatches(value, 'kan4')).toBe(true);
      expect(lexicalReadingMatches(value, 'kan3')).toBe(false);
    });
  it.each([
    ['kan1', 'kan4'], ['de2', 'de5'], ['wei4', 'wei2'], ['hang2', 'xing2'],
    ['chang2', 'zhang3'], ['le4', 'yue4'], ['yin3', 'ting1'], ['zhi1 dao4', 'zhi1 dao5'],
    ['kan4 shu1', 'kan4'], ['kan4shu1', 'kan4'], ['kan1 / kan4 shu1', 'kan4'],
    ['xue2 xi2', 'xue2'], ['xi2', 'xue2 xi2'], ['kan4 (look)', 'kan4'],
  ])('does not invent a reading or match a prefix: %s vs %s', (candidate, expected) => {
    expect(lexicalReadingMatches(candidate, expected)).toBe(false);
  });
  it.each([null, undefined, '', ' ', '???', 'kan6', 'kan4shu', 'kàn4', 'kan4 / kan1', 'haishi4', 'hai shi4', 'n1', 'm2'])
    ('rejects null/invalid single readings: %s', value => {
      expect(normalizeLexicalReading(value)).toBeNull();
      expect(lexicalReadingMatches('kan4', value)).toBe(false);
    });
  it('handles absent candidates without falling back to a guessed reading', () => {
    expect(lexicalReadingMatches(null, 'kan4')).toBe(false);
    expect(lexicalReadingMatches(undefined, 'kan4')).toBe(false);
    expect(lexicalReadingMatches('', '')).toBe(false);
  });
});
