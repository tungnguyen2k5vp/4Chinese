import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { MotionPressable } from '@/components/ui/MotionPressable';
import type { ExamQuestion } from '@/services/exam/engine';
import { examPromptParts } from '@/services/exam/presentation';
import { useTheme } from '@/theme/ThemeProvider';

export function ExamQuestionCard({ question, answer, disabled = false, review = false, onAnswer }: {
  question: ExamQuestion; answer?: number; disabled?: boolean; review?: boolean; onAnswer?: (index: number) => void;
}) {
  const theme = useTheme();
  const { passage, instruction } = examPromptParts(question);
  const audio = question.metadata?.audio;
  return <View style={{ gap: 16 }}>
    {audio ? <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
      {audio.source === 'SYSTEM_TTS' ? <AudioButton text={audio.transcript} accessibilityLabel="Nghe nội dung câu hỏi bằng giọng đọc máy" /> : null}
      <Text style={{ color: theme.textMuted, textAlign: 'center' }}>{audio.source === 'SYSTEM_TTS' ? 'Nghe câu hỏi · giữ loa để nghe chậm' : 'Bài này cần bản ghi âm gốc; chưa có trình phát cho tài nguyên này.'}</Text>
      {review ? <Text style={{ color: theme.textPrimary, fontSize: 20, lineHeight: 30 }}>{audio.transcript}</Text> : null}
    </View> : null}
    {passage ? <View style={{ borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 8 }}>
      <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '800' }}>ĐỌC ĐOẠN VĂN</Text>
      <ScrollView nestedScrollEnabled style={{ maxHeight: 240 }} contentContainerStyle={{ paddingBottom: 4 }}>
        <Text style={{ color: theme.textPrimary, fontSize: 23, lineHeight: 37 }}>{passage}</Text>
      </ScrollView>
    </View> : null}
    <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 22, lineHeight: 34, fontWeight: '700' }}>{instruction}</Text>
    <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
      {question.choices.map((choice, index) => {
        const selected = answer === index;
        const correct = review && question.correctIndex === index;
        const wrong = review && selected && !correct;
        const color = correct ? theme.success : wrong ? theme.error : selected ? theme.primaryText : theme.textMuted;
        return <MotionPressable key={`${question.id}-${index}`} accessibilityRole="radio"
          accessibilityLabel={`${String.fromCharCode(65 + index)}. ${choice}${correct ? ', đáp án đúng' : wrong ? ', bạn chọn sai' : ''}`}
          accessibilityState={{ checked: selected, disabled: disabled || review }} disabled={disabled || review}
          onPress={() => onAnswer?.(index)} style={{ minHeight: 64, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
            borderRadius: 20, borderWidth: selected || correct ? 2 : 1, borderColor: selected || correct ? color : theme.border,
            backgroundColor: wrong ? theme.errorSoft : selected || correct ? theme.primarySoft : theme.surface }}>
          <View style={{ minWidth: 32, minHeight: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
            <Text style={{ color, fontWeight: '800', fontSize: 16 }}>{String.fromCharCode(65 + index)}</Text>
          </View>
          <Text style={{ flex: 1, color: theme.textPrimary, fontSize: 20, lineHeight: 30 }}>{choice}</Text>
          {correct || wrong || selected ? <Ionicons name={wrong ? 'close-circle' : correct ? 'checkmark-circle' : 'radio-button-on'} color={color} size={22} /> : null}
        </MotionPressable>;
      })}
    </View>
    {review ? <View style={{ gap: 8, padding: 16, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
      <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{answer === undefined ? 'Bạn đã bỏ trống câu này' : `Bạn chọn ${String.fromCharCode(65 + answer)}`} · Đáp án {String.fromCharCode(65 + question.correctIndex)}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 16, lineHeight: 25 }}>{question.explanationVi}</Text>
    </View> : null}
  </View>;
}
