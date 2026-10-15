import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Chinese lesson pinyin: explicit 2026-10-13 user addendum', () => {
  it('uses the existing word pinyin directly below audio in every learning pass', () => {
    const source = readFileSync('src/app/learn/session.tsx', 'utf8');
    expect(source).toMatch(/<AudioButton text=\{word\.simplified\} size=\{27\} \/>\s*<PinyinText value=\{word\.pinyin\} visible style=\{styles\.pinyin\} \/>/);
    expect(source).toContain('Dựa vào nghĩa tiếng Việt và pinyin');
  });
});
