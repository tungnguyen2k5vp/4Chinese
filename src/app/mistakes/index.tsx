import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChineseAIEntry } from '@/components/ChineseAIEntry';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Disclosure } from '@/components/chinese/Disclosure';
import { MotionPressable } from '@/components/ui/MotionPressable';
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
  return <Screen title="Sổ lỗi" hideHeader>
    <PrimaryButton label="Chọn lỗi để luyện cùng Study Coach" variant="ghost" onPress={() => router.push('/ai/coach' as Href)} />
    <Text style={styles.meta}>Đúng 3 lần liên tiếp, không gợi ý để khắc phục.</Text>
    {!loading && !error && visibleItems.length ? <ChineseAIEntry label="Hỏi AI cách luyện nhóm lỗi này" context={{ label: 'Số liệu gộp từ nhóm lỗi đang xem', task: 'memory', context: { kind: 'weakness', summary: filters.filter(([value]) => value && visibleItems.some(item => item.skill_type === value)).map(([value, label]) => ({ skill: label, openItems: visibleItems.filter(item => item.skill_type === value).length, wrongAttempts: visibleItems.filter(item => item.skill_type === value).reduce((sum, item) => sum + item.wrong_count, 0) })) } }} /> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityRole="tablist">{filters.map(([value, label]) => {
      const count = value ? items.filter((item) => item.skill_type === value).length : items.length;
      return <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: skill === value }} style={[styles.filter, skill === value && styles.active]}
        onPress={() => setSkill(value)}><Text style={[styles.filterText, skill === value && styles.activeFilterText]}>{label} · {count}</Text></Pressable>;
    })}</ScrollView>
    {loading?<ActivityIndicator color={theme.primary}/>:null}
    {error?<View style={themedCard(theme)}><Text style={styles.meta}>{error}</Text><PrimaryButton label="Thử lại" onPress={()=>setRetry(value=>value+1)}/></View>:null}
    {!loading&&!error&&clusters.length?<Disclosure title={`Gợi ý luyện · ${Math.min(3,clusters.length)} nhóm`}>
      {clusters.slice(0,3).map(group=><View key={group.key} style={[themedCard(theme), {gap:4,padding:14}]}>
        <Text style={styles.title}>{group.title}</Text>
        <Text style={styles.meta}>{group.openItems} mục · {group.wrongAttempts} lần sai</Text>
        {group.microLesson && group.microLesson.practiceItemIds.length >= 2 ? <PrimaryButton label={`Luyện ${group.microLesson.practiceItemIds.length} mục`}
            onPress={()=>router.push(`/mistakes/practice?id=${encodeURIComponent(group.microLesson!.practiceItemIds[0]!)}&queue=${encodeURIComponent(group.microLesson!.practiceItemIds.join('|'))}` as Href)} /> : null}
        <Disclosure title="Chi tiết gợi ý">
          <Text style={styles.note}>{group.suggestion}</Text>
          <Text style={styles.meta}>{group.thresholdReason}</Text>
          {group.microLesson ? <View style={{gap:6}}>
            <Text style={styles.note}>{group.microLesson.explanation}</Text>
            {group.microLesson.steps.map((step,index)=><Text key={`${group.key}:${index}`} style={styles.meta}>{index+1}. {step}</Text>)}
          </View> : null}
          <Text style={styles.meta}>Gợi ý từ tối đa 200 mục lỗi đang mở; không phải đánh giá năng lực thi.</Text>
        </Disclosure>
      </View>)}
    </Disclosure>:null}
    {!loading&&!error&&!visibleItems.length ? <View style={[themedCard(theme), {padding:16,gap:12}]}>
      <Text style={styles.title}>{items.length ? `Chưa có lỗi thuộc nhóm ${filters.find(([value]) => value === skill)?.[1] ?? ''}` : 'Chưa có lỗi cần củng cố'}</Text>
      <Text style={styles.note}>{items.length ? 'Chọn kỹ năng khác để xem mục cần luyện.' : 'Các lỗi cần luyện lại sẽ xuất hiện ở đây.'}</Text>
      <PrimaryButton label="Học từ mới" onPress={() => router.push('/learn/setup' as Href)} />
      <PrimaryButton variant="secondary" label="Ôn tập" onPress={() => router.push('/review' as Href)} />
    </View> : null}
    {!loading&&!error&&visibleItems.length ? <Text accessibilityRole="header" style={styles.sectionTitle}>Mục cần củng cố · {visibleItems.length}</Text> : null}
    {!loading&&!error?visibleItems.map((item) => <MotionPressable key={item.id} style={[themedCard(theme), styles.item]} accessibilityLabel={`Luyện lại ${item.title}. Sai ${item.wrong_count} lần. Đúng liên tiếp ${item.correct_streak} trên 3.`}
      onPress={() => router.push((item.exercise_type.startsWith('confusable_') ? `/confusables/${encodeURIComponent(item.exercise_type.slice('confusable_'.length))}` : item.grammar_id ? `/grammar/${item.grammar_id}` : item.skill_type === 'SPEAKING' ? `/word/${item.vocabulary_id}` : `/mistakes/practice?id=${encodeURIComponent(item.id)}`) as Href)}>
      <View style={{flex:1,gap:4}}>
        <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8}}><Text style={styles.title}>{item.title}</Text>{item.pinyin ? <Text style={styles.note}>{item.pinyin}</Text> : null}</View>
        <Text style={styles.meta}>{filters.find(([value]) => value === item.skill_type)?.[1]} · Sai {item.wrong_count} · Đúng {item.correct_streak}/3</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.primaryText}/>
    </MotionPressable>):null}
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  filters: { flexDirection: 'row', gap: spacing.sm },
  filter: { minHeight:48,justifyContent:'center',borderWidth: 1, borderColor: theme.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.surface },
  active: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
  filterText: { color: theme.primaryText, fontWeight: '700' },
  activeFilterText: { color: theme.textPrimary },
  item: { gap: spacing.sm, padding:14, minHeight:84, flexDirection:'row',alignItems:'center' }, title: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', flexShrink:1 },
  sectionTitle: {color:theme.textPrimary,fontSize:16,fontWeight:'800'},
  note: { color: theme.textSecondary, fontSize:14,lineHeight:20 }, meta: { color: theme.textMuted, fontSize: 12,lineHeight:18 },
}); }
