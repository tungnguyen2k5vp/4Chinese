import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { useLayoutEffect, useRef, useState } from 'react';
import { AppState, FlatList, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AttachmentComposer, AttachmentList, useMediaDrafts } from '@/components/community/Attachments';
import { PresenceLabel, useFriendPresence } from '@/components/community/Presence';
import { Avatar, confirmSocial, PersonSheet, ReportSheet, SocialError, SocialInput, SocialSheet, socialTime, useSocialStyles } from '@/components/community/SocialUI';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { getPerson, markRead, me, messageDetails, messageEmojis, messages, newOperationId, reactToMessage, socialError, withdrawMessage, type SocialMessage, type SocialPerson, type SocialProfile } from '@/services/community/api';
import { catchUpMessages } from '@/services/community/history';
import { deliverPending, discardPending, mergeMessages, pendingMessages, queueMessage, type PendingMessage } from '@/services/community/outbox';
import { useSocialRefresh } from '@/services/community/use-social-refresh';
import { useTheme } from '@/theme/ThemeProvider';

export default function CommunityChat() {
  const { id } = useLocalSearchParams<{ id: string }>(), s = useSocialStyles(), t = useTheme();
  const media = useMediaDrafts(id), presence = useFriendPresence([id]);
  const [attaching, setAttaching] = useState(false);
  const focused = useIsFocused(), focusedRef = useRef(focused);
  useLayoutEffect(() => { focusedRef.current = focused; }, [focused]);
  const [profile, setProfile] = useState<SocialProfile | null>(null), [peer, setPeer] = useState<SocialPerson | null>(null), [items, setItems] = useState<SocialMessage[]>([]), [pending, setPending] = useState<PendingMessage[]>([]);
  const [readId, setReadId] = useState(0), [more, setMore] = useState(false), [menu, setMenu] = useState(false), [reportId, setReportId] = useState<string | null>(null);
  const [body, setBody] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [deliveryError, setDeliveryError] = useState('');
  const [reply, setReply] = useState<SocialMessage | null>(null), [selected, setSelected] = useState<SocialMessage | null>(null);
  const [emojis, setEmojis] = useState(false), [searching, setSearching] = useState(false), [query, setQuery] = useState('');
  const rows = useRef<SocialMessage[]>([]), fetchedThrough = useRef<number | undefined>(undefined), acknowledged = useRef(0), personAt = useRef(0), list = useRef<FlatList<SocialMessage | PendingMessage>>(null), atEnd = useRef(true), lock = useRef(false), delivering = useRef(false);
  const scrollSize = useRef({ viewport: 0, content: 0 });
  const followTail = () => { if (atEnd.current) requestAnimationFrame(() => { if (atEnd.current) list.current?.scrollToEnd({ animated: false }); }); };
  const append = (page: SocialMessage[]) => {
    rows.current = mergeMessages(rows.current, page); setItems(rows.current);
    const refresh = (current: SocialMessage | null) => {
      const updated = current && page.find(m => m.id === current.id);
      return updated ? updated.withdrawn_at ? null : updated : current;
    };
    setReply(refresh); setSelected(refresh);
  };
  const drain = async (sender: string) => {
    if (delivering.current) return; delivering.current = true;
    try {
      setDeliveryError('');
      for (const item of await pendingMessages(sender, id)) {
        if (!focusedRef.current || (AppState.currentState != null && AppState.currentState !== 'active')) break;
        try { append([await deliverPending(item)]); } catch (e) { setDeliveryError(socialError(e)); break; }
      }
      setPending(await pendingMessages(sender, id));
    } finally { delivering.current = false; }
  };
  const live = useSocialRefresh(['social_messages', 'social_message_updates', 'social_reads', 'social_friendships', 'social_blocks'], async () => {
    try {
    const own = await me(); setProfile(own);
    if (Date.now() - personAt.current > 30000) { setPeer(await getPerson(id)); personAt.current = Date.now(); }
    // Sending may append a newer ID before older incoming messages are fetched.
    // Advance the resume cursor only from history responses, never from send acknowledgements.
    const after = fetchedThrough.current;
    const replay = await catchUpMessages(id, after, (page, read) => {
      append(page); setReadId(read);
      fetchedThrough.current = page.at(-1)?.id ?? fetchedThrough.current;
    }, () => focusedRef.current && (AppState.currentState == null || AppState.currentState === 'active'));
    if (after === undefined) setMore(replay.initialFull);
    // Reactions/withdrawals change existing rows; the history cursor alone cannot replay them.
    const loaded = rows.current.map(m => m.id);
    for (let offset = 0; offset < loaded.length; offset += 200) append(await messageDetails(id, loaded.slice(offset, offset + 200)));
    const received = rows.current.filter(m => m.sender_id === id).at(-1)?.id;
    if (received && received > acknowledged.current && focusedRef.current && (AppState.currentState == null || AppState.currentState === 'active')) {
      await markRead(id, received); acknowledged.current = received;
    }
    setPending(await pendingMessages(own.id, id));
    await drain(own.id);
    } catch (e) {
      if ((e as { message?: string })?.message?.includes('SOCIAL_NOT_FOUND')) {
        setPeer(null); personAt.current = 0; rows.current = []; setItems([]); setReply(null); setSelected(null);
        fetchedThrough.current = undefined; acknowledged.current = 0; setReadId(0); setMore(false);
      }
      throw e;
    }
  });
  const run = async (action: () => Promise<unknown>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { setError(socialError(e)); } finally { lock.current = false; setBusy(false); }
  };
  const knownNonces = new Set(items.map(m => m.client_id));
  const all: (SocialMessage | PendingMessage)[] = [...items, ...pending.filter(p => !knownNonces.has(p.client_id))];
  const shown = searching && query.trim() ? all.filter(m => m.body.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))) : all;
  const send = () => run(async () => {
    if (!profile || media.busy || !media.ready || (!body.trim() && !media.files.length)) return;
    const item: PendingMessage = { client_id: newOperationId(), sender_id: profile.id, recipient_id: id, body: body.trim() || '📎 Tệp đính kèm', attachments: media.files, created_at: new Date().toISOString(), reply_to: reply?.id ?? null };
    await queueMessage(item); media.clear(); setAttaching(false); setBody(''); setReply(null); setEmojis(false); atEnd.current = true; setPending(await pendingMessages(profile.id, id));
    await drain(profile.id);
  });
  return <Screen maxWidth={860} title={peer?.profile.display_name ?? 'Tin nhắn'} scroll={false} compact avoidKeyboard safeAreaEdges={['top', 'bottom']} right={<View style={s.row}><MotionPressable accessibilityLabel="Tìm trong hội thoại" style={s.iconButton} onPress={() => { setSearching(value => !value); setQuery(''); }}><Ionicons name="search-outline" size={23} color={t.primaryText} /></MotionPressable>{peer ? <Avatar profile={peer.profile} onPress={() => setMenu(true)} /> : null}</View>}><View style={{ flex: 1, width: '100%', maxWidth: 820, alignSelf: 'center', gap: 8 }}>
    <View style={{ gap: 8 }}><PresenceLabel status={presence(id)} /><Text style={s.small}>{live.connected ? '● Cập nhật trực tiếp' : 'Đang nối lại · tin chưa gửi sẽ được giữ trên máy'}</Text><SocialError message={error || deliveryError || live.error} />
      {(error || deliveryError || live.error) ? <PrimaryButton label="Kết nối & thử gửi lại" variant="ghost" loading={live.loading} onPress={() => { setError(''); personAt.current = 0; void live.refresh(); }} /> : null}
    </View>
    {searching ? <View style={{ gap: 6 }}><SocialInput placeholder="Tìm trong tin nhắn đã tải" value={query} onChangeText={setQuery} maxLength={100} /><Text style={s.small}>{shown.length} / {all.length} tin đã tải · mở tin cũ hơn để tìm thêm</Text></View> : null}
    <FlatList ref={list} data={shown} keyExtractor={m => m.client_id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      onScroll={e => {
        const { layoutMeasurement: l, contentOffset: o, contentSize: c } = e.nativeEvent;
        // Keyboard/error banners can resize the viewport without the user scrolling away.
        if (scrollSize.current.viewport === l.height && scrollSize.current.content === c.height) atEnd.current = c.height - o.y - l.height < 90;
        scrollSize.current = { viewport: l.height, content: c.height };
      }} scrollEventThrottle={100}
      onLayout={() => { if (!searching) followTail(); }} onContentSizeChange={() => { if (!searching) followTail(); }}
      ListHeaderComponent={more ? <PrimaryButton label="Xem tin nhắn cũ hơn" variant="ghost" loading={busy} onPress={() => { void run(async () => {
        const before = rows.current[0]?.id; if (!before) return; atEnd.current = false;
        const page = await messages(id, { before }); append(page.messages); setMore(page.messages.length === 50); setReadId(page.read);
      }); }} /> : <Text style={[s.small, { textAlign: 'center' }]}>Tin nhắn riêng giữa hai người đã kết bạn.</Text>}
      ListEmptyComponent={!live.loading && peer ? <Text style={s.muted}>Gửi một lời chào để bắt đầu học cùng nhau.</Text> : null}
      renderItem={({ item, index }) => {
        const own = item.sender_id === profile?.id, saved = 'id' in item;
        const quote = saved ? item.reply : items.find(m => m.id === item.reply_to);
        const withdrawn = saved && !!item.withdrawn_at;
        const date = new Date(item.created_at).toLocaleDateString('vi-VN');
        const newDay = index === 0 || new Date(shown[index - 1]!.created_at).toLocaleDateString('vi-VN') !== date;
        return <View style={{ gap: 8 }}>{newDay ? <Text style={[s.small, { textAlign: 'center', marginVertical: 8 }]}>{date}</Text> : null}<View style={{ alignItems: own ? 'flex-end' : 'flex-start', gap: 4 }}><View style={[s.row, { maxWidth: '96%', alignItems: 'center', flexDirection: own ? 'row-reverse' : 'row' }]}><Pressable accessibilityRole="text" onLongPress={() => { if (saved) setSelected(item); }} style={{ maxWidth: '88%', minWidth: 74, gap: 7, padding: 13, borderRadius: 20, borderBottomRightRadius: own ? 6 : 20, borderBottomLeftRadius: own ? 20 : 6, backgroundColor: withdrawn ? t.background : own ? (t.mode === 'dark' ? '#175F5B' : t.primary) : t.surface, borderWidth: own && !withdrawn ? 0 : 1, borderColor: t.border }}>
          {quote ? <View style={{ borderLeftWidth: 3, borderColor: own ? '#FFFFFF99' : t.primary, paddingLeft: 9, gap: 3 }}><Text style={[s.small, { color: own ? '#FFFFFF' : t.primaryText, fontWeight: '700' }]}>{quote.sender_id === profile?.id ? 'Bạn' : peer?.profile.display_name}</Text><Text numberOfLines={2} style={[s.small, { color: own ? '#FFFFFFDD' : t.textSecondary }]}>{quote.body}</Text></View> : null}
          <Text selectable style={[s.body, { color: withdrawn ? t.textMuted : own ? '#FFFFFF' : t.textPrimary, fontStyle: withdrawn ? 'italic' : 'normal', fontSize: 16, lineHeight: 24 }]}>{item.body}</Text>
          <AttachmentList files={item.attachments} />
          {!saved ? <MotionPressable accessibilityLabel="Bỏ tin nhắn đang chờ" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => confirmSocial('Bỏ tin đang chờ?', 'Nếu máy chủ đã nhận tin trước khi mất mạng, tin đã gửi vẫn nằm trong hội thoại.', 'Bỏ tin chờ', () => { void run(async () => { await discardPending(item.sender_id, item.client_id); setPending(await pendingMessages(item.sender_id, id)); }); }, true)}><Text style={[s.small, { color: t.error }]}>Bỏ tin chờ</Text></MotionPressable> : null}
        </Pressable>{saved && !withdrawn ? <MotionPressable accessibilityLabel={`Tùy chọn tin nhắn: ${item.body.slice(0, 40)}`} style={s.iconButton} onPress={() => setSelected(item)}><Ionicons name="ellipsis-horizontal" size={19} color={t.textMuted} /></MotionPressable> : null}</View>
        {saved && item.reactions?.length ? <View style={[s.row, { gap: 5, flexWrap: 'wrap' }]}>{item.reactions.map(r => <MotionPressable key={r.emoji} accessibilityLabel={`${r.emoji}: ${r.count} cảm xúc`} accessibilityState={{ selected: r.mine }} disabled={busy} style={[s.reaction, { minHeight: 36, paddingHorizontal: 8, backgroundColor: r.mine ? t.primarySoft : t.surface }]} onPress={() => { void run(async () => append([await reactToMessage(id, item.id, r.mine ? null : r.emoji)])); }}><Text style={s.small}>{r.emoji} {r.count}</Text></MotionPressable>)}</View> : null}
        <Text style={[s.small, { fontSize: 10 }]}>{socialTime(item.created_at)}{own ? saved ? item.id <= readId ? ' · Đã xem ✓✓' : ' · Đã gửi ✓' : ' · Chờ gửi' : ''}</Text>
        </View></View>;
      }} />
    {peer?.state === 'accepted' ? <View style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border }}>
      {reply ? <View style={[s.row, { backgroundColor: t.primarySoft, paddingLeft: 12, borderRadius: 14 }]}><View style={{ flex: 1, gap: 3 }}><Text style={s.small}>Đang trả lời {reply.sender_id === profile?.id ? 'chính bạn' : peer.profile.display_name}</Text><Text numberOfLines={1} style={s.name}>{reply.body}</Text></View><MotionPressable accessibilityLabel="Hủy trả lời" onPress={() => setReply(null)} style={s.iconButton}><Ionicons name="close" size={20} color={t.textSecondary} /></MotionPressable></View> : null}
      {attaching || media.drafts.length ? <View style={{ maxHeight: 220 }}><ScrollView keyboardShouldPersistTaps="handled"><AttachmentComposer media={media} disabled={busy} /></ScrollView></View> : null}
      {emojis ? <View style={[s.row, { flexWrap: 'wrap' }]}>{['😊','❤️','👍','😂','🎉','🐼','你好！','谢谢！','加油！'].map(emoji => <MotionPressable key={emoji} accessibilityLabel={`Chèn ${emoji}`} style={s.reaction} onPress={() => setBody(value => value.length + emoji.length <= 2000 ? value + emoji : value)}><Text style={s.body}>{emoji}</Text></MotionPressable>)}</View> : null}
      <View style={[s.row, { alignItems: 'flex-end', gap: 6 }]}><MotionPressable accessibilityLabel="Thêm ảnh, video hoặc tài liệu" accessibilityState={{ expanded: attaching }} style={s.iconButton} onPress={() => setAttaching(v => !v)}><Ionicons name="add-circle-outline" size={26} color={t.primaryText} /></MotionPressable><MotionPressable accessibilityLabel="Emoji và câu chào nhanh" accessibilityState={{ expanded: emojis }} style={s.iconButton} onPress={() => setEmojis(value => !value)}><Ionicons name="happy-outline" size={26} color={t.primaryText} /></MotionPressable><SocialInput placeholder="Nhắn tin…" multiline value={body} onChangeText={setBody} maxLength={2000} editable={!busy} style={{ flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 23, paddingVertical: 12 }} /><MotionPressable accessibilityLabel="Gửi tin nhắn" accessibilityState={{ disabled: !profile || (!body.trim() && !media.files.length) || busy || media.busy || !media.ready, busy }} disabled={!profile || (!body.trim() && !media.files.length) || busy || media.busy || !media.ready} onPress={() => { void send(); }} style={[s.iconButton, { backgroundColor: t.primary, borderRadius: 24, opacity: body.trim() || media.files.length ? 1 : 0.5 }]}><Ionicons name="send" size={21} color="#FFFFFF" /></MotionPressable></View>
    </View> : peer ? <PrimaryButton label="Xem hồ sơ & kết bạn để nhắn tin" variant="secondary" onPress={() => setMenu(true)} /> : null}
    {menu && peer && profile ? <PersonSheet profile={peer.profile} myId={profile.id} onClose={() => setMenu(false)} onChanged={() => { personAt.current = 0; void live.refresh(); }} /> : null}
    {reportId ? <ReportSheet kind="message" id={reportId} onClose={() => setReportId(null)} /> : null}
    {selected ? <SocialSheet title="Tùy chọn tin nhắn" onClose={() => { if (!busy) setSelected(null); }}><Text numberOfLines={4} style={s.body}>{selected.body}</Text><View style={[s.row, { flexWrap: 'wrap' }]}>{messageEmojis.map(emoji => <MotionPressable key={emoji} disabled={busy} accessibilityLabel={`Thả ${emoji}`} style={s.reaction} onPress={() => { void run(async () => { append([await reactToMessage(id, selected.id, selected.reactions?.some(r => r.emoji === emoji && r.mine) ? null : emoji)]); setSelected(null); }); }}><Text style={{ fontSize: 23 }}>{emoji}</Text></MotionPressable>)}</View>
      <PrimaryButton label="Trả lời tin nhắn này" variant="secondary" disabled={busy || peer?.state !== 'accepted'} onPress={() => { setReply(selected); setSelected(null); }} />
      {/[\u3400-\u9fff]/u.test(selected.body) ? <View style={s.row}><AudioButton text={selected.body} /><Text style={s.muted}>Nghe tiếng Trung · giữ loa để nghe chậm</Text></View> : null}
      <PrimaryButton label={Platform.OS === 'web' ? 'Sao chép tin nhắn' : 'Chia sẻ văn bản tin nhắn'} variant="ghost" onPress={() => { void run(async () => { if (Platform.OS === 'web') await navigator.clipboard.writeText(selected.body); else await Share.share({ message: selected.body }); setSelected(null); }); }} />
      {selected.sender_id === profile?.id ? <PrimaryButton label="Thu hồi với mọi người" variant="ghost" disabled={busy} onPress={() => confirmSocial('Thu hồi tin nhắn?', 'Hai bên sẽ thấy “Tin nhắn đã thu hồi”. Người nhận có thể đã đọc hoặc sao chép nội dung.', 'Thu hồi', () => { void run(async () => { append([await withdrawMessage(id, selected.id)]); setSelected(null); await live.refresh(); }); })} /> : <PrimaryButton label="Báo cáo tin nhắn" variant="ghost" onPress={() => { setReportId(String(selected.id)); setSelected(null); }} />}
    </SocialSheet> : null}
  </View></Screen>;
}
