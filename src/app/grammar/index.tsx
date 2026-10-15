import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SyntaxPattern } from '@/components/visual/SyntaxPattern';
import { card as baseCard, spacing } from '@/constants/design';
import { listGrammarPoints, type GrammarPoint } from '@/db/grammar';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function GrammarIndex() {
  const styles = useThemeStyles(createStyles);
  const theme = useTheme();
  const db = useSQLiteContext();
  const { lessonActivityId, returnTo, band, grammarId } = useLocalSearchParams<{ lessonActivityId?: string; returnTo?: string; band?: string; grammarId?: string }>();
  const grammarBand = band === '7-9' || /^[1-6]$/u.test(band ?? '') ? band : undefined;
  const [points, setPoints] = useState<GrammarPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(false);
    void listGrammarPoints(db, grammarBand).then((rows) => {
      if (live) setPoints(grammarId ? rows.filter((point) => point.id === grammarId) : rows);
    }).catch(() => { if (live) setError(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  // reload intentionally repeats the focused read after a failed query.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, grammarBand, grammarId, reload]));
  const selectedGrammarTitle = points[0]?.title;
  return <Screen title={grammarId ? selectedGrammarTitle ?? "Chủ điểm ngữ pháp" : "Ngữ pháp"} hideTitle={!grammarId} subtitle={grammarBand ? `HSK ${grammarBand}` : undefined}>
    {!grammarId ? <View style={{ flexDirection: 'row', gap: 8 }}><PrimaryButton style={{ flex: 1 }} label="Đề cương HSK" variant="secondary" onPress={() => router.push({ pathname: '/hsk/syllabus', params: { section: 'grammar', band: grammarBand ?? '1' } } as Href)} /><PrimaryButton style={{ flex: 1 }} label="Ôn lỗi hay nhầm" variant="secondary" onPress={() => router.push('/grammar/focus' as Href)} /></View> : null}
    {loading ? <ActivityIndicator accessibilityLabel="Đang tải ngữ pháp" color={theme.primary} /> : null}
    {error ? <><Text accessibilityRole="alert" style={{ color: theme.error }}>Chưa tải được ngữ pháp. Tiến độ đã lưu không bị xóa.</Text><PrimaryButton variant="secondary" label="Thử lại" onPress={() => setReload(value => value + 1)} /></> : null}
    {!loading && !error && !points.length ? <Text style={{ color: theme.textMuted }}>Chưa có cấu trúc trong phạm vi này.</Text> : null}
    {points.map((point) => <Pressable key={point.id} style={[styles.card, styles.item]} accessibilityRole="button"
      onPress={() => router.push({ pathname: "/grammar/[id]", params: { id: point.id, lessonActivityId: lessonActivityId ?? "", returnTo: returnTo ?? "" } } as unknown as Href)}>
      <View style={styles.row}><Text style={styles.title}>{point.title}</Text><Text style={styles.band}>HSK {point.hsk_level}</Text></View>
      <SyntaxPattern value={point.pattern} />
      <Text style={styles.progress}>{point.mastery_status === "MASTERED" ? "Đã nắm vững · 3+ lượt, ≥80% đúng" : point.attempts ? `${point.correct}/${point.attempts} câu đúng · ${point.distinct_exercise_types}/2 dạng` : "Chưa luyện"}</Text>
    </Pressable>)}
  </Screen>;
}

function createStyles(theme: ThemeTokens) { return StyleSheet.create({
  card: { ...baseCard, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, shadowColor: theme.shadow },
  item: { gap: spacing.sm, padding: spacing.md }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.sm },
  title: { flex: 1, minWidth: 0, color: theme.textPrimary, fontSize: 16, fontWeight: '800' }, band: { flexShrink: 0, paddingHorizontal: 6, color: theme.primaryText, fontWeight: '700', fontSize: 13 },
  pattern: { color: theme.textPrimary, fontSize: 16 }, progress: { color: theme.textMuted },
}); }
