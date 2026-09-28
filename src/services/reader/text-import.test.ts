import { strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';

import { extractTxt, MAX_TEXT_FILE_BYTES, normalizeImportedText } from './text-import';

describe('safe TXT extraction before reader/database mutation', () => {
  it('reads UTF-8 including BOM, Chinese, Vietnamese and emoji', () => {
    expect(extractTxt(strToU8('\uFEFF你好！\r\nXin chào 👋'), 'lesson.TXT')).toEqual({ source: 'TXT', text: '你好！\nXin chào 👋', truncated: false });
  });
  it('reads BOM UTF-16 in either byte order without losing surrogate pairs', () => {
    const text = '中国 👋';
    for (const little of [true, false]) {
      const bytes = [little ? 0xff : 0xfe, little ? 0xfe : 0xff];
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        bytes.push(...(little ? [code & 255, code >> 8] : [code >> 8, code & 255]));
      }
      expect(extractTxt(new Uint8Array(bytes), 'test.txt').text).toBe(text);
    }
  });
  it('rejects wrong formats, binary, malformed encoding, empty and oversized files', () => {
    expect(() => extractTxt(strToU8('text'), 'test.pdf')).toThrow('.txt');
    expect(() => extractTxt(strToU8('a\0b'), 'test.txt')).toThrow('nhị phân');
    expect(() => extractTxt(new Uint8Array([0xc0, 0xaf]), 'test.txt')).toThrow();
    expect(() => extractTxt(new Uint8Array([0xff, 0xfe, 1]), 'test.txt')).toThrow('thiếu byte');
    expect(() => extractTxt(new Uint8Array([0xff, 0xfe, 0, 0xd8]), 'test.txt')).toThrow('bị hỏng');
    expect(() => extractTxt(new Uint8Array(), 'test.txt')).toThrow('không có nội dung');
    expect(() => extractTxt(new Uint8Array(MAX_TEXT_FILE_BYTES + 1), 'test.txt')).toThrow('256 KB');
  });
  it('bounds reader text by Unicode code points without splitting characters', () => {
    const result = normalizeImportedText('👋'.repeat(2001), 'IMAGE_OCR');
    expect([...result.text]).toHaveLength(2000);
    expect(result.truncated).toBe(true);
  });
});
