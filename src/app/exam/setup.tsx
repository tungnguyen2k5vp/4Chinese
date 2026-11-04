import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { HskBandSelect } from '@/components/HskBandSelect';
import { PrimaryButton } from '@/components/PrimaryButton';
import { themedCard } from '@/constants/design';
import { createExamAttempt } from '@/db/exam';
import { listVocabulary } from '@/db/repository';
import { buildOriginalPractice, originalPracticeBank, practiceDurations, practiceFocusLabels, type PracticeDuration, type PracticeFocus } from '@/services/exam/practice-bank';
import { buildVocabularyPractice } from '@/services/exam/vocabulary-practice';
import { useTheme } from '@/theme/ThemeProvider';
import { visualModePresentation } from '@/theme/visual-modes';
import type { HskBand } from '@/types/models';

export default function ExamSetup() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const visualMode = visualModePresentation(theme, 'EXAM');
  const params = useLocalSearchParams<{ focus?: string; band?: string; minutes?: string; kind?: string }>();
  const [level, setLevel] = useState<HskBand>([1, 2, 3, 4, 5, 6].includes(Number(params.band)) ? Number(params.band) as HskBand : params.band === '7-9' ? '7-9' : 1);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [minutes, setMinutes] = useState<PracticeDuration>(params.minutes === '10' ? 10 : params.minutes === '15' ? 15 : 5);
  const [focus, setFocus] = useState<PracticeFocus>(params.focus === 'READING' || params.focus === 'LANGUAGE' ? params.focus : 'ALL');
  const [kind, setKind] = useState<'context' | 'vocabulary'>(params.kind === 'vocabulary' ? 'vocabulary' : 'context');
  const [noBack, setNoBack] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const startLock = useRef(false);
  const start = async () => {
    if (startLock.current) return;
    startLock.current = true; setStarting(true); setError('');
    try {
      const bank = originalPracticeBank.find(item => item.profile.level === String(level));
      const practice = kind === 'vocabulary'
        ? buildVocabularyPractice(await listVocabulary(db, { band: level, filter: 'all', limit: 500 }), level, minutes, noBack)
        : bank ? buildOriginalPractice(bank.profile.id, minutes, focus, noBack) : null;
      if (!practice) throw new Error('NO_PRACTICE');
      const attempt = await createExamAttempt(db, practice.profile, practice.questions);
      router.replace({ pathname: '/exam/session', params: { id: attempt.id } } as Href);
    } catch { setError('Chưa tạo được bài luyện. Kiểm tra cấp độ đã chọn và thử lại.'); }
    finally { setStarting(false); startLock.current = false; }
  };
  const choiceStyle = (selected: boolean) => ({ minHeight: 48, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.surface });
  const bank = originalPracticeBank.find(item => item.profile.level === String(level));
  const preview = kind === 'context' && bank ? buildOriginalPractice(bank.profile.id, minutes, focus, noBack) : null;
  return <Screen title="Thiết lập bài luyện" hideTitle>
    <View style={{ ...themedCard(theme), gap: 12, borderLeftWidth: 4, borderLeftColor: visualMode.accent }}>
      <Text style={{ color: visualMode.accent, fontSize: 12, fontWeight: '800' }}>BẮT ĐẦU TẠI ĐÂY</Text>
      <HskBandSelect value={level} allowAll={false} disabled={starting} onChange={value => { if (value !== 'all') setLevel(value); }} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{([{ id: 'context', label: 'Đọc & ngữ pháp' }, { id: 'vocabulary', label: 'Từ vựng' }] as const).map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: kind === item.id }} disabled={starting} onPress={() => setKind(item.id)} style={choiceStyle(kind === item.id)}><Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{item.label}</Text></Pressable>)}</View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{practiceDurations.map(duration => <Pressable key={duration} accessibilityRole="radio" accessibilityState={{ checked: minutes === duration }} disabled={starting} onPress={() => setMinutes(duration)} style={choiceStyle(minutes === duration)}><Text style={{ color: theme.textPrimary }}>{duration} phút</Text></Pressable>)}</View>
      <Text style={{ color: theme.textMuted }}>{preview ? `${preview.questions.length} câu` : `Tối đa ${minutes === 5 ? 10 : 20} câu`} · có đáp án và giải thích sau khi nộp</Text>
      <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 16, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', padding: 12, backgroundColor: theme.primarySoft }}><Text style={{ color: theme.primaryText, fontWeight: '800', flex: 1 }}>Nội dung</Text><Text style={{ color: theme.primaryText, fontWeight: '800' }}>Thời gian</Text></View>
        <View style={{ padding: 12, flexDirection: 'row', gap: 12 }}><Text style={{ color: theme.textPrimary, flex: 1 }}>{preview ? practiceFocusLabels[focus] : 'Chọn nghĩa của từ'}{preview ? ` · ${preview.questions.length} câu` : ''}</Text><Text style={{ color: theme.textPrimary }}>{minutes} phút</Text></View>
      </View>
      <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>Chọn đáp án, đánh dấu câu cần xem lại, kiểm tra bảng câu trước khi nộp. Mỗi câu đúng được 1 điểm; sai hoặc bỏ trống được 0 điểm.</Text>
      <PrimaryButton label={starting ? 'Đang chuẩn bị…' : `Bắt đầu luyện HSK ${level}`} disabled={starting} onPress={() => void start()} />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: advanced }} onPress={() => setAdvanced(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: theme.primaryText }}>Tùy chọn bài luyện {advanced ? '⌃' : '⌄'}</Text></Pressable>
      {advanced ? <View style={{ gap: 10 }}>
        {kind === 'context' ? (Object.keys(practiceFocusLabels) as PracticeFocus[]).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: focus === value }} disabled={starting} onPress={() => setFocus(value)} style={choiceStyle(focus === value)}><Text style={{ color: theme.textPrimary }}>{practiceFocusLabels[value]}</Text></Pressable>) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: theme.textPrimary, flex: 1 }}>Không quay lại câu trước</Text><Switch accessibilityLabel="Không quay lại câu trước" disabled={starting} value={noBack} onValueChange={setNoBack} /></View>
        <Text style={{ color: theme.textMuted, lineHeight: 21 }}>Bài tập trong app dùng để luyện kỹ năng, chưa phải đề thi chính thức. Thời gian tiếp tục chạy khi bạn rời app.</Text>
      </View> : null}
    </View>
    {error ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text> : null}
  </Screen>;
}
