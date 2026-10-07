import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { GrammarExerciseCard } from '@/components/GrammarExerciseCard';
import { PinyinText } from '@/components/PinyinText';
import { Screen } from '@/components/Screen';
import { SyntaxPattern } from '@/components/visual/SyntaxPattern';
import { card as baseCard, spacing } from '@/constants/design';
import { vietnameseContrasts } from '@/data/vietnamese-contrasts';
import { grammarSeed, listGrammarExamples, listGrammarPoints,
  type GrammarExample, type GrammarPoint } from '@/db/grammar';
import { recordLessonActivityEvidence } from "@/db/learning-path";
import { useStudySession } from '@/hooks/use-study-session';
import { buildGrammarExercises } from '@/services/learning/grammar-exercises';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function GrammarDetail() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { id, lessonActivityId } = useLocalSearchParams<{ id: string; lessonActivityId?: string }>();
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
  const contrast = vietnameseContrasts.find((item) => item.seed.id === id);
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
    {loading ? <ActivityIndicator color={theme.primary} /> : null}
    {error ? <View style={[styles.block, styles.errorStatus]}><Text style={styles.errorText}>{error}</Text>
      <Pressable accessibilityRole="button" style={styles.option} onPress={() => { load(); }}><Text style={styles.retry}>Thử lại</Text></Pressable></View> : null}
    {!loading && !error && !point ? <Text style={styles.explanation}>Không tìm thấy cấu trúc này.</Text> : null}
    {point ? <View style={[styles.card, styles.block]}>
      <Text style={styles.label}>CẤU TRÚC</Text><SyntaxPattern value={point.pattern} />
      <Text style={styles.explanation}>{point.explanation_vi}</Text>
    </View> : null}
    {contrast ? <View style={[styles.card, styles.block]}>
      <Text style={styles.label}>ĐỐI CHIẾU VIỆT–TRUNG · TỰ BIÊN SOẠN</Text>
      <Text style={styles.explanation}>{contrast.vietnameseTrap}</Text>
      <Text style={styles.explanation}>Câu cần sửa: {contrast.incorrect}</Text>
      <Text style={styles.hanzi}>{contrast.corrected}</Text>
      <Text style={styles.explanation}>{contrast.why}</Text>
      <Text style={styles.explanation}>Cấp độ chỉ mang tính gợi ý và có thể không trùng với cấu trúc đề thi HSK chính thức.</Text>
    </View> : null}
    {examples.map((example) => <View key={example.id} style={[styles.card, styles.block]}>
      <View style={styles.row}><Text style={styles.hanzi}>{example.hanzi}</Text><AudioButton text={example.hanzi} /></View>
      <PinyinText value={example.pinyin} style={styles.pinyin} /><Text style={styles.translation}>{example.translation_vi}</Text>
    </View>)}
    {point && exercise && !loading && !error ? <View style={[styles.card, styles.block]}>
      <Text style={styles.label}>LUYỆN TẬP · {exercises.length} DẠNG BÀI</Text>
      <View style={styles.options}>{exercises.map((item, index) => <Pressable key={item.id} accessibilityRole="button"
        accessibilityState={{ selected: index === exerciseIndex }} onPress={() => { setExerciseIndex(index); setRound(0); }}
        style={[styles.option, index === exerciseIndex && styles.selected]}><Text style={styles.optionText}>{item.label}</Text></Pressable>)}</View>
      <GrammarExerciseCard key={`${exercise.id}-${round}`} grammarId={id} exercise={exercise} onRecorded={(correct) => { if (correct && lessonActivityId) void recordLessonActivityEvidence(db, lessonActivityId, "GRAMMAR_CORRECT_ANSWER", `${id}:${exercise.id}`).catch(() => undefined); }} />
      <Pressable accessibilityRole="button" style={styles.option} onPress={() => setRound((value) => value + 1)}>
        <Text style={styles.retry}>Làm lại dạng bài này</Text></Pressable>
      <Text style={styles.explanation}>Bài dịch chọn câu phù hợp, không chấm tự do các cách dịch khác. Kết quả lưu vào ngữ pháp và sổ lỗi, không đổi SRS từ vựng.</Text>
    </View> : null}
  </Screen>;
}

function createStyles(theme: ThemeTokens) { return StyleSheet.create({
  card: { ...baseCard, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, shadowColor: theme.shadow },
  block: { gap: spacing.sm }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: theme.primaryText, fontWeight: '800', fontSize: 12 },
  pattern: { color: theme.textPrimary, fontSize: 22, fontWeight: '800' },
  explanation: { color: theme.textSecondary, lineHeight: 22 },
  hanzi: { color: theme.textPrimary, fontSize: 24, fontWeight: '700', flex: 1 },
  pinyin: { color: theme.textSecondary },
  translation: { color: theme.textSecondary },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: theme.surface },
  optionText: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
  selected: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
  retry: { color: theme.primaryText, fontWeight: '700' },
  errorStatus: { borderWidth: 1, borderColor: theme.error, borderRadius: 12, padding: spacing.md, backgroundColor: theme.errorSoft },
  errorText: { color: theme.error, lineHeight: 22 },
}); }
