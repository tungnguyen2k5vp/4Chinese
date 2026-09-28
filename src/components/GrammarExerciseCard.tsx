import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';

import { colors, spacing } from '@/constants/design';
import { recordGrammarAnswer } from '@/db/grammar';
import { isGrammarAnswerCorrect, type GrammarExercise } from '@/services/learning/grammar-exercises';

/** Parent keys by exercise + round, so changing exercise cannot reuse a previous answer. */
export function GrammarExerciseCard({ grammarId, exercise }: { grammarId: string; exercise: GrammarExercise }) {
  const db = useSQLiteContext();
  const [value, setValue] = useState('');
  const [order, setOrder] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [attemptId] = useState(() => `grammar-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const busy = useRef(false);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const answer = exercise.kind === 'reorder' ? order.map((index) => exercise.tokens[index]).join('') : value;
  const submit = async (chosen = answer) => {
    if (busy.current || result !== null || !chosen.trim()) return;
    busy.current = true;
    setSaving(true);
    setNotice('');
    const correct = isGrammarAnswerCorrect(exercise, chosen);
    try {
      await recordGrammarAnswer(db, grammarId, correct, { id: attemptId, exerciseType: `grammar_${exercise.kind}` });
      if (live.current) { setValue(chosen); setResult(correct); }
    } catch { if (live.current) setNotice('Chưa lưu được kết quả. Câu trả lời vẫn giữ nguyên, hãy thử lại.'); }
    finally { busy.current = false; if (live.current) setSaving(false); }
  };
  const locked = saving || result !== null;
  return <View style={styles.block}>
    <Text style={styles.label}>{exercise.label}</Text>
    <Text style={styles.prompt}>{exercise.prompt}</Text>
    {exercise.kind === 'fill_blank' ? <TextInput accessibilityLabel="Điền từ tiếng Trung vào chỗ trống"
      editable={!locked} value={value} onChangeText={setValue} placeholder="Nhập Hán tự" maxLength={30}
      style={styles.input} onSubmitEditing={() => void submit()} /> : null}
    {exercise.kind === 'reorder' ? <>
      <Text accessibilityLabel="Câu đã sắp xếp" style={styles.assembled}>{answer || 'Chạm các từ theo thứ tự'}</Text>
      <View style={styles.options}>{exercise.tokens.map((token, index) => <Pressable key={`${index}-${token}`}
        accessibilityRole="button" accessibilityLabel={`Chọn ${token}`} disabled={locked || order.includes(index)}
        onPress={() => setOrder((items) => [...items, index])}
        style={[styles.option, order.includes(index) && styles.disabled]}><Text style={styles.optionText}>{token}</Text></Pressable>)}</View>
      <PrimaryButton variant="ghost" label="Bỏ từ cuối" disabled={locked || !order.length} onPress={() => setOrder((items) => items.slice(0, -1))} />
    </> : null}
    {exercise.options.length > 0 ? <View style={styles.options}>{exercise.options.map((option) => <Pressable
      key={option} accessibilityRole="button" accessibilityLabel={`Chọn ${option}`} disabled={locked}
      onPress={() => { setValue(option); void submit(option); }} style={[styles.option, value === option && styles.selected]}>
      <Text style={styles.optionText}>{option}</Text></Pressable>)}</View> : null}
    {!exercise.options.length ? <PrimaryButton label={saving ? 'Đang lưu…' : 'Kiểm tra'}
      disabled={locked || !answer.trim() || (exercise.kind === 'reorder' && order.length !== exercise.tokens.length)} onPress={() => void submit()} /> : null}
    {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    {result !== null ? <>
      <Text accessibilityRole="alert" style={[styles.feedback, { color: result ? colors.success : colors.danger }]}>
        {result ? 'Chính xác!' : `Đáp án: ${exercise.answer}`}</Text>
      <Text style={styles.notice}>{exercise.explanation}</Text>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  block: { gap: spacing.md }, label: { color: colors.primary, fontWeight: '800' },
  prompt: { color: colors.text, fontSize: 24, lineHeight: 34 },
  input: { color: colors.text, fontSize: 20, borderWidth: 1, borderColor: colors.border, padding: spacing.md, borderRadius: 12, minHeight: 48 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { minHeight: 48, justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  optionText: { color: colors.text, fontSize: 18 }, selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  disabled: { opacity: 0.35 }, assembled: { color: colors.primary, fontSize: 23, minHeight: 45 },
  feedback: { fontWeight: '800', fontSize: 18 }, notice: { color: colors.textMuted, lineHeight: 22 },
});
