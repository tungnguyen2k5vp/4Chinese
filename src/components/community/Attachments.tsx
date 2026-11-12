import { Ionicons } from '@expo/vector-icons';
import { createElement, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { newOperationId, socialError, type SocialAttachment } from '@/services/community/api';
import { discardMedia, mediaUrl, openMedia, pickMedia, uploadMedia, validateMedia, type LocalAttachment } from '@/services/community/media';
import { useTheme } from '@/theme/ThemeProvider';

type Draft = { key: string; local: LocalAttachment; file?: SocialAttachment; error?: string };
const fileSize = (bytes: number) => bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
const errorText = (error: unknown) => (error as Error)?.name === 'AbortError' || (error as Error)?.message === 'SOCIAL_UPLOAD_CANCELLED' ? 'Đã dừng tải. Bạn có thể thử lại hoặc bỏ tệp.' : /^(Cho phép|Mỗi lần|Thiết bị)/u.test((error as Error)?.message ?? '') ? (error as Error).message : socialError(error);
export function useMediaDrafts(peer?: string) {
  const [drafts, setDrafts] = useState<Draft[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false), current = useRef<Draft[]>([]), controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const update = (next: Draft[]) => { current.current = next; setDrafts(next); };
  const upload = async (draft: Draft) => {
    try {
      const file = await uploadMedia(draft.local, peer, controller.current?.signal);
      update(current.current.map(d => d.key === draft.key ? { ...d, file, error: undefined } : d));
    } catch (e) { update(current.current.map(d => d.key === draft.key ? { ...d, error: errorText(e) } : d)); }
  };
  const choose = async (kind: Parameters<typeof pickMedia>[0]) => {
    if (lock.current) return; lock.current = true; controller.current = new AbortController(); setBusy(true); setError('');
    try {
      if (current.current.length >= 4) throw new Error('Mỗi lần chia sẻ tối đa 4 tệp.');
      const picked = await pickMedia(kind, 4 - current.current.length);
      const next = picked.map(local => ({ local: { ...local, mime: validateMedia(local.name, local.mime, local.bytes) }, key: newOperationId() }));
      update([...current.current, ...next]);
      for (const draft of next) { if (controller.current.signal.aborted) break; await upload(draft); }
      if (controller.current.signal.aborted) update(current.current.map(d => d.file ? d : { ...d, error: 'Đã dừng tải. Bạn có thể thử lại hoặc bỏ tệp.' }));
    } catch (e) { setError(errorText(e)); } finally { lock.current = false; setBusy(false); }
  };
  const retry = async (draft: Draft) => {
    if (lock.current) return; lock.current = true; controller.current = new AbortController(); setBusy(true);
    try { await upload(draft); } finally { lock.current = false; setBusy(false); }
  };
  const remove = async (draft: Draft) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { if (draft.file) await discardMedia(draft.file); update(current.current.filter(d => d.key !== draft.key)); }
    catch (e) { setError(errorText(e)); } finally { lock.current = false; setBusy(false); }
  };
  const clear = (discard = false) => {
    const previous = current.current; update([]); setError('');
    if (discard) void Promise.allSettled(previous.filter(d => d.file).map(d => discardMedia(d.file!)));
  };
  return { drafts, busy, error, choose, retry, remove, clear, cancel: () => controller.current?.abort(), ready: drafts.every(d => !!d.file), files: drafts.flatMap(d => d.file ? [d.file] : []) };
}
export function AttachmentComposer({ media, disabled = false }: { media: ReturnType<typeof useMediaDrafts>; disabled?: boolean }) {
  const t = useTheme();
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{([
      ['image', 'Ảnh', 'image-outline'], ['video', 'Video', 'videocam-outline'], ['document', 'Tài liệu', 'document-attach-outline'],
      ...(Platform.OS !== 'web' ? [['camera', 'Quay video', 'camera-outline']] : []),
    ] as [Parameters<typeof pickMedia>[0], string, keyof typeof Ionicons.glyphMap][]).map(([kind, label, icon]) => <MotionPressable key={kind} disabled={disabled || media.busy} accessibilityLabel={`Đính kèm ${label}`} onPress={() => { void media.choose(kind); }} style={{ minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: t.primarySoft, borderRadius: 12 }}><Ionicons name={icon} size={20} color={t.primaryText} /><Text style={{ color: t.primaryText, fontSize: 13 }}>{label}</Text></MotionPressable>)}</View>
    {media.drafts.map(d => <View key={d.key} style={{ padding: 8, borderWidth: 1, borderColor: d.error ? t.error : t.border, borderRadius: 12, gap: 4 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{d.local.mime.startsWith('image/') ? <Image source={{ uri: d.local.uri }} style={{ width: 46, height: 46, borderRadius: 8 }} /> : <Ionicons name={d.local.mime.startsWith('video/') ? 'videocam-outline' : 'document-outline'} size={25} color={t.primaryText} />}<View style={{ flex: 1 }}><Text numberOfLines={2} style={{ color: t.textPrimary, fontSize: 13 }}>{d.local.name}</Text><Text style={{ color: t.textMuted, fontSize: 11 }}>{fileSize(d.local.bytes)} · {d.file ? 'Đã tải · sẵn sàng chia sẻ' : d.error ? 'Chưa tải được' : 'Đang tải lên…'}</Text></View><MotionPressable disabled={disabled || media.busy} accessibilityLabel={`Bỏ tệp ${d.local.name}`} onPress={() => { void media.remove(d); }} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={22} color={t.textSecondary} /></MotionPressable></View>{d.error ? <><Text accessibilityRole="alert" style={{ color: t.error, fontSize: 12 }}>{d.error}</Text><PrimaryButton label="Thử tải lại tệp" variant="ghost" disabled={disabled || media.busy} onPress={() => { void media.retry(d); }} /></> : null}</View>)}
    {media.busy ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator color={t.primaryText} accessibilityLabel="Đang tải tệp đính kèm" /><PrimaryButton label="Dừng tải" variant="ghost" onPress={media.cancel} /></View> : null}
    {media.error ? <Text accessibilityRole="alert" style={{ color: t.error }}>{media.error}</Text> : null}
    {media.drafts.length ? <Text style={{ color: t.textMuted, fontSize: 11 }}>Tối đa 4 tệp · ảnh 8 MB · video 25 MB · tài liệu 10 MB</Text> : null}
  </View>;
}
export function AttachmentList({ files, preview = false }: { files?: SocialAttachment[]; preview?: boolean }) {
  return files?.length ? <View pointerEvents={preview ? 'none' : 'auto'} style={{ gap: 8, minWidth: 160 }}>{(preview ? files.slice(0, 1) : files).map(file => <Attachment key={file.id} file={file} preview={preview} />)}</View> : null;
}
function Attachment({ file, preview = false }: { file: SocialAttachment; preview?: boolean }) {
  const t = useTheme(), [url, setUrl] = useState(''), [error, setError] = useState(''), [large, setLarge] = useState(false), [busy, setBusy] = useState(false);
  const image = file.mime.startsWith('image/'), video = file.mime.startsWith('video/');
  useEffect(() => {
    if (!image && !(video && Platform.OS === 'web')) return;
    let live = true;
    void mediaUrl(file).then(value => { if (live) setUrl(value); }).catch(e => { if (live) setError(errorText(e)); });
    return () => { live = false; };
  }, [file, image, video]);
  const open = async () => {
    if (busy) return; setBusy(true); setError('');
    try { if (image || (video && Platform.OS === 'web')) { setUrl(await mediaUrl(file)); if (image) setLarge(true); } else await openMedia(file); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  return <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, overflow: 'hidden', gap: 5 }}>
    {image && url ? preview ? <Image source={{ uri: url }} resizeMode="cover" style={{ width: '100%', height: 120 }} /> : <MotionPressable accessibilityLabel={`Xem ảnh ${file.name}`} onPress={() => { void open(); }}><Image source={{ uri: url }} resizeMode="cover" onError={() => setError('Ảnh chưa tải được. Chạm thử lại.')} style={{ width: '100%', height: 180 }} /></MotionPressable> : null}
    {video && url && Platform.OS === 'web' ? createElement('video', { src: url, controls: !preview, preload: 'metadata', playsInline: true, 'aria-label': `Video ${file.name}`, style: { width: '100%', maxHeight: preview ? 120 : 260 }, onError: () => setError('Video chưa phát được. Chạm thử lại.') }) : null}
    {preview ? <View style={{ padding: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name={image ? 'image-outline' : video ? 'play-circle-outline' : 'document-text-outline'} size={20} color={t.primaryText} /><Text numberOfLines={1} style={{ color: t.textSecondary, flex: 1, fontSize: 12 }}>{file.name}</Text></View> : <MotionPressable disabled={busy} accessibilityLabel={`${image ? 'Mở ảnh' : video ? 'Xem video' : 'Tải tài liệu'} ${file.name}`} onPress={() => { void open(); }} style={{ minHeight: 48, padding: 10, flexDirection: 'row', gap: 9, alignItems: 'center' }}><Ionicons name={image ? 'image-outline' : video ? 'play-circle-outline' : 'document-text-outline'} size={24} color={t.primaryText} /><View style={{ flex: 1 }}><Text numberOfLines={2} style={{ color: t.textPrimary, fontWeight: '600', fontSize: 13 }}>{file.name}</Text><Text style={{ color: t.textMuted, fontSize: 11 }}>{fileSize(file.bytes)} · {image ? 'Xem ảnh' : video ? 'Phát video' : 'Tải / chia sẻ'}</Text></View></MotionPressable>}
    {error ? <Text accessibilityRole="alert" style={{ color: t.error, fontSize: 12, padding: 8 }}>{error}</Text> : null}
    {large ? <Modal transparent visible onRequestClose={() => setLarge(false)}><View style={{ flex: 1, padding: 24, paddingTop: 48, backgroundColor: '#0A101CEE', gap: 16 }}><PrimaryButton label="Đóng ảnh" variant="secondary" onPress={() => setLarge(false)} /><Image source={{ uri: url }} resizeMode="contain" style={{ flex: 1, width: '100%' }} accessibilityLabel={file.name} /></View></Modal> : null}
  </View>;
}
