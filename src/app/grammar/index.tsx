import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { listGrammarPoints, type GrammarPoint } from '@/db/grammar';

export default function GrammarIndex() {
  const db = useSQLiteContext();
  const [points, setPoints] = useState<GrammarPoint[]>([]);
  useFocusEffect(useCallback(() => {
    let live = true;
    void listGrammarPoints(db).then((rows) => { if (live) setPoints(rows); });
    return () => { live = false; };
  }, [db]));
  return <Screen title="Ngữ pháp" subtitle="Cấu trúc cơ bản và ví dụ có thể nghe lại.">
    {points.map((point) => <Pressable key={point.id} style={[card, styles.item]} accessibilityRole="button"
      onPress={() => router.push(`/grammar/${point.id}` as Href)}>
      <View style={styles.row}><Text style={styles.title}>{point.title}</Text><Text style={styles.band}>HSK {point.hsk_level}</Text></View>
      <Text style={styles.pattern}>{point.pattern}</Text>
      <Text style={styles.progress}>{point.attempts ? `${point.correct}/${point.attempts} câu đúng` : 'Chưa luyện'}</Text>
    </Pressable>)}
  </Screen>;
}

const styles = StyleSheet.create({
  item: { gap: spacing.sm }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' }, band: { color: colors.primary, fontWeight: '700' },
  pattern: { color: colors.text, fontSize: 16 }, progress: { color: colors.textMuted },
});
