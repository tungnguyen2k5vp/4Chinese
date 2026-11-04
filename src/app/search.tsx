import { router, useIsFocused, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { themedCard } from '@/constants/design';
import { searchAllContent, type SearchKind, type UnifiedSearchResult } from '@/db/unified-search';
import { useTheme } from '@/theme/ThemeProvider';

const headings: Record<SearchKind, string> = { VOCABULARY: 'Từ vựng', GRAMMAR: 'Ngữ pháp', STORY: 'Truyện', LESSON: 'Bài học', CONFUSABLE: 'Từ dễ nhầm' };
export default function SearchScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const focused = useIsFocused();
  const [filter, setFilter] = useState<SearchKind | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<UnifiedSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const kinds = Object.keys(headings) as SearchKind[];
  const visibleRows = filter === 'ALL' ? rows : rows.filter(row => row.kind === filter);
  useEffect(() => {
    const request = ++generation.current;
    // Reset display for a new asynchronous query; the request generation guards stale responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailed(false);
    if (!query.trim()) { setRows([]); setBusy(false); return; }
    setBusy(true);
    const timer = setTimeout(() => {
      void searchAllContent(db, query).then(value => {
        if (request === generation.current) setRows(value);
      }).catch(() => { if (request === generation.current) { setRows([]); setFailed(true); } })
        .finally(() => { if (request === generation.current) setBusy(false); });
    }, 220);
    // Invalidating this request also prevents a response after unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { clearTimeout(timer); if (request === generation.current) generation.current++; };
  }, [db, query, retry]);
  return <Screen title="Tìm trong ứng dụng" subtitle="Tra từ, cấu trúc, truyện, bài học và nhóm từ dễ nhầm.">
    <TextInput value={query} onChangeText={setQuery} maxLength={100} accessibilityLabel="Tìm kiếm trong ứng dụng"
      placeholder="Hán tự, pinyin, tên bài hoặc nghĩa Việt…" placeholderTextColor={theme.textMuted}
      style={{ minHeight: 52, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 16, backgroundColor: theme.surface, color: theme.textPrimary, fontSize: 17 }} />
    <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
      {(['ALL', ...kinds] as const).map(kind => <MotionPressable key={kind} accessibilityRole="tab"
        accessibilityLabel={kind === 'ALL' ? 'Tất cả kết quả' : headings[kind]} accessibilityState={{ selected: filter === kind }}
        onPress={() => setFilter(kind)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 24, borderWidth: 1,
          borderColor: filter === kind ? theme.primary : theme.border, backgroundColor: filter === kind ? theme.primarySoft : theme.surface }}>
        <Text style={{ color: filter === kind ? theme.primaryText : theme.textSecondary, fontWeight: '700' }}>{kind === 'ALL' ? 'Tất cả' : headings[kind]}</Text>
      </MotionPressable>)}
    </ScrollView>
    {busy ? <ActivityIndicator accessibilityLabel="Đang tìm" color={theme.primaryText} /> : failed ? <View style={{ gap: 10 }}>
      <Text style={{ color: theme.textPrimary }}>Chưa tải được kết quả. Hãy thử lại.</Text>
      <PrimaryButton label="Thử tìm lại" onPress={() => setRetry(value => value + 1)} />
    </View> : !query.trim() ? <Text style={{ color: theme.textMuted }}>Nhập nội dung bạn muốn tìm. Khi quay lại, từ khóa và vị trí danh sách được giữ.</Text>
      : !visibleRows.length ? <EmptyState scene="search" title="Chưa tìm thấy kết quả" message={rows.length ? 'Nhóm này chưa có kết quả. Chọn Tất cả hoặc thử từ khóa khác.' : 'Thử tên ngắn hơn hoặc nhập Hán tự, pinyin hay nghĩa tiếng Việt.'} /> : <StudyTransition active={focused} turnKey={filter} effect="reveal" style={{ gap: 18 }}>{kinds.map(kind => {
        const group = visibleRows.filter(row => row.kind === kind);
        if (!group.length) return null;
        return <View key={kind} style={{ gap: 10 }}><Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: '800', color: theme.textPrimary }}>{headings[kind]}</Text>
          {group.map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`${headings[kind]}: ${row.title}`}
            onPress={() => router.push({ pathname: row.pathname, params: row.params } as Href)}
            style={({ pressed }) => [themedCard(theme), { minHeight: 64, padding: 16, gap: 6, backgroundColor: pressed ? theme.primarySoft : theme.surface }]}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.textPrimary }}>{row.title}</Text>
            <Text numberOfLines={3} style={{ color: theme.textMuted, lineHeight: 21 }}>{row.subtitle}</Text>
          </Pressable>)}
        </View>;
      })}</StudyTransition>}
  </Screen>;
}
