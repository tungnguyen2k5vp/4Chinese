import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PracticeArt } from '@/components/learning/PracticeArt';
import { PracticeMenuItem, PracticeRoundHeader, usePracticeStyles } from '@/components/learning/PracticeUI';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { usePracticeSpeech } from '@/hooks/use-practice-speech';
import { choiceStories, type ChoiceStory, type StoryNode, type StudyLine } from '@/services/learning/adventure-content';
import { useTheme } from '@/theme/ThemeProvider';

export default function ChoiceStories() {
  const s = usePracticeStyles(), [story, setStory] = useState<ChoiceStory | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  return <Screen key={story?.id ?? 'menu'} scrollRef={scrollRef} title="Truyện có lựa chọn" hideHeader>{story ? <StorySession key={story.id} story={story} onTurn={() => scrollRef.current?.scrollTo({ y: 0, animated: false })} onExit={() => setStory(null)} /> : <>
    <Text style={s.title}>Câu chuyện đi theo lời bạn nói</Text>
    <Text style={s.copy}>Chọn lời đáp bằng tiếng Trung để đổi diễn biến. Mỗi truyện có bốn kết thúc; mọi lựa chọn đều có thể dùng trong tình huống.</Text>
    {choiceStories.map(item => <PracticeMenuItem key={item.id} scene={item.id} title={item.title} subtitle={`${item.subtitle} · 4 kết thúc`} onPress={() => setStory(item)} />)}
    <Text style={s.meta}>Có pinyin, nghĩa và bản hội thoại để xem lại. Không chấm đúng/sai hay thay đổi tiến độ học.</Text>
  </>}</Screen>;
}

function StorySession({ story, onExit, onTurn }: { story: ChoiceStory; onExit: () => void; onTurn: () => void }) {
  const s = usePracticeStyles(), t = useTheme();
  const [history, setHistory] = useState<{ node: string; choice: number }[]>([]), [translated, setTranslated] = useState(false), [review, setReview] = useState(false);
  const previous = history.at(-1), nodeId = previous ? story.nodes[previous.node]!.choices![previous.choice]!.next : story.start;
  const node = story.nodes[nodeId]!;
  usePracticeSpeech(nodeId);
  return <>
    <PracticeRoundHeader title={story.title} current={Math.min(history.length + 1, 2)} total={2} finished={!!node.ending} onExit={onExit} />
    <View style={{ height: node.ending ? 160 : 120, borderRadius: 22, overflow: 'hidden' }}><PracticeArt scene={story.id} reaction={nodeId} celebration={!!node.ending} /></View>
    {node.ending ? <>
      <Text style={s.meta}>KẾT THÚC CỦA BẠN · 2 LỰA CHỌN</Text><Text accessibilityRole="header" style={s.title}>{node.ending}</Text>
      <StoryLine line={node} translated />
      <View style={[s.panel, { backgroundColor: t.primarySoft }]}><Text style={s.heading}>Mang theo một cách nói</Text><Text style={s.copy}>{node.takeaway}</Text></View>
      <PrimaryButton label={review ? 'Ẩn hội thoại đã chọn' : 'Xem lại hội thoại'} variant="secondary" onPress={() => setReview(value => !value)} />
      {review ? <View style={{ gap: 16 }}>{history.map((step, index) => {
        const turn = story.nodes[step.node]!, reply = turn.choices![step.choice]!;
        return <View key={step.node} style={s.panel}><Text style={s.meta}>LƯỢT {index + 1} · NGƯỜI ĐỐI THOẠI</Text><StoryLine line={turn} translated /><Text style={[s.meta, { color: t.primaryText }]}>BẠN ĐÃ CHỌN</Text><StoryLine line={reply} translated /></View>;
      })}<View style={s.panel}><Text style={s.meta}>LỜI KẾT</Text><StoryLine line={node} translated /></View></View> : null}
      <PrimaryButton label="Thử nhánh khác" onPress={() => { setHistory([]); setReview(false); onTurn(); }} />
      <PrimaryButton label="Chọn truyện khác" variant="ghost" onPress={onExit} />
      <Text style={s.meta}>Thử một lời đáp khác để khám phá kết thúc mới và luyện thêm cách diễn đạt.</Text>
    </> : <>
      <PrimaryButton label={translated ? 'Ẩn nghĩa và pinyin' : 'Hiện nghĩa và pinyin'} variant="ghost" onPress={() => setTranslated(value => !value)} />
      <StoryTurn key={`${nodeId}-${history.length}`} node={node} translated={translated} onAdvance={choice => { setHistory(old => [...old, { node: nodeId, choice }]); onTurn(); }} />
    </>}
  </>;
}

function StoryLine({ line, translated }: { line: StudyLine; translated: boolean }) {
  const s = usePracticeStyles();
  return <View style={{ gap: 6 }}><View style={[s.row, { alignItems: 'flex-start' }]}><Text style={[s.chinese, { flex: 1, fontSize: 23, lineHeight: 34 }]}>{line.chinese}</Text><AudioButton text={line.chinese} /></View>{translated ? <><Text style={s.pinyin}>{line.pinyin}</Text><Text style={s.copy}>{line.meaning}</Text></> : null}</View>;
}

function StoryTurn({ node, translated, onAdvance }: { node: StoryNode; translated: boolean; onAdvance: (choice: number) => void }) {
  const s = usePracticeStyles(), t = useTheme(), choiceLock = useRef(false), nextLock = useRef(false);
  const [choice, setChoice] = useState<number | null>(null);
  return <>
    <StudyTransition turnKey={node.chinese} animateOnMount effect="reveal"><View style={s.panel}><Text style={s.meta}>NGƯỜI ĐỐI THOẠI</Text><StoryLine line={node} translated={translated} /></View></StudyTransition>
    <Text style={s.heading}>Bạn đáp lại thế nào?</Text>
    {node.choices!.map((line, index) => <MotionPressable key={line.next} accessibilityLabel={`Chọn lời đáp ${line.chinese}`} accessibilityState={{ selected: choice === index }} disabled={choice !== null} onPress={() => { if (choiceLock.current) return; choiceLock.current = true; setChoice(index); }} style={[s.panel, { borderColor: choice === index ? t.primary : t.border, backgroundColor: choice === index ? t.primarySoft : t.surface }]}>
      <Text style={[s.chinese, { fontSize: 22, lineHeight: 32 }]}>{line.chinese}</Text>{translated ? <><Text style={s.pinyin}>{line.pinyin}</Text><Text style={s.copy}>{line.meaning}</Text></> : null}
    </MotionPressable>)}
    {choice !== null ? <StudyTransition turnKey="reply" animateOnMount effect="slide"><View style={{ gap: 12 }}><View style={s.row}><AudioButton text={node.choices![choice]!.chinese} /><Text style={[s.copy, { flex: 1 }]}>{node.choices![choice]!.meaning}</Text></View><PrimaryButton label="Tiếp tục câu chuyện" onPress={() => { if (nextLock.current) return; nextLock.current = true; onAdvance(choice); }} /></View></StudyTransition> : null}
  </>;
}
