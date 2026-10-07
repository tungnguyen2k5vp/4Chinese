import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, Text, View } from 'react-native';

import { HskBandSelect } from '@/components/HskBandSelect';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { getSyllabusAlignment, syllabus, syllabusLevel, syllabusSectionLabels, type SyllabusRow, type SyllabusSection } from '@/services/hsk/syllabus';
import { useTheme } from '@/theme/ThemeProvider';
import type { HskBand } from '@/types/models';

export default function SyllabusDetail() {
  const params = useLocalSearchParams<{ band?: string; filter?: string }>(); const db = useSQLiteContext(); const theme = useTheme();
  const [band, setBand] = useState<HskBand>(params.band === '7-9' ? '7-9' : [1,2,3,4,5,6].includes(Number(params.band)) ? Number(params.band) as HskBand : 1);
  const [section, setSection] = useState<'vocabulary' | SyllabusSection>('vocabulary');
  const [reviewOnly, setReviewOnly] = useState(params.filter === 'review'); const [query, setQuery] = useState('');
  const [rows, setRows] = useState<SyllabusRow[] | null>(null); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => { let live = true; void getSyllabusAlignment(db).then(data => { if (live) { setRows(data); setError(false); } }).catch(() => { if (live) setError(true); }); return () => { live = false; }; }, [db, retry]);
  const level = syllabusLevel(band);
  const filtered = useMemo(() => (rows ?? []).filter(row => row.level === level && (!reviewOnly || row.status !== 'matched') && `${row.simplified} ${row.pinyin}`.toLowerCase().includes(query.trim().toLowerCase())), [rows, level, query, reviewOnly]);
  const statusLabels = { matched: 'Đã có · đúng cấp', missing: 'Chưa có trong kho', levelConflict: 'Khác cấp trong kho', readingReview: 'Cần đối chiếu cách đọc' };
  const openSource = (page?: number) => void Linking.openURL(`${syllabus.source}${page ? `#page=${page}` : ''}`).catch(() => Alert.alert('Chưa mở được tài liệu', 'Kiểm tra mạng rồi thử lại.'));
  const tab = (active: boolean) => ({ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: active ? theme.primarySoft : theme.surface });
  return <Screen scroll={false} title="Nội dung syllabus" subtitle={`HSK ${band} · bản ${syllabus.version}`}>
    <HskBandSelect value={band} allowAll={false} onChange={value => { if (value !== 'all') setBand(value); }} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{(['vocabulary', ...Object.keys(syllabusSectionLabels)] as ('vocabulary' | SyllabusSection)[]).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: section === value }} onPress={() => setSection(value)} style={tab(section === value)}><Text style={{ color: theme.textPrimary }}>{value === 'vocabulary' ? 'Từ vựng' : syllabusSectionLabels[value]}</Text></Pressable>)}</View>
    {section === 'vocabulary' ? <>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Hán tự hoặc pinyin trong syllabus" />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: reviewOnly }} onPress={() => setReviewOnly(value => !value)} style={tab(reviewOnly)}><Text style={{ color: theme.textPrimary }}>{reviewOnly ? '✓ ' : ''}Chỉ mục thiếu hoặc cần đối chiếu · {filtered.length} mục</Text></Pressable>
      {!rows && !error ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? <PrimaryButton label="Thử lại" onPress={() => setRetry(value => value + 1)} /> : null}
      <FlatList style={{ flex: 1 }} data={filtered} keyExtractor={row => row.identifier} initialNumToRender={12} ListEmptyComponent={rows ? <Text style={{ color: theme.textMuted }}>Không có mục phù hợp bộ lọc.</Text> : null} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => item.vocabularyId ? router.push({ pathname: '/word/[id]', params: { id: item.vocabularyId } } as Href) : openSource(item.page)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: theme.border, gap: 4 }}><Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: '700' }}>{item.simplified} · {item.pinyin}</Text><Text style={{ color: item.status === 'matched' ? theme.primaryText : theme.textMuted }}>{statusLabels[item.status]}{item.status === 'levelConflict' ? ` · HSK ${item.appLevel}` : ''}</Text><Text style={{ color: theme.textMuted, fontSize: 11 }}>Tài liệu trang {item.page} · mục {item.identifier}</Text></Pressable>} />
    </> : <FlatList style={{ flex: 1 }} data={syllabus.sections[section][level]} keyExtractor={item => String(item.page)} renderItem={({ item }) => <View style={{ paddingVertical: 16, gap: 10 }}><Text style={{ color: theme.primaryText, fontWeight: '700' }}>Trang {item.page} · nguyên văn tài liệu</Text><Text selectable style={{ color: theme.textPrimary, fontSize: 16, lineHeight: 26 }}>{item.text}</Text></View>} />}
    <PrimaryButton label="Mở tài liệu chính thức" variant="ghost" onPress={() => openSource()} />
  </Screen>;
}
