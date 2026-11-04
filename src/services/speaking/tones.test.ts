import { describe, expect, it } from 'vitest';

import { buildToneSamples, nextShadowingIndex, parseTones, toneChoices, withoutPinyinToneMarks } from './tones';

import vocabulary from '@/data/hsk-vocabulary.json';

describe('tone trainer uses real dictionary entries', () => {
  it('parses compact/spaced tones and rejects ambiguous or missing tones', () => {
    expect(parseTones('nin2 hao3')).toEqual([2, 3]);
    expect(parseTones('lü4se4')).toEqual([4, 4]);
    expect(parseTones('nu:3')).toEqual([3]);
    expect(parseTones('ma5')).toEqual([5]);
    for (const value of ['ma', 'ma0', 'xing2/hang2', 'ni3!', '', 'hello3/world2']) expect(parseTones(value)).toEqual([]);
  });
  it('hides tone answers before grading but preserves umlaut and syllable spelling', () => {
    expect(withoutPinyinToneMarks('Měi lǜ sè mǎi ma3')).toBe('Mei lü se mai ma');
    expect(withoutPinyinToneMarks('nǚ')).toBe('nü');
  });
  it('covers all five tones and all sixteen pairs without copying vocabulary', () => {
    const words = [...vocabulary].filter((word) => [1, 2].includes([...word.simplified].length))
      .sort((a, b) => parseInt(String(a.hskBand)) - parseInt(String(b.hskBand)) || a.id.localeCompare(b.id)).slice(0, 6000)
      .map((word) => ({ id: word.id, hanzi: word.simplified, pinyin: word.pinyin,
        numeric: word.pinyinNumeric, meaning: word.primaryMeaningVi }));
    for (const pair of [false, true]) {
      const samples = buildToneSamples(words, pair);
      expect([...new Set(samples.map((sample) => sample.answer))].sort()).toEqual(toneChoices(pair).sort());
      expect(samples.length).toBeLessThanOrEqual(pair ? 192 : 60);
      for (const sample of samples) expect(words.some((word) => word.id === sample.id && word.hanzi === sample.hanzi)).toBe(true);
    }
  });
  it('never grades a dictionary sandhi or common polyphonic word as an audio tone', () => {
    const words = ([['你好', 'ni3 hao3'], ['一个', 'yi1 ge4'], ['不对', 'bu4 dui4'], ['银行', 'yin2 hang2'], ['中国', 'zhong1 guo2']] as const)
      .map(([hanzi, numeric]) => ({ id: hanzi, hanzi, numeric, pinyin: '', meaning: '' }));
    const samples = buildToneSamples(words, true);
    expect(samples.filter((word) => word.listeningSafe).map((word) => word.hanzi)).toEqual(['中国']);
    expect(samples).toHaveLength(5);
  });
  it('bounds automatic playback; loop takes priority and last sentence stops', () => {
    expect(nextShadowingIndex(0, 3, false, true)).toBe(1);
    expect(nextShadowingIndex(2, 3, false, true)).toBeNull();
    expect(nextShadowingIndex(2, 3, true, true)).toBe(2);
    expect(nextShadowingIndex(0, 0, true, true)).toBeNull();
    expect(nextShadowingIndex(0, 3, false, false)).toBeNull();
  });
});
