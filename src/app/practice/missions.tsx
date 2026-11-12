import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DragPiece } from '@/components/learning/DragPiece';
import { PracticeArt, PracticeObject } from '@/components/learning/PracticeArt';
import { PracticeFeedback, PracticeMenuItem, PracticeResult, PracticeRoundHeader, usePracticeStyles } from '@/components/learning/PracticeUI';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { usePracticeSpeech } from '@/hooks/use-practice-speech';
import { sceneMissions, type SceneMission } from '@/services/learning/adventure-content';
import { practiceScenes, type PracticeScene } from '@/services/learning/interactive-content';
import { useTheme } from '@/theme/ThemeProvider';

export default function SceneMissions() {
  const params = useLocalSearchParams<{ scene?: string }>(), s = usePracticeStyles();
  const [scene, setScene] = useState(() => practiceScenes.find(item => item.id === params.scene) ?? null);
  const scrollRef = useRef<ScrollView>(null);
  return <Screen key={scene?.id ?? 'menu'} scrollRef={scrollRef} title="Nhiệm vụ trong cảnh" hideHeader>{scene ? <MissionSession key={scene.id} scene={scene} onTurn={() => scrollRef.current?.scrollTo({ y: 0, animated: false })} onExit={() => setScene(null)} /> : <>
    <Text style={s.title}>Nghe, chọn và giao đúng chỗ</Text>
    <Text style={s.copy}>Nghe yêu cầu, kéo đồ vật đến nơi nhận. Bạn cũng có thể chạm đồ vật rồi chạm nơi nhận.</Text>
    {practiceScenes.map(item => <PracticeMenuItem key={item.id} title={item.title} subtitle="3 nhiệm vụ · nghe và phân biệt vị trí" scene={item.id} onPress={() => setScene(item)} />)}
    <Text style={s.meta}>Không giới hạn thời gian. Có pinyin và nghĩa khi cần; lượt chơi không ghi vào tiến độ học.</Text>
  </>}</Screen>;
}

function MissionSession({ scene, onExit, onTurn }: { scene: PracticeScene; onExit: () => void; onTurn: () => void }) {
  const [results, setResults] = useState<boolean[]>([]), s = usePracticeStyles();
  usePracticeSpeech(results.length);
  const content = sceneMissions[scene.id];
  if (results.length === content.tasks.length) return <><PracticeResult scene={scene.id} correct={results.filter(Boolean).length} total={results.length} onRestart={() => { setResults([]); onTurn(); }} /><PrimaryButton label="Chọn cảnh khác" variant="ghost" onPress={onExit} /></>;
  return <>
    <PracticeRoundHeader title={scene.title} current={results.length + 1} total={content.tasks.length} onExit={onExit} />
    <MissionTurn key={results.length} scene={scene} task={content.tasks[results.length]!} places={content.places} onNext={firstTry => { setResults(old => [...old, firstTry]); onTurn(); }} last={results.length === content.tasks.length - 1} />
    <Text style={s.meta}>Kéo ra ngoài nơi nhận sẽ trả đồ về, không tính là trả lời sai.</Text>
  </>;
}

function MissionTurn({ scene, task, places, last, onNext }: { scene: PracticeScene; task: SceneMission; places: [string, string]; last: boolean; onNext: (firstTry: boolean) => void }) {
  const s = usePracticeStyles(), t = useTheme();
  const [selected, setSelected] = useState<string | null>(null), [hint, setHint] = useState(false);
  const [result, setResult] = useState<boolean | null>(null), [attempts, setAttempts] = useState(0), [message, setMessage] = useState('');
  const left = useRef<View>(null), right = useRef<View>(null), solved = useRef(false), nextLock = useRef(false), deliveryLock = useRef(false);
  const answer = scene.words.find(item => item.id === task.item)!;
  const deliver = (item: string, place: number) => {
    if (solved.current || deliveryLock.current) return;
    deliveryLock.current = true;
    const correct = item === task.item && place === task.place;
    solved.current = correct;
    setAttempts(value => value + 1); setResult(correct); setSelected(null);
    setMessage(correct ? task.explanation : item !== task.item ? 'Chưa đúng đồ vật. Nghe lại hoặc mở gợi ý, rồi thử một món khác nhé.' : 'Đúng đồ vật rồi, nhưng chưa đúng nơi nhận. Hãy nghe lại phần chỉ vị trí.');
  };
  const drop = (id: string, x: number, y: number) => { deliveryLock.current = false; [left, right].forEach((target, index) => target.current?.measureInWindow((a, b, w, h) => { if (x >= a && x <= a + w && y >= b && y <= b + h) deliver(id, index); })); };
  return <>
    <View style={{ height: 120, borderRadius: 20, overflow: 'hidden' }}><PracticeArt scene={scene.id} reaction={`delivery-${attempts}`} celebration={result === true} /></View>
    <View style={[s.row, { flexWrap: 'wrap' }]}><AudioButton text={task.chinese} accessibilityLabel="Nghe yêu cầu giao đồ" /><View style={{ flex: 1, minWidth: 120 }}><Text style={s.heading}>{result === true ? 'Đã giao đúng yêu cầu' : 'Bạn cần giao gì, đến đâu?'}</Text><Text style={s.meta}>Bấm loa để nghe · giữ loa để nghe chậm</Text></View></View>
    {result !== true ? <PrimaryButton label={hint ? 'Ẩn gợi ý yêu cầu' : 'Hiện pinyin và nghĩa'} variant="ghost" onPress={() => setHint(value => !value)} /> : null}
    {hint || result === true ? <View style={{ gap: 5 }}><Text style={s.copy}>{task.chinese}</Text><Text style={s.pinyin}>{task.pinyin}</Text><Text style={s.copy}>{task.meaning}</Text></View> : null}
    {result !== true ? <Text accessibilityLiveRegion="polite" style={s.meta}>{selected ? `Đã chọn ${scene.words.find(item => item.id === selected)!.meaning}. Chạm nơi nhận.` : 'Kéo đồ vào vùng nét đứt hoặc chạm đồ rồi chạm nơi nhận.'}</Text> : null}
    <View style={[s.row, { alignItems: 'stretch' }]}>{places.map((place, index) => <View key={place} ref={index === 0 ? left : right} collapsable={false} style={{ flex: 1 }}>
      <MotionPressable accessibilityLabel={`Giao đến ${place}`} disabled={result === true || !selected} onPress={() => { if (selected) deliver(selected, index); }} style={[s.panel, { flex: 1, minHeight: 108, padding: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderColor: result === true && task.place === index ? t.success : selected ? t.primary : t.border }]}>
        {result === true && task.place === index ? <StudyTransition animateOnMount turnKey="delivered" effect="bounce"><PracticeObject id={answer.id} /></StudyTransition> : null}
        <Text style={[s.copy, { textAlign: 'center', fontWeight: '700' }]}>{place}</Text>
      </MotionPressable>
    </View>)}</View>
    {result !== true ? <View style={[s.wrap, { zIndex: 2 }]}>{scene.words.map(word => <DragPiece key={word.id} label={`Chọn ${word.meaning}`} onPress={() => { deliveryLock.current = false; setSelected(old => old === word.id ? null : word.id); }} onDrop={(x, y) => drop(word.id, x, y)} style={[s.chip, { alignItems: 'center', minWidth: 64, borderColor: selected === word.id ? t.primary : t.border, backgroundColor: selected === word.id ? t.primarySoft : t.surface }]}><PracticeObject id={word.id} /><Text style={s.copy}>{word.hanzi}</Text></DragPiece>)}</View> : null}
    {result !== null ? <PracticeFeedback correct={result} explanation={message} turnKey={`feedback-${attempts}`} /> : null}
    {result === true ? <PrimaryButton label={last ? 'Xem kết quả nhiệm vụ' : 'Nhiệm vụ tiếp theo'} onPress={() => { if (nextLock.current) return; nextLock.current = true; onNext(attempts === 1); }} /> : null}
  </>;
}
