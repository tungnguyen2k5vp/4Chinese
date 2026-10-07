import { strFromU8, strToU8 } from 'fflate';

import { MAX_READER_CHARACTERS } from './pages';

// 100k Unicode code points may require four bytes each, plus a UTF-8 BOM.
export const MAX_TEXT_FILE_BYTES = MAX_READER_CHARACTERS * 4 + 3;
export type ReaderImportSource = 'TEXT' | 'TXT' | 'EPUB' | 'PDF' | 'WEB' | 'IMAGE_OCR';
export type ExtractedReaderText = { source: ReaderImportSource; text: string; truncated: boolean };

export class TextImportError extends Error {}

/** Shared extraction boundary: every supported source feeds the existing Reader pipeline. */
export function normalizeImportedText(text: string, source: ReaderImportSource): ExtractedReaderText {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) throw new TextImportError('Tệp không có nội dung chữ.');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(normalized)) {
    throw new TextImportError('Tệp có dữ liệu nhị phân hoặc mã hóa chưa hỗ trợ. Hãy lưu lại dưới dạng TXT UTF-8.');
  }
  const characters = Array.from(normalized);
  // OCR keeps its existing preview contract; TXT/manual input must never silently lose text.
  if (source === 'IMAGE_OCR') return { source, text: characters.slice(0, 2000).join(''), truncated: characters.length > 2000 };
  if (characters.length > MAX_READER_CHARACTERS) throw new TextImportError('Giới hạn 100.000 ký tự mỗi bài đọc. Hãy chia tệp thành các phần nhỏ hơn.');
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = normalized.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TextImportError('Văn bản có ký tự Unicode bị hỏng.');
    } else if (code >= 0xdc00 && code <= 0xdfff) throw new TextImportError('Văn bản có ký tự Unicode bị hỏng.');
  }
  return { source, text: normalized, truncated: false };
}

export function extractTxt(bytes: Uint8Array, filename: string): ExtractedReaderText {
  if (!/\.txt$/i.test(filename.trim())) throw new TextImportError('Chỉ hỗ trợ tệp .txt; PDF/EPUB chưa được đọc ở bước này.');
  if (bytes.byteLength > MAX_TEXT_FILE_BYTES) throw new TextImportError('Tệp TXT quá lớn. Giới hạn 400.003 byte và 100.000 ký tự mỗi tệp.');
  let text: string;
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) {
    if (bytes.length % 2) throw new TextImportError('Tệp UTF-16 bị thiếu byte.');
    const littleEndian = bytes[0] === 0xff;
    const characters: string[] = [];
    for (let i = 2; i < bytes.length; i += 2) {
      characters.push(String.fromCharCode(littleEndian ? bytes[i]! | (bytes[i + 1]! << 8) : (bytes[i]! << 8) | bytes[i + 1]!));
    }
    text = characters.join('');
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff) {
        const next = text.charCodeAt(++i);
        if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TextImportError('Tệp UTF-16 có ký tự bị hỏng.');
      } else if (code >= 0xdc00 && code <= 0xdfff) throw new TextImportError('Tệp UTF-16 có ký tự bị hỏng.');
    }
  } else {
    const payload = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
    try { text = strFromU8(payload); }
    catch { throw new TextImportError('Mã hóa chưa hỗ trợ. Hãy lưu tệp dưới dạng TXT UTF-8 hoặc UTF-16 có BOM.'); }
    const encoded = strToU8(text);
    if (encoded.length !== payload.length || encoded.some((byte, index) => byte !== payload[index])) {
      throw new TextImportError('Mã hóa chưa hỗ trợ. Hãy lưu tệp dưới dạng TXT UTF-8 hoặc UTF-16 có BOM.');
    }
  }
  return normalizeImportedText(text, 'TXT');
}
