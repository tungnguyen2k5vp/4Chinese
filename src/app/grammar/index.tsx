import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SyntaxPattern } from '@/components/visual/SyntaxPattern';
import { card as baseCard, spacing } from '@/constants/design';
import { listGrammarPoints, type GrammarPoint } from '@/db/grammar';
import { useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function GrammarIndex() {
  const styles = useThemeStyles(createStyles);
  const db = useSQLiteContext();
  const { lessonActivityId, returnTo, band, grammarId } = useLocalSearchParams<{ lessonActivityId?: string; returnTo?: string; band?: string; grammarId?: string }>();
  const grammarBand = band === '7-9' || /^[1-6]$/u.test(band ?? '') ? band : undefined;
  const [points, setPoints] = useState<GrammarPoint[]>([]);
  useFocusEffect(useCallback(() => {
    let live = true;
    void listGrammarPoints(db, grammarBand).then((rows) => {
      if (live) setPoints(grammarId ? rows.filter((point) => point.id === grammarId) : rows);
    });
    return () => { live = false; };
  }, [db, grammarBand, grammarId]));
  const selectedGrammarTitle = points[0]?.title;
  return <Screen title={selectedGrammarTitle ?? (grammarBand ? `Ngữ pháp HSK ${grammarBand}` : "Ngữ pháp")} subtitle="Cấu trúc cơ bản và ví dụ có thể nghe lại.">
    {!grammarId ? <PrimaryButton label="Người Việt hay nhầm · ôn theo lỗi lặp lại" variant="secondary" onPress={() => router.push('/grammar/focus' as Href)} /> : null}
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
  item: { gap: spacing.sm }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { color: theme.textPrimary, fontSize: 18, fontWeight: '800' }, band: { color: theme.primaryText, fontWeight: '700' },
  pattern: { color: theme.textPrimary, fontSize: 16 }, progress: { color: theme.textMuted },
}); }
