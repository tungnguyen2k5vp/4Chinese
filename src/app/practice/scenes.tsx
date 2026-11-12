import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Switch, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PracticeArt, PracticeObject } from '@/components/learning/PracticeArt';
import { PracticeChoice, PracticeFeedback, PracticeResult, usePracticeStyles } from '@/components/learning/PracticeUI';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { speakChinese, stopChineseSpeech } from '@/services/audio/chinese-speech';
import { playFeedback } from '@/services/feedback/feedback-service';
import { practiceScenes, type PracticeScene, type SceneWord } from '@/services/learning/interactive-content';
import { useAppStore } from '@/stores/app-store';
import { useTheme } from '@/theme/ThemeProvider';

export default function InteractiveScenes() {
  const s = usePracticeStyles(), t = useTheme();
  const [scene, setScene] = useState<PracticeScene | null>(null);
  return <Screen title="Tiếng Trung quanh mình" hideHeader>
    {scene ? <SceneExplorer key={scene.id} scene={scene} onBack={() => setScene(null)} /> : <>
      <Text style={s.title}>Một nơi mới, vài điều hay</Text>
      <Text style={s.copy}>Chạm đồ vật để nghe từ mới, rồi thử trò chuyện ngay trong khung cảnh.</Text>
      <View style={[s.wrap, { gap: 12 }]}>{practiceScenes.map(item => <MotionPressable key={item.id} accessibilityLabel={`Khám phá ${item.title}`} onPress={() => setScene(item)} style={{ flexBasis: '46%', flexGrow: 1, borderRadius: 22, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, overflow: 'hidden' }}>
        <View style={{ height: 136 }}><PracticeArt scene={item.id} /></View>
        <View style={{ padding: 14, gap: 4 }}><Text style={s.heading}>{item.title}</Text><Text style={s.meta}>{item.subtitle}</Text><Text style={[s.meta, { color: t.primaryText }]}>5 đồ vật · 3 lượt hội thoại →</Text></View>
      </MotionPressable>)}</View>
      <Text style={s.meta}>Nội dung luyện cơ bản do 4Chinese biên soạn. Luyện tự do, không thay đổi tiến độ học.</Text>
    </>}
  </Screen>;
}

function SceneExplorer({ scene, onBack }: { scene: PracticeScene; onBack: () => void }) {
  const s = usePracticeStyles(), t = useTheme(), settings = useAppStore(state => state.settings);
  const [word, setWord] = useState<SceneWord>(scene.words[0]!);
  const [seen, setSeen] = useState<string[]>([]), [tap, setTap] = useState(0);
  const [mode, setMode] = useState<'explore' | 'dialogue'>('explore');
  const [autoSound, setAutoSound] = useState(true), [speechError, setSpeechError] = useState('');
  const [turn, setTurn] = useState(0), [choice, setChoice] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const lock = useRef(false), nextLock = useRef(false), speechRequest = useRef(0);
  useEffect(() => { nextLock.current = false; }, [turn]);
  const soundOn = settings?.soundEnabled ?? true;
  const stop = useCallback(() => { speechRequest.current++; void stopChineseSpeech().catch(() => undefined); }, []);
  useFocusEffect(useCallback(() => stop, [stop]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => sub.remove();
  }, [stop]);
  useEffect(() => { if (!soundOn || !autoSound) stop(); }, [autoSound, soundOn, stop]);
  const explore = (item: SceneWord) => {
    setWord(item); setTap(value => value + 1); setSeen(old => old.includes(item.id) ? old : [...old, item.id]); setSpeechError('');
    if (!soundOn || !autoSound) return;
    const request = ++speechRequest.current;
    void speakChinese(item.hanzi, { rate: settings?.speechRate ?? 0.82, onError: () => { if (request === speechRequest.current) setSpeechError('Chưa phát được giọng đọc. Bạn có thể thử lại bằng nút loa.'); } }).then(result => {
      if (request === speechRequest.current && !result.ok && result.reason !== 'cancelled') setSpeechError('Chưa có giọng tiếng Trung. Hãy cài giọng đọc máy trong cài đặt thiết bị.');
    }).catch(() => { if (request === speechRequest.current) setSpeechError('Chưa phát được giọng đọc. Bạn vẫn có thể đọc pinyin và tiếp tục.'); });
  };
  const reset = () => { lock.current = false; nextLock.current = false; setTurn(0); setChoice(null); setResults([]); };
  if (turn >= scene.dialogue.length) return <PracticeResult scene={scene.id} correct={results.filter(Boolean).length} total={results.length} onRestart={reset} />;
  const line = scene.dialogue[turn]!;
  return <>
    <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><View style={{ flex: 1 }}><Text style={s.title}>{scene.title}</Text><Text style={s.meta}>{scene.subtitle}</Text></View><PrimaryButton label="Đổi khung cảnh" variant="ghost" onPress={() => { stop(); onBack(); }} /></View>
    <PrimaryButton label="Thử nhiệm vụ giao đồ trong cảnh" variant="secondary" onPress={() => { stop(); router.push({ pathname: '/practice/missions', params: { scene: scene.id } }); }} />
    <View accessibilityRole="tablist" style={s.row}>{(['explore', 'dialogue'] as const).map(key => <MotionPressable key={key} accessibilityRole="tab" accessibilityState={{ selected: mode === key }} onPress={() => { stop(); setMode(key); }} style={[s.chip, { flex: 1, backgroundColor: mode === key ? t.primarySoft : t.surface, borderColor: mode === key ? t.primary : t.border }]}><Text style={[s.copy, { textAlign: 'center', color: t.primaryText, fontWeight: '700' }]}>{key === 'explore' ? 'Khám phá đồ vật' : 'Thử hội thoại'}</Text></MotionPressable>)}</View>
    {mode === 'explore' ? <>
      <Text style={s.meta}>Chạm biểu tượng trong cảnh · đã khám phá {seen.length}/{scene.words.length}</Text>
      <View style={{ height: 260, borderRadius: 24, overflow: 'hidden', position: 'relative' }}>
        <PracticeArt scene={scene.id} reaction={`tap-${tap}`} />
        {scene.words.map(item => <View key={item.id} style={{ position: 'absolute', left: `${item.x - 8}%`, top: `${item.y - 9}%`, width: '16%', minWidth: 44 }}>
          <StudyTransition turnKey={`${item.id}-${word.id === item.id ? tap : 0}`} effect="bounce"><MotionPressable haptic accessibilityLabel={`Khám phá ${item.meaning}`} accessibilityState={{ selected: seen.includes(item.id) }} onPress={() => explore(item)} style={{ minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: word.id === item.id && seen.length ? t.primarySoft : t.surface, borderWidth: 2, borderColor: word.id === item.id && seen.length ? t.primary : t.border }}>
            <PracticeObject id={item.id} />
            {seen.includes(item.id) ? <Ionicons name="checkmark-circle" size={14} color={t.success} style={{ position: 'absolute', right: -4, top: -4 }} /> : null}
          </MotionPressable></StudyTransition>
        </View>)}
      </View>
      <StudyTransition turnKey={word.id} effect="reveal"><View style={s.panel}>
        <View style={s.row}><View style={{ flex: 1 }}><Text selectable style={s.chinese}>{word.hanzi}</Text><Text style={s.pinyin}>{word.pinyin}</Text><Text style={s.copy}>{word.meaning}</Text></View><AudioButton text={word.hanzi} /></View>
        <View style={{ height: 1, backgroundColor: t.border }} /><Text selectable style={[s.chinese, { fontSize: 21, lineHeight: 32 }]}>{word.sentence}</Text><Text style={s.pinyin}>{word.sentencePinyin}</Text><Text style={s.copy}>{word.translation}</Text>
        <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.meta}>Nghe cả câu · giọng đọc máy</Text><AudioButton text={word.sentence} size={20} /></View>
      </View></StudyTransition>
      <View style={s.row}><Switch accessibilityLabel="Tự phát âm khi chạm đồ vật" value={autoSound && soundOn} disabled={!soundOn} onValueChange={setAutoSound} trackColor={{ true: t.primary }} /><Text style={[s.copy, { flex: 1 }]}>{soundOn ? 'Tự phát âm khi chạm' : 'Âm thanh đang tắt trong Cài đặt'}</Text></View>
      {speechError ? <Text accessibilityLiveRegion="polite" style={s.copy}>{speechError}</Text> : null}
      <PrimaryButton label={`Thử hội thoại · ${scene.mission}`} onPress={() => { stop(); setMode('dialogue'); }} />
      <PrimaryButton label="Ghép câu trong khung cảnh này" variant="secondary" onPress={() => { stop(); router.push({ pathname: '/practice/sentences', params: { scene: scene.id } }); }} />
    </> : <>
      <Text style={s.meta}>{scene.mission} · Lượt {turn + 1}/{scene.dialogue.length}</Text>
      <AnimatedProgressBar progress={turn / scene.dialogue.length} color={t.primary} trackColor={t.border} accessibilityLabel={`Hội thoại: lượt ${turn + 1} trên ${scene.dialogue.length}`} />
      <StudyTransition turnKey={`turn-${turn}`}><View style={s.panel}><Text style={s.meta}>NGƯỜI ĐỐI THOẠI</Text><View style={s.row}><Text selectable style={[s.chinese, { flex: 1 }]}>{line.prompt}</Text><AudioButton text={line.prompt} /></View><Text style={s.pinyin}>{line.pinyin}</Text><Text style={s.copy}>{line.meaning}</Text></View></StudyTransition>
      <Text style={s.heading}>Bạn sẽ trả lời thế nào?</Text>
      <View style={{ gap: 10 }}>{line.choices.map((text, i) => <PracticeChoice key={`${turn}-${i}`} label={text} selected={choice === i} disabled={choice !== null} correct={choice !== null && i === line.answer} prefix={String.fromCharCode(65 + i)} onPress={() => {
        if (lock.current) return; lock.current = true; setChoice(i); setResults(old => [...old, i === line.answer]); void playFeedback(i === line.answer ? 'success' : 'error', settings ?? {});
      }} />)}</View>
      {choice !== null ? <><PracticeFeedback correct={choice === line.answer} explanation={line.explanation} chinese={line.choices[line.answer]} turnKey={`${turn}-${choice}`} /><PrimaryButton label={turn === scene.dialogue.length - 1 ? 'Xem kết quả hội thoại' : 'Lượt tiếp theo'} onPress={() => { if (choice === null || nextLock.current) return; nextLock.current = true; stop(); lock.current = false; setChoice(null); setTurn(value => value + 1); }} /></> : null}
    </>}
  </>;
}
