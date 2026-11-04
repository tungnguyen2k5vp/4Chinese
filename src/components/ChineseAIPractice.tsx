import { useState } from 'react';
import { Text, View } from 'react-native';

import { ChineseAIEntry } from '@/components/ChineseAIEntry';
import { PrimaryButton } from '@/components/PrimaryButton';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import type { AIQuiz } from '@/services/ai/gateway';
import { practiceAIContext, summarizeAIPractice } from '@/services/ai/learning';
import { useTheme } from '@/theme/ThemeProvider';

export function ChineseAIPractice({ quiz, hskLevel, reviewed = false }: { quiz: AIQuiz[]; hskLevel?: number | null; reviewed?: boolean }) {
  const theme = useTheme();
  const [index, setIndex] = useState(0), [selected, setSelected] = useState<(number | null)[]>(() => quiz.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const summary = summarizeAIPractice(quiz, selected), current = quiz[index];
  if (!current) return null;
  const matched = selected[index] === current.answerIndex;
  const body = { color: theme.textSecondary, fontSize: 15, lineHeight: 23 };
  const author = reviewed ? 'bản nháp' : 'AI';
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 19, fontWeight: '800' }}>Luyện nháp · {quiz.length} câu</Text>
    <Text style={body}>Chọn đáp án rồi nộp để xem giải thích. {reviewed ? 'Bản nháp đã được tự đối chiếu, chưa phải đề thi chính thức' : 'Bài AI chưa được biên tập'}; kết quả không ghi vào tiến độ.</Text>
    <View accessibilityLabel="Chuyển câu trong bài luyện AI" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {quiz.map((_, i) => <MotionPressable key={i} accessibilityRole="button" accessibilityLabel={`Câu ${i + 1}${selected[i] !== null ? ', đã chọn' : ', chưa chọn'}`}
        accessibilityState={{ selected: index === i }} onPress={() => setIndex(i)} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12,
          borderWidth: 1, borderColor: index === i ? theme.primary : theme.border, backgroundColor: index === i ? theme.primarySoft : theme.surface }}>
        <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{i + 1}{selected[i] !== null ? ' •' : ''}</Text>
      </MotionPressable>)}
    </View>
    <Text accessibilityLiveRegion="polite" style={body}>{submitted ? `${summary.matched}/${summary.total} câu khớp đáp án ${author}. Có thể mở từng câu để đối chiếu.` : `Đã chọn ${summary.answered}/${summary.total} câu.`}</Text>
    <StudyTransition turnKey={`${index}:${submitted}`} effect={submitted && matched ? 'success' : 'reveal'} style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 18, lineHeight: 27 }}>Câu {index + 1}. {current.question}</Text>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {current.choices.map((choice, i) => <MotionPressable key={i} accessibilityRole="radio" accessibilityLabel={choice} disabled={submitted}
          accessibilityState={{ checked: selected[index] === i, disabled: submitted }} onPress={() => setSelected(values => values.map((value, n) => n === index ? i : value))}
          style={{ minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 12, justifyContent: 'center', borderColor: selected[index] === i ? theme.primary : theme.border,
            backgroundColor: selected[index] === i ? theme.primarySoft : theme.surface }}>
          <Text style={{ color: theme.textPrimary, fontSize: 16, lineHeight: 24 }}>{selected[index] === i ? '✓ ' : ''}{choice}</Text>
        </MotionPressable>)}
      </View>
      {submitted ? <View accessibilityLiveRegion="polite" style={{ gap: 8, padding: 12, borderRadius: 12, backgroundColor: matched ? theme.successSoft : theme.warningSoft }}>
        <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{matched ? `Khớp đáp án ${author}` : 'Cần đối chiếu lại'}</Text>
        <Text style={body}>Bạn chọn: {current.choices[selected[index]!]}</Text>
        <Text style={body}>Đáp án {author} gợi ý: {current.choices[current.answerIndex]}</Text>
        <Text selectable style={body}>{current.explanation}</Text>
      </View> : null}
    </StudyTransition>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <PrimaryButton label="Câu trước" variant="ghost" style={{ flex: 1 }} disabled={index === 0} onPress={() => setIndex(i => i - 1)} />
      <PrimaryButton label="Câu sau" variant="secondary" style={{ flex: 1 }} disabled={index === quiz.length - 1} onPress={() => setIndex(i => i + 1)} />
    </View>
    {submitted ? <PrimaryButton label="Làm lại bài này" variant="secondary" onPress={() => { setSelected(quiz.map(() => null)); setIndex(0); setSubmitted(false); }} />
      : <PrimaryButton label="Nộp bài nháp" disabled={summary.answered !== summary.total} onPress={() => { setSubmitted(true); setIndex(0); }} />}
    <Text style={{ ...body, fontSize: 12 }}>Chuyển câu, xem kết quả và làm lại không gọi thêm AI.</Text>
    {submitted && !reviewed ? <>
      <Text style={body}>Muốn hiểu lựa chọn của mình? Xem trước bài và đáp án đã chọn trước khi cho AI phân tích hoặc tạo bài luyện tiếp. Đáp án tham khảo vẫn cần kiểm chứng.</Text>
      <ChineseAIEntry label="Xem trước phân tích bài vừa làm" load={async () => ({ label: 'Bài nháp vừa nộp và lựa chọn của bạn', task: 'practice_review', hskLevel,
        context: practiceAIContext(quiz, selected), question: 'Đối chiếu lựa chọn thực tế của tôi và kiểm tra lại đáp án tham khảo. Nêu điểm cần luyện có bằng chứng, không mặc định đáp án AI đúng.' })} />
      <ChineseAIEntry label="Xem trước bài luyện tiếp" load={async () => ({ label: 'Bài nháp vừa nộp và lựa chọn của bạn', task: 'practice', hskLevel,
        context: practiceAIContext(quiz, selected), question: 'Tạo 3 câu mới theo những điểm tôi cần luyện trong bài này. Kiểm tra lại đáp án tham khảo trước khi suy luận lỗi.' })} />
    </> : null}
  </View>;
}
