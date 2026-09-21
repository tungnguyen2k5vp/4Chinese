import { describe, expect, it } from 'vitest';

import { getToneNumber, normalizePinyinInput, numericPinyinToMarks, stripPinyinTone, toneColor } from './pinyin';

describe('pinyin helpers', () => {
  it('detects marked and numeric tones', () => { expect(getToneNumber('nǐ')).toBe(3); expect(getToneNumber('hao3')).toBe(3); expect(getToneNumber('ma5')).toBe(0); });
  it('converts numeric pinyin using placement rules', () => { expect(numericPinyinToMarks('ni3 hao3')).toBe('nǐ hǎo'); expect(numericPinyinToMarks('shui3')).toBe('shuǐ'); expect(numericPinyinToMarks('lü4')).toBe('lǜ'); });
  it('strips tone marks for search', () => { expect(stripPinyinTone('Nǐ hǎo')).toBe('ni hao'); expect(stripPinyinTone('lǜ4')).toBe('lv'); });
  it.each(['xihuan', 'xi huan', 'xi3huan1', 'xǐhuan', 'xǐ huan', 'XI HUAN'])('normalizes %s for pinyin lookup', (value) => {
    expect(normalizePinyinInput(value)).toBe('xihuan');
  });
  it.each(['xuexi', 'xuéxí', 'xue2xi2', 'xue xi'])('normalizes %s to xuexi', (value) => {
    expect(normalizePinyinInput(value)).toBe('xuexi');
  });
  it('returns a stable tone color', () => { expect(toneColor(4)).toBe('#9251A6'); expect(toneColor(9)).toBe('#697386'); });
});
