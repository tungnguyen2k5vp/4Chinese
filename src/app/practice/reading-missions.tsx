import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PracticeChoice, PracticeFeedback, PracticeMenuItem, PracticeResult, PracticeRoundHeader, usePracticeStyles } from '@/components/learning/PracticeUI';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { usePracticeSpeech } from '@/hooks/use-practice-speech';
import { readingDocuments, type ReadingDocument, type ReadingQuestion } from '@/services/learning/adventure-content';
import { useTheme } from '@/theme/ThemeProvider';

export default function ReadingMissions() {
  const s = usePracticeStyles();
  const [document, setDocument] = useState<ReadingDocument | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  return <Screen key={document?.id ?? 'menu'} scrollRef={scrollRef} title="Tìm thông tin thực tế" hideHeader>{document ? <ReadingSession key={document.id} document={document} onTurn={() => scrollRef.current?.scrollTo({ y: 0, animated: false })} onExit={() => setDocument(null)} /> : <>
    <Text style={s.title}>Đọc để làm được một việc</Text><Text style={s.copy}>Tìm giá món, giờ tàu hoặc chi tiết một cuộc hẹn. Chạm dòng quan trọng để đánh dấu, rồi chọn đáp án.</Text>
    {readingDocuments.map(item => <PracticeMenuItem key={item.id} scene={item.scene} title={item.title} subtitle={`${item.subtitle} · 4 câu hỏi`} onPress={() => setDocument(item)} />)}
    <Text style={s.meta}>Mẫu do 4Chinese biên soạn để luyện đọc, không phải thực đơn, lịch tàu hay tin nhắn thật. Không đổi tiến độ học.</Text>
  </>}</Screen>;
}

function ReadingSession({ document, onExit, onTurn }: { document: ReadingDocument; onExit: () => void; onTurn: () => void }) {
  const [results, setResults] = useState<boolean[]>([]);
  usePracticeSpeech(results.length);
  if (results.length === document.questions.length) return <><PracticeResult scene={document.scene} correct={results.filter(Boolean).length} total={results.length} onRestart={() => { setResults([]); onTurn(); }} /><PrimaryButton label="Chọn tư liệu khác" variant="ghost" onPress={onExit} /></>;
  return <>
    <PracticeRoundHeader title={document.title} current={results.length + 1} total={document.questions.length} onExit={onExit} />
    <ReadingTurn key={results.length} document={document} question={document.questions[results.length]!} last={results.length === document.questions.length - 1} onNext={correct => { setResults(old => [...old, correct]); onTurn(); }} />
  </>;
}

function ReadingTurn({ document, question, last, onNext }: { document: ReadingDocument; question: ReadingQuestion; last: boolean; onNext: (correct: boolean) => void }) {
  const s = usePracticeStyles(), t = useTheme();
  const [choice, setChoice] = useState<number | null>(null), [translated, setTranslated] = useState(false), [marked, setMarked] = useState<string[]>([]);
  const choiceLock = useRef(false), nextLock = useRef(false), answered = choice !== null;
  return <>
    <Text accessibilityRole="header" style={s.title}>{question.prompt}</Text>
    <View style={[s.panel, { padding: 14, borderTopWidth: 4, borderTopColor: t.primary, gap: 10 }]}>
      <View style={{ gap: 4 }}><Text style={[s.meta, { letterSpacing: 1 }]}>MẪU LUYỆN ĐỌC · {document.id === 'menu' ? 'THỰC ĐƠN' : document.id === 'ticket' ? 'VÉ TÀU GIẢ LẬP' : 'TIN NHẮN GIẢ LẬP'}</Text><Text style={[s.chinese, { fontSize: 25, lineHeight: 36 }]}>{document.chineseTitle}</Text></View>
      {document.rows.map((row, index) => {
        const evidence = answered && question.evidence.includes(row.id), selected = marked.includes(row.id);
        return <View key={row.id} style={{ gap: 5 }}>
          <MotionPressable accessibilityLabel={`Đánh dấu dòng ${index + 1}: ${row.chinese}`} accessibilityState={{ selected }} onPress={() => setMarked(old => old.includes(row.id) ? old.filter(id => id !== row.id) : [...old, row.id])} style={{ gap: 5, padding: 12, borderRadius: 14, minHeight: 52, borderWidth: 1, borderColor: evidence ? t.success : selected ? t.primary : t.border, backgroundColor: evidence ? t.successSoft : selected ? t.primarySoft : t.background }}>
            <View style={s.row}><Text style={[s.meta, { flex: 1 }]}>{row.label ?? `Dòng ${index + 1}`}</Text>{evidence ? <Text style={[s.meta, { color: t.success }]}>✓ Dữ kiện đáp án</Text> : selected ? <Text style={[s.meta, { color: t.primaryText }]}>Đã đánh dấu</Text> : null}</View>
            <Text style={[s.copy, { fontSize: 21, lineHeight: 32, color: t.textPrimary, fontWeight: '600' }]}>{row.chinese}</Text>
            {translated ? <><Text style={s.pinyin}>{row.pinyin}</Text><Text style={s.copy}>{row.meaning}</Text></> : null}
          </MotionPressable>
        </View>;
      })}
      <View style={[s.row, { flexWrap: 'wrap' }]}><PrimaryButton label={translated ? 'Ẩn bản dịch' : 'Hiện bản dịch hỗ trợ'} variant="ghost" onPress={() => setTranslated(value => !value)} /><AudioButton text={document.rows.map(row => row.chinese).join('。')} accessibilityLabel="Nghe toàn bộ tư liệu" /></View>
    </View>
    {question.choices.map((label, index) => <PracticeChoice key={label} label={label} prefix={String.fromCharCode(65 + index)} selected={choice === index} disabled={answered} correct={answered && index === question.answer} onPress={() => { if (choiceLock.current) return; choiceLock.current = true; setChoice(index); }} />)}
    {answered ? <><PracticeFeedback correct={choice === question.answer} explanation={question.explanation} turnKey="reading-answer" /><Text style={s.meta}>Các dòng có nhãn “Dữ kiện đáp án” là căn cứ để đối chiếu, dù bạn đã đánh dấu dòng nào.</Text><PrimaryButton label={last ? 'Xem kết quả đọc' : 'Câu hỏi đọc tiếp theo'} onPress={() => { if (nextLock.current) return; nextLock.current = true; onNext(choice === question.answer); }} /></> : <Text style={s.meta}>Có thể cuộn lên xem lại tư liệu bất cứ lúc nào. Không tính giờ.</Text>}
  </>;
}
