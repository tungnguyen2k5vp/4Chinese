import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SyntaxPattern } from '@/components/visual/SyntaxPattern';
import { spacing } from '@/constants/design';
import { grammarSeed, listGrammarPoints, type GrammarPoint } from '@/db/grammar';
import { grammarGuides, normalizeGrammarSearch } from '@/services/learning/grammar-guides';
import { syllabusGrammar } from '@/services/learning/grammar-syllabus';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

const bands = ['all', '1', '2', '3', '4', '5', '6', '7-9'];
export default function GrammarIndex() {
  const styles = useThemeStyles(createStyles);
  const theme = useTheme();
  const db = useSQLiteContext();
  const { lessonActivityId, returnTo, band, grammarId, targetGrammarId } = useLocalSearchParams<{ lessonActivityId?: string; returnTo?: string; band?: string; grammarId?: string; targetGrammarId?: string }>();
  const [selectedBand, setSelectedBand] = useState(bands.includes(band ?? '') ? band! : grammarSeed.find(point => point.id === (grammarId || targetGrammarId))?.hsk ?? 'all');
  const [source, setSource] = useState<'practice' | 'syllabus'>('practice');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [points, setPoints] = useState<GrammarPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(false);
    void listGrammarPoints(db).then(rows => { if (live) setPoints(rows); })
      .catch(() => { if (live) setError(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  // reload repeats the focused query after a failed read.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, reload]));
  const target = points.find(point => point.id === (grammarId || targetGrammarId));
  const open = (id: string) => router.push({ pathname: '/grammar/[id]', params: {
    id, lessonActivityId: lessonActivityId ?? '', returnTo: returnTo ?? '', targetGrammarId: targetGrammarId || grammarId || '',
  } } as Href);
  const search = normalizeGrammarSearch(query.trim());
  const rows = source === 'practice' ? points.map(point => ({ id: point.id, title: point.title, pattern: point.pattern,
    detail: [point.explanation_vi, grammarGuides[point.id]?.use, grammarGuides[point.id]?.tip, ...grammarSeed.find(item => item.id === point.id)?.examples.map(item => item.hanzi) ?? []].join(' '),
    level: point.hsk_level, note: point.attempts ? `${point.correct}/${point.attempts} câu đúng · ${point.distinct_exercise_types} dạng đã luyện` : 'Chưa luyện · lưu tiến độ' }))
    : syllabusGrammar.map(point => ({ ...point, note: `${point.examples.length} câu mẫu · luyện nhớ trong phiên` }));
  const visible = rows.filter(point => (selectedBand === 'all' || point.level === selectedBand)
    && (!search || normalizeGrammarSearch(`${point.title} ${point.pattern} ${point.detail}`).includes(search)));
  return <Screen title="Ngữ pháp" subtitle="Học cấu trúc · luyện theo câu · khám phá HSK 1–9" avoidKeyboard>
    {target ? <View style={styles.overview}>
      <Text style={styles.label}>CHỦ ĐIỂM TRONG BÀI HỌC · HSK {target.hsk_level}</Text>
      <Text accessibilityRole="header" style={styles.title}>{target.title}</Text>
      <SyntaxPattern value={target.pattern} />
      <Text style={styles.body}>{target.explanation_vi}</Text>
      <PrimaryButton label="Luyện chủ điểm này" onPress={() => open(target.id)} />
      <Text style={styles.muted}>Khám phá thêm bên dưới. Chỉ câu đúng thuộc chủ điểm này mới hoàn thành hoạt động bài học.</Text>
    </View> : null}
    {loading ? <ActivityIndicator accessibilityLabel="Đang tải tiến độ ngữ pháp" color={theme.primary} /> : null}
    {error ? <View style={styles.block}><Text accessibilityRole="alert" style={styles.error}>Chưa tải được tiến độ. Bạn vẫn có thể xem đề cương bên dưới.</Text><PrimaryButton label="Thử lại" variant="secondary" onPress={() => setReload(value => value + 1)} /></View> : null}
    {!loading && !error && grammarId && !target ? <Text style={styles.muted}>Chủ điểm bài học chưa có trong danh sách hiện tại. Chọn cấu trúc khác để tự luyện.</Text> : null}
    <Text accessibilityRole="header" style={styles.title}>{target ? 'Mở rộng từ chủ điểm này' : 'Chọn nội dung luyện'}</Text>
    <View style={styles.controls}>{(['practice', 'syllabus'] as const).map(value => <Pressable key={value} accessibilityRole="button"
      accessibilityState={{ selected: source === value }} onPress={() => { setSource(value); setLimit(20); }} style={[styles.control, source === value && styles.selected]}>
      <Text style={styles.controlText}>{value === 'practice' ? 'Bài có chấm điểm' : 'Đề cương HSK 1–9'}</Text>
    </Pressable>)}</View>
    <Text style={styles.muted}>{source === 'practice' ? 'Câu hỏi theo cấu trúc, số câu và dạng bài tùy nội dung đã biên soạn.' : '593 mục · 2.059 câu mẫu gốc tiếng Trung. HSK 7–9 dùng chung một nhóm. Luyện nhớ nguyên văn, chưa có bản dịch Việt; không lưu điểm.'}</Text>
    {!lessonActivityId && source === 'practice' ? <PrimaryButton label="Ôn lỗi hay nhầm" variant="ghost" onPress={() => router.push('/grammar/focus' as Href)} /> : null}
    <View style={styles.controls}>{bands.map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={value === 'all' ? 'Tất cả cấp độ' : `HSK ${value}`}
      accessibilityState={{ selected: selectedBand === value }} onPress={() => { setSelectedBand(value); setLimit(20); }} style={[styles.control, selectedBand === value && styles.selected]}>
      <Text style={styles.controlText}>{value === 'all' ? 'Tất cả' : `HSK ${value}`}</Text>
    </Pressable>)}</View>
    <TextInput value={query} onChangeText={value => { setQuery(value); setLimit(20); }} accessibilityLabel="Tìm ngữ pháp theo chữ, cấu trúc hoặc cách dùng" placeholder="Tìm 比, so sánh, trải nghiệm…" placeholderTextColor={theme.textMuted} style={styles.input} />
    <Text accessibilityLiveRegion="polite" style={styles.muted}>{visible.length} chủ điểm phù hợp</Text>
    {visible.slice(0, limit).map(point => <Pressable key={point.id} style={styles.item} accessibilityRole="button" accessibilityLabel={`${point.title}, HSK ${point.level}. ${point.note}`} onPress={() => open(point.id)}>
      <View style={styles.row}><Text style={styles.itemTitle}>{point.title}</Text><Text style={styles.band}>HSK {point.level}</Text></View>
      {point.pattern ? <SyntaxPattern value={point.pattern} /> : null}<Text style={styles.muted}>{point.note}</Text>
    </Pressable>)}
    {!visible.length && !loading ? <Text style={styles.body}>Không có kết quả. Hãy chọn cấp độ khác hoặc đổi từ tìm kiếm.</Text> : null}
    {visible.length > limit ? <PrimaryButton variant="secondary" label={`Xem thêm (${visible.length - limit} mục)`} onPress={() => setLimit(value => value + 20)} /> : null}
  </Screen>;
}
function createStyles(theme: ThemeTokens) { return StyleSheet.create({
  overview: { padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderRadius: 16, borderColor: theme.primary, backgroundColor: theme.primarySoft },
  block: { gap: spacing.sm }, title: { color: theme.textPrimary, fontSize: 20, fontWeight: '800' }, label: { color: theme.primaryText, fontWeight: '800', fontSize: 13 },
  body: { color: theme.textSecondary, fontSize: 16, lineHeight: 24 }, muted: { color: theme.textMuted, fontSize: 14, lineHeight: 21 }, error: { color: theme.error, lineHeight: 22 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, control: { minHeight: 48, justifyContent: 'center', padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  controlText: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' }, selected: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
  input: { color: theme.textPrimary, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 12, minHeight: 48, padding: spacing.md, fontSize: 16 },
  item: { paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: theme.border, gap: spacing.sm, minHeight: 48 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'flex-start' },
  itemTitle: { color: theme.textPrimary, flex: 1, minWidth: 0, fontWeight: '700', fontSize: 17 }, band: { color: theme.primaryText, fontSize: 14, fontWeight: '700' },
}); }
