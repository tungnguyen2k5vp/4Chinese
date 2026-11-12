import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Share, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AttachmentComposer, useMediaDrafts } from '@/components/community/Attachments';
import { StickerPicker } from '@/components/community/Illustrations';
import { QuizComposer } from '@/components/community/LearningQuiz';
import { PresenceLabel, useFriendPresence } from '@/components/community/Presence';
import { Avatar, categories, confirmSocial, PersonSheet, PostCard, SocialEmpty, SocialError, SocialInput, SocialSheet, socialTime, useSocialStyles } from '@/components/community/SocialUI';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { blockPerson, createPost, feed, findPerson, inbox, me, newOperationId, relations, socialError, topics, type FeedFilter, type SocialPerson, type SocialPost, type SocialProfile } from '@/services/community/api';
import { encodeLearningQuiz, quizTemplates, type LearningQuiz } from '@/services/community/learning-quiz';
import { useSocialRefresh } from '@/services/community/use-social-refresh';
import { useTheme } from '@/theme/ThemeProvider';

type Tab = 'feed' | 'inbox' | 'friends';
const tabs = { feed: 'Bảng tin', inbox: 'Tin nhắn', friends: 'Bạn bè' } as const;
type Inbox = Awaited<ReturnType<typeof inbox>>;
export default function CommunityScreen() {
  const s = useSocialStyles(), t = useTheme();
  const [tab, setTab] = useState<Tab>('feed'), [profile, setProfile] = useState<SocialProfile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]), [letters, setLetters] = useState<Inbox>([]);
  const [friends, setFriends] = useState<SocialPerson[]>([]), [blocked, setBlocked] = useState<SocialProfile[]>([]);
  const [more, setMore] = useState(false), [moreFriends, setMoreFriends] = useState(false), [moreBlocked, setMoreBlocked] = useState(false);
  const [person, setPerson] = useState<SocialProfile | null>(null), [writing, setWriting] = useState(false), [error, setError] = useState('');
  const [handle, setHandle] = useState(''), [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>({}), [query, setQuery] = useState(''), [inboxQuery, setInboxQuery] = useState('');
  const activeFilter = useRef<FeedFilter>({});
  const presence = useFriendPresence([...letters.map(i => i.profile.id), ...friends.filter(f => f.state === 'accepted').map(f => f.profile.id)]);
  const lock = useRef(false), activeTab = useRef(tab);
  const live = useSocialRefresh(['social_posts', 'social_reactions', 'social_comments', 'social_messages', 'social_reads', 'social_friendships', 'social_blocks'], async () => {
    const currentTab = activeTab.current;
    const own = await me(); setProfile(own);
    if (currentTab === 'feed') { const selected = activeFilter.current; const page = await feed(undefined, selected); if (activeTab.current === currentTab && activeFilter.current === selected) { setPosts(page); setMore(page.length === 20); } }
    if (currentTab === 'inbox') { const page = await inbox(); if (activeTab.current === currentTab) setLetters(page); }
    if (currentTab === 'friends') { const page = await relations(); if (activeTab.current === currentTab) { setFriends(page.friends); setBlocked(page.blocked); setMoreFriends(page.friends.length === 50); setMoreBlocked(page.blocked.length === 50); } }
  });
  const run = async (action: () => Promise<unknown>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { setError(socialError(e)); } finally { lock.current = false; setBusy(false); }
  };
  const loadMore = () => run(async () => {
    const last = posts.at(-1); if (!last) return;
    const selected = activeFilter.current, page = await feed(last, selected);
    if (activeFilter.current === selected) { setPosts(old => [...old, ...page.filter(p => !old.some(x => x.id === p.id))]); setMore(page.length === 20); }
  });
  const filterFeed = (next: FeedFilter) => { activeFilter.current = next; setFilter(next); setPosts([]); setMore(false); void live.refresh(); };
  const peopleMore = (kind: 'friends' | 'blocked') => run(async () => {
    const after = kind === 'friends' ? friends.at(-1)?.profile.id : blocked.at(-1)?.id; if (!after) return;
    const page = await relations(kind === 'friends' ? { friends_after: after } : { blocked_after: after });
    if (kind === 'friends') { setFriends(old => [...old, ...page.friends.filter(p => !old.some(x => x.profile.id === p.profile.id))]); setMoreFriends(page.friends.length === 50); }
    else { setBlocked(old => [...old, ...page.blocked.filter(p => !old.some(x => x.id === p.id))]); setMoreBlocked(page.blocked.length === 50); }
  });
  const header = <View style={{ gap: 16, paddingBottom: 18 }}>
    {profile ? <View style={[s.row, { paddingVertical: 4 }]}>
      <Avatar profile={profile} onPress={() => router.push('/community/account')} /><View style={{ flex: 1, gap: 3 }}><Text style={s.name}>Chào {profile.display_name} 👋</Text><Text selectable style={s.small}>ID: FC-{profile.handle}</Text></View><MotionPressable accessibilityLabel="Chia sẻ ID kết bạn" style={s.iconButton} onPress={() => { void Share.share({ message: `Kết bạn cùng mình trên 4Chinese: FC-${profile.handle}` }).catch(() => setError('Chưa chia sẻ được ID. Bạn có thể sao chép dòng ID bên trên.')); }}><Ionicons name="share-outline" size={22} color={t.primaryText} /></MotionPressable>
    </View> : null}
    <View accessibilityRole="tablist" style={[s.row, { gap: 6 }]}>{(Object.keys(tabs) as Tab[]).map(key => <MotionPressable key={key} accessibilityRole="tab" accessibilityLabel={tabs[key]} accessibilityState={{ selected: tab === key }} onPress={() => {
      activeTab.current = key; setTab(key); setError(''); void live.refresh();
    }} style={[s.reaction, { flex: 1, paddingHorizontal: 6, justifyContent: 'center', backgroundColor: tab === key ? t.primarySoft : t.surface, borderColor: tab === key ? t.primary : t.border }]}><Ionicons name={key === 'feed' ? 'albums-outline' : key === 'inbox' ? 'chatbubbles-outline' : 'people-outline'} size={18} color={tab === key ? t.primaryText : t.textMuted} /><Text style={[s.name, { fontSize: 13, color: tab === key ? t.primaryText : t.textSecondary }]}>{tabs[key]}</Text></MotionPressable>)}</View>
    <SocialError message={error || live.error} />
    {!profile ? <PrimaryButton label="Kết nối lại" variant="ghost" loading={live.loading} onPress={() => { void live.refresh(); }} /> : null}
    {tab === 'feed' ? <>
      <MotionPressable accessibilityLabel="＋ Viết bài · hỏi cộng đồng" disabled={!profile} onPress={() => setWriting(true)} style={[s.card, s.row, { borderColor: t.primary, padding: 14 }]}><View style={[s.avatar, { borderRadius: 14 }]}><Ionicons name="create-outline" size={24} color={t.primaryText} /></View><View style={{ flex: 1, gap: 4 }}><Text style={s.name}>Hôm nay bạn muốn chia sẻ gì?</Text><Text style={s.small}>Hỏi đáp · chia sẻ mẹo · tạo bài đố tương tác</Text></View><Ionicons name="add-circle" size={28} color={t.primary} /></MotionPressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{[{ label: 'Khám phá', value: undefined }, ...Object.entries(categories).map(([value,label]) => ({value,label})), {label:'Đã lưu',value:'saved'}].map(item => {
        const selected = item.value === 'saved' ? !!filter.saved : !filter.saved && filter.category === item.value;
        return <MotionPressable key={item.value ?? 'all'} accessibilityLabel={`Lọc ${item.label}`} accessibilityState={{ selected }} style={[s.reaction, { backgroundColor: selected ? t.primarySoft : t.surface, borderColor: selected ? t.primary : t.border }]} onPress={() => filterFeed({ ...filter, category: item.value === 'saved' ? undefined : item.value as FeedFilter['category'], saved: item.value === 'saved' })}><Text style={[s.name, { fontSize: 13 }]}>{item.label}</Text></MotionPressable>;
      })}</ScrollView>
      <View style={s.row}><SocialInput placeholder="Tìm bài viết, câu tiếng Trung…" value={query} onChangeText={setQuery} maxLength={80} returnKeyType="search" onSubmitEditing={() => filterFeed({ ...filter, query: query.trim() || undefined })} style={{ flex: 1 }} /><MotionPressable accessibilityLabel="Tìm bài viết" style={[s.iconButton, { backgroundColor: t.primarySoft }]} onPress={() => filterFeed({ ...filter, query: query.trim() || undefined })}><Ionicons name="search" size={23} color={t.primaryText} /></MotionPressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{Object.entries(topics).map(([key,label]) => <MotionPressable key={key} accessibilityLabel={`Chủ đề ${label}`} accessibilityState={{ selected: filter.topic === key }} style={[s.reaction, { borderWidth: 0, backgroundColor: filter.topic === key ? t.primarySoft : t.surface, minHeight: 40 }]} onPress={() => filterFeed({ ...filter, topic: filter.topic === key ? undefined : key as FeedFilter['topic'] })}><Text style={[s.small, { color: filter.topic === key ? t.primaryText : t.textSecondary }]}># {label}</Text></MotionPressable>)}</ScrollView>
      {(filter.query || filter.topic) ? <PrimaryButton label="Xóa bộ lọc tìm kiếm" variant="ghost" onPress={() => { setQuery(''); filterFeed({}); }} /> : null}
    </> : tab === 'inbox' ? <SocialInput placeholder="Tìm trong danh sách trò chuyện" value={inboxQuery} onChangeText={setInboxQuery} maxLength={80} /> : null}
    <Text style={s.small}>{live.connected ? '● Đang cập nhật trực tiếp' : 'Đang nối lại · kéo xuống để làm mới'}</Text>
  </View>;
  return <Screen maxWidth={940} title="Học cùng nhau" subtitle="Một câu hỏi hay, thêm một điều hiểu rõ." scroll={false} compact safeAreaEdges={['top', 'bottom']} right={<MotionPressable accessibilityLabel="Hồ sơ cộng đồng" onPress={() => router.push('/community/account')} style={s.iconButton}><Ionicons name="person-circle-outline" size={28} color={t.primaryText} /></MotionPressable>}><View style={{ flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' }}>
    {tab === 'feed' ? <FlatList data={posts} keyExtractor={p => p.id} ListHeaderComponent={header} renderItem={({ item }) => <PostCard post={item} myId={profile?.id ?? ''} onPerson={setPerson} onChanged={() => { void live.refresh(); }} />} ItemSeparatorComponent={() => <View style={{ height: 16 }} />} refreshing={live.loading} onRefresh={() => { void live.refresh(); }} contentContainerStyle={{ paddingBottom: 24 }}
      ListEmptyComponent={!live.loading && profile ? <SocialEmpty title={filter.saved ? 'Góc đọc lại của bạn' : 'Chưa có bài viết phù hợp'} detail={filter.saved ? 'Chạm biểu tượng đánh dấu trên bài viết để lưu lại ở đây.' : 'Thử chủ đề khác hoặc đặt câu hỏi đầu tiên. Bài viết thật của mọi người sẽ xuất hiện tại đây.'} /> : live.loading ? <ActivityIndicator color={t.primaryText} /> : null}
      ListFooterComponent={more ? <PrimaryButton style={{ marginTop: 16 }} label="Xem bài cũ hơn" variant="ghost" loading={busy} onPress={() => { void loadMore(); }} /> : null} /> :
      tab === 'inbox' ? <FlatList data={letters.filter(item => `${item.profile.display_name} ${item.message.body}`.toLocaleLowerCase('vi').includes(inboxQuery.toLocaleLowerCase('vi')))} keyExtractor={i => i.profile.id} ListHeaderComponent={header} refreshing={live.loading} onRefresh={() => { void live.refresh(); }} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} contentContainerStyle={{ paddingBottom: 24 }} renderItem={({ item }) => <View style={[s.card, s.row, { borderWidth: 0, backgroundColor: item.unread ? t.primarySoft : t.surface }]}><Avatar profile={item.profile} onPress={() => setPerson(item.profile)} /><MotionPressable accessibilityLabel={`Mở tin nhắn với ${item.profile.display_name}, ${item.unread} tin chưa đọc`} onPress={() => router.push({ pathname: '/community/chat/[id]', params: { id: item.profile.id } })} style={{ flex: 1, gap: 6, minHeight: 60, justifyContent: 'center' }}><View style={s.row}><Text style={[s.name, { flex: 1 }]}>{item.profile.display_name}</Text>{item.unread ? <Text style={s.badge}>{item.unread}</Text> : null}</View><Text style={s.muted} numberOfLines={1}>{item.message.sender_id === profile?.id ? 'Bạn: ' : ''}{item.message.body}</Text><PresenceLabel status={presence(item.profile.id)} /><Text style={s.small}>{socialTime(item.message.created_at)}</Text></MotionPressable></View>}
        ListEmptyComponent={!live.loading && profile ? <SocialEmpty title="Bắt đầu học cùng một người bạn" detail="Mở tab Bạn bè, tìm theo ID và gửi lời mời. Hai bạn có thể nhắn tin khi đã kết bạn." /> : null} /> :
        <FlatList data={friends} keyExtractor={p => p.profile.id} ListHeaderComponent={<>{header}<View style={[s.card, { marginBottom: 16 }]}><Text style={s.heading}>Tìm bạn bằng ID</Text><SocialInput placeholder="FC-XXXXXXXXXX" autoCapitalize="characters" value={handle} onChangeText={setHandle} maxLength={13} /><PrimaryButton label="Tìm người học" variant="secondary" loading={busy} disabled={!profile || !/^(FC-)?[A-F0-9]{10}$/i.test(handle.trim())} onPress={() => { void run(async () => { const found = await findPerson(handle); if (found) setPerson(found.profile); else setError('Không tìm thấy ID này. Kiểm tra lại với người bạn muốn kết nối.'); }); }} /></View><Text style={[s.heading, { marginBottom: 16 }]}>Bạn bè & lời mời</Text></>} refreshing={live.loading} onRefresh={() => { void live.refresh(); }} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => <View style={[s.card, s.row]}><Avatar profile={item.profile} onPress={() => setPerson(item.profile)} /><View style={{ flex: 1, gap: 5 }}><Text style={s.name}>{item.profile.display_name}</Text><Text style={s.muted}>{item.state === 'accepted' ? 'Đã kết bạn' : item.requested_by === profile?.id ? 'Đã gửi lời mời' : 'Muốn kết bạn với bạn'}</Text>{item.state === 'accepted' ? <PresenceLabel status={presence(item.profile.id)} /> : null}</View><PrimaryButton label={item.state === 'accepted' ? 'Chat' : 'Xem'} variant="secondary" onPress={() => { if (item.state === 'accepted') router.push({ pathname: '/community/chat/[id]', params: { id: item.profile.id } }); else setPerson(item.profile); }} /></View>}
          ListEmptyComponent={!live.loading && profile ? <Text style={s.muted}>Chưa có bạn bè hoặc lời mời. Chia sẻ ID để tìm nhau.</Text> : null}
          ListFooterComponent={<View style={{ gap: 16, marginTop: 20 }}>{moreFriends ? <PrimaryButton label="Thêm bạn bè & lời mời" variant="ghost" loading={busy} onPress={() => { void peopleMore('friends'); }} /> : null}
            {blocked.length ? <><Text style={s.heading}>Đã chặn</Text>{blocked.map(p => <View key={p.id} style={[s.card, s.row]}><Text style={[s.name, { flex: 1 }]}>{p.display_name}</Text><PrimaryButton label="Bỏ chặn" variant="ghost" disabled={busy} onPress={() => confirmSocial('Bỏ chặn?', 'Hai bạn cần kết bạn lại để gửi tin nhắn mới.', 'Bỏ chặn', () => { void run(async () => { await blockPerson(p.id, false); await live.refresh(); }); })} /></View>)}</> : null}
            {moreBlocked ? <PrimaryButton label="Xem thêm tài khoản đã chặn" variant="ghost" loading={busy} onPress={() => { void peopleMore('blocked'); }} /> : null}
          </View>} />}
    {person && profile ? <PersonSheet key={person.id} profile={person} myId={profile.id} onClose={() => setPerson(null)} onChanged={() => { void live.refresh(); }} /> : null}
    {writing ? <ComposePost onClose={() => setWriting(false)} onCreated={() => { setWriting(false); void live.refresh(); }} /> : null}
  </View></Screen>;
}

function ComposePost({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const s = useSocialStyles(), t = useTheme();
  const [body, setBody] = useState(''), [category, setCategory] = useState<SocialPost['category']>('question'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [title, setTitle] = useState(''), [topic, setTopic] = useState<SocialPost['topic']>('general'), [choosingTopic, setChoosingTopic] = useState(false);
  const [stickerIds, setStickerIds] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<LearningQuiz | null>(null);
  let quizError = '';
  if (quiz) { try { encodeLearningQuiz(quiz, body); } catch { quizError = 'Kiểm tra câu hỏi, các lựa chọn, đáp án đúng và lời giải bên dưới.'; } }
  const media = useMediaDrafts();
  const operation = useRef(newOperationId()), attempted = useRef(''), lock = useRef(false);
  return <SocialSheet title="Chia sẻ với cộng đồng" onClose={() => {
    if (busy || media.busy) return;
    const discard = () => { media.clear(true); onClose(); };
    if (body.trim() || title.trim() || media.drafts.length || stickerIds.length || quiz) confirmSocial('Bỏ bài viết đang soạn?', 'Nội dung chưa đăng sẽ bị bỏ.', 'Bỏ', discard, true); else onClose();
  }}><View style={[s.row, { flexWrap: 'wrap' }]}>{(Object.keys(categories) as SocialPost['category'][]).map(key => <MotionPressable key={key} accessibilityLabel={categories[key]} accessibilityState={{ selected: category === key }} disabled={busy} style={[s.reaction, category === key && { backgroundColor: t.primarySoft, borderColor: t.primary }]} onPress={() => {
    const change = () => { setCategory(key); if (key !== 'practice') setQuiz(null); };
    if (quiz && key !== 'practice') confirmSocial('Chuyển kiểu bài viết?', 'Nội dung bài đố đang soạn sẽ được bỏ. Phần giới thiệu và tệp đính kèm vẫn được giữ.', 'Chuyển', change); else change();
  }}><Text style={s.name}>{categories[key]}</Text></MotionPressable>)}</View>
    <PrimaryButton label={quiz ? 'Bỏ bài đố · viết bài thường' : 'Tạo bài đố tương tác'} variant="secondary" disabled={busy} onPress={() => { if (quiz) confirmSocial('Bỏ bài đố đang soạn?', 'Phần giới thiệu và tệp đính kèm vẫn được giữ.', 'Bỏ bài đố', () => setQuiz(null)); else { setCategory('practice'); setQuiz({ ...quizTemplates[0]!.quiz, choices: [...quizTemplates[0]!.quiz.choices] }); } }} />
    <SocialInput placeholder="Tiêu đề ngắn gọn (không bắt buộc)" value={title} onChangeText={setTitle} maxLength={120} editable={!busy} />
    <SocialInput placeholder={quiz ? 'Giới thiệu bài đố (không bắt buộc, tối đa 600 ký tự)' : 'Hôm nay bạn muốn hỏi hoặc chia sẻ điều gì?'} multiline maxLength={quiz ? Math.max(600, body.length) : 3000} value={body} onChangeText={setBody} editable={!busy} style={[s.composer, { minHeight: quiz ? 80 : 160 }]} />
    {quiz ? <QuizComposer value={quiz} onChange={setQuiz} introduction={body} disabled={busy} /> : null}
    {!body ? <Text style={s.small}>{category === 'question' ? 'Gợi ý: câu bạn chưa hiểu + cách bạn đang nghĩ + điều muốn hỏi.' : category === 'practice' ? 'Gợi ý: một câu tiếng Trung + nghĩa + lời mời cùng sửa hoặc đặt câu.' : 'Gợi ý: điều vừa học được + ví dụ + mẹo ghi nhớ của bạn.'}</Text> : null}
    <Text style={s.small}>{body.length}/{quiz ? 600 : 3000}</Text><AttachmentComposer media={media} disabled={busy} />
    <StickerPicker value={stickerIds} disabled={busy} onChange={setStickerIds} />
    <View style={[s.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1, gap: 4 }}><Text style={s.heading}>Chủ đề</Text><Text style={[s.muted, { color: t.primaryText }]}># {topics[topic]}</Text></View><PrimaryButton label={choosingTopic ? 'Đóng chủ đề' : 'Đổi chủ đề'} variant="ghost" disabled={busy} onPress={() => setChoosingTopic(v => !v)} /></View>
    {choosingTopic ? <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>{Object.entries(topics).map(([key,label]) => <MotionPressable key={key} disabled={busy} accessibilityLabel={`Chọn chủ đề ${label}`} accessibilityState={{ selected: topic === key }} style={[s.reaction, { width: '47%', flexGrow: 1, maxWidth: '49%', backgroundColor: topic === key ? t.primarySoft : t.background }]} onPress={() => { setTopic(key as SocialPost['topic']); setChoosingTopic(false); }}><Text style={[s.small, { color: topic === key ? t.primaryText : t.textSecondary }]}>{label}</Text></MotionPressable>)}</View> : null}
    <SocialError message={error || quizError} /><PrimaryButton label="Đăng bài" loading={busy || media.busy} disabled={!!quizError || (!quiz && !body.trim() && !media.files.length && !stickerIds.length) || !media.ready} onPress={() => {
      if (lock.current || media.busy || !media.ready) return; lock.current = true; setBusy(true); setError('');
      let content: string;
      try { content = quiz ? encodeLearningQuiz(quiz, body) : body.trim() || (stickerIds.length ? 'Ảnh biểu cảm' : '📎 Tệp đính kèm'); } catch { lock.current = false; setBusy(false); setError('Bài đố chưa hợp lệ. Hãy kiểm tra nội dung.'); return; }
      const attachments = media.files.map(f => f.id);
      const draft = JSON.stringify({ body: content, category, title: title.trim(), topic, attachments, stickers: stickerIds });
      if (attempted.current && attempted.current !== draft) operation.current = newOperationId();
      attempted.current = draft;
      void createPost(operation.current, content, category, { title: title.trim(), topic, attachments, stickers: stickerIds }).then(() => { media.clear(); onCreated(); }).catch(e => setError(socialError(e))).finally(() => { lock.current = false; setBusy(false); });
    }} />
  </SocialSheet>;
}
