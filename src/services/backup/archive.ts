import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

import { type LocalBackup, parseLocalBackup } from './format';

export const BACKUP_ARCHIVE_VERSION = 2;
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_DATA_BYTES = 30 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_COUNT = 500;
const MAX_TOTAL_BYTES = 120 * 1024 * 1024;
const imagePathPattern = /^images\/([a-zA-Z0-9_-]{1,120})\.(jpg|jpeg|png|webp|gif|heic)$/;

export type ArchivedImage = { wordId: string; path: string; mimeType: string; bytes: Uint8Array };
type ImageManifest = { wordId: string; path: string; mimeType: string; size: number; checksum: string };
type ArchiveMetadata = {
  archiveVersion: number;
  backupVersion: number;
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
  images: ImageManifest[];
};

function fail(message: string): never {
  throw new Error(`INVALID_BACKUP_ARCHIVE: ${message}`);
}

/** CRC-32 detects accidental corruption independently of ZIP's own header. */
export function checksumBytes(bytes: Uint8Array): string {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

function assertImage(image: ArchivedImage): void {
  const match = imagePathPattern.exec(image.path);
  if (!match || match[1] !== image.wordId) fail('Tên ảnh không hợp lệ.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'].includes(image.mimeType)) fail('Định dạng ảnh không hợp lệ.');
  if (image.bytes.length === 0 || image.bytes.length > MAX_IMAGE_BYTES) fail('Kích thước ảnh không hợp lệ.');
}

export function createBackupArchive(backup: LocalBackup, images: ArchivedImage[]): Uint8Array {
  if (images.length > MAX_IMAGE_COUNT) fail('Quá nhiều ảnh.');
  const paths = new Set<string>();
  const ids = new Set<string>();
  const entries: Zippable = {};
  const manifest: ImageManifest[] = [];
  for (const image of images) {
    assertImage(image);
    if (paths.has(image.path) || ids.has(image.wordId)) fail('Ảnh bị trùng.');
    paths.add(image.path);
    ids.add(image.wordId);
    entries[image.path] = [image.bytes, { level: 0 }];
    manifest.push({ wordId: image.wordId, path: image.path, mimeType: image.mimeType,
      size: image.bytes.length, checksum: checksumBytes(image.bytes) });
  }
  const exported: LocalBackup = { ...backup, data: { ...backup.data,
    customVocabulary: backup.data.customVocabulary.map((row) => ({ ...row })),
    baseVocabularyOverrides: (backup.data.baseVocabularyOverrides ?? []).map((row) => ({ ...row })),
    imageAssets: (backup.data.imageAssets ?? [])
      .filter((row) => manifest.some((item) => item.wordId === row.vocabulary_id))
      .map((row) => ({ ...row })) } };
  const wordRows = [...exported.data.customVocabulary, ...(exported.data.baseVocabularyOverrides ?? [])];
  for (const row of wordRows) {
    if (typeof row.id !== 'string') fail('ID từ không hợp lệ.');
    const image = manifest.find((item) => item.wordId === row.id);
    if (image) row.image_uri = `backup://${image.path}`;
    else if (typeof row.image_uri === 'string' && /^(file|content):/i.test(row.image_uri)) {
      fail('Thiếu ảnh trên thiết bị trong bản sao lưu.');
    }
  }
  for (const asset of exported.data.imageAssets ?? []) {
    const image = manifest.find((item) => item.wordId === asset.vocabulary_id);
    if (image) {
      asset.local_uri = `backup://${image.path}`;
      asset.file_size = image.size;
      asset.checksum = image.checksum;
      asset.mime_type = image.mimeType;
    }
  }
  for (const image of manifest) {
    if (exported.data.imageAssets?.some((asset) => asset.vocabulary_id === image.wordId)) continue;
    exported.data.imageAssets?.push({ id: `image-${image.wordId}`, vocabulary_id: image.wordId,
      local_uri: `backup://${image.path}`, cloud_url: null, mime_type: image.mimeType,
      file_name: image.path.slice('images/'.length), file_size: image.size, checksum: image.checksum,
      created_at: backup.createdAt, updated_at: backup.createdAt });
  }
  const metadata: ArchiveMetadata = {
    archiveVersion: BACKUP_ARCHIVE_VERSION,
    backupVersion: backup.backupVersion,
    schemaVersion: backup.schemaVersion,
    appVersion: backup.appVersion,
    createdAt: backup.createdAt,
    images: manifest,
  };
  entries['metadata.json'] = strToU8(JSON.stringify(metadata));
  entries['version.json'] = strToU8(JSON.stringify({ archiveVersion: BACKUP_ARCHIVE_VERSION }));
  entries['data.json'] = strToU8(JSON.stringify(exported));
  const zipped = zipSync(entries, { level: 6 });
  if (zipped.length > MAX_ARCHIVE_BYTES) fail('Tệp sao lưu quá lớn.');
  return zipped;
}

export type ParsedBackupArchive = { backup: LocalBackup; images: ArchivedImage[] };

export function parseBackupArchive(bytes: Uint8Array): ParsedBackupArchive {
  if (bytes.length > MAX_ARCHIVE_BYTES) fail('Tệp sao lưu quá lớn.');
  let total = 0;
  let count = 0;
  const entryNames = new Set<string>();
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, { filter: (file) => {
      if (file.name !== 'metadata.json' && file.name !== 'version.json' && file.name !== 'data.json' && !imagePathPattern.test(file.name)) {
        fail('Tệp ZIP chứa đường dẫn không hợp lệ.');
      }
      if (entryNames.has(file.name)) fail('Mục ZIP bị trùng.');
      entryNames.add(file.name);
      if (!Number.isSafeInteger(file.originalSize) || file.originalSize < 0) fail('Kích thước ZIP không hợp lệ.');
      const limit = file.name === 'data.json' ? MAX_DATA_BYTES : file.name.startsWith('images/') ? MAX_IMAGE_BYTES : 100_000;
      if (file.originalSize > limit) fail('Một mục trong ZIP vượt giới hạn.');
      if (file.name.startsWith('images/')) count++;
      total += file.originalSize;
      if (count > MAX_IMAGE_COUNT || total > MAX_TOTAL_BYTES) fail('Nội dung ZIP vượt giới hạn.');
      return true;
    } });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('INVALID_BACKUP_ARCHIVE')) throw error;
    fail('Không đọc được ZIP.');
  }
  const metadataBytes = entries['metadata.json'];
  const versionBytes = entries['version.json'];
  const dataBytes = entries['data.json'];
  if (!metadataBytes || !versionBytes || !dataBytes) fail('Thiếu tệp bắt buộc.');
  let metadata: ArchiveMetadata;
  let version: { archiveVersion: number };
  try {
    metadata = JSON.parse(strFromU8(metadataBytes)) as ArchiveMetadata;
    version = JSON.parse(strFromU8(versionBytes)) as { archiveVersion: number };
  } catch { fail('Metadata không hợp lệ.'); }
  if (metadata.archiveVersion !== BACKUP_ARCHIVE_VERSION || version.archiveVersion !== BACKUP_ARCHIVE_VERSION) {
    fail('Phiên bản ZIP chưa được hỗ trợ.');
  }
  if (!Array.isArray(metadata.images) || metadata.images.length > MAX_IMAGE_COUNT) fail('Danh sách ảnh không hợp lệ.');
  const backup = parseLocalBackup(strFromU8(dataBytes));
  if (metadata.schemaVersion !== backup.schemaVersion || metadata.backupVersion !== backup.backupVersion ||
    metadata.createdAt !== backup.createdAt || metadata.appVersion !== backup.appVersion) fail('Metadata không khớp dữ liệu.');
  const images: ArchivedImage[] = [];
  const seen = new Set<string>();
  const seenWords = new Set<string>();
  for (const item of metadata.images) {
    if (typeof item.wordId !== 'string' || typeof item.path !== 'string' || typeof item.mimeType !== 'string' ||
      typeof item.size !== 'number' || typeof item.checksum !== 'string') fail('Metadata ảnh không hợp lệ.');
    const imageBytes = entries[item.path];
    if (!imageBytes || seen.has(item.path) || seenWords.has(item.wordId)) fail('Thiếu hoặc trùng ảnh.');
    const image = { wordId: item.wordId, path: item.path, mimeType: item.mimeType, bytes: imageBytes };
    assertImage(image);
    if (item.size !== imageBytes.length || item.checksum !== checksumBytes(imageBytes)) fail('Ảnh hỏng hoặc bị thay đổi.');
    const word = [...backup.data.customVocabulary, ...(backup.data.baseVocabularyOverrides ?? [])]
      .find((row) => row.id === item.wordId);
    if (!word || word.image_uri !== `backup://${item.path}`) fail('Ảnh không khớp từ vựng.');
    images.push(image);
    seen.add(item.path);
    seenWords.add(item.wordId);
  }
  if (Object.keys(entries).filter((path) => path.startsWith('images/')).length !== images.length) fail('Ảnh ZIP không có metadata.');
  for (const word of [...backup.data.customVocabulary, ...(backup.data.baseVocabularyOverrides ?? [])]) {
    if (typeof word.image_uri === 'string' && word.image_uri.startsWith('backup://') &&
      !images.some((image) => `backup://${image.path}` === word.image_uri)) fail('Từ vựng thiếu ảnh.');
    if (word.image_source === 'Người dùng chọn' && typeof word.image_uri === 'string' &&
      !word.image_uri.startsWith('backup://')) fail('Từ vựng vẫn dùng đường dẫn ảnh của thiết bị cũ.');
    if (typeof word.image_uri === 'string' && /^(file|content):/i.test(word.image_uri)) {
      fail('Từ vựng vẫn dùng đường dẫn ảnh của thiết bị cũ.');
    }
  }
  for (const asset of backup.data.imageAssets ?? []) {
    if (typeof asset.local_uri !== 'string' || !asset.local_uri.startsWith('backup://') ||
      !images.some((image) => image.wordId === asset.vocabulary_id && asset.local_uri === `backup://${image.path}`)) {
      fail('Metadata ảnh không khớp tệp ZIP.');
    }
  }
  return { backup, images };
}
