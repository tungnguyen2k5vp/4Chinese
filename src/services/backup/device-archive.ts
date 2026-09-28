import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { createBackupArchive, parseBackupArchive, type ParsedBackupArchive } from './archive';
import { type LocalBackup, parseLocalBackup } from './format';

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const imageTypes: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', heic: 'image/heic',
};

export async function createDeviceBackupArchive(backup: LocalBackup): Promise<Uint8Array> {
  const images = [];
  for (const word of [...backup.data.customVocabulary, ...(backup.data.baseVocabularyOverrides ?? [])]) {
    if (word.image_source !== 'Người dùng chọn' &&
      !(typeof word.image_uri === 'string' && /^(file|content):/i.test(word.image_uri))) continue;
    if (typeof word.id !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(word.id) || typeof word.image_uri !== 'string') {
      throw new Error('Ảnh của từ vựng có ID hoặc đường dẫn không hợp lệ.');
    }
    const file = new File(word.image_uri);
    if (!file.exists) throw new Error(`Không còn ảnh của từ ${word.simplified ?? word.id} trên thiết bị.`);
    const ext = file.extension.replace('.', '').toLowerCase();
    const mimeType = imageTypes[ext];
    if (!mimeType) throw new Error(`Định dạng ảnh ${ext} chưa được hỗ trợ sao lưu.`);
    images.push({ wordId: word.id, path: `images/${word.id}.${ext}`, mimeType, bytes: await file.bytes() });
  }
  return createBackupArchive(backup, images);
}

export function writeBackupArchiveFile(bytes: Uint8Array): File {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = new File(Paths.cache, `4chinese-backup-${stamp}.zip`);
  file.create({ intermediates: true, overwrite: false });
  file.write(bytes);
  return file;
}

export async function shareBackupArchive(file: File): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Thiết bị chưa hỗ trợ chia sẻ tệp sao lưu.');
  await Sharing.shareAsync(file.uri, { dialogTitle: 'Lưu bản sao lưu 4Chinese', mimeType: 'application/zip' });
}

export type PickedBackup = { kind: 'archive'; value: ParsedBackupArchive } | { kind: 'legacy'; value: LocalBackup };

function restorePointArchiveFile(): File {
  return new File(Paths.document, '4chinese-before-restore.zip');
}

export function hasArchiveRestorePoint(): boolean {
  return restorePointArchiveFile().exists;
}

export async function writeRestorePointArchive(bytes: Uint8Array): Promise<void> {
  const temporary = new File(Paths.document, `4chinese-restore-${Date.now()}.tmp`);
  temporary.create({ overwrite: false });
  temporary.write(bytes);
  if (temporary.size !== bytes.length) throw new Error('Không thể xác minh điểm khôi phục.');
  parseBackupArchive(await temporary.bytes());
  await temporary.move(restorePointArchiveFile(), { overwrite: true });
}

export async function readRestorePointArchive(): Promise<ParsedBackupArchive | null> {
  const file = restorePointArchiveFile();
  return file.exists ? parseBackupArchive(await file.bytes()) : null;
}

export function validateLegacyImageUris(backup: LocalBackup): void {
  for (const word of [...backup.data.customVocabulary, ...(backup.data.baseVocabularyOverrides ?? [])]) {
    if (word.image_source !== 'Người dùng chọn') continue;
    if (typeof word.image_uri !== 'string' || !new File(word.image_uri).exists) {
      throw new Error('Bản JSON cũ không chứa ảnh. Ảnh đã chọn không còn trên thiết bị này; hãy dùng bản sao lưu ZIP.');
    }
  }
}

export async function pickBackup(): Promise<PickedBackup | null> {
  const result = await File.pickFileAsync({ mimeTypes: ['application/zip', 'application/json', 'application/octet-stream'] });
  if (result.canceled) return null;
  const file = result.result;
  if ((file.size ?? 0) > MAX_ARCHIVE_BYTES) throw new Error('Tệp sao lưu quá lớn.');
  const bytes = await file.bytes();
  if (bytes.length > MAX_ARCHIVE_BYTES) throw new Error('Tệp sao lưu quá lớn.');
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return { kind: 'archive', value: parseBackupArchive(bytes) };
  }
  const legacy = parseLocalBackup(new TextDecoder().decode(bytes));
  if (legacy.backupVersion !== 1) {
    throw new Error('Bản sao lưu phiên bản mới phải là tệp ZIP để chứa đầy đủ ảnh.');
  }
  return { kind: 'legacy', value: legacy };
}

export async function materializeArchiveImages(parsed: ParsedBackupArchive): Promise<LocalBackup> {
  const destination = new Directory(Paths.document, 'word-images', `restore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  if (parsed.images.length > 0) destination.create({ intermediates: true, idempotent: false });
  const uriByWord = new Map<string, string>();
  for (const image of parsed.images) {
    const file = new File(destination, image.path.slice('images/'.length));
    file.create({ overwrite: false });
    file.write(image.bytes);
    if (!file.exists || file.size !== image.bytes.length) throw new Error('Không ghi được ảnh khôi phục.');
    uriByWord.set(image.wordId, file.uri);
  }
  return { ...parsed.backup, data: { ...parsed.backup.data,
    customVocabulary: parsed.backup.data.customVocabulary.map((word) => ({ ...word,
      image_uri: typeof word.id === 'string' && uriByWord.has(word.id) ? uriByWord.get(word.id) : word.image_uri,
    })),
    baseVocabularyOverrides: (parsed.backup.data.baseVocabularyOverrides ?? []).map((word) => ({ ...word,
      image_uri: typeof word.id === 'string' && uriByWord.has(word.id) ? uriByWord.get(word.id) : word.image_uri,
    })),
    imageAssets: (parsed.backup.data.imageAssets ?? []).map((asset) => ({ ...asset,
      local_uri: typeof asset.vocabulary_id === 'string' && uriByWord.has(asset.vocabulary_id)
        ? uriByWord.get(asset.vocabulary_id) : asset.local_uri,
    })) } };
}
