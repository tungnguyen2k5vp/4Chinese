import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { z } from 'zod';

import { attachmentSchema, communitySession, socialCall, type SocialAttachment } from './api';

export const mediaTypes: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', pdf: 'application/pdf', txt: 'text/plain',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
export type LocalAttachment = { uri: string; name: string; mime: string; bytes: number; file?: globalThis.File };
export function validateMedia(name: string, mime: string | undefined, bytes: number) {
  const extension = name.split('.').at(-1)?.toLowerCase() ?? '', expected = mediaTypes[extension];
  if (!expected || !name || name.length > 120 || /[/\\\p{Cc}]/u.test(name) || (mime && mime !== 'application/octet-stream' && mime !== expected) || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > (expected.startsWith('video/') ? 25 : expected.startsWith('image/') ? 8 : 10) * 1024 * 1024) throw new Error('SOCIAL_MEDIA_INVALID');
  return expected;
}
export async function pickMedia(kind: 'image' | 'video' | 'document' | 'camera', count: number): Promise<LocalAttachment[]> {
  if (kind === 'document') {
    const result = await DocumentPicker.getDocumentAsync({ type: Object.values(mediaTypes).filter(t => !t.startsWith('image/') && !t.startsWith('video/')), multiple: true, copyToCacheDirectory: true, base64: false });
    if (result.canceled) return [];
    if (result.assets.length > count) throw new Error('Mỗi lần chia sẻ tối đa 4 tệp.');
    return result.assets.map(a => ({ uri: a.uri, name: a.name, bytes: a.size ?? (Platform.OS === 'web' ? a.file?.size ?? 0 : new File(a.uri).size), mime: a.mimeType ?? '', file: a.file }));
  }
  if (kind === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Cho phép camera để quay video, hoặc chọn video có sẵn.');
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: kind === 'image' ? ['images'] : ['videos'], allowsMultipleSelection: kind !== 'camera', selectionLimit: count, quality: 0.85, videoMaxDuration: 60 };
  const result = kind === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return [];
  if (result.assets.length > count) throw new Error('Mỗi lần chia sẻ tối đa 4 tệp.');
  return result.assets.map(a => ({ uri: a.uri, name: a.fileName ?? `chia-se-${Date.now()}.${a.type === 'video' ? 'mp4' : 'jpg'}`, mime: a.mimeType ?? '', bytes: a.fileSize ?? (Platform.OS === 'web' ? a.file?.size ?? 0 : new File(a.uri).size), file: a.file }));
}
export async function uploadMedia(local: LocalAttachment, peer?: string, signal?: AbortSignal): Promise<SocialAttachment> {
  const mime = validateMedia(local.name, local.mime, local.bytes), client = await communitySession();
  const own = (await client.auth.getUser()).data.user?.id;
  if (!own) throw new Error('SOCIAL_AUTH_REQUIRED');
  const reserved = await socialCall('media_prepare', { name: local.name, mime, bytes: local.bytes, ...(peer ? { peer } : {}) }, attachmentSchema);
  const controller = new AbortController(), cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  const timeout = setTimeout(cancel, 90000);
  try {
    if (signal?.aborted) { controller.abort(); throw new Error('SOCIAL_UPLOAD_CANCELLED'); }
    // ponytail: standard upload buffers at most 25 MB; use resumable upload if larger clips are added.
    const data = Platform.OS === 'web' ? await (local.file ?? await (await fetch(local.uri)).blob()).arrayBuffer() : await new File(local.uri).arrayBuffer();
    if (data.byteLength !== local.bytes) throw new Error('SOCIAL_MEDIA_INVALID');
    const session = (await client.auth.getSession()).data.session;
    if (session?.user.id !== own) throw new Error('SOCIAL_AUTH_REQUIRED');
    // Storage SDK upload has no AbortSignal parameter; use its REST endpoint for cancellation.
    const result = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/social-media/${reserved.path}`, {
      method: 'POST', body: data, signal: controller.signal,
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, 'Content-Type': mime, 'x-upsert': 'false' },
    });
    if (!result.ok) throw new Error(result.status === 413 ? 'SOCIAL_MEDIA_INVALID' : 'SOCIAL_UPLOAD_FAILED');
    return await socialCall('media_finish', { id: reserved.id }, attachmentSchema);
  } catch (error) { await discardMedia(reserved).catch(() => {}); throw error; }
  finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); }
}
export async function discardMedia(file: SocialAttachment) {
  const client = await communitySession();
  const { error } = await client.storage.from('social-media').remove([attachmentSchema.parse(file).path]);
  if (error) throw error;
  await socialCall('media_discard', { id: file.id }, z.literal(true));
}
export async function mediaUrl(file: SocialAttachment) {
  const client = await communitySession();
  const { data, error } = await client.storage.from('social-media').createSignedUrl(attachmentSchema.parse(file).path, 60);
  if (error || !data) throw error ?? new Error('SOCIAL_NOT_FOUND');
  return data.signedUrl;
}
export async function openMedia(file: SocialAttachment) {
  const url = await mediaUrl(file);
  if (file.mime.startsWith('video/')) { await WebBrowser.openBrowserAsync(url); return; }
  if (Platform.OS === 'web') {
    const response = await fetch(url); if (!response.ok) throw new Error('SOCIAL_NOT_FOUND');
    const blob = URL.createObjectURL(await response.blob()), link = document.createElement('a');
    link.href = blob; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(blob), 10000);
  } else {
    const local = await File.downloadFileAsync(url, new File(Paths.cache, `${file.id}.${file.name.split('.').at(-1)}`), { idempotent: true });
    if (!(await Sharing.isAvailableAsync())) throw new Error('Thiết bị chưa hỗ trợ mở/chia sẻ tệp.');
    await Sharing.shareAsync(local.uri, { mimeType: file.mime, dialogTitle: file.name });
  }
}
