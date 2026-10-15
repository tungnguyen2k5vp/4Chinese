import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { LearningLandscape } from '@/components/visual/LearningLandscape';
import { StoryCover } from '@/components/visual/StoryCover';
import { card as baseCard, spacing } from '@/constants/design';
import { storiesV5Drafts } from '@/data/stories-v5';
import { listStories, type Story } from '@/db/stories';
import { useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function StoriesScreen() {
  const styles = useThemeStyles(createStyles);
  const db = useSQLiteContext();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [showDrafts, setShowDrafts] = useState(false);
  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(false);
    void listStories(db).then((rows) => { if (live) setStories(rows); })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  // Retry is an intentional reload trigger for this focus-scoped request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, retry]));
  return <Screen title="Truyện theo cấp độ" subtitle="Chọn một câu chuyện vừa sức — đọc trên nền giấy, tra từ trong ngữ cảnh.">
    {loading ? <Text style={styles.note} accessibilityLiveRegion="polite">Đang tải truyện…</Text> : null}
    {error ? <><Text accessibilityRole="alert" style={styles.note}>Chưa tải được truyện. Dữ liệu cũ được giữ nguyên.</Text>
      <PrimaryButton label="Thử tải lại truyện" onPress={() => setRetry((value) => value + 1)} /></> : null}
    {!loading && !error && !stories.length ? <EmptyState variant="reading" scene="stories" title="Thư viện truyện đang trống" message="Thêm nội dung đã được kiểm duyệt hoặc quay lại sau để chọn bài đọc vừa sức." /> : null}
    {stories.map((story) => <MotionPressable key={story.id} haptic style={[styles.card, styles.storyCard]}
      accessibilityLabel={`${story.title}. Mức ước tính ${story.hsk_level}, ${story.estimated_minutes} phút`}
      onPress={() => router.push(`/stories/${story.id}` as Href)}>
      <View style={styles.cover}><StoryCover storyId={story.id} level={story.hsk_level} /></View>
      <View style={styles.storyCopy}><View style={styles.tagRow}><Text style={styles.levelTag}>HSK ƯỚC TÍNH {story.hsk_level}</Text>{story.attempts > 0 ? <Text style={styles.readTag}>{story.best_score}% tốt nhất</Text> : null}</View><Text style={styles.title}>{story.title}</Text><Text numberOfLines={3} style={styles.note}>{story.description}</Text><View style={styles.metaRow}><Text style={styles.meta}>{story.estimated_minutes} phút</Text><Text style={styles.metaDot}>·</Text><Text style={styles.meta}>{story.attempts ? `${story.attempts} lượt đọc hiểu` : 'Có câu hỏi đọc hiểu'}</Text></View></View>
    </MotionPressable>)}
    {__DEV__ ? <>
      <View style={styles.draftControl}><Text style={styles.draftEyebrow}>NỘI DUNG BIÊN TẬP</Text><Text style={styles.note}>Bản nháp chỉ dành cho kiểm tra nội bộ; chưa xuất bản vào kho đọc.</Text><PrimaryButton variant="secondary" label={showDrafts ? 'Ẩn bản nháp V5' : 'Xem 14 bản nháp chưa thẩm định'} onPress={() => setShowDrafts((value) => !value)} /></View>
      {showDrafts ? <><Text style={styles.note}>AI hỗ trợ · DRAFT / UNREVIEWED. Mức học chỉ là ước tính biên tập, không phải phân loại HSK chính thức. Xem trước không lưu tiến độ hay nhận XP.</Text>
        {storiesV5Drafts.map((draft, index) => <MotionPressable key={draft.id} style={[styles.card, styles.storyCard]}
          accessibilityLabel={`Xem trước bản nháp ${draft.title}, chưa thẩm định`}
          onPress={() => router.push(`/stories/${draft.id}?preview=1` as Href)}>
          <View style={styles.cover}><LearningLandscape mood={index % 2 ? 'reading' : 'journey'} height={120} /></View><View style={styles.storyCopy}><Text style={styles.draftTag}>DRAFT · UNREVIEWED</Text><Text style={styles.title}>{draft.title}</Text><Text numberOfLines={3} style={styles.note}>{draft.description}</Text><Text style={styles.meta}>HSK ước tính {draft.level} · 3 câu hỏi</Text></View>
        </MotionPressable>)}</> : null}
    </> : null}
  </Screen>;
}

function createStyles(theme: ThemeTokens) { return StyleSheet.create({
  card: { ...baseCard, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, shadowColor: theme.shadow },
  storyCard: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md, padding: spacing.sm }, cover: { width: 82, minHeight: 120, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: theme.border }, storyCopy: { flex: 1, justifyContent: 'center', gap: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 }, levelTag: { color: theme.success, fontSize: 9, fontWeight: '900', letterSpacing: 0.3 }, readTag: { color: theme.primaryText, fontSize: 9, fontWeight: '800' }, title: { color: theme.textPrimary, fontSize: 17, lineHeight: 22, fontWeight: '900' }, note: { color: theme.textSecondary, fontSize: 12, lineHeight: 18 }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, meta: { color: theme.textMuted, fontSize: 10, fontWeight: '700' }, metaDot: { color: theme.textMuted },
  draftControl: { borderRadius: 16, padding: spacing.md, backgroundColor: theme.warningSoft, borderWidth: 1, borderColor: theme.warning, gap: spacing.sm }, draftEyebrow: { color: theme.warning, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }, draftTag: { color: theme.warning, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
}); }
