import { useRef, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DragPiece } from '@/components/learning/DragPiece';
import { PracticeFeedback, PracticeResult, PracticeRoundHeader, usePracticeStyles } from '@/components/learning/PracticeUI';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { usePracticeSpeech } from '@/hooks/use-practice-speech';
import { assemblyCharacters, assemblyMatches } from '@/services/learning/adventure-content';
import { shuffled } from '@/services/learning/interactive-content';
import { canonicalRadical, componentMeaning } from '@/services/memory/character-content';
import { useTheme } from '@/theme/ThemeProvider';

type Puzzle = typeof assemblyCharacters[number];
const groups = [
  { title: 'Trái – phải', match: 'Trái', example: '休 · 明 · 林 · 妈 · 河 · 晴 · 请' },
  { title: 'Trên – dưới', match: 'Trên', example: '字 · 安 · 男' },
  { title: 'Khung bao', match: 'Bao', example: '问 · 国' },
];

export default function CharacterAssembly() {
  const s = usePracticeStyles(), t = useTheme();
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null), [results, setResults] = useState<boolean[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  usePracticeSpeech(`${puzzles?.[0]?.character ?? 'menu'}-${results.length}`);
  return <Screen key={puzzles?.[0]?.character ?? 'menu'} scrollRef={scrollRef} title="Ghép thành phần Hán tự" hideHeader>{!puzzles ? <>
    <Text style={s.title}>Mỗi phần tìm đúng vị trí</Text><Text style={s.copy}>Nghe âm hoặc đọc nghĩa, rồi kéo/chạm thành phần vào từng ô. Đây là bài ghép cấu tạo, không phải luyện thứ tự nét.</Text>
    {groups.map(group => <MotionPressable key={group.match} accessibilityLabel={`Luyện bố cục ${group.title}`} style={[s.panel, { borderLeftWidth: 4, borderLeftColor: t.primary }]} onPress={() => { setResults([]); setPuzzles(assemblyCharacters.filter(item => item.structure.layout.startsWith(group.match))); }}><Text style={s.heading}>{group.title}</Text><Text style={s.chinese}>{group.example}</Text><Text style={s.meta}>{assemblyCharacters.filter(item => item.structure.layout.startsWith(group.match)).length} chữ · có đối chiếu cấu tạo</Text></MotionPressable>)}
    <PrimaryButton label="Luyện cả 12 chữ" onPress={() => { setResults([]); setPuzzles(assemblyCharacters); }} />
    <Text style={s.meta}>Thành phần hình thể không phải lúc nào cũng là bộ thủ. Mẹo liên tưởng được ghi riêng, không dùng thay từ nguyên. Lượt luyện không đổi tiến độ học.</Text>
  </> : results.length === puzzles.length ? <PracticeResult scene="classroom" correct={results.filter(Boolean).length} total={results.length} onRestart={() => { setResults([]); scrollRef.current?.scrollTo({ y: 0, animated: false }); }} /> : <>
    <PracticeRoundHeader title="Ghép thành phần Hán tự" current={results.length + 1} total={puzzles.length} onExit={() => setPuzzles(null)} />
    <AssemblyTurn key={results.length} puzzle={puzzles[results.length]!} last={results.length === puzzles.length - 1} onNext={firstTry => { setResults(old => [...old, firstTry]); scrollRef.current?.scrollTo({ y: 0, animated: false }); }} />
  </>}</Screen>;
}

function AssemblyTurn({ puzzle, last, onNext }: { puzzle: Puzzle; last: boolean; onNext: (firstTry: boolean) => void }) {
  const s = usePracticeStyles(), t = useTheme(), { structure } = puzzle;
  const [bank] = useState(() => shuffled([...structure.parts, ...['口', '木', '日', '子', '女', '玉', '囗'].filter(part => !structure.parts.includes(part)).slice(0, 2)].map((text, id) => ({ text, id }))));
  const [slots, setSlots] = useState<(number | null)[]>(() => structure.parts.map(() => null));
  const values = useRef(slots), active = useRef(0), targets = useRef<(View | null)[]>([]), checkLock = useRef(false), nextLock = useRef(false), solved = useRef(false);
  const [checked, setChecked] = useState<boolean | null>(null), [attempts, setAttempts] = useState(0), [revealed, setRevealed] = useState(false), [pinyin, setPinyin] = useState(false), [sourceError, setSourceError] = useState('');
  const done = checked === true || revealed, vertical = structure.layout.startsWith('Trên'), enclosed = structure.layout.startsWith('Bao');
  const labels = enclosed ? ['Khung bao', 'Bên trong'] : vertical ? ['Bên trên', 'Bên dưới'] : ['Bên trái', 'Bên phải'];
  const textFor = (id: number) => bank.find(piece => piece.id === id)!.text;
  const place = (id: number, slot = active.current) => {
    if (solved.current || values.current.includes(id) || values.current[slot] !== null) return;
    const next = values.current.map((value, index) => index === slot ? id : value);
    values.current = next; active.current = Math.max(0, next.indexOf(null)); checkLock.current = false; setSlots(next); setChecked(null);
  };
  return <>
    {!done ? <>
    <View style={[s.panel, { backgroundColor: t.primarySoft }]}><Text style={s.meta}>GHÉP CHỮ CÓ NGHĨA</Text><Text style={s.title}>{puzzle.clue}</Text><View style={[s.row, { flexWrap: 'wrap' }]}><AudioButton text={puzzle.character} accessibilityLabel="Nghe âm của chữ cần ghép" /><PrimaryButton label={pinyin ? 'Ẩn pinyin' : 'Gợi ý pinyin'} variant="ghost" onPress={() => setPinyin(value => !value)} />{pinyin ? <Text style={s.pinyin}>{structure.pinyin}</Text> : null}</View></View>
    <Text style={s.heading}>Bố cục: {structure.layout.toLowerCase()}</Text>
    <Text style={s.meta}>Chạm ô để lấy thành phần ra, rồi chạm mảnh mới. Có thể kéo trực tiếp vào từng ô.</Text>
    <View style={[enclosed && { borderWidth: 2, borderRadius: 22, borderColor: t.primary, padding: 12 }, { flexDirection: vertical || enclosed ? 'column' : 'row', gap: 10 }]}>{structure.parts.map((_, index) => <View ref={node => { targets.current[index] = node; }} collapsable={false} key={index} style={{ flex: vertical || enclosed ? undefined : 1 }}>
      <MotionPressable accessibilityLabel={`Ô ${index + 1}: ${labels[index]}${slots[index] !== null ? `, ${textFor(slots[index]!)}, chạm để lấy ra` : ', còn trống'}`} disabled={done} onPress={() => { if (done) return; active.current = index; values.current = values.current.map((value, i) => i === index ? null : value); checkLock.current = false; setSlots(values.current); setChecked(null); }} style={[s.panel, { minHeight: 100, alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: done ? t.successSoft : t.surface, borderStyle: slots[index] === null ? 'dashed' : 'solid' }]}>
        <Text style={s.meta}>{labels[index]}</Text><Text style={[s.chinese, { fontSize: 34, lineHeight: 44 }]}>{slots[index] === null ? '＋' : textFor(slots[index]!)}</Text>
      </MotionPressable>
    </View>)}</View>
    </> : null}
    {!done ? <>
      <View style={[s.wrap, { zIndex: 2 }]}>{bank.filter(piece => !slots.includes(piece.id)).map(piece => <DragPiece key={piece.id} label={`Chọn thành phần ${piece.text}, mảnh ${piece.id + 1}`} style={[s.chip, { minWidth: 58, alignItems: 'center' }]} onPress={() => place(piece.id)} onDrop={(x, y) => targets.current.forEach((target, index) => target?.measureInWindow((a, b, w, h) => { if (x >= a && x <= a + w && y >= b && y <= b + h) place(piece.id, index); }))}><Text style={[s.chinese, { fontSize: 32, lineHeight: 44 }]}>{piece.text}</Text></DragPiece>)}</View>
      <PrimaryButton label="Kiểm tra chữ" disabled={slots.includes(null) || checked !== null} onPress={() => {
        if (checkLock.current || values.current.includes(null)) return;
        checkLock.current = true; const correct = assemblyMatches(values.current.map(id => textFor(id!)), puzzle.character); solved.current = correct; setChecked(correct); setAttempts(value => value + 1);
      }} />
      <PrimaryButton label="Xếp lại các phần" variant="ghost" onPress={() => { values.current = structure.parts.map(() => null); active.current = 0; checkLock.current = false; setSlots(values.current); setChecked(null); }} />
      {checked === false ? <><PracticeFeedback correct={false} explanation={`Hãy xem lại thành phần và vị trí theo bố cục ${structure.layout.toLowerCase()}. Mỗi mảnh chỉ dùng được một lần.`} turnKey={`attempt-${attempts}`} /><PrimaryButton label="Xem cách ghép" variant="secondary" onPress={() => { if (solved.current) return; solved.current = true; const used = new Set<number>(); const ids = structure.parts.map(part => { const piece = bank.find(value => value.text === part && !used.has(value.id))!; used.add(piece.id); return piece.id; }); values.current = ids; setSlots(ids); setRevealed(true); }} /></> : null}
    </> : <>
      <StudyTransition turnKey="assembled" animateOnMount effect="stamp"><View style={[s.panel, { alignItems: 'center', backgroundColor: t.successSoft }]}><Text style={[s.chinese, { fontSize: 76, lineHeight: 100 }]}>{puzzle.character}</Text><Text style={s.pinyin}>{structure.pinyin} · {puzzle.clue}</Text><AudioButton text={puzzle.character} /></View></StudyTransition>
      <Text accessibilityLiveRegion="polite" style={s.heading}>{revealed ? 'Cùng đối chiếu cách ghép' : 'Đã ghép đúng cấu tạo!'}</Text>
      <Text style={s.pinyin}>{structure.parts.join(' + ')} → {puzzle.character} · {structure.layout}</Text>
      <Text style={s.copy}>{structure.parts.map(part => `${part}: ${componentMeaning(part)}`).join(' · ')}</Text>
      {structure.radical ? <Text style={s.copy}>Bộ thủ tra cứu: {structure.radical}{canonicalRadical(structure.radical) !== structure.radical ? ` (dạng của ${canonicalRadical(structure.radical)})` : ''}.</Text> : null}
      <Text style={s.copy}>Gợi nhớ khi luyện: {puzzle.note}</Text><Text style={s.meta}>Ghi chú vị trí và liên tưởng để học, không phải giải thích từ nguyên. Hình chữ hoàn chỉnh ở trên là mẫu để đối chiếu.</Text>
      <PrimaryButton label={`Xem mục từ ${puzzle.character} trên Hán Điển`} variant="ghost" onPress={() => { void Linking.openURL(structure.sourceUrl).catch(() => setSourceError('Chưa mở được nguồn. Bạn có thể xem tại zdic.net/hans/' + puzzle.character)); }} />{sourceError ? <Text style={s.copy}>{sourceError}</Text> : null}
      <PrimaryButton label={last ? 'Xem kết quả ghép chữ' : 'Chữ tiếp theo'} onPress={() => { if (nextLock.current) return; nextLock.current = true; onNext(checked === true && attempts === 1 && !revealed); }} />
    </>}
  </>;
}
