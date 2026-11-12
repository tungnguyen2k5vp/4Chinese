import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PracticeArt } from '@/components/learning/PracticeArt';
import { PracticeResult, usePracticeStyles } from '@/components/learning/PracticeUI';
import { SentenceTiles } from '@/components/learning/SentenceTiles';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { practiceScenes, type PracticeScene } from '@/services/learning/interactive-content';
import { useTheme } from '@/theme/ThemeProvider';

export default function SentencePractice() {
  const { scene: requested } = useLocalSearchParams<{ scene?: string }>();
  const [scene, setScene] = useState(() => practiceScenes.find(item => item.id === requested) ?? practiceScenes[0]!);
  const [run, setRun] = useState(0);
  const s = usePracticeStyles(), t = useTheme();
  return <Screen title="Ghép câu" hideHeader>
    <Text style={s.title}>Ghép từng mảnh từ</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>{practiceScenes.map(item => <MotionPressable key={item.id} accessibilityLabel={`Ghép câu ${item.title}`} accessibilityState={{ selected: scene.id === item.id }} onPress={() => { setScene(item); setRun(value => value + 1); }} style={[s.chip, { backgroundColor: scene.id === item.id ? t.primarySoft : t.surface, borderColor: scene.id === item.id ? t.primary : t.border }]}><Text style={s.copy}>{item.title}</Text></MotionPressable>)}</ScrollView>
    <SentenceSession key={`${scene.id}-${run}`} scene={scene} />
  </Screen>;
}

function SentenceSession({ scene }: { scene: PracticeScene }) {
  const s = usePracticeStyles(), t = useTheme();
  const [queue, setQueue] = useState(scene.words), [index, setIndex] = useState(0), [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<typeof scene.words>([]), [run, setRun] = useState(0);
  const restart = (retry = false) => { setQueue(retry ? missed : scene.words); setMissed([]); setIndex(0); setCorrect(0); setRun(value => value + 1); };
  const word = queue[index];
  if (!word) return <PracticeResult scene={scene.id} total={queue.length} correct={correct} onRestart={() => restart()} onRetry={missed.length ? () => restart(true) : undefined} />;
  return <>
    <View style={{ height: 80, borderRadius: 22, overflow: 'hidden' }}><PracticeArt scene={scene.id} reaction={`sentence-${index}`} /></View>
    <Text style={s.meta}>{scene.title} · Câu {index + 1}/{queue.length}</Text>
    <AnimatedProgressBar progress={index / queue.length} color={t.primary} trackColor={t.border} accessibilityLabel={`Ghép câu: câu ${index + 1} trên ${queue.length}`} />
    <SentenceTiles key={`${run}-${word.id}`} word={word} last={index === queue.length - 1} onNext={firstTry => { if (firstTry) setCorrect(value => value + 1); else setMissed(old => [...old, word]); setIndex(value => value + 1); }} />
  </>;
}
