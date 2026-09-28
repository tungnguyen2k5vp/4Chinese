import { type SupabaseClient } from '@supabase/supabase-js';

import { parseBackupArchive, type ParsedBackupArchive } from '@/services/backup/archive';

export const CLOUD_BACKUP_BUCKET = 'user-backups';
export const MAX_CLOUD_BACKUP_BYTES = 100 * 1024 * 1024;
const filePattern = /^backup-\d{13}-[a-z0-9]{6}\.zip$/;

export function cloudBackupPath(userId: string, filename: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !filePattern.test(filename)) {
    throw new Error('Đường dẫn bản sao lưu không hợp lệ.');
  }
  return `${userId}/${filename}`;
}

export type CloudBackupItem = { name: string; createdAt: string; size: number };

async function ownerId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Bạn cần đăng nhập để dùng sao lưu đám mây.');
  return data.user.id;
}

export async function listCloudBackups(client: SupabaseClient): Promise<CloudBackupItem[]> {
  const uid = await ownerId(client);
  const { data, error } = await client.storage.from(CLOUD_BACKUP_BUCKET).list(uid, {
    limit: 100, sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw error;
  return (data ?? []).filter((item) => filePattern.test(item.name))
    .map((item) => ({ name: item.name, createdAt: item.created_at ?? '',
      size: typeof item.metadata?.size === 'number' ? item.metadata.size : 0 }));
}

export async function uploadCloudBackup(client: SupabaseClient, archive: Uint8Array): Promise<void> {
  // Reparse before crossing the network boundary. No partially generated ZIP is uploaded.
  parseBackupArchive(archive);
  if (archive.length > MAX_CLOUD_BACKUP_BYTES) throw new Error('Bản sao lưu quá lớn.');
  const uid = await ownerId(client);
  const filename = `backup-${Date.now()}-${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}.zip`;
  const { error } = await client.storage.from(CLOUD_BACKUP_BUCKET).upload(
    cloudBackupPath(uid, filename), archive.slice().buffer as ArrayBuffer,
    { contentType: 'application/zip', upsert: false },
  );
  if (error) throw error;
}

export async function downloadCloudBackup(client: SupabaseClient, filename: string): Promise<ParsedBackupArchive> {
  const uid = await ownerId(client);
  const { data, error } = await client.storage.from(CLOUD_BACKUP_BUCKET)
    .download(cloudBackupPath(uid, filename));
  if (error || !data) throw error ?? new Error('Không tải được bản sao lưu.');
  if (data.size > MAX_CLOUD_BACKUP_BYTES) throw new Error('Bản sao lưu quá lớn.');
  const bytes = new Uint8Array(await data.arrayBuffer());
  return parseBackupArchive(bytes);
}

export async function deleteCloudBackup(client: SupabaseClient, filename: string): Promise<void> {
  const uid = await ownerId(client);
  const { error } = await client.storage.from(CLOUD_BACKUP_BUCKET)
    .remove([cloudBackupPath(uid, filename)]);
  if (error) throw error;
}
