import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { spacing, themedCard } from '@/constants/design';
import { listMistakes, type Mistake, type PracticeSkill } from '@/db/mistakes';
import { clusterObservedMistakesV2 } from '@/services/learning/error-intelligence-v2';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';

const filters: [PracticeSkill | undefined, string][] = [[undefined, 'Tất cả'], ['MEANING', 'Nghĩa'],
  ['PINYIN', 'Pinyin'], ['LISTENING', 'Nghe'], ['HANZI', 'Hán tự'], ['WRITING', 'Viết'], ['GRAMMAR', 'Ngữ pháp'], ['SPEAKING', 'Nói']];

export default function MistakeBook() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const [skill, setSkill] = useState<PracticeSkill | undefined>();
  const [items, setItems] = useState<Mistake[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useFocusEffect(useCallback(() => {
    // Explicit user-requested refresh token; never changes persisted mistakes.
    void retry;
    let live = true;
    setLoading(true);setError('');
    void listMistakes(db).then((rows) => { if (live) setItems(rows); })
      .catch(() => { if (live) setError('Chưa tải được sổ lỗi. Dữ liệu của bạn vẫn giữ nguyên.'); })
      .finally(()=>{if(live)setLoading(false);});
    return () => { live = false; };
  }, [db,retry]));
  const visibleItems = useMemo(() => skill ? items.filter((item) => item.skill_type === skill) : items, [items, skill]);
  const clusters=clusterObservedMistakesV2(visibleItems);
  return <Screen title="Sổ lỗi" subtitle="Lỗi từ các lần ôn và luyện ngữ pháp. 3 lần đúng không gợi ý để khắc phục.">
    <View accessibilityRole="tablist" style={styles.filters}>{filters.map(([value, label]) => {
      const count = value ? items.filter((item) => item.skill_type === value).length : items.length;
      return <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: skill === value }} style={[styles.filter, skill === value && styles.active]}
        onPress={() => setSkill(value)}><Text style={[styles.filterText, skill === value && styles.activeFilterText]}>{label} · {count}</Text></Pressable>;
    })}</View>
    {loading?<ActivityIndicator color={theme.primary}/>:null}
    {error?<View style={themedCard(theme)}><Text style={styles.meta}>{error}</Text><PrimaryButton label="Thử lại" onPress={()=>setRetry(value=>value+1)}/></View>:null}
    {!loading&&!error&&clusters.length?<View style={[themedCard(theme),styles.item]}>
      <Text accessibilityRole="header" style={styles.title}>Nhóm cần luyện tiếp</Text>
      <Text style={styles.meta}>Dựa trên tối đa 200 mục lỗi đang mở, không phải đánh giá năng lực thi.</Text>
      {clusters.slice(0,3).map(group=><View key={group.key} style={{gap:8}}>
        <Text style={styles.link}>{group.title} · {group.openItems} mục · {group.wrongAttempts} lần sai</Text>
        <Text style={styles.note}>{group.suggestion}</Text>
        <Text style={styles.meta}>{group.recurring?'Có mục sai từ 3 lần: nên luyện lại trong ngữ cảnh.':'Chưa đủ dấu hiệu để kết luận nguyên nhân lỗi.'}</Text>
      </View>)}
    </View>:null}
    {!loading&&!error&&!visibleItems.length ? <View style={themedCard(theme)}><EmptyState
      icon="✓"
      variant="review"
      scene="mistakes"
      title={items.length ? `Chưa có lỗi thuộc nhóm ${filters.find(([value]) => value === skill)?.[1] ?? ''}` : "Chưa có lỗi cần củng cố"}
      message={items.length ? "Chọn một kỹ năng khác để xem mục cần luyện." : "Khi có mục cần luyện lại, nội dung sẽ xuất hiện ở đây. Bạn có thể tiếp tục học hoặc ôn từ đến hạn."}
      primaryAction={{ label: 'Học từ mới', onPress: () => router.push('/learn/setup' as Href) }}
      secondaryAction={{ label: 'Ôn tập', onPress: () => router.push('/review' as Href) }}
    /></View> : null}
    {!loading&&!error?visibleItems.map((item) => <Pressable key={item.id} style={[themedCard(theme), styles.item]} accessibilityRole="button"
      onPress={() => router.push((item.exercise_type.startsWith('confusable_') ? `/confusables/${encodeURIComponent(item.exercise_type.slice('confusable_'.length))}` : item.grammar_id ? `/grammar/${item.grammar_id}` : item.skill_type === 'SPEAKING' ? `/word/${item.vocabulary_id}` : `/mistakes/practice?id=${encodeURIComponent(item.id)}`) as Href)}>
      <Text style={styles.title}>{item.title}</Text>
      {item.pinyin ? <Text style={styles.note}>{item.pinyin}</Text> : null}
      <Text style={styles.meta}>{filters.find(([value]) => value === item.skill_type)?.[1]} · Sai {item.wrong_count} lần · Đúng liên tiếp {item.correct_streak}/3</Text>
      <Text style={styles.link}>{item.exercise_type.startsWith('confusable_') ? 'Phân biệt lại trong ngữ cảnh · không đổi lịch ôn' : item.grammar_id ? 'Luyện lại ngữ pháp' : item.skill_type === 'SPEAKING' ? 'Xem từ để luyện phát âm' : 'Luyện lại · không đổi lịch ôn'}</Text>
    </Pressable>):null}
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: { minHeight:48,justifyContent:'center',borderWidth: 1, borderColor: theme.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.surface },
  active: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
  filterText: { color: theme.primaryText, fontWeight: '700' },
  activeFilterText: { color: theme.textPrimary },
  item: { gap: spacing.sm }, title: { color: theme.textPrimary, fontSize: 22, fontWeight: '800' },
  note: { color: theme.textMuted }, meta: { color: theme.textMuted, fontSize: 12 },
  link: { color: theme.primaryText, fontWeight: '800' },
}); }
