import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';

import { HskBandSelect } from '@/components/HskBandSelect';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { themedCard } from '@/constants/design';
import { createExamAttempt, listExamAttempts } from '@/db/exam';
import { listVocabulary } from '@/db/repository';
import { buildOriginalPractice, originalPracticeBank, practiceDurations, practiceFocusLabels, type PracticeDuration, type PracticeFocus } from '@/services/exam/practice-bank';
import { getExamResult, type ExamAttempt } from '@/services/exam/session';
import { buildVocabularyPractice } from '@/services/exam/vocabulary-practice';
import { useTheme } from '@/theme/ThemeProvider';
import { visualModePresentation } from '@/theme/visual-modes';
import type { HskBand } from '@/types/models';

export default function ExamCenter() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const visualMode = visualModePresentation(theme, 'EXAM');
  const params = useLocalSearchParams<{ focus?: string; band?: string }>();
  const [level, setLevel] = useState<HskBand>([1, 2, 3, 4, 5, 6].includes(Number(params.band)) ? Number(params.band) as HskBand : params.band === '7-9' ? '7-9' : 1);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [minutes, setMinutes] = useState<PracticeDuration>(5);
  const [focus, setFocus] = useState<PracticeFocus>(params.focus === 'READING' || params.focus === 'LANGUAGE' ? params.focus : 'ALL');
  const [kind, setKind] = useState<'context' | 'vocabulary'>('context');
  const [noBack, setNoBack] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const startLock = useRef(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setAttempts(await listExamAttempts(db)); }
    catch { setError('Chưa tải được lịch sử. Hãy thử lại.'); }
    finally { setLoading(false); }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const open = (attempt: ExamAttempt) => router.push({ pathname: attempt.status === 'SUBMITTED' ? '/exam/result' : '/exam/session', params: { id: attempt.id } } as unknown as Href);
  const start = async () => {
    if (startLock.current) return;
    startLock.current = true; setStarting(true); setError('');
    try {
      const bank = originalPracticeBank.find(item => item.profile.level === String(level));
      const practice = kind === 'vocabulary'
        ? buildVocabularyPractice(await listVocabulary(db, { band: level, filter: 'all', limit: 500 }), level, minutes, noBack)
        : bank ? buildOriginalPractice(bank.profile.id, minutes, focus, noBack) : null;
      if (!practice) throw new Error('NO_PRACTICE');
      open(await createExamAttempt(db, practice.profile, practice.questions));
    } catch { setError('Chưa tạo được bài luyện. Kiểm tra cấp độ đã chọn và thử lại.'); }
    finally { setStarting(false); startLock.current = false; }
  };
  const submitted = attempts.filter(item => item.status === 'SUBMITTED');
  const active = attempts.filter(item => item.status === 'IN_PROGRESS');
  const choiceStyle = (selected: boolean) => ({ minHeight: 48, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.surface });
  const routes: { label: string; hint: string; icon: keyof typeof Ionicons.glyphMap; route: Href }[] = [
    { label: 'Nghe', hint: 'Nghe và ghép nghĩa', icon: 'headset-outline', route: '/listening' as Href },
    { label: 'Đọc', hint: 'Truyện và đọc hiểu', icon: 'book-outline', route: '/stories' as Href },
    { label: 'Viết & dịch', hint: 'Luyện câu, đoạn văn', icon: 'create-outline', route: '/exam/skills' as Href },
    { label: 'Nói', hint: 'Giao tiếp và phát âm', icon: 'mic-outline', route: '/speaking' as Href },
  ];
  return <Screen title="Trung tâm luyện thi" subtitle="Chọn cấp độ → luyện ngắn → xem lỗi và ôn lại.">
    <View style={{ ...themedCard(theme), gap: 12, borderLeftWidth: 4, borderLeftColor: visualMode.accent }}>
      <Text style={{ color: visualMode.accent, fontSize: 12, fontWeight: '800' }}>BẮT ĐẦU TẠI ĐÂY</Text>
      <Text style={{ color: theme.textPrimary, fontSize: 22, fontWeight: '800' }}>Một bài ngắn mỗi ngày</Text>
      <HskBandSelect value={level} allowAll={false} disabled={starting} onChange={value => { if (value !== 'all') setLevel(value); }} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{([{ id: 'context', label: 'Đọc & ngữ pháp' }, { id: 'vocabulary', label: 'Từ vựng' }] as const).map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: kind === item.id }} disabled={starting} onPress={() => setKind(item.id)} style={choiceStyle(kind === item.id)}><Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{item.label}</Text></Pressable>)}</View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{practiceDurations.map(duration => <Pressable key={duration} accessibilityRole="radio" accessibilityState={{ checked: minutes === duration }} disabled={starting} onPress={() => setMinutes(duration)} style={choiceStyle(minutes === duration)}><Text style={{ color: theme.textPrimary }}>{duration} phút</Text></Pressable>)}</View>
      <Text style={{ color: theme.textMuted }}>{kind === 'context' ? (focus === 'ALL' ? 4 : 2) : minutes === 5 ? 10 : 20} câu · có đáp án và giải thích sau khi nộp</Text>
      <PrimaryButton label={starting ? 'Đang chuẩn bị…' : `Bắt đầu luyện HSK ${level}`} disabled={starting} onPress={() => void start()} />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: advanced }} onPress={() => setAdvanced(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: theme.primaryText }}>Tùy chọn bài luyện {advanced ? '⌃' : '⌄'}</Text></Pressable>
      {advanced ? <View style={{ gap: 10 }}>
        {kind === 'context' ? (Object.keys(practiceFocusLabels) as PracticeFocus[]).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: focus === value }} disabled={starting} onPress={() => setFocus(value)} style={choiceStyle(focus === value)}><Text style={{ color: theme.textPrimary }}>{practiceFocusLabels[value]}</Text></Pressable>) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: theme.textPrimary, flex: 1 }}>Không quay lại câu trước</Text><Switch disabled={starting} value={noBack} onValueChange={setNoBack} /></View>
        <Text style={{ color: theme.textMuted, lineHeight: 21 }}>Bài tập trong app dùng để luyện kỹ năng, chưa phải đề thi chính thức. Thời gian tiếp tục chạy khi bạn rời app.</Text>
      </View> : null}
    </View>
    {error ? <><Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text><PrimaryButton variant="ghost" label="Thử tải lại" onPress={() => void load()} /></> : null}
    {loading ? <ActivityIndicator color={theme.primary} /> : null}
    {active.map(attempt => <PrimaryButton key={attempt.id} variant="secondary" label={`Tiếp tục HSK ${attempt.snapshot.profile.level} · ${Object.keys(attempt.snapshot.answers).length}/${attempt.snapshot.questions.length} câu`} onPress={() => open(attempt)} />)}
    <Text style={{ color: theme.textPrimary, fontSize: 19, fontWeight: '800' }}>Luyện từng kỹ năng</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{routes.map(item => <Pressable key={item.label} accessibilityRole="button" onPress={() => router.push(item.route)} style={{ width: '48%', ...choiceStyle(false), gap: 8 }}><Ionicons name={item.icon} size={24} color={theme.primaryText} /><Text style={{ color: theme.textPrimary, fontWeight: '800', fontSize: 17 }}>{item.label}</Text><Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.hint}</Text></Pressable>)}</View>
    <PrimaryButton variant="ghost" label="Xem tiến độ và kỹ năng cần luyện thêm" onPress={() => router.push('/exam/readiness' as Href)} />
    <Text style={{ color: theme.textPrimary, fontSize: 19, fontWeight: '800' }}>Kết quả gần đây</Text>
    {!loading && !submitted.length ? <Text style={{ color: theme.textMuted }}>Làm bài đầu tiên để xem kết quả tại đây.</Text> : null}
    {submitted.slice(0, 5).map(attempt => <PrimaryButton key={attempt.id} variant="secondary" label={`HSK ${attempt.snapshot.profile.level} · ${getExamResult(attempt).correct}/${attempt.snapshot.questions.length} đúng · ${new Date(attempt.startedAtMs).toLocaleDateString('vi-VN')}`} onPress={() => open(attempt)} />)}
  </Screen>;
}
