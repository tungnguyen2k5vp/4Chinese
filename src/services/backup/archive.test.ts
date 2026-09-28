import { strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { checksumBytes, createBackupArchive, parseBackupArchive } from './archive';
import { createLocalBackup } from './format';

function backupWithImage() {
  return createLocalBackup({
    userSettings: [], personalDecks: [],
    customVocabulary: [{ id: 'word-1', simplified: '猫', traditional: '貓', is_custom: 1,
      image_uri: 'file:///old-phone/word-images/cat.jpg', image_source: 'Người dùng chọn' }],
    exampleSentences: [], vocabularyProgress: [], reviewLogs: [], dailyStats: [],
  }, '0.1.13');
}

describe('Backup 2.0 ZIP archive', () => {
  it('round-trips metadata, user image and DB data without exporting an old device path', () => {
    const backup = backupWithImage();
    const bytes = Uint8Array.from([1, 2, 3, 4, 5]);
    const zip = createBackupArchive(backup, [{ wordId: 'word-1', path: 'images/word-1.jpg',
      mimeType: 'image/jpeg', bytes }]);
    const parsed = parseBackupArchive(zip);
    expect(parsed.images).toHaveLength(1);
    expect(parsed.images[0]?.bytes).toEqual(bytes);
    expect(parsed.backup.data.customVocabulary[0]?.image_uri).toBe('backup://images/word-1.jpg');
    expect(backup.data.customVocabulary[0]?.image_uri).toBe('file:///old-phone/word-images/cat.jpg');
    expect(checksumBytes(bytes)).toBe('470b99f4');
  });

  it('refuses to produce an archive if a selected image is missing', () => {
    expect(() => createBackupArchive(backupWithImage(), [])).toThrow('Thiếu ảnh');
  });

  it('refuses traversal paths and untrusted entries', () => {
    const zip = zipSync({ '../evil.txt': strToU8('bad'), 'data.json': strToU8('{}') });
    expect(() => parseBackupArchive(zip)).toThrow('đường dẫn không hợp lệ');
  });

  it('refuses an image whose checksum does not match the manifest', () => {
    const backup = backupWithImage();
    const bytes = Uint8Array.from([1, 2, 3]);
    const zip = createBackupArchive(backup, [{ wordId: 'word-1', path: 'images/word-1.jpg',
      mimeType: 'image/jpeg', bytes }]);
    const contents = unzipSync(zip);
    contents['images/word-1.jpg'] = Uint8Array.from([9, 9, 9]);
    expect(() => parseBackupArchive(zipSync(contents))).toThrow('Ảnh hỏng');
  });

  it('packages edited HSK images and image metadata without retaining source-device URIs', () => {
    const backup = backupWithImage();
    backup.data.baseVocabularyOverrides = [{ id: 'hsk-1-ni', pinyin: 'nǐ', meanings_vi: '["bạn"]',
      meanings_en: '["you"]', image_uri: 'file:///old-phone/word-images/you.png', image_source: 'Người dùng chọn' }];
    backup.data.imageAssets = [{ id: 'custom-image', vocabulary_id: 'word-1',
      local_uri: 'file:///old-phone/word-images/cat.jpg', mime_type: 'image/jpeg', file_name: 'cat.jpg',
      file_size: 5, checksum: null, created_at: backup.createdAt, updated_at: backup.createdAt }];
    const zip = createBackupArchive(backup, [
      { wordId: 'word-1', path: 'images/word-1.jpg', mimeType: 'image/jpeg', bytes: Uint8Array.of(1, 2, 3) },
      { wordId: 'hsk-1-ni', path: 'images/hsk-1-ni.png', mimeType: 'image/png', bytes: Uint8Array.of(4, 5, 6) },
    ]);
    const parsed = parseBackupArchive(zip);
    expect(parsed.backup.data.imageAssets).toHaveLength(2);
    expect(parsed.backup.data.baseVocabularyOverrides?.[0]?.image_uri).toBe('backup://images/hsk-1-ni.png');
    expect(parsed.backup.data.imageAssets?.every((item) => String(item.local_uri).startsWith('backup://'))).toBe(true);
    expect(JSON.stringify(parsed.backup)).not.toContain('old-phone');
  });
});
