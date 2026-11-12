import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { SocialInput } from './SocialInput';

import { AudioButton } from '@/components/AudioButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PracticeChoice, PracticeFeedback, usePracticeStyles } from '@/components/learning/PracticeUI';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { encodeLearningQuiz, learningQuizSchema, quizTemplates, type LearningQuiz } from '@/services/community/learning-quiz';
import { playFeedback } from '@/services/feedback/feedback-service';
import { useAppStore } from '@/stores/app-store';
import { useTheme } from '@/theme/ThemeProvider';

export function CommunityLearningQuiz({ quiz, compact = false, onOpen }: { quiz: LearningQuiz; compact?: boolean; onOpen?: () => void }) {
  const s = usePracticeStyles(), t = useTheme(), settings = useAppStore(state => state.settings);
  const [choice, setChoice] = useState<number | null>(null), [run, setRun] = useState(0), lock = useRef(false);
  const inner = <>
    <Text style={[s.meta, { color: t.skillColors.grammar, fontWeight: '800' }]}>ĐỐ VUI · {quiz.kind === 'listen' ? 'NGHE & ĐOÁN' : quiz.kind === 'sentence' ? 'CHỌN CÂU ĐÚNG' : 'ĐOÁN NGHĨA'}</Text>
    <Text style={s.heading}>{quiz.question}</Text>
    {quiz.chinese && quiz.kind !== 'listen' ? <Text selectable={!compact} style={s.chinese}>{quiz.chinese}</Text> : null}
    {compact ? <Text style={s.copy}>{quiz.choices.length} lựa chọn · mở bài để thử sức →</Text> : <>
      {quiz.chinese ? <View style={s.row}><AudioButton text={quiz.chinese} accessibilityLabel="Nghe nội dung bài đố" /><Text style={s.meta}>Giọng đọc máy · giữ để nghe chậm</Text></View> : null}
      {quiz.kind === 'listen' && settings?.soundEnabled === false ? <Text accessibilityRole="alert" style={s.copy}>Bật Âm thanh trong Cài đặt để nghe câu hỏi.</Text> : null}
      {quiz.choices.map((text, i) => <PracticeChoice key={i} label={text} prefix={String.fromCharCode(65 + i)} selected={choice === i} correct={choice !== null && quiz.answer === i} disabled={choice !== null} onPress={() => { if (lock.current) return; lock.current = true; setChoice(i); void playFeedback(i === quiz.answer ? 'success' : 'error', settings ?? {}); }} />)}
      {choice !== null ? <><PracticeFeedback correct={choice === quiz.answer} explanation={quiz.explanation} chinese={quiz.kind === 'listen' ? quiz.chinese : undefined} turnKey={`quiz-${run}-${choice}`} /><PrimaryButton label="Thử lại bài đố" variant="ghost" onPress={() => { setChoice(null); setRun(value => value + 1); lock.current = false; }} /></> : null}
      <Text style={s.meta}>Đáp án do tác giả bài viết cung cấp. Lượt chơi không lưu điểm hay thay đổi tiến độ học.</Text>
    </>}
  </>;
  return compact ? <MotionPressable accessibilityLabel={`Chơi bài đố: ${quiz.question}`} onPress={() => onOpen?.()} style={[s.panel, { backgroundColor: t.skillSurfaces.grammar }]}>{inner}</MotionPressable> : <View style={[s.panel, { backgroundColor: t.skillSurfaces.grammar }]}>{inner}</View>;
}

export function QuizComposer({ value, onChange, introduction, disabled }: { value: LearningQuiz; onChange: (quiz: LearningQuiz) => void; introduction: string; disabled: boolean }) {
  const s = usePracticeStyles(), t = useTheme();
  const [preview, setPreview] = useState(false);
  const parsed = learningQuizSchema.safeParse(value);
  let validation = parsed.success ? '' : parsed.error.issues[0]?.message ?? 'Kiểm tra nội dung bài đố.';
  if (parsed.success) { try { encodeLearningQuiz(parsed.data, introduction); } catch (e) { validation = e instanceof Error ? e.message : 'Bài đố chưa hợp lệ.'; } }
  return <View style={s.panel}>
    <Text style={s.heading}>Thiết kế bài đố của bạn</Text><Text style={s.meta}>Chọn mẫu để bắt đầu, rồi sửa câu hỏi, lựa chọn và lời giải. Chạm chữ cái để đánh dấu đáp án đúng.</Text>
    <View style={s.wrap}>{quizTemplates.map(template => <MotionPressable key={template.title} accessibilityLabel={`Mẫu bài đố ${template.title}`} disabled={disabled} onPress={() => { onChange({ ...template.quiz, choices: [...template.quiz.choices] }); setPreview(false); }} style={s.chip}><Text style={s.copy}>{template.title}</Text></MotionPressable>)}</View>
    <Text style={s.copy}>Câu hỏi</Text><SocialInput placeholder="Câu hỏi bài đố" value={value.question} editable={!disabled} maxLength={240} onChangeText={question => onChange({ ...value, question })} multiline />
    <Text style={s.copy}>{value.kind === 'listen' ? 'Nội dung phát âm (ẩn trước khi chọn đáp án)' : 'Hán tự hoặc câu gợi ý (không bắt buộc)'}</Text><SocialInput placeholder="Nội dung tiếng Trung bài đố" value={value.chinese} editable={!disabled} maxLength={100} onChangeText={chinese => onChange({ ...value, chinese })} />
    {value.choices.map((choice, i) => <View key={i} style={s.row}><MotionPressable accessibilityRole="radio" accessibilityLabel={`Đặt ${String.fromCharCode(65 + i)} làm đáp án đúng`} accessibilityState={{ checked: value.answer === i }} disabled={disabled} onPress={() => onChange({ ...value, answer: i })} style={[s.chip, { backgroundColor: value.answer === i ? t.successSoft : t.surface, borderColor: value.answer === i ? t.success : t.border }]}><Text style={s.heading}>{String.fromCharCode(65 + i)}{value.answer === i ? ' ✓' : ''}</Text></MotionPressable><SocialInput style={{ flex: 1 }} placeholder={`Đáp án ${String.fromCharCode(65 + i)}`} value={choice} editable={!disabled} maxLength={100} onChangeText={text => onChange({ ...value, choices: value.choices.map((old, index) => index === i ? text : old) })} /></View>)}
    <View style={s.row}>{value.choices.length < 4 ? <PrimaryButton label="Thêm lựa chọn" disabled={disabled} variant="ghost" onPress={() => onChange({ ...value, choices: [...value.choices, ''] })} /> : null}{value.choices.length > 2 ? <PrimaryButton label="Bỏ lựa chọn cuối" disabled={disabled} variant="ghost" onPress={() => onChange({ ...value, choices: value.choices.slice(0, -1), answer: Math.min(value.answer, value.choices.length - 2) })} /> : null}</View>
    <Text style={s.copy}>Lời giải sau khi trả lời</Text><SocialInput placeholder="Giải thích đáp án bài đố" value={value.explanation} editable={!disabled} maxLength={500} multiline onChangeText={explanation => onChange({ ...value, explanation })} />
    {validation ? <Text accessibilityLiveRegion="polite" style={[s.copy, { color: t.error }]}>{validation}</Text> : null}
    <PrimaryButton label={preview ? 'Đóng bản xem thử' : 'Chơi thử trước khi đăng'} variant="secondary" disabled={disabled || !!validation} onPress={() => setPreview(old => !old)} />
    {preview && parsed.success ? <CommunityLearningQuiz key={JSON.stringify(value)} quiz={parsed.data} /> : null}
  </View>;
}
