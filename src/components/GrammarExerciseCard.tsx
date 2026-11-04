import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';

import { spacing } from '@/constants/design';
import { recordGrammarAnswer } from '@/db/grammar';
import { isGrammarAnswerCorrect, type GrammarExercise } from '@/services/learning/grammar-exercises';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';

/** Key by question; completed answers are restored when paging back. */
export function GrammarExerciseCard({ grammarId, exercise, initialResult = null, onRecorded, onBusyChange }: {
  grammarId?: string; exercise: GrammarExercise; initialResult?: boolean | null;
  onRecorded?: (correct: boolean) => void | Promise<void>; onBusyChange?: (busy: boolean) => void;
}) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const [value, setValue] = useState('');
  const [order, setOrder] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(initialResult);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [attemptId] = useState(() => `grammar-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const busy = useRef(false);
  const pendingAnswer = useRef<string | null>(null);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const answer = exercise.kind === 'reorder' ? order.map(index => exercise.tokens[index]).join('') : value;
  const submit = async (chosen = answer) => {
    if (busy.current || result !== null || !chosen.trim()) return;
    const submitted = pendingAnswer.current ?? chosen;
    pendingAnswer.current = submitted;
    busy.current = true;
    setSaving(true); setNotice(''); setValue(submitted); onBusyChange?.(true);
    const correct = isGrammarAnswerCorrect(exercise, submitted);
    let completed = false;
    try {
      if (grammarId) await recordGrammarAnswer(db, grammarId, correct, { id: attemptId, exerciseType: `grammar_${exercise.kind}` });
      await onRecorded?.(correct);
      completed = true;
      if (live.current) setResult(correct);
    } catch {
      if (live.current) setNotice('Chưa lưu xong kết quả. Câu trả lời được giữ nguyên; thử lưu lại để tiếp tục.');
    } finally {
      busy.current = false;
      // Keep paging locked after an ambiguous write until the same attempt is retried.
      onBusyChange?.(!completed);
      if (live.current) setSaving(false);
    }
  };
  const locked = saving || result !== null || !!notice;
  return <View style={styles.block}>
    <Text style={styles.label}>{exercise.label}</Text>
    <Text style={styles.prompt}>{exercise.prompt}</Text>
    {exercise.kind === 'fill_blank' ? <TextInput accessibilityLabel="Điền từ tiếng Trung vào chỗ trống"
      editable={!locked} value={value} onChangeText={setValue} placeholder="Nhập Hán tự" placeholderTextColor={theme.textMuted} maxLength={200}
      style={styles.input} onSubmitEditing={() => void submit()} /> : null}
    {exercise.kind === 'reorder' ? <>
      <Text accessibilityLabel={`Câu đã sắp xếp: ${answer || 'chưa chọn từ'}`} style={styles.assembled}>{answer || 'Chạm các từ theo thứ tự'}</Text>
      <View style={styles.options}>{exercise.tokens.map((token, index) => <Pressable key={`${index}-${token}`}
        accessibilityRole="button" accessibilityLabel={`Chọn ${token}, vị trí ${index + 1}`} accessibilityState={{ disabled: locked || order.includes(index) }} disabled={locked || order.includes(index)}
        onPress={() => setOrder(items => [...items, index])}
        style={[styles.option, order.includes(index) && styles.disabled]}><Text style={styles.optionText}>{token}</Text></Pressable>)}</View>
      <PrimaryButton variant="ghost" label="Bỏ từ cuối" disabled={locked || !order.length} onPress={() => setOrder(items => items.slice(0, -1))} />
    </> : null}
    {exercise.options.length > 0 ? <View style={styles.options}>{exercise.options.map(option => <Pressable
      key={option} accessibilityRole="button" accessibilityLabel={`Chọn ${option}`} accessibilityState={{ disabled: locked, selected: value === option }} disabled={locked}
      onPress={() => void submit(option)} style={[styles.option, value === option && styles.selected]}>
      <Text style={styles.optionText}>{option}</Text></Pressable>)}</View> : null}
    {!exercise.options.length ? <PrimaryButton label={saving ? 'Đang lưu…' : 'Kiểm tra'} loading={saving}
      disabled={locked || !answer.trim() || (exercise.kind === 'reorder' && order.length !== exercise.tokens.length)} onPress={() => void submit()} /> : null}
    {saving ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{grammarId ? 'Đang lưu kết quả…' : 'Đang kiểm tra…'}</Text> : null}
    {notice ? <><Text accessibilityRole="alert" style={styles.notice}>{notice}</Text><PrimaryButton label="Thử lưu lại" variant="secondary" disabled={saving} onPress={() => void submit(pendingAnswer.current ?? answer)} /></> : null}
    {result !== null ? <>
      <Text accessibilityRole="alert" style={[styles.feedback, { color: result ? theme.success : theme.error }]}>{result ? 'Chính xác!' : `Đáp án: ${exercise.answer}`}</Text>
      <Text style={styles.notice}>{exercise.explanation}</Text>
      <Text style={styles.notice}>{grammarId ? 'Đã lưu kết quả ngữ pháp.' : 'Kết quả chỉ trong phiên này, không lưu điểm hay tiến độ bài học.'}</Text>
    </> : null}
  </View>;
}
function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  block: { gap: spacing.md }, label: { color: theme.primaryText, fontWeight: '800', fontSize: 15 },
  prompt: { color: theme.textPrimary, fontSize: 22, lineHeight: 33 },
  input: { color: theme.textPrimary, backgroundColor: theme.surface, fontSize: 20, borderWidth: 1, borderColor: theme.border, padding: spacing.md, borderRadius: 12, minHeight: 48 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { minHeight: 48, minWidth: 48, justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: theme.border, borderRadius: 12, flexShrink: 1 },
  optionText: { color: theme.textPrimary, fontSize: 18 }, selected: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
  disabled: { opacity: 0.4 }, assembled: { color: theme.primaryText, fontSize: 22, lineHeight: 33, minHeight: 48 },
  feedback: { fontWeight: '800', fontSize: 18 }, notice: { color: theme.textMuted, fontSize: 15, lineHeight: 23 },
}); }
