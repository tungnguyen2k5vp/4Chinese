import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Avatar, confirmSocial, PersonSheet, PostCard, SocialError, SocialInput, socialTime, useSocialStyles } from '@/components/community/SocialUI';
import { comment, me, newOperationId, postDetail, removeContent, socialError, viewPost, type SocialComment, type SocialPost, type SocialProfile } from '@/services/community/api';
import { useSocialRefresh } from '@/services/community/use-social-refresh';

export default function CommunityPost() {
  const { id } = useLocalSearchParams<{ id: string }>(), s = useSocialStyles();
  const [profile, setProfile] = useState<SocialProfile | null>(null), [post, setPost] = useState<SocialPost | null>(null), [comments, setComments] = useState<SocialComment[]>([]);
  const [person, setPerson] = useState<SocialProfile | null>(null), [body, setBody] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [more, setMore] = useState(false);
  const operation = useRef(newOperationId()), attempted = useRef(''), lock = useRef(false);
  const viewed = useRef(''), focused = useIsFocused(), focusedRef = useRef(focused);
  useLayoutEffect(() => { focusedRef.current = focused; }, [focused]);
  const live = useSocialRefresh(['social_posts', 'social_comments', 'social_reactions', 'social_blocks'], async () => {
    setProfile(await me());
    try {
      const page = await postDetail(id);
      if (viewed.current !== id && focusedRef.current && (AppState.currentState == null || AppState.currentState === 'active')) {
        try { page.post.views = await viewPost(id); viewed.current = id; } catch { /* Reading remains available if counting is temporarily offline. */ }
      }
      setPost(page.post); setComments(page.comments); setMore(page.comments.length === 30);
    }
    catch (e) { if ((e as Error)?.message.includes('SOCIAL_NOT_FOUND')) { setPost(null); setComments([]); } throw e; }
  });
  const run = async (action: () => Promise<unknown>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { setError(socialError(e)); } finally { lock.current = false; setBusy(false); }
  };
  return <Screen maxWidth={940} title="Bài viết" scroll={false} avoidKeyboard safeAreaEdges={['top', 'bottom']}>
    <FlatList data={comments} keyExtractor={c => c.id} refreshing={live.loading} onRefresh={() => { void live.refresh(); }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 20 }}
      ListHeaderComponent={<View style={{ gap: 16 }}><SocialError message={error || live.error} />{post ? <PostCard post={post} myId={profile?.id ?? ''} onPerson={setPerson} onChanged={() => { void live.refresh(); }} detail /> : live.loading ? <ActivityIndicator /> : <PrimaryButton label="Thử tải lại bài viết" variant="ghost" onPress={() => { void live.refresh(); }} />}
        <Text style={s.heading}>Bình luận{post ? ` · ${post.comments}` : ''}</Text>
      </View>}
      ListEmptyComponent={post && !live.loading ? <Text style={s.muted}>Hãy là người đầu tiên chia sẻ ý kiến.</Text> : null}
      renderItem={({ item }) => <View style={s.card}><View style={s.row}><Avatar profile={item.author} onPress={() => setPerson(item.author)} /><View style={{ flex: 1, gap: 4 }}><Text style={s.name}>{item.author.display_name}</Text><Text style={s.small}>{socialTime(item.created_at)}</Text></View>{item.author_id === profile?.id ? <PrimaryButton label="Xóa" variant="ghost" disabled={busy} onPress={() => confirmSocial('Xóa bình luận?', 'Bình luận sẽ không còn hiển thị.', 'Xóa', () => { void run(async () => { await removeContent(item.id, 'comment'); await live.refresh(); }); }, true)} /> : null}</View><Text selectable style={s.body}>{item.body}</Text></View>}
      ListFooterComponent={more ? <PrimaryButton label="Bình luận cũ hơn" variant="ghost" loading={busy} onPress={() => { void run(async () => {
        const last = comments.at(-1); if (!last) return;
        const page = await postDetail(id, last); setComments(old => [...old, ...page.comments.filter(c => !old.some(x => x.id === c.id))]); setMore(page.comments.length === 30);
      }); }} /> : null} />
    {post ? <View style={{ gap: 8 }}><SocialInput placeholder="Viết bình luận…" multiline maxLength={1000} value={body} onChangeText={setBody} editable={!busy} style={{ maxHeight: 130 }} /><PrimaryButton label="Gửi bình luận" disabled={!body.trim() || !profile} loading={busy} onPress={() => { void run(async () => {
      if (attempted.current && attempted.current !== body.trim()) operation.current = newOperationId();
      attempted.current = body.trim(); await comment(operation.current, id, body); setBody(''); attempted.current = ''; operation.current = newOperationId(); await live.refresh();
    }); }} /></View> : null}
    {person && profile ? <PersonSheet key={person.id} profile={person} myId={profile.id} onClose={() => setPerson(null)} onChanged={() => { void live.refresh(); }} /> : null}
  </Screen>;
}
