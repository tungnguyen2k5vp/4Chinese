import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { GrammarExerciseCard } from '@/components/GrammarExerciseCard';
import { PinyinText } from '@/components/PinyinText';
import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { grammarSeed, listGrammarExamples, listGrammarPoints,
  type GrammarExample, type GrammarPoint } from '@/db/grammar';
import { useStudySession } from '@/hooks/use-study-session';
import { buildGrammarExercises } from '@/services/learning/grammar-exercises';

export default function GrammarDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  useStudySession(db);
  const [point, setPoint] = useState<GrammarPoint | null>(null);
  const [examples, setExamples] = useState<GrammarExample[]>([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadGeneration = useRef(0);
  const quiz = grammarSeed.find((item) => item.id === id);
  const exercises = quiz ? buildGrammarExercises(quiz, grammarSeed) : [];
  const exercise = exercises[exerciseIndex] ?? exercises[0];
  const load = useCallback(() => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError('');
    void Promise.all([listGrammarPoints(db), listGrammarExamples(db, id)]).then(([points, rows]) => {
      if (generation !== loadGeneration.current) return;
      setPoint(points.find((item) => item.id === id) ?? null);
      setExamples(rows);
    }).catch(() => { if (generation === loadGeneration.current) setError('Chưa tải được ngữ pháp. Hãy thử lại.'); })
      .finally(() => { if (generation === loadGeneration.current) setLoading(false); });
    return () => { loadGeneration.current++; };
  }, [db, id]);
  useFocusEffect(load);
  return <Screen title={point?.title ?? 'Ngữ pháp'} subtitle={point ? `HSK ${point.hsk_level}` : undefined}>
    {loading ? <ActivityIndicator color={colors.primary} /> : null}
    {error ? <View style={styles.block}><Text style={styles.explanation}>{error}</Text>
      <Pressable accessibilityRole="button" style={styles.option} onPress={() => { load(); }}><Text>Thử lại</Text></Pressable></View> : null}
    {!loading && !error && !point ? <Text style={styles.explanation}>Không tìm thấy cấu trúc này.</Text> : null}
    {point ? <View style={[card, styles.block]}>
      <Text style={styles.label}>CẤU TRÚC</Text><Text style={styles.pattern}>{point.pattern}</Text>
      <Text style={styles.explanation}>{point.explanation_vi}</Text>
    </View> : null}
    {examples.map((example) => <View key={example.id} style={[card, styles.block]}>
      <View style={styles.row}><Text style={styles.hanzi}>{example.hanzi}</Text><AudioButton text={example.hanzi} /></View>
      <PinyinText value={example.pinyin} /><Text style={styles.translation}>{example.translation_vi}</Text>
    </View>)}
    {point && exercise && !loading && !error ? <View style={[card, styles.block]}>
      <Text style={styles.label}>LUYỆN TẬP · 5 DẠNG BÀI</Text>
      <View style={styles.options}>{exercises.map((item, index) => <Pressable key={item.id} accessibilityRole="button"
        accessibilityState={{ selected: index === exerciseIndex }} onPress={() => { setExerciseIndex(index); setRound(0); }}
        style={[styles.option, index === exerciseIndex && styles.selected]}><Text style={styles.optionText}>{item.label}</Text></Pressable>)}</View>
      <GrammarExerciseCard key={`${exercise.id}-${round}`} grammarId={id} exercise={exercise} />
      <Pressable accessibilityRole="button" style={styles.option} onPress={() => setRound((value) => value + 1)}>
        <Text style={styles.retry}>Làm lại dạng bài này</Text></Pressable>
      <Text style={styles.explanation}>Bài dịch chọn câu phù hợp, không chấm tự do các cách dịch khác. Kết quả lưu vào ngữ pháp và sổ lỗi, không đổi SRS từ vựng.</Text>
    </View> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  pattern: { color: colors.text, fontSize: 22, fontWeight: '800' },
  explanation: { color: colors.textMuted, lineHeight: 22 },
  hanzi: { color: colors.text, fontSize: 24, fontWeight: '700', flex: 1 },
  translation: { color: colors.textMuted },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  optionText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  retry: { color: colors.primary, fontWeight: '700' },
});
