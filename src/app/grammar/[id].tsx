import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { ChineseAIEntry } from '@/components/ChineseAIEntry';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { ExampleSentence } from '@/components/ExampleSentence';
import { GrammarExerciseCard } from '@/components/GrammarExerciseCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Disclosure } from '@/components/chinese/Disclosure';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { SyntaxPattern } from '@/components/visual/SyntaxPattern';
import { spacing } from '@/constants/design';
import { vietnameseContrasts } from '@/data/vietnamese-contrasts';
import { grammarSeed, listGrammarExamples, listGrammarPoints, type GrammarExample, type GrammarPoint } from '@/db/grammar';
import { recordLessonActivityEvidence } from '@/db/learning-path';
import { useStudySession } from '@/hooks/use-study-session';
import { buildGrammarExercises, type GrammarExerciseKind } from '@/services/learning/grammar-exercises';
import { grammarGuides, type GrammarForm } from '@/services/learning/grammar-guides';
import { buildSyllabusGrammarExercises, syllabusGrammar } from '@/services/learning/grammar-syllabus';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

const setSize = 3;
export default function GrammarDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GrammarDetailContent key={id} />;
}
function GrammarDetailContent() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { id, lessonActivityId, returnTo, targetGrammarId } = useLocalSearchParams<{ id: string; lessonActivityId?: string; returnTo?: string; targetGrammarId?: string }>();
  const db = useSQLiteContext();
  useStudySession(db);
  const [point, setPoint] = useState<GrammarPoint | null>(null);
  const [examples, setExamples] = useState<GrammarExample[]>([]);
  const [activityTarget, setActivityTarget] = useState<string | null>(null);
  const [legacyActivityBand, setLegacyActivityBand] = useState<string | null>(null);
  const [kind, setKind] = useState<GrammarExerciseKind>('choice');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'guide' | 'practice'>('guide');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadGeneration = useRef(0);
  const quiz = grammarSeed.find(item => item.id === id);
  const official = syllabusGrammar.find(item => item.id === id);
  const contrast = vietnameseContrasts.find(item => item.seed.id === id);
  const guide = grammarGuides[id];
  const exercises = useMemo(() => official ? buildSyllabusGrammarExercises(official) : quiz ? buildGrammarExercises(quiz, grammarSeed) : [], [official, quiz]);
  const kinds = [...new Set(exercises.map(item => item.kind))];
  const activeKind = kinds.includes(kind) ? kind : kinds[0];
  const questions = exercises.filter(item => item.kind === activeKind);
  const currentIndex = Math.min(questionIndex, Math.max(0, questions.length - 1));
  const exercise = questions[currentIndex];
  const setStart = Math.floor(currentIndex / setSize) * setSize;
  const setEnd = Math.min(setStart + setSize, questions.length);
  const answered = exercises.filter(item => answers[item.id] !== undefined).length;
  const correctCount = exercises.filter(item => answers[item.id] === true).length;
  const load = useCallback(() => {
    const generation = ++loadGeneration.current;
    setLoading(true); setError(''); setPoint(null); setActivityTarget(null); setLegacyActivityBand(null);
    void Promise.all([official ? Promise.resolve([] as GrammarPoint[]) : listGrammarPoints(db), official ? Promise.resolve([] as GrammarExample[]) : listGrammarExamples(db, id),
      lessonActivityId && !official ? db.getFirstAsync<{ target: string | null; activity_type: string; hsk_band: string }>(`SELECT a.target,a.activity_type,c.hsk_band FROM lesson_activities a
        JOIN lessons l ON l.id=a.lesson_id JOIN units u ON u.id=l.unit_id JOIN courses c ON c.id=u.course_id WHERE a.id=?`, lessonActivityId) : Promise.resolve(null),
    ]).then(([points, rows, activity]) => {
      if (generation !== loadGeneration.current) return;
      setPoint(points.find(item => item.id === id) ?? null); setExamples(rows);
      if (activity?.activity_type === 'GRAMMAR') {
        setActivityTarget(activity.target);
        if (activity.target === null) setLegacyActivityBand(activity.hsk_band);
      }
    }).catch(() => { if (generation === loadGeneration.current) setError('Chưa tải được ngữ pháp. Hãy thử lại.'); })
      .finally(() => { if (generation === loadGeneration.current) setLoading(false); });
    return () => { loadGeneration.current++; };
  }, [db, id, lessonActivityId, official]);
  useFocusEffect(load);
  const browse = () => router.push({ pathname: '/grammar', params: { lessonActivityId: lessonActivityId ?? '', returnTo: returnTo ?? '', targetGrammarId: targetGrammarId ?? '', band: official?.level ?? point?.hsk_level ?? 'all' } } as Href);
  const backToTarget = targetGrammarId || activityTarget;
  const available = !!official || !!point;
  return <Screen title={official?.title ?? point?.title ?? 'Ngữ pháp'} subtitle={official ? `HSK ${official.level} · câu mẫu đề cương` : point ? `HSK ${point.hsk_level} · luyện có lưu tiến độ` : undefined} avoidKeyboard>
    {loading ? <ActivityIndicator accessibilityLabel="Đang tải chủ điểm" color={theme.primary} /> : null}
    {error ? <View style={styles.block}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><PrimaryButton label="Thử lại" variant="secondary" onPress={() => { load(); }} /></View> : null}
    {!loading && !error && !available ? <Text style={styles.body}>Không tìm thấy cấu trúc này.</Text> : null}
    {available && !loading && !error ? <>
      <ChineseAIEntry context={{ label: official?.title ?? point?.title ?? 'Ngữ pháp', task: 'grammar', context: { kind: 'grammar', title: (official?.title ?? point?.title ?? '').slice(0, 150), pattern: (official?.pattern ?? point?.pattern ?? '').slice(0, 300), explanation: (official?.detail ?? point?.explanation_vi ?? '').slice(0, 1000), example: (official?.examples[0]?.hanzi ?? examples[0]?.hanzi ?? '').slice(0, 300), hsk: String(official?.level ?? point?.hsk_level ?? '') } }} />
      <View style={styles.options}>{(['guide', 'practice'] as const).map(value => <MotionPressable key={value} accessibilityRole="tab" accessibilityState={{ selected: view === value, disabled: busy }} disabled={busy} onPress={() => setView(value)} style={[styles.option, styles.pagerButton, view === value && styles.selected]}><Text style={styles.optionText}>{value === 'guide' ? 'Hướng dẫn' : 'Luyện tập'}</Text></MotionPressable>)}</View>
      {view === 'guide' ? <>
      <View style={styles.overview}>
        <Text style={styles.label}>{official ? official.category : 'KHI NÀO DÙNG'}</Text>
        {guide ? <Text style={styles.body}>{guide.use}</Text> : null}
        {(official?.pattern || point?.pattern) ? <SyntaxPattern value={official?.pattern || point?.pattern || ''} /> : null}
        <Text style={styles.body}>{official ? official.detail || 'Đọc câu mẫu gốc và luyện khôi phục nguyên văn.' : point?.explanation_vi}</Text>
        {official ? <Text style={styles.muted}>Nguồn câu mẫu tiếng Trung, chưa có bản dịch Việt. Đây là luyện nhớ trong phiên, không chấm năng lực ngữ pháp hay hoàn thành bài học.</Text> : null}
      </View>
      {guide?.forms ? <GrammarForms forms={guide.forms} /> : null}
      {guide ? <View style={styles.notice}><Text style={styles.label}>NHỚ NHANH</Text><Text style={styles.body}>{guide.tip}</Text></View> : null}
      <Disclosure title={`Câu mẫu tham khảo (${official ? official.examples.length : examples.length})`}>
        <View style={styles.block}>{official ? official.examples.map(example => <View key={example.id} style={styles.example}><View style={styles.row}><Text style={styles.hanzi}>{example.hanzi}</Text><AudioButton text={example.hanzi} /></View></View>)
          : examples.map(example => <ExampleSentence key={example.id} item={{ chinese: example.hanzi, pinyin: example.pinyin, vietnamese: example.translation_vi }} />)}</View>
      </Disclosure>
      {contrast ? <Disclosure title="Lỗi dễ nhầm Việt–Trung"><View style={styles.block}><Text style={styles.body}>{contrast.vietnameseTrap}</Text><Text style={styles.body}>Câu cần sửa: {contrast.incorrect}</Text><Text style={styles.hanzi}>{contrast.corrected}</Text><Text style={styles.body}>{contrast.why}</Text></View></Disclosure> : null}
      <PrimaryButton label={official ? 'Luyện nhớ câu mẫu' : 'Bắt đầu luyện cấu trúc'} onPress={() => setView('practice')} />
      </> : null}
      {view === 'practice' && (exercise ? <View style={styles.practice}>
        <Text accessibilityRole="header" style={styles.title}>{official ? 'Luyện nhớ câu mẫu' : 'Luyện tập theo cấu trúc'}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.muted}>{answered}/{exercises.length} câu đã làm · {correctCount} đúng · {kinds.length} dạng có sẵn</Text>
        <ScrollView horizontal accessibilityLabel="Các dạng bài, vuốt ngang để xem thêm" showsHorizontalScrollIndicator contentContainerStyle={styles.kinds}>{kinds.map(value => {
          const items = exercises.filter(item => item.kind === value);
          return <Pressable key={value} accessibilityRole="button" disabled={busy} accessibilityState={{ selected: activeKind === value, disabled: busy }}
            onPress={() => { setKind(value); setQuestionIndex(0); }} style={[styles.option, styles.kindOption, activeKind === value && styles.selected, busy && styles.disabled]}>
            <Text style={styles.optionText}>{items[0]?.label} · {items.length} câu</Text>
          </Pressable>;
        })}</ScrollView>
        <Text style={styles.label}>BỘ {Math.floor(currentIndex / setSize) + 1}/{Math.ceil(questions.length / setSize)} · CÂU {currentIndex + 1}/{questions.length}</Text>
        <GrammarExerciseCard key={`${id}:${exercise.id}`} grammarId={official ? undefined : point?.id} exercise={exercise} initialResult={answers[exercise.id] ?? null} onBusyChange={setBusy}
          onRecorded={async correct => {
            // Route context alone cannot grant completion for another structure.
            if (correct && !official && point && lessonActivityId && (activityTarget === point.id || (activityTarget === null && legacyActivityBand === point.hsk_level))) {
              await recordLessonActivityEvidence(db, lessonActivityId, 'GRAMMAR_CORRECT_ANSWER', `${point.id}:${exercise.id}`);
            }
            setAnswers(previous => ({ ...previous, [exercise.id]: correct }));
          }} />
        <View style={styles.options}>
          <PrimaryButton style={styles.pagerButton} variant="secondary" label="Câu trước" disabled={busy || currentIndex <= setStart} onPress={() => setQuestionIndex(value => value - 1)} />
          <PrimaryButton style={styles.pagerButton} variant="secondary" label="Câu tiếp" disabled={busy || currentIndex + 1 >= setEnd} onPress={() => setQuestionIndex(value => value + 1)} />
        </View>
        <View style={styles.options}>
          {setStart > 0 ? <PrimaryButton style={styles.pagerButton} variant="ghost" label="Bộ trước" disabled={busy} onPress={() => setQuestionIndex(setStart - setSize)} /> : null}
          {setEnd < questions.length ? <PrimaryButton style={styles.pagerButton} label="Bộ câu mới" disabled={busy} onPress={() => setQuestionIndex(setEnd)} /> : <Text style={styles.muted}>Đã đến bộ cuối của dạng này. Chọn dạng hoặc cấu trúc khác để gặp câu mới.</Text>}
        </View>
        {!official ? <Text style={styles.muted}>Chọn câu dịch phù hợp trong các đáp án; không chấm bản dịch tự do. Kết quả lưu vào ngữ pháp và sổ lỗi.</Text> : null}
      </View> : <Text style={styles.body}>Chủ điểm này chưa có bài tập. Bạn có thể đọc và nghe câu mẫu.</Text>)}
    </> : null}
    <View style={styles.block}>
      <PrimaryButton label="Khám phá cấu trúc khác · HSK 1–9" variant="secondary" disabled={busy} onPress={browse} />
      {backToTarget && backToTarget !== id ? <PrimaryButton label="Về chủ điểm bài học" variant="ghost" disabled={busy} onPress={() => router.push({ pathname: '/grammar/[id]', params: { id: backToTarget, lessonActivityId: lessonActivityId ?? '', returnTo: returnTo ?? '', targetGrammarId: backToTarget } } as Href)} /> : null}
      {returnTo?.startsWith('/path/lesson/') ? <PrimaryButton label="Trở về bài học" variant="ghost" disabled={busy} onPress={() => router.push(returnTo as Href)} /> : null}
    </View>
  </Screen>;
}
function GrammarForms({ forms }: { forms: GrammarForm[] }) {
  const styles = useThemeStyles(createStyles);
  const [index, setIndex] = useState(0);
  const form = forms[index] ?? forms[0];
  if (!form) return null;
  return <View style={styles.block}>
    <Text accessibilityRole="header" style={styles.title}>Thử đổi cách nói</Text>
    <View style={styles.options}>{forms.map((item, i) => <MotionPressable key={item.label} accessibilityRole="tab" accessibilityState={{ selected: index === i }} onPress={() => setIndex(i)} style={[styles.option, index === i && styles.selected]}><Text style={styles.optionText}>{item.label}</Text></MotionPressable>)}</View>
    <StudyTransition turnKey={String(index)} effect="reveal" durationMs={180} style={styles.block}>
      <SyntaxPattern value={form.pattern} />
      <ExampleSentence key={form.label} item={{ chinese: form.hanzi, pinyin: form.pinyin, vietnamese: form.vi }} />
    </StudyTransition>
  </View>;
}
function createStyles(theme: ThemeTokens) { return StyleSheet.create({
  block: { gap: spacing.md }, overview: { gap: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1, borderColor: theme.border },
  practice: { gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: theme.border, borderRadius: 16, backgroundColor: theme.surface },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, example: { gap: spacing.sm, paddingVertical: spacing.sm },
  title: { color: theme.textPrimary, fontWeight: '800', fontSize: 20 }, label: { color: theme.primaryText, fontWeight: '800', fontSize: 14 },
  body: { color: theme.textSecondary, fontSize: 16, lineHeight: 24 }, muted: { color: theme.textMuted, fontSize: 14, lineHeight: 22 },
  hanzi: { color: theme.textPrimary, fontSize: 23, lineHeight: 34, flex: 1 }, error: { color: theme.error, lineHeight: 24 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, option: { minHeight: 48, justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: theme.border, borderRadius: 12, flexShrink: 1 },
  kinds: { gap: spacing.sm, paddingBottom: spacing.sm }, kindOption: { maxWidth: 240, flexShrink: 0 },
  optionText: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' }, selected: { borderColor: theme.primary, backgroundColor: theme.primarySoft }, disabled: { opacity: 0.5 },
  pagerButton: { flexGrow: 1, flexBasis: 120 },
  notice: { gap: spacing.sm, padding: spacing.md, borderRadius: 14, backgroundColor: theme.primarySoft },
}); }
