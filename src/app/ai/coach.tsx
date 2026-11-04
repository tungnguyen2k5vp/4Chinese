import { router, type Href, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { listMemoryCandidates, type MemoryCandidate } from '@/db/hanzi-memory';
import { listMistakes, type Mistake } from '@/db/mistakes';
import { learnerAIContext } from '@/services/ai/adaptive';
import { useAILaunch } from '@/services/ai/context';
import { useLearningLanguage } from '@/services/languages/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function AIStudyCoach() {
  const db = useSQLiteContext(), theme = useTheme(), { preferences } = useLearningLanguage();
  const [words, setWords] = useState<MemoryCandidate[]>([]), [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]), [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [goal, setGoal] = useState('Nhớ chắc từ hay quên và dùng đúng trong câu.'), [minutes, setMinutes] = useState(10);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    void retry;
    if (preferences.learningLanguage !== 'zh') return;
    let live = true; setLoading(true); setError('');
    void Promise.all([listMemoryCandidates(db, 'weak', 12), listMistakes(db)]).then(([w, m]) => {
      if (live) { setWords(w); setMistakes(m.slice(0, 16)); setSelectedWords([]); setSelectedMistakes([]); }
    }).catch(() => { if (live) setError('Chưa đọc được dữ liệu để gợi ý. Bạn có thể thử lại; dữ liệu học giữ nguyên.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [db, preferences.learningLanguage, retry]));
  const body = { color: theme.textSecondary, fontSize: 15, lineHeight: 23 };
  const toggle = (id: string, values: string[], update: (v: string[]) => void, max: number) => update(values.includes(id) ? values.filter(v => v !== id) : values.length < max ? [...values, id] : values);
  if (preferences.learningLanguage !== 'zh') return <Screen title="Study Coach"><Text style={body}>Study Coach cá nhân hiện dành cho tiếng Trung.</Text></Screen>;
  return <Screen title="Study Coach" avoidKeyboard>
    <Text style={body}>Chọn dữ liệu muốn AI xem. Chưa có nội dung nào được gửi; AI chỉ gợi ý luyện thêm, không đổi lịch ôn hoặc mục tiêu đã lưu.</Text>
    <TextInput accessibilityLabel="Mục tiêu Study Coach" multiline maxLength={300} value={goal} onChangeText={setGoal} style={{ color: theme.textPrimary, minHeight: 90, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 12 }} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[5, 10, 15, 20].map(n => <PrimaryButton key={n} label={`${n} phút${minutes === n ? ' ✓' : ''}`} variant="secondary" onPress={() => setMinutes(n)} />)}</View>
    {loading ? <ActivityIndicator accessibilityLabel="Đang đọc dữ liệu gợi ý" color={theme.primary} /> : null}
    {error ? <><Text accessibilityRole="alert" style={body}>{error}</Text><PrimaryButton label="Thử đọc lại" onPress={() => setRetry(n => n + 1)} /></> : null}
    {!loading && !error ? <>
      <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '700' }}>Từ khó nhớ · chọn tối đa 6</Text>
      {!words.length ? <Text style={body}>Chưa có từ đủ dấu hiệu sai lặp lại hoặc quên trong tập này. Bạn vẫn có thể đặt mục tiêu và xin bài khảo sát nháp.</Text> : null}
      {words.map(w => <Pick key={w.word.id} label={`${w.word.simplified} · ${w.word.pinyin} · ${w.wrongCount} lần sai, ${w.lapseCount} lần quên`} selected={selectedWords.includes(w.word.id)}
        disabled={!selectedWords.includes(w.word.id) && selectedWords.length >= 6} onPress={() => toggle(w.word.id, selectedWords, setSelectedWords, 6)} />)}
      <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '700' }}>Mục lỗi · chọn tối đa 8</Text>
      {mistakes.map(m => <Pick key={m.id} label={`${m.title} · ${m.skill_type} · ${m.wrong_count} lần sai`} selected={selectedMistakes.includes(m.id)}
        disabled={!selectedMistakes.includes(m.id) && selectedMistakes.length >= 8} onPress={() => toggle(m.id, selectedMistakes, setSelectedMistakes, 8)} />)}
      {!mistakes.length ? <Text style={body}>Chưa có lỗi đang mở.</Text> : null}
      <Text style={{ ...body, fontSize: 12 }}>Tập gợi ý: tối đa 12 từ khó và 16 trong tối đa 200 mục lỗi đang mở. Chỉ gửi từ/nghĩa (tối đa 3 nghĩa mỗi từ), dạng bài và số đếm bạn chọn; không có đáp án cũ hoặc ghi chú cá nhân.</Text>
      <PrimaryButton label="Xem trước cùng AI" disabled={!goal.trim()} onPress={() => {
        useAILaunch.getState().set({ label: `Mục tiêu ${minutes} phút · ${selectedWords.length} từ, ${selectedMistakes.length} mục lỗi đã chọn`, task: 'coach',
          context: learnerAIContext(goal, minutes, words.filter(w => selectedWords.includes(w.word.id)), mistakes.filter(m => selectedMistakes.includes(m.id))),
          question: 'Phân tích bằng chứng và gợi ý kế hoạch vừa mục tiêu/thời gian tôi chọn; nói rõ giới hạn dữ liệu.' });
        router.push('/ai' as Href);
      }} />
    </> : null}
  </Screen>;
}
function Pick({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  return <MotionPressable accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress}
    style={{ minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 12, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.surface }}>
    <Text style={{ color: theme.textPrimary, fontSize: 15, lineHeight: 23 }}>{selected ? '✓ ' : ''}{label}</Text>
  </MotionPressable>;
}
