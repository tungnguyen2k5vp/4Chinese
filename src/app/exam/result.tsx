import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Disclosure } from '@/components/chinese/Disclosure';
import { ExamNavigator } from '@/components/exam/ExamNavigator';
import { ExamQuestionCard } from '@/components/exam/ExamQuestionCard';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { getExamAttempt } from '@/db/exam';
import { examSkillLabels } from '@/services/exam/engine';
import { getPracticeEvidence, practiceFocusLabels } from '@/services/exam/practice-bank';
import { examAnswerCounts, examAnswerState, examReviewIndices, examTimeLabel, type ExamReviewFilter } from '@/services/exam/presentation';
import { getExamResult, type ExamAttempt } from '@/services/exam/session';
import { useTheme } from '@/theme/ThemeProvider';

export default function ExamResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext(); const theme = useTheme();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ExamReviewFilter>('all');
  const [reviewIndex, setReviewIndex] = useState(0); const [navigatorOpen, setNavigatorOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const saved = await getExamAttempt(db, id);
      if (saved.status !== 'SUBMITTED') { router.replace({ pathname: '/exam/session', params: { id } } as Href); return; }
      setAttempt(saved);
    } catch { setError('Không đọc được kết quả. Lịch sử vẫn được giữ trên máy.'); }
    finally { setLoading(false); }
  }, [db, id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const snapshot = attempt?.snapshot;
  const result = attempt ? getExamResult(attempt) : null;
  const evidence = snapshot ? getPracticeEvidence(snapshot.questions, snapshot.answers) : null;
  const counts = snapshot ? examAnswerCounts(snapshot.questions, snapshot.answers) : null;
  const indices = snapshot ? examReviewIndices(snapshot, reviewFilter) : [];
  const currentIndex = indices.includes(reviewIndex) ? reviewIndex : indices[0] ?? 0;
  const position = indices.indexOf(currentIndex);
  const question = indices.length ? snapshot?.questions[currentIndex] : null;
  const state = question && snapshot ? examAnswerState(question, snapshot.answers) : null;
  const card = { gap: 12, padding: 18, borderRadius: 24, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border };
  const heading = { color: theme.textPrimary, fontSize: 19, fontWeight: '800' as const };
  const filters: { value: ExamReviewFilter; label: string }[] = counts && snapshot ? [
    { value: 'all', label: `Tất cả ${counts.total}` }, { value: 'correct', label: `Đúng ${counts.correct}` }, { value: 'wrong', label: `Sai ${counts.wrong}` },
    { value: 'unanswered', label: `Bỏ trống ${counts.unanswered}` }, { value: 'flagged', label: `Đánh dấu ${snapshot.flaggedIds.length}` },
  ] : [];
  return <Screen title="Kết quả bài luyện" hideTitle scroll={false}>
    {loading ? <ActivityIndicator color={theme.primary} /> : null}
    {error ? <View style={{ gap: 10 }}><Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text><PrimaryButton label="Thử lại" onPress={() => void load()} /></View> : null}
    {!loading && attempt && snapshot && result && evidence && counts ? <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <PrimaryButton style={{ flex: 1 }} label="Tổng quan" variant={reviewOpen ? 'secondary' : 'primary'} onPress={() => setReviewOpen(false)} />
        <PrimaryButton style={{ flex: 1 }} label="Chữa bài" variant={reviewOpen ? 'primary' : 'secondary'} onPress={() => setReviewOpen(true)} />
      </View>
      {!reviewOpen ? <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 16 }}>
        <View style={card}>
          <Text style={{ color: theme.primaryText, fontSize: 12, fontWeight: '800' }}>KẾT QUẢ BÀI LUYỆN · HSK {snapshot.profile.level}</Text>
          <Text style={heading}>{snapshot.profile.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <View style={{ padding: 16, borderRadius: 24, backgroundColor: theme.primarySoft }}><Text style={{ color: theme.primaryText, fontSize: 38, fontWeight: '900' }}>{result.percent}%</Text></View>
            <View style={{ flex: 1, minWidth: 120, gap: 6 }}><Text style={{ ...heading, fontSize: 24 }}>{result.correct}/{result.total} câu đúng</Text><Text style={{ color: theme.textSecondary }}>Thời gian {examTimeLabel(result.elapsedSeconds)}</Text></View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {([{ label: 'Đúng', value: counts.correct, color: theme.success, filter: 'correct' }, { label: 'Sai', value: counts.wrong, color: theme.error, filter: 'wrong' }, { label: 'Bỏ trống', value: counts.unanswered, color: theme.textMuted, filter: 'unanswered' }] as const).map(item =>
              <MotionPressable key={item.label} accessibilityRole="button" accessibilityLabel={`Xem ${item.value} câu ${item.label.toLowerCase()}`} onPress={() => { setReviewFilter(item.filter); setReviewOpen(true); }} style={{ minWidth: 70, minHeight: 64, flex: 1, gap: 4, justifyContent: 'center' }}>
                <Text style={{ color: item.color, fontSize: 26, fontWeight: '900' }}>{item.value}</Text><Text style={{ color: theme.textSecondary }}>{item.label}</Text>
              </MotionPressable>)}
          </View>
          <Text style={{ color: theme.textMuted, lineHeight: 21 }}>Đúng 1 điểm · sai hoặc bỏ trống 0 điểm. Tỷ lệ đúng tính trên toàn bộ câu hỏi, không phải thang điểm HSK chính thức.</Text>
        </View>
        {result.sections.map(section => {
          const sectionCounts = examAnswerCounts(snapshot.questions.filter(item => item.skill === section.skill), snapshot.answers);
          return <View key={section.skill} style={card}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Text style={{ ...heading, flex: 1 }}>{examSkillLabels[section.skill]}</Text><Text style={{ color: theme.primaryText, fontWeight: '800' }}>{section.correct}/{section.total} · {section.percent}%</Text></View>
            <AnimatedProgressBar progress={section.percent / 100} color={theme.primary} trackColor={theme.border} accessibilityLabel={`${examSkillLabels[section.skill]}: ${section.percent} phần trăm`} />
            <Text style={{ color: theme.textSecondary }}>{sectionCounts.correct} đúng · {sectionCounts.wrong} sai · {sectionCounts.unanswered} bỏ trống</Text>
          </View>;
        })}
        <PrimaryButton label={counts.wrong ? 'Chữa các câu sai' : counts.unanswered ? 'Chữa các câu bỏ trống' : 'Xem lại toàn bộ đáp án'} onPress={() => { setReviewFilter(counts.wrong ? 'wrong' : counts.unanswered ? 'unanswered' : 'all'); setReviewOpen(true); }} />
        <Disclosure title="Cách tính điểm và luyện tiếp">
          <Text style={{ color: theme.textSecondary, lineHeight: 23 }}>{evidence.limitationVi}</Text>
          <Text style={{ color: theme.textSecondary, lineHeight: 23 }}>Bài này chấm theo đáp án đã lưu trong từng câu. Không cộng điểm cho câu bỏ trống, không trừ điểm câu sai và không thay đổi điểm khi bạn lọc hoặc xem lại câu hỏi.</Text>
          <PrimaryButton label={`Luyện tiếp: ${practiceFocusLabels[evidence.recommendedFocus]}`} variant="secondary" onPress={() => router.push({ pathname: '/exam/setup', params: { focus: evidence.recommendedFocus, band: snapshot.profile.level } } as Href)} />
          <PrimaryButton label="Tự luyện viết, dịch và nói" variant="ghost" onPress={() => router.push('/exam/skills' as Href)} />
        </Disclosure>
        <PrimaryButton label="Về trung tâm luyện thi" variant="ghost" onPress={() => router.dismissTo('/exam' as Href)} />
      </ScrollView> : <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
          {filters.map(filter => <MotionPressable key={filter.value} accessibilityRole="tab" accessibilityState={{ selected: reviewFilter === filter.value }} onPress={() => setReviewFilter(filter.value)} style={{ minHeight: 48, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 16, backgroundColor: reviewFilter === filter.value ? theme.primarySoft : theme.surface }}>
            <Text style={{ color: theme.primaryText, fontWeight: '700' }}>{filter.label}</Text>
          </MotionPressable>)}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: theme.textPrimary, fontWeight: '800', flex: 1 }}>{question ? `Câu ${currentIndex + 1}/${counts.total} · ${state === 'correct' ? 'Đúng' : state === 'wrong' ? 'Sai' : 'Bỏ trống'}` : 'Không có câu trong bộ lọc này'}</Text>
          <PrimaryButton label="Bảng câu" variant="ghost" onPress={() => setNavigatorOpen(true)} />
        </View>
        <ScrollView key={`${currentIndex}-${reviewFilter}`} contentContainerStyle={{ gap: 16, paddingBottom: 20 }} style={{ flex: 1 }}>
          {question ? <StudyTransition turnKey={question.id} durationMs={180}><ExamQuestionCard question={question} answer={snapshot.answers[question.id]} review /></StudyTransition> : <Text style={{ color: theme.textSecondary }}>Chọn Tất cả hoặc một bộ lọc khác để tiếp tục chữa bài.</Text>}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PrimaryButton label="Câu trước" style={{ flex: 1 }} variant="secondary" disabled={position <= 0} onPress={() => setReviewIndex(indices[position - 1] ?? currentIndex)} />
          <PrimaryButton label="Câu tiếp" style={{ flex: 1 }} variant="secondary" disabled={position < 0 || position >= indices.length - 1} onPress={() => setReviewIndex(indices[position + 1] ?? currentIndex)} />
        </View>
      </>}
      <ExamNavigator visible={navigatorOpen} snapshot={snapshot} currentIndex={currentIndex} canGo={() => true} review onClose={() => setNavigatorOpen(false)} onSelect={index => { setReviewFilter('all'); setReviewIndex(index); setReviewOpen(true); setNavigatorOpen(false); }} />
    </> : null}
  </Screen>;
}
