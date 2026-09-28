import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { extractTxt, MAX_TEXT_FILE_BYTES, TextImportError, type ExtractedReaderText } from './text-import';

/** Always picker-initiated, no upload, preview only. Delete only the copy inside app cache. */
export async function pickTextDocument(signal: AbortSignal): Promise<ExtractedReaderText | null> {
  const picked = await getDocumentAsync({ type: ['text/plain', 'application/octet-stream'], copyToCacheDirectory: true, multiple: false, base64: false });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  let cacheFile: File | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (Platform.OS !== 'web') {
      // Reject traversal and external sources before reading/deleting anything.
      const decoded = decodeURIComponent(asset.uri);
      const cacheRoot = `${Paths.cache.uri.replace(/\/+$/, '')}/`;
      if (!asset.uri.startsWith(cacheRoot) || decoded.split('/').includes('..')) throw new TextImportError('Không mở được bản sao tệp an toàn trong bộ nhớ app.');
      cacheFile = new File(asset.uri);
    }
    if (signal.aborted) return null;
    const size = asset.file?.size ?? cacheFile?.size ?? asset.size;
    if (typeof size !== 'number' || size > MAX_TEXT_FILE_BYTES || size < 0) throw new TextImportError('Tệp TXT phải nhỏ hơn 256 KB.');
    if (!/\.txt$/i.test(asset.name)) throw new TextImportError('Hãy chọn tệp .txt.');
    const read = Platform.OS === 'web' ? asset.file?.arrayBuffer().then((buffer) => new Uint8Array(buffer)) : cacheFile?.bytes();
    if (!read) throw new TextImportError('Không đọc được tệp đã chọn.');
    const bytes = await Promise.race([read, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TextImportError('Đọc tệp quá lâu. Hãy thử tệp lưu trên thiết bị.')), 10_000);
    })]);
    if (signal.aborted) return null;
    return extractTxt(bytes, asset.name);
  } finally {
    if (timer) clearTimeout(timer);
    try { if (cacheFile?.exists) cacheFile.delete(); } catch { /* Never delete the user's original document. */ }
  }
}
