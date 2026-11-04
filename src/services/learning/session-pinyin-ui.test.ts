import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Chinese lesson pinyin: explicit 2026-10-13 user addendum', () => {
  it('keeps the existing word pinyin visible beside audio in every learning pass', () => {
    const source = readFileSync('src/app/learn/session.tsx', 'utf8');
    expect(source).toMatch(/<PinyinText value=\{word\.pinyin\} visible style=\{styles\.pinyin\} \/>\s*<AudioButton text=\{word\.simplified\}/);
    expect(source).toContain('Dựa vào nghĩa tiếng Việt và pinyin');
  });
});
