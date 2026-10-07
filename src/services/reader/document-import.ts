import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { extractEpub, MAX_EPUB_FILE_BYTES } from './epub-import';
import { extractTxt, MAX_TEXT_FILE_BYTES, TextImportError, type ExtractedReaderText } from './text-import';

/** Always picker-initiated, no upload, preview only. Delete only the copy inside app cache. */
export async function pickTextDocument(signal: AbortSignal, onReadStart?: () => void): Promise<ExtractedReaderText | null> {
  return pickReaderDocument(signal, onReadStart, false);
}

export async function pickReaderDocument(signal: AbortSignal, onReadStart?: () => void, allowEpub = true): Promise<ExtractedReaderText | null> {
  const picked = await getDocumentAsync({ type: allowEpub ? ['text/plain', 'application/epub+zip', 'application/octet-stream'] : ['text/plain', 'application/octet-stream'], copyToCacheDirectory: true, multiple: false, base64: false });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  let cacheFile: File | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelRead: () => void = () => {};
  try {
    if (Platform.OS !== 'web') {
      // Reject traversal and external sources before reading/deleting anything.
      const decoded = decodeURIComponent(asset.uri);
      const cacheRoot = `${Paths.cache.uri.replace(/\/+$/, '')}/`;
      if (!asset.uri.startsWith(cacheRoot) || /[\\\u0000?#]/u.test(decoded) || decoded.split('/').includes('..') || decoded.includes('%')) throw new TextImportError('Không mở được bản sao tệp an toàn trong bộ nhớ app.');
      cacheFile = new File(asset.uri);
    }
    if (signal.aborted) return null;
    const epub = allowEpub && /\.epub$/i.test(asset.name);
    const byteLimit = epub ? MAX_EPUB_FILE_BYTES : MAX_TEXT_FILE_BYTES;
    const size = asset.file?.size ?? cacheFile?.size ?? asset.size;
    if (typeof size !== 'number' || !Number.isFinite(size) || size > byteLimit || size < 0) throw new TextImportError(epub ? 'EPUB tối đa 8 MiB và 100.000 ký tự.' : 'Tệp TXT tối đa 400.003 byte và 100.000 ký tự.');
    if (!epub && !/\.txt$/i.test(asset.name)) throw new TextImportError(allowEpub ? 'Hãy chọn tệp .txt hoặc .epub. PDF/URL chưa hỗ trợ.' : 'Hãy chọn tệp .txt.');
    onReadStart?.();
    const read = Platform.OS === 'web' ? asset.file?.arrayBuffer().then((buffer) => new Uint8Array(buffer)) : cacheFile?.bytes();
    if (!read) throw new TextImportError('Không đọc được tệp đã chọn.');
    const bytes = await Promise.race([read, new Promise<null>((resolve) => {
      cancelRead = () => resolve(null);
      signal.addEventListener('abort', cancelRead, { once: true });
      if (signal.aborted) cancelRead();
    }), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TextImportError('Đọc tệp quá lâu. Hãy thử tệp lưu trên thiết bị.')), 10_000);
    })]);
    if (signal.aborted || !bytes) return null;
    return epub ? extractEpub(bytes, asset.name) : extractTxt(bytes, asset.name);
  } finally {
    if (timer) clearTimeout(timer);
    signal.removeEventListener('abort', cancelRead);
    try { if (cacheFile?.exists) cacheFile.delete(); } catch { /* Never delete the user's original document. */ }
  }
}
