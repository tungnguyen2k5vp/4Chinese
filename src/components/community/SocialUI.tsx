import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioButton } from '@/components/AudioButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AttachmentList } from '@/components/community/Attachments';
import { AvatarGlyph, StickerList } from '@/components/community/Illustrations';
import { CommunityLearningQuiz } from '@/components/community/LearningQuiz';
import { SocialInput } from '@/components/community/SocialInput';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { useModalAnimationType } from '@/hooks/use-reduced-motion';
import { getCommunityClient } from '@/services/cloud/client';
import { blockPerson, bookmarkPost, friendsAction, getPerson, me, react, removeContent, report, socialError, topics, type SocialPerson, type SocialPost, type SocialProfile } from '@/services/community/api';
import { decodeLearningQuiz } from '@/services/community/learning-quiz';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export const categories = { question: 'Hỏi đáp', share: 'Chia sẻ', practice: 'Luyện cùng nhau' } as const;
export const useSocialStyles = () => useThemeStyles(createStyles);
export const socialTime = (value: string) => new Date(value).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export function confirmSocial(title: string, detail: string, label: string, action: () => void, destructive = false) {
  if (Platform.OS === 'web') { if (globalThis.confirm(`${title}\n\n${detail}`)) action(); }
  else Alert.alert(title, detail, [{ text: 'Hủy', style: 'cancel' }, { text: label, style: destructive ? 'destructive' : 'default', onPress: action }]);
}

export { SocialInput } from './SocialInput';
export function SocialError({ message }: { message?: string }) {
  const s = useSocialStyles();
  return message ? <Text accessibilityRole="alert" style={s.error}>{message}</Text> : null;
}
export function SocialEmpty({ title, detail }: { title: string; detail: string }) {
  const s = useSocialStyles(), t = useTheme();
  return <View style={s.empty}><Ionicons name="chatbubbles-outline" size={32} color={t.primaryText} /><Text style={s.heading}>{title}</Text><Text style={[s.muted, { textAlign: 'center' }]}>{detail}</Text></View>;
}
export function Avatar({ profile, onPress }: { profile: SocialProfile; onPress: () => void }) {
  const s = useSocialStyles();
  return <MotionPressable accessibilityLabel={`Xem hồ sơ ${profile.display_name}`} onPress={onPress} style={s.avatar}><AvatarGlyph index={profile.icon ?? profile.avatar} /></MotionPressable>;
}
export function AccountIdentityCard() {
  const s = useSocialStyles(), t = useTheme();
  const [profile, setProfile] = useState<SocialProfile | null>(null), [email, setEmail] = useState('');
  useFocusEffect(useCallback(() => {
    let live = true;
    void getCommunityClient()?.auth.getSession().then(async ({ data }) => {
      if (!live) return;
      setEmail(data.session?.user.email_confirmed_at ? data.session.user.email ?? '' : '');
      if (!data.session) { setProfile(null); return; }
      try { const own = await me(); if (live) setProfile(own); } catch { /* Keep the last visible identity offline; never create/switch accounts here. */ }
    }).catch(() => {});
    return () => { live = false; };
  }, []));
  return <MotionPressable accessibilityLabel="Mở tài khoản 4Chinese" onPress={() => router.push('/community/account')} style={[s.card, s.row]}>
    <View style={[s.avatar, { width: 62, height: 62, borderRadius: 22 }]}>{profile ? <AvatarGlyph index={profile.icon ?? profile.avatar} size={43} /> : <Text style={{ fontSize: 33 }}>学</Text>}</View>
    <View style={{ flex: 1, gap: 5 }}><Text style={s.heading}>{profile?.display_name ?? 'Tài khoản 4Chinese'}</Text><Text numberOfLines={2} style={s.small}>{email || 'Hồ sơ · bạn bè · cộng đồng'}</Text><Text style={[s.small, { color: t.primaryText }]}>Học offline · giữ nguyên tiến độ</Text></View><Ionicons name="chevron-forward" size={20} color={t.textMuted} />
  </MotionPressable>;
}
export function SocialSheet({ title, onClose, children }: PropsWithChildren<{ title: string; onClose: () => void }>) {
  const s = useSocialStyles(), t = useTheme(), animationType = useModalAnimationType();
  const { width } = useWindowDimensions(), wide = Platform.OS === 'web' && width >= 720;
  return <Modal transparent animationType={animationType} onRequestClose={onClose} visible>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[s.scrim, wide && { justifyContent: 'center', alignItems: 'center', padding: 24 }]}><SafeAreaView edges={['top', 'bottom']} style={[s.sheetSafe, wide && { width: '100%', maxWidth: 640, borderRadius: 26 }]}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.sheet}>
      <View style={s.row}><Text accessibilityRole="header" style={[s.heading, { flex: 1 }]}>{title}</Text><MotionPressable accessibilityLabel="Đóng" onPress={onClose} style={s.iconButton}><Ionicons name="close" size={24} color={t.textPrimary} /></MotionPressable></View>
      {children}
    </ScrollView></SafeAreaView></KeyboardAvoidingView>
  </Modal>;
}
export function ReportSheet({ kind, id, onClose }: { kind: 'post' | 'message' | 'profile'; id: string; onClose: () => void }) {
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const s = useSocialStyles(), lock = useRef(false);
  return <SocialSheet title="Báo cáo nội dung" onClose={onClose}><Text style={s.muted}>Mô tả vấn đề để quản trị viên xem xét. Báo cáo chỉ hiển thị với bạn và quản trị viên.</Text>
    <SocialInput placeholder="Lý do báo cáo" value={reason} onChangeText={setReason} maxLength={500} multiline style={s.composer} editable={!busy} />
    <SocialError message={error} /><PrimaryButton label="Gửi báo cáo" loading={busy} disabled={reason.trim().length < 3} onPress={() => {
      if (lock.current) return; lock.current = true; setBusy(true);
      void report(kind, id, reason).then(() => { onClose(); Alert.alert('Đã nhận báo cáo', 'Nội dung đã được gửi để xem xét.'); }).catch(e => setError(socialError(e))).finally(() => { lock.current = false; setBusy(false); });
    }} />
  </SocialSheet>;
}

export function PersonSheet({ profile, myId, onClose, onChanged }: { profile: SocialProfile; myId: string; onClose: () => void; onChanged: () => void }) {
  const s = useSocialStyles();
  const [person, setPerson] = useState<SocialPerson | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [reporting, setReporting] = useState(false);
  const lock = useRef(false), own = profile.id === myId;
  useEffect(() => {
    let live = true;
    if (!own) void getPerson(profile.id).then(p => { if (live) setPerson(p); }).catch(e => { if (live) setError(socialError(e)); });
    return () => { live = false; };
  }, [own, profile.id]);
  const run = async (action: () => Promise<unknown>, close = false) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await action(); onChanged(); if (close) onClose(); else setPerson(await getPerson(profile.id)); }
    catch (e) { setError(socialError(e)); } finally { lock.current = false; setBusy(false); }
  };
  if (reporting) return <ReportSheet kind="profile" id={profile.id} onClose={() => setReporting(false)} />;
  const incoming = person?.state === 'pending' && person.requested_by !== myId;
  return <SocialSheet title={profile.display_name} onClose={onClose}>
    <View style={s.row}><AvatarGlyph index={profile.icon ?? profile.avatar} size={54} /><View style={{ flex: 1, gap: 6 }}><Text selectable style={s.heading}>FC-{profile.handle}</Text><Text style={s.muted}>{profile.bio || 'Cùng nhau học mỗi ngày.'}</Text></View></View>
    <SocialError message={error} />
    {own ? <PrimaryButton label="Sửa hồ sơ · liên kết email" onPress={() => { onClose(); router.push('/community/account'); }} /> : <>
      {!person && !error ? <ActivityIndicator /> : null}
      {person?.state === 'accepted' ? <><PrimaryButton label="Nhắn tin" onPress={() => { onClose(); router.push({ pathname: '/community/chat/[id]', params: { id: profile.id } }); }} />
        <PrimaryButton label="Hủy kết bạn" variant="ghost" loading={busy} onPress={() => confirmSocial('Hủy kết bạn?', 'Lịch sử nhắn tin vẫn được giữ. Hai bạn cần kết bạn lại để gửi tin mới.', 'Hủy kết bạn', () => { void run(() => friendsAction(profile.id, 'remove')); })} /></> : incoming ?
        <><PrimaryButton label="Chấp nhận kết bạn" loading={busy} onPress={() => { void run(() => friendsAction(profile.id, 'accept')); }} /><PrimaryButton label="Từ chối" variant="ghost" disabled={busy} onPress={() => { void run(() => friendsAction(profile.id, 'decline')); }} /></> : person?.state === 'pending' ?
          <><Text style={s.muted}>Đã gửi lời mời. Khi được chấp nhận, hai bạn có thể nhắn tin.</Text><PrimaryButton label="Thu hồi lời mời" variant="ghost" loading={busy} onPress={() => { void run(() => friendsAction(profile.id, 'remove')); }} /></> : person ?
            <><PrimaryButton label="Kết bạn" loading={busy} onPress={() => { void run(() => friendsAction(profile.id, 'request')); }} /><Text style={s.muted}>Nhắn tin mở sau khi cả hai đồng ý kết bạn.</Text></> : null}
      <PrimaryButton label="Báo cáo tài khoản" variant="ghost" disabled={busy} onPress={() => setReporting(true)} />
      <PrimaryButton label="Chặn người dùng" variant="danger" disabled={busy} onPress={() => confirmSocial('Chặn người dùng?', 'Ẩn nội dung và ngừng nhận tin nhắn từ tài khoản này.', 'Chặn', () => { void run(() => blockPerson(profile.id, true), true); }, true)} />
    </>}
  </SocialSheet>;
}

export function PostCard({ post, myId, onPerson, onChanged, detail = false }: { post: SocialPost; myId: string; onPerson: (p: SocialProfile) => void; onChanged: () => void; detail?: boolean }) {
  const s = useSocialStyles(), t = useTheme(), lock = useRef(false);
  const { height } = useWindowDimensions(), lines = height < 750 ? 3 : 5;
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [reporting, setReporting] = useState(false);
  const toggle = async () => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await react(post.id, post.reaction === 'heart' ? null : 'heart'); onChanged(); } catch (e) { setError(socialError(e)); } finally { lock.current = false; setBusy(false); }
  };
  const learningQuiz = post.category === 'practice' ? decodeLearningQuiz(post.body) : null;
  const displayBody = learningQuiz ? learningQuiz.introduction : post.body;
  const chinese = !learningQuiz && displayBody.split('\n').find(line => /[\u3400-\u9fff]/u.test(line) && line.length <= 180);
  const open = () => router.push({ pathname: '/community/post/[id]', params: { id: post.id } });
  const content = <View style={{ gap: 10 }}>
    {post.title ? <Text selectable={detail} numberOfLines={detail ? undefined : 2} accessibilityRole="header" style={[s.heading, { fontSize: 20, lineHeight: 28 }]}>{post.title}</Text> : null}
    <Text style={[s.small, { color: t.skillColors.grammar }]}># {topics[post.community_topic ?? post.topic]}</Text>
    {displayBody ? <Text selectable={detail} style={s.body} numberOfLines={detail ? undefined : lines}>{displayBody}</Text> : null}
    <StickerList ids={post.stickers} compact={!detail} />
    {detail || !post.stickers.length ? <AttachmentList files={post.attachments} preview={!detail} /> : null}
    {!detail ? <Text style={[s.small, { color: t.primaryText, fontWeight: '700' }]}>Xem đầy đủ{(post.attachments?.length ?? 0) > 1 ? ` · ${post.attachments!.length} tệp` : ''}{post.stickers.length > 2 ? ` · ${post.stickers.length} ảnh biểu cảm` : ''} →</Text> : null}
  </View>;
  return <View style={[s.card, { borderTopWidth: 3, borderTopColor: post.category === 'question' ? t.skillColors.grammar : post.category === 'practice' ? t.skillColors.speaking : t.primary }]}>
    <View style={s.row}><Avatar profile={post.author} onPress={() => onPerson(post.author)} /><View style={{ flex: 1, gap: 3 }}><Text style={s.name}>{post.author.display_name}</Text><Text style={s.small}>{socialTime(post.created_at)}</Text></View>
      <Text style={s.badge}>{categories[post.category]}</Text>
    </View>
    {detail ? content : <Pressable accessibilityRole="button" accessibilityLabel={`Mở đầy đủ bài viết ${post.title || learningQuiz?.quiz.question || post.body.slice(0, 60)}`} onPress={open}>{content}</Pressable>}
    {learningQuiz ? <CommunityLearningQuiz key={`${post.id}-${post.body}`} quiz={learningQuiz.quiz} compact={!detail} onOpen={open} /> : null}
    {chinese ? <View style={s.row}><AudioButton text={chinese} size={18} accessibilityLabel="Nghe câu tiếng Trung trong bài viết" /><Text style={s.small}>Nghe câu tiếng Trung</Text></View> : null}
    <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
      <MotionPressable disabled={busy} accessibilityLabel={`Tim: ${post.hearts}`} accessibilityState={{ selected: post.reaction === 'heart' }} onPress={() => { void toggle(); }} style={[s.reaction, { paddingHorizontal: 10, borderWidth: 0, backgroundColor: post.reaction === 'heart' ? t.primarySoft : t.background }]}><Ionicons name={post.reaction === 'heart' ? 'heart' : 'heart-outline'} size={21} color={post.reaction === 'heart' ? t.error : t.textSecondary} /><Text style={s.name}>{post.hearts}</Text></MotionPressable>
      {detail ? <View accessibilityLabel={`${post.comments} bình luận`} style={[s.row, { minHeight: 44, gap: 5, paddingHorizontal: 7 }]}><Ionicons name="chatbubble-outline" size={20} color={t.textSecondary} /><Text style={s.name}>{post.comments}</Text></View> : <MotionPressable accessibilityLabel={`${post.comments} bình luận`} onPress={open} style={[s.reaction, { borderWidth: 0, paddingHorizontal: 10 }]}><Ionicons name="chatbubble-outline" size={20} color={t.textSecondary} /><Text style={s.name}>{post.comments}</Text></MotionPressable>}
      <View accessibilityLabel={`${post.views} người đã xem`} style={[s.row, { gap: 5, minHeight: 44 }]}><Ionicons name="eye-outline" size={20} color={t.textMuted} /><Text style={s.small}>{post.views}</Text></View>
      <View style={{ flex: 1 }} />
      <MotionPressable accessibilityLabel={post.saved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'} accessibilityState={{ selected: post.saved }} disabled={busy} style={s.iconButton} onPress={() => {
        if (lock.current) return; lock.current = true; setBusy(true);
        void bookmarkPost(post.id, !post.saved).then(onChanged).catch(e => setError(socialError(e))).finally(() => { lock.current = false; setBusy(false); });
      }}><Ionicons name={post.saved ? 'bookmark' : 'bookmark-outline'} size={20} color={post.saved ? t.primaryText : t.textMuted} /></MotionPressable>
      <MotionPressable accessibilityLabel={post.author_id === myId ? 'Xóa bài viết' : 'Báo cáo bài viết'} disabled={busy} onPress={() => {
        if (post.author_id !== myId) { setReporting(true); return; }
        confirmSocial('Xóa bài viết?', 'Bài viết sẽ không còn hiển thị trong cộng đồng.', 'Xóa', () => {
          if (lock.current) return; lock.current = true; setBusy(true);
          void removeContent(post.id, 'post').then(() => { if (detail) { if (router.canGoBack()) router.back(); else router.replace('/community'); } else onChanged(); }).catch(e => setError(socialError(e))).finally(() => { lock.current = false; setBusy(false); });
        }, true);
      }} style={s.iconButton}><Ionicons name={post.author_id === myId ? 'trash-outline' : 'flag-outline'} size={19} color={t.textMuted} /></MotionPressable>
    </View><SocialError message={error} />
    {reporting ? <ReportSheet kind="post" id={post.id} onClose={() => setReporting(false)} /> : null}
  </View>;
}

function createStyles(t: ThemeTokens) { return StyleSheet.create({
  card: { borderWidth: 1, borderColor: t.border, borderRadius: 22, padding: 16, gap: 14, backgroundColor: t.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { color: t.textPrimary, fontSize: 20, fontWeight: '800' },
  name: { color: t.textPrimary, fontSize: 15, fontWeight: '700' },
  body: { color: t.textPrimary, fontSize: 17, lineHeight: 27 },
  muted: { color: t.textSecondary, fontSize: 14, lineHeight: 21 },
  small: { color: t.textMuted, fontSize: 12, lineHeight: 18 },
  badge: { color: t.primaryText, backgroundColor: t.primarySoft, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, fontSize: 11, fontWeight: '700', overflow: 'hidden', maxWidth: '38%' },
  input: { color: t.textPrimary, backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: 15, padding: 14, fontSize: 16, minHeight: 50 },
  composer: { minHeight: 110, maxHeight: 220, textAlignVertical: 'top', lineHeight: 25 },
  avatar: { width: 48, height: 48, borderRadius: 18, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  reaction: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: t.border, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  error: { color: t.error, fontSize: 14, lineHeight: 21, paddingVertical: 6 },
  empty: { padding: 28, borderRadius: 22, backgroundColor: t.primarySoft, alignItems: 'center', gap: 12 },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: t.overlay },
  sheetSafe: { maxHeight: '92%', backgroundColor: t.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  sheet: { padding: 22, gap: 16 },
}); }
