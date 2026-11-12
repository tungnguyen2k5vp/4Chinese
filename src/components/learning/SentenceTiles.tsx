import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { DragPiece } from './DragPiece';
import { PracticeFeedback, usePracticeStyles } from './PracticeUI';

import { AudioButton } from '@/components/AudioButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { playFeedback } from '@/services/feedback/feedback-service';
import { sentenceMatches, shuffled, type SceneWord } from '@/services/learning/interactive-content';
import { useAppStore } from '@/stores/app-store';
import { useTheme } from '@/theme/ThemeProvider';

export function SentenceTiles({ word, onNext, last = false }: { word: SceneWord; onNext: (firstTry: boolean) => void; last?: boolean }) {
  const s = usePracticeStyles(), t = useTheme(), settings = useAppStore(state => state.settings);
  const [bank] = useState(() => {
    const tiles = word.tokens.map((text, id) => ({ text, id }));
    const mixed = shuffled(tiles);
    return sentenceMatches(mixed.map(tile => tile.text), word) ? [...mixed.slice(1), mixed[0]!] : mixed;
  });
  const [selected, setSelected] = useState<number[]>([]), [checked, setChecked] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0), [showHint, setShowHint] = useState(false), [revealed, setRevealed] = useState(false);
  const target = useRef<View>(null), advanceLock = useRef(false), checkLock = useRef(false);
  const textFor = (id: number) => word.tokens[id]!;
  const append = (id: number) => { if (checked === true || revealed) return; checkLock.current = false; setChecked(null); setSelected(old => old.includes(id) ? old : [...old, id]); };
  const drop = (id: number, x: number, y: number) => target.current?.measureInWindow((left, top, width, height) => { if (x >= left && x <= left + width && y >= top && y <= top + height) append(id); });
  const complete = checked === true || revealed;
  return <View style={{ gap: 16 }}>
    <View style={{ gap: 6 }}><Text style={s.heading}>{word.translation}</Text><Text style={s.meta}>Kéo hoặc chạm để ghép. Chạm từ trong câu để lấy ra.</Text></View>
    <View ref={target} collapsable={false} accessibilityLabel="Khung ghép câu" style={[s.panel, { minHeight: 116, borderStyle: selected.length ? 'solid' : 'dashed', backgroundColor: complete ? t.successSoft : t.primarySoft, borderColor: complete ? t.success : t.primary }]}>
      <View style={[s.wrap, { minHeight: 48 }]}>{selected.length ? selected.map((id, i) => <StudyTransition key={id} turnKey={`tile-${id}`} animateOnMount effect="success"><Pressable accessibilityRole="button" accessibilityLabel={`Bỏ ${textFor(id)} khỏi vị trí ${i + 1}`} disabled={complete} onPress={() => { checkLock.current = false; setChecked(null); setSelected(old => old.filter(value => value !== id)); }} style={[s.chip, { borderColor: t.primary }]}><Text style={[s.chinese, { fontSize: 23, lineHeight: 32 }]}>{textFor(id)}</Text></Pressable></StudyTransition>) : <Text style={[s.copy, { alignSelf: 'center' }]}>Câu của bạn sẽ xuất hiện ở đây…</Text>}</View>
      <Text style={s.meta}>{selected.length}/{word.tokens.length} mảnh từ</Text>
    </View>
    {selected.length < bank.length ? <View style={[s.wrap, { minHeight: 58, zIndex: 2 }]}>{bank.map(tile => selected.includes(tile.id) ? null : <DragPiece key={tile.id} label={`Thêm ${tile.text} vào câu`} onPress={() => append(tile.id)} onDrop={(x, y) => drop(tile.id, x, y)} disabled={complete} style={s.chip}><Text style={[s.chinese, { fontSize: 23, lineHeight: 32 }]}>{tile.text}</Text></DragPiece>)}</View> : null}
    {showHint && !complete ? <Text style={s.pinyin}>{word.sentencePinyin}</Text> : null}
    {!complete ? <>
      <PrimaryButton label="Kiểm tra câu" disabled={selected.length !== word.tokens.length || checked !== null} onPress={() => {
        if (checkLock.current || checked !== null || selected.length !== word.tokens.length) return;
        checkLock.current = true;
        const correct = sentenceMatches(selected.map(textFor), word); setChecked(correct); setAttempts(value => value + 1); void playFeedback(correct ? 'success' : 'error', settings ?? {});
      }} />
      <View style={s.row}><PrimaryButton label="Xếp lại" variant="ghost" style={{ flex: 1 }} onPress={() => { checkLock.current = false; setSelected([]); setChecked(null); }} /><PrimaryButton label={showHint ? 'Ẩn pinyin' : 'Gợi ý pinyin'} variant="ghost" style={{ flex: 1 }} onPress={() => setShowHint(value => !value)} /></View>
      {checked === false ? <><PracticeFeedback correct={false} explanation="Thử đổi vị trí các mảnh từ. Bạn cũng có thể xem câu mẫu rồi luyện lại." turnKey={`attempt-${attempts}`} /><PrimaryButton label="Xem câu mẫu" variant="secondary" onPress={() => { setRevealed(true); setSelected(word.tokens.map((_, i) => i)); }} /></> : null}
    </> : <>
      <PracticeFeedback correct={checked === true} chinese={word.sentence} explanation={`${word.sentencePinyin}\n${word.translation}`} turnKey={`complete-${attempts}`} />
      <PrimaryButton label={last ? 'Xem kết quả ghép câu' : 'Câu tiếp theo'} onPress={() => { if (advanceLock.current) return; advanceLock.current = true; onNext(checked === true && attempts === 1); }} />
    </>}
    {complete ? <Text style={s.meta}>Câu mẫu gắn với khung cảnh; một ý có thể có nhiều cách diễn đạt đúng khác.</Text> : <View style={s.row}><AudioButton text={word.sentence} /><Text style={[s.meta, { flex: 1 }]}>Nghe gợi ý câu mẫu · giọng đọc máy</Text></View>}
  </View>;
}

