import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { listMistakes, type Mistake, type PracticeSkill } from '@/db/mistakes';

const filters: [PracticeSkill | undefined, string][] = [[undefined, 'Tất cả'], ['MEANING', 'Nghĩa'],
  ['PINYIN', 'Pinyin'], ['LISTENING', 'Nghe'], ['HANZI', 'Hán tự'], ['WRITING', 'Viết'], ['GRAMMAR', 'Ngữ pháp'], ['SPEAKING', 'Nói']];

export default function MistakeBook() {
  const db = useSQLiteContext();
  const [skill, setSkill] = useState<PracticeSkill | undefined>();
  const [items, setItems] = useState<Mistake[]>([]);
  useFocusEffect(useCallback(() => {
    let live = true;
    void listMistakes(db, skill).then((rows) => { if (live) setItems(rows); })
      .catch(() => { if (live) Alert.alert('Chưa tải được sổ lỗi', 'Vui lòng thử lại.'); });
    return () => { live = false; };
  }, [db, skill]));
  return <Screen title="Sổ lỗi" subtitle="Lỗi từ các lần ôn và luyện ngữ pháp. 3 lần đúng không gợi ý để khắc phục.">
    <View style={styles.filters}>{filters.map(([value, label]) => <Pressable key={label}
      accessibilityRole="button" style={[styles.filter, skill === value && styles.active]}
      onPress={() => setSkill(value)}><Text style={styles.filterText}>{label}</Text></Pressable>)}</View>
    {!items.length ? <View style={card}><Text>Không có lỗi chưa khắc phục trong nhóm này.</Text></View> : null}
    {items.map((item) => <Pressable key={item.id} style={[card, styles.item]} accessibilityRole="button"
      onPress={() => router.push((item.grammar_id ? `/grammar/${item.grammar_id}` : item.skill_type === 'SPEAKING' ? `/word/${item.vocabulary_id}` : `/mistakes/practice?id=${encodeURIComponent(item.id)}`) as Href)}>
      <Text style={styles.title}>{item.title}</Text>
      {item.pinyin ? <Text style={styles.note}>{item.pinyin}</Text> : null}
      <Text style={styles.meta}>{filters.find(([value]) => value === item.skill_type)?.[1]} · Sai {item.wrong_count} lần · Đúng liên tiếp {item.correct_streak}/3</Text>
      <Text style={styles.link}>{item.grammar_id ? 'Luyện lại ngữ pháp' : item.skill_type === 'SPEAKING' ? 'Xem từ để luyện phát âm' : 'Luyện lại · không đổi lịch ôn'}</Text>
    </Pressable>)}
  </Screen>;
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 10 },
  active: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filterText: { color: colors.primary, fontWeight: '700' },
  item: { gap: spacing.sm }, title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  note: { color: colors.textMuted }, meta: { color: colors.textMuted, fontSize: 12 },
  link: { color: colors.primary, fontWeight: '800' },
});
