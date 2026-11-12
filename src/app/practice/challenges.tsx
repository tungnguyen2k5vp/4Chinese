import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PracticeArt } from '@/components/learning/PracticeArt';
import { PracticeChoice, PracticeFeedback, PracticeResult, usePracticeStyles } from '@/components/learning/PracticeUI';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { getLearnedReviewPage } from '@/db/repository';
import { playFeedback } from '@/services/feedback/feedback-service';
import { shuffled } from '@/services/learning/interactive-content';
import { buildChallenges, practiceWordPool, scenePracticeWords, type ChallengeMode, type ChallengeQuestion, type PracticeWord } from '@/services/learning/quick-challenge';
import { useAppStore } from '@/stores/app-store';
import { useTheme } from '@/theme/ThemeProvider';

const modes = [
  { id: 'listen', title: 'Nghe & đoán', description: 'Nghe từ, tìm đúng nghĩa', icon: 'headset-outline', tone: 'listening' },
  { id: 'pairs', title: 'Tìm đôi', description: 'Nối Hán tự với nghĩa', icon: 'grid-outline', tone: 'reading' },
  { id: 'context', title: 'Đáp lời', description: 'Chọn câu trong tình huống', icon: 'chatbubbles-outline', tone: 'speaking' },
  { id: 'repair', title: 'Thám tử câu', description: 'Tìm và sửa một lỗi sai', icon: 'search-outline', tone: 'grammar' },
] as const;

export default function QuickChallenges() {
  const s = usePracticeStyles(), t = useTheme(), db = useSQLiteContext();
  const [mode, setMode] = useState<ChallengeMode>('listen'), [source, setSource] = useState<'scenes' | 'learned'>('scenes');
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0), [size, setSize] = useState(5);
  const [learned, setLearned] = useState<{ page: number; retry: number; words: PracticeWord[]; pages: number; error: string } | null>(null);
  const [session, setSession] = useState<{ mode: ChallengeMode; questions: ChallengeQuestion[]; pairs: PracticeWord[] } | null>(null);
  const [run, setRun] = useState(0);
  const usesWords = mode === 'listen' || mode === 'pairs';
  const loaded = learned?.page === page && learned.retry === retry;
  const words = loaded ? learned.words : [], pages = loaded ? learned.pages : 1, error = loaded ? learned.error : '';
  const loading = source === 'learned' && usesWords && !loaded;
  useEffect(() => {
    if (source !== 'learned' || !usesWords) return;
    let live = true;
    void getLearnedReviewPage(db, page).then(result => { if (live) setLearned({ page, retry, words: practiceWordPool(result.words), pages: result.totalPages, error: '' }); }).catch(() => { if (live) setLearned({ page, retry, words: [], pages: 1, error: 'Chưa tải được từ đã học. Thử lại hoặc luyện với từ trong khung cảnh.' }); });
    return () => { live = false; };
  }, [db, page, retry, source, usesWords]);
  const pool = source === 'scenes' ? scenePracticeWords() : words;
  const questions = mode === 'pairs' ? [] : buildChallenges(mode, pool, size);
  const ready = mode === 'pairs' ? pool.length >= 3 : questions.length > 0;
  return <Screen title="Thử thách ngắn" hideHeader>
    {session ? <><PrimaryButton label="Đổi thử thách" variant="ghost" onPress={() => setSession(null)} />{session.mode === 'pairs' ? <PairSession key={run} words={session.pairs} /> : <ChallengeSession key={run} questions={session.questions} />}</> : <>
      <Text style={s.title}>Đổi cách luyện, thêm hứng thú</Text><Text style={s.copy}>Một lượt ngắn để nghe, nhớ và dùng tiếng Trung. Bạn chủ động chọn cách luyện.</Text>
      <View style={s.wrap}>{modes.map(item => <MotionPressable key={item.id} accessibilityLabel={item.title} accessibilityState={{ selected: mode === item.id }} onPress={() => setMode(item.id)} style={[s.panel, { flexBasis: '46%', flexGrow: 1, borderColor: mode === item.id ? t.skillColors[item.tone] : t.border, backgroundColor: mode === item.id ? t.skillSurfaces[item.tone] : t.surface }]}><Ionicons name={item.icon} size={26} color={t.skillColors[item.tone]} /><Text style={s.heading}>{item.title}</Text><Text style={s.meta}>{item.description}</Text></MotionPressable>)}</View>
      {usesWords ? <View style={s.panel}><Text style={s.heading}>Bạn muốn luyện từ nào?</Text><View style={s.wrap}>{(['scenes', 'learned'] as const).map(value => <MotionPressable key={value} accessibilityLabel={value === 'scenes' ? 'Từ trong khung cảnh' : 'Từ tôi đã học'} accessibilityState={{ selected: source === value }} onPress={() => setSource(value)} style={[s.chip, { backgroundColor: source === value ? t.primarySoft : t.surface }]}><Text style={s.copy}>{value === 'scenes' ? 'Từ trong khung cảnh' : 'Từ tôi đã học'}</Text></MotionPressable>)}</View>
        {source === 'learned' ? loading ? <ActivityIndicator accessibilityLabel="Đang đọc từ đã học" color={t.primaryText} /> : error ? <><Text accessibilityRole="alert" style={s.copy}>{error}</Text><PrimaryButton label="Thử tải lại" variant="ghost" onPress={() => setRetry(value => value + 1)} /></> : <><Text style={s.meta}>{words.length ? `${words.length} từ phù hợp trong nhóm ${page}/${pages}` : 'Chưa có đủ 3 từ đã học với nghĩa khác nhau. Bạn có thể luyện từ trong khung cảnh trước.'}</Text>{pages > 1 ? <View style={s.row}><PrimaryButton label="Nhóm trước" variant="ghost" disabled={page === 1} onPress={() => setPage(value => value - 1)} /><PrimaryButton label="Nhóm sau" variant="ghost" disabled={page >= pages} onPress={() => setPage(value => value + 1)} /></View> : null}</> : <Text style={s.meta}>20 từ thuộc bốn khung cảnh gần gũi.</Text>}
      </View> : <Text style={s.meta}>{mode === 'context' ? '12 tình huống trong quán cà phê, nhà ga, chợ và lớp học.' : '8 câu về lượng từ, trật tự câu và cách dùng động từ.'}</Text>}
      <View style={s.row}><Text style={[s.copy, { flex: 1 }]}>Số câu mỗi lượt</Text>{[5, 10].map(value => <MotionPressable key={value} accessibilityLabel={`${value} câu mỗi lượt`} accessibilityState={{ selected: size === value }} onPress={() => setSize(value)} style={[s.chip, { backgroundColor: size === value ? t.primarySoft : t.surface }]}><Text style={s.heading}>{value}</Text></MotionPressable>)}</View>
      {mode === 'listen' && source === 'learned' && !loading && !error && pool.length >= 3 && !ready ? <Text accessibilityLiveRegion="polite" style={s.copy}>Nhóm này chưa đủ từ khác âm để tạo bài nghe rõ ràng. Hãy đổi nhóm hoặc chọn Tìm đôi.</Text> : null}
      <PrimaryButton label="Bắt đầu thử thách" disabled={!ready || (usesWords && source === 'learned' && (loading || !!error))} onPress={() => { setSession({ mode, questions, pairs: shuffled(pool).slice(0, size) }); setRun(value => value + 1); }} />
      <Text style={s.meta}>Nếu kho câu ít hơn lựa chọn, lượt luyện sẽ dùng tất cả câu hiện có. Kết quả chỉ tính trong lượt này; lịch ôn và tiến độ được giữ nguyên.</Text>
    </>}
  </Screen>;
}

function ChallengeSession({ questions }: { questions: ChallengeQuestion[] }) {
  const s = usePracticeStyles(), t = useTheme(), settings = useAppStore(state => state.settings);
  const [queue, setQueue] = useState(questions), [index, setIndex] = useState(0), [choice, setChoice] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0), [missed, setMissed] = useState<ChallengeQuestion[]>([]), lock = useRef(false), nextLock = useRef(false);
  useEffect(() => { nextLock.current = false; }, [index]);
  const question = queue[index];
  const restart = (retry = false) => { setQueue(retry ? missed : questions); setMissed([]); setCorrect(0); setIndex(0); setChoice(null); lock.current = false; nextLock.current = false; };
  if (!question) return <PracticeResult total={queue.length} correct={correct} onRestart={() => restart()} onRetry={missed.length ? () => restart(true) : undefined} />;
  return <>
    <Text style={s.meta}>Câu {index + 1}/{queue.length}</Text><AnimatedProgressBar progress={index / queue.length} color={t.primary} trackColor={t.border} accessibilityLabel={`Thử thách: câu ${index + 1} trên ${queue.length}`} />
    <StudyTransition turnKey={question.id}><View style={s.panel}><Text style={s.heading}>{question.prompt}</Text>{question.chinese ? <Text selectable style={s.chinese}>{question.chinese}</Text> : null}{question.audio ? <View style={s.row}><AudioButton text={question.audio} accessibilityLabel="Nghe câu hỏi thử thách" /><Text style={s.meta}>Chạm để nghe · giữ để nghe chậm</Text></View> : null}{question.audio && !question.chinese && settings?.soundEnabled === false ? <Text accessibilityRole="alert" style={s.copy}>Hãy bật Âm thanh trong Cài đặt để làm bài nghe, hoặc chọn thử thách khác.</Text> : null}</View></StudyTransition>
    <View style={{ gap: 10 }}>{question.choices.map((text, i) => <PracticeChoice key={`${question.id}-${i}`} label={text} prefix={String.fromCharCode(65 + i)} selected={choice === i} correct={choice !== null && i === question.answer} disabled={choice !== null} onPress={() => {
      if (lock.current) return; lock.current = true; setChoice(i);
      if (i === question.answer) setCorrect(value => value + 1); else setMissed(old => [...old, question]);
      void playFeedback(i === question.answer ? 'success' : 'error', settings ?? {});
    }} />)}</View>
    {choice !== null ? <><PracticeFeedback correct={choice === question.answer} explanation={question.explanation} chinese={question.audio} turnKey={`${question.id}-${choice}`} /><PrimaryButton label={index === queue.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'} onPress={() => { if (choice === null || nextLock.current) return; nextLock.current = true; lock.current = false; setChoice(null); setIndex(value => value + 1); }} /></> : null}
  </>;
}

function PairSession({ words }: { words: PracticeWord[] }) {
  const s = usePracticeStyles(), t = useTheme(), settings = useAppStore(state => state.settings);
  const [queue, setQueue] = useState(words), [offset, setOffset] = useState(0), [correct, setCorrect] = useState(0), [run, setRun] = useState(0);
  if (offset >= queue.length) return <PracticeResult total={queue.length} correct={correct} onRestart={() => { setQueue(shuffled(words)); setOffset(0); setCorrect(0); setRun(value => value + 1); }} />;
  return <><Text style={s.title}>Tìm đúng người bạn của từ</Text><Text style={s.copy}>Chọn một Hán tự bên trái, rồi chọn nghĩa tương ứng bên phải.</Text><Text style={s.meta}>Đã ghép {offset}/{queue.length} từ</Text><AnimatedProgressBar progress={offset / queue.length} color={t.primary} trackColor={t.border} accessibilityLabel={`Đã ghép ${offset} trên ${queue.length} từ`} /><PairBoard key={`${run}-${offset}`} words={queue.slice(offset, offset + 4)} onDone={score => { setCorrect(value => value + score); setOffset(value => value + 4); }} settings={settings} /></>;
}

function PairBoard({ words, onDone, settings }: { words: PracticeWord[]; onDone: (correct: number) => void; settings: ReturnType<typeof useAppStore.getState>['settings'] }) {
  const s = usePracticeStyles(), t = useTheme();
  const [meanings] = useState(() => shuffled(words)), [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]), [missed, setMissed] = useState<string[]>([]), [notice, setNotice] = useState('');
  const [wrong, setWrong] = useState<string | null>(null), [attempt, setAttempt] = useState(0), lock = useRef(false);
  const activeWord = useRef<string | null>(null);
  const complete = matched.length === words.length;
  return <>
    <View style={[s.row, { alignItems: 'stretch' }]}>{[words, meanings].map((column, side) => <View key={side} style={{ flex: 1, gap: 10 }}>{column.map(word => <StudyTransition key={word.id} turnKey={`${word.id}-${matched.includes(word.id) ? 'matched' : wrong === word.id ? attempt : 'idle'}`} effect={matched.includes(word.id) ? 'success' : 'error'}><MotionPressable accessibilityLabel={`${side === 0 ? 'Từ' : 'Nghĩa'} ${side === 0 ? word.simplified : word.primaryMeaningVi}${matched.includes(word.id) ? ', đã ghép' : ''}`} accessibilityState={{ selected: side === 0 && selected === word.id }} disabled={matched.includes(word.id)} onPress={() => {
      if (side === 0) { activeWord.current = word.id; setSelected(word.id); setWrong(null); return; }
      const selected = activeWord.current;
      if (!selected) { setNotice('Chọn một Hán tự bên trái trước nhé.'); return; }
      if (lock.current) return;
      if (selected === word.id) { activeWord.current = null; setMatched(old => old.includes(word.id) ? old : [...old, word.id]); setSelected(null); setWrong(null); setNotice(`Đã ghép ${word.simplified} — ${word.primaryMeaningVi}`); void playFeedback('success', settings ?? {}); }
      else { setMissed(old => old.includes(selected) ? old : [...old, selected]); setWrong(word.id); setAttempt(value => value + 1); setNotice('Hai mảnh này chưa khớp. Thử một nghĩa khác nhé.'); void playFeedback('error', settings ?? {}); }
    }} style={[s.panel, { minHeight: 88, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: matched.includes(word.id) ? t.successSoft : side === 0 && selected === word.id ? t.primarySoft : t.surface, borderColor: matched.includes(word.id) ? t.success : side === 0 && selected === word.id ? t.primary : wrong === word.id && side === 1 ? t.warning : t.border }]}>
      <Text style={[side === 0 ? s.chinese : s.copy, { textAlign: 'center', fontSize: side === 0 ? 25 : 16 }]}>{side === 0 ? word.simplified : word.primaryMeaningVi}</Text>{matched.includes(word.id) ? <Ionicons name="checkmark-circle" size={18} color={t.success} /> : null}
    </MotionPressable></StudyTransition>)}</View>)}</View>
    <Text accessibilityLiveRegion="polite" style={s.copy}>{notice || 'Không giới hạn thời gian. Cứ bình tĩnh tìm từng đôi.'}</Text>
    {complete ? <><View style={{ height: 112, borderRadius: 22, overflow: 'hidden' }}><PracticeArt scene="classroom" celebration reaction="pairs-complete" /></View><PrimaryButton label="Tiếp tục" onPress={() => { if (lock.current) return; lock.current = true; onDone(words.length - missed.length); }} /></> : null}
  </>;
}
