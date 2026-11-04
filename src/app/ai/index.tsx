import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, Text, TextInput, View } from 'react-native';

import { AIConversationTools } from '@/components/AIConversationTools';
import { AIOralPractice } from '@/components/AIOralPractice';
import { AudioButton } from '@/components/AudioButton';
import { ChineseAIPractice } from '@/components/ChineseAIPractice';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { EnglishAudioButton } from '@/components/EnglishAudioButton';
import { ExampleSentence } from '@/components/ExampleSentence';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Disclosure } from '@/components/chinese/Disclosure';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { themedCard } from '@/constants/design';
import { saveMemoryMnemonic } from '@/db/hanzi-memory';
import { useConfirmation } from '@/hooks/use-confirmation';
import { aiQuickActions, useAILaunch, type AILaunch } from '@/services/ai/context';
import { ChineseAIError, sendChineseAI, type AIContext, type AIExerciseKind, type AIRequest, type AIResult, type AITask, type AITranslation } from '@/services/ai/gateway';
import { aiQuestionText, writingQuestion } from '@/services/ai/learning';
import { useAISettings } from '@/services/ai/preferences';
import { useLearningLanguage } from '@/services/languages/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';

const mnemonicLabel = 'Mẹo liên tưởng do AI tạo — không phải từ nguyên học';
const modeNames = { AUTO_FREE: 'Auto · nhà cung cấp miễn phí', GEMINI_FREE: 'Gemini Free', GROQ_FREE: 'Groq Free', OPENROUTER_FREE: 'OpenRouter Free', LOCAL_ONLY: 'Chỉ trên thiết bị', DISABLED: 'AI đang tắt' };
export default function ChineseAITutor() {
  const { preferences } = useLearningLanguage();
  const prefs = useAISettings(s => s.preferences);
  const [revision, setRevision] = useState(0);
  const [launch] = useState(() => useAILaunch.getState().value);
  useEffect(() => () => { if (useAILaunch.getState().value === launch) useAILaunch.getState().set(null); }, [launch]);
  // Remount session on every consent/provider change; no earlier history crosses that boundary.
  const language = preferences.learningLanguage === 'en' ? 'en' : 'zh';
  return <Tutor key={`${language}:${JSON.stringify(prefs)}:${revision}`} language={language} launch={(launch?.language ?? 'zh') === language ? launch : null} onNewSession={() => setRevision(v => v + 1)} />;
}
function contextText(context: AIContext): string {
  switch (context.kind) {
    case 'word': return `${context.hanzi} · ${context.pinyin}\nNghĩa: ${context.meaning}\n${context.pos ? `Từ loại: ${context.pos}\n` : ''}${context.usage ? `Cách dùng: ${context.usage}\n` : ''}HSK (dữ liệu từ điển): ${context.hsk}`;
    case 'character': return `${context.hanzi} · ${context.pinyin}\n${context.meaning}\nCấu tạo local: ${context.structure}\nNguồn đối chiếu: ${context.source || 'Chưa có'}`;
    case 'grammar': return `${context.title}\n${context.pattern}\n${context.explanation}\nCâu mẫu: ${context.example}\nHSK: ${context.hsk}`;
    case 'reader': return context.text;
    case 'comparison': return context.words.map(w => `${w.hanzi} (${w.pinyin}): ${w.meaning}\n${w.usage}`).join('\n\n');
    case 'weakness': return context.summary.map(s => `${s.skill}: ${s.openItems} mục cần luyện, ${s.wrongAttempts} lần sai trong tập đang xem`).join('\n');
    case 'learner': return `Mục tiêu: ${context.goal}\nThời gian: ${context.minutes} phút\n${context.words.map(w => `${w.hanzi} (${w.pinyin}) · nghĩa local: ${w.meanings.join(' / ')} · ${w.wrongAttempts} lần sai, ${w.lapses} lần quên`).join('\n')}\n${context.mistakes.map(m => `${m.title} · ${m.skill}/${m.exercise} · ${m.wrongAttempts} lần sai`).join('\n')}\nChỉ có số đếm, không có câu trả lời cũ của người học.`;
    case 'conversation': return `Tình huống: ${context.scene}\n${context.turns.length ? context.turns.map(t => `${t.role === 'user' ? 'Người học' : 'AI'}: ${t.text}`).join('\n') : 'Không kèm transcript cũ.'}\nChỉ có chữ, không kèm âm thanh hoặc điểm phát âm.`;
    case 'practice': return `Bài nháp vừa nộp; đáp án tham khảo do AI tạo, chưa được kiểm chứng.\n${context.attempts.map((q, i) => `Câu ${i + 1}: ${q.question}\n${q.choices.map((c, n) => `${n + 1}. ${c}`).join('\n')}\nBạn chọn: ${q.choices[q.selectedIndex]}\nĐáp án tham khảo: ${q.choices[q.answerIndex]}\nGiải thích tham khảo: ${q.explanation}`).join('\n\n')}`;
  }
}
function Tutor({ launch, language, onNewSession }: { launch: AILaunch | null; language: 'zh' | 'en'; onNewSession: () => void }) {
  const theme = useTheme(), prefs = useAISettings(s => s.preferences), ready = useAISettings(s => s.ready), load = useAISettings(s => s.load);
  const { ask, dialog } = useConfirmation();
  const [sense, setSense] = useState<number | null>(() => launch?.senses?.length === 1 ? 0 : null);
  const [readerText, setReaderText] = useState(launch?.context?.kind === 'reader' ? launch.context.text : '');
  const [includeContext, setIncludeContext] = useState(false), [includeHistory, setIncludeHistory] = useState(false);
  const [draft, setDraft] = useState(launch?.question ?? ''), [task, setTask] = useState<AITask>(language === 'en' ? 'writing' : launch?.task ?? 'tutor');
  const [scene, setScene] = useState('Làm quen và nói về sở thích'), [reflex, setReflex] = useState(false);
  const [intendedMeaning, setIntendedMeaning] = useState(''), [hskLevel, setHskLevel] = useState<number | null>(launch?.hskLevel ?? null);
  const [oralTarget, setOralTarget] = useState<string | null>(null);
  const [exerciseKind, setExerciseKind] = useState<AIExerciseKind>('mixed');
  const [translation, setTranslation] = useState<AITranslation>({ source: '', attempt: '', direction: 'vi-zh', feedback: 'hint' });
  const [turns, setTurns] = useState<{ question: string; input: string; scene?: string; hskLevel: number | null; result: AIResult; task: AITask; noteTarget?: AILaunch['noteTarget'] }[]>([]), [pending, setPending] = useState(''), [error, setError] = useState<ChineseAIError | null>(null);
  const [retryUntil, setRetryUntil] = useState(0), [now, setNow] = useState(Date.now);
  const scroll = useRef<ScrollView>(null), controller = useRef<AbortController | null>(null), generation = useRef(0);
  const [session] = useState(() => `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`);
  const dialogue = turns.filter(t => t.task === 'conversation' && t.scene === (scene.trim() || 'Hội thoại tự do')).slice(-6).flatMap(t => [
    { role: 'user' as const, text: t.input.slice(0, 500) }, { role: 'assistant' as const, text: (t.result.answer.examples[0]?.hanzi ?? '').slice(0, 500) },
  ]).filter(t => t.text);
  const context: AIContext | null = language === 'en' ? null : task === 'conversation' || task === 'speaking_review'
    ? { kind: 'conversation', scene: scene.trim() || 'Hội thoại tự do', turns: task === 'speaking_review' ? dialogue : includeHistory ? dialogue.slice(-6) : [] }
    : launch?.senses ? sense === null ? null : launch.senses[sense] ?? null
    : launch?.context?.kind === 'reader' ? { kind: 'reader' as const, text: readerText.trim() } : launch?.context ?? null;
  const actions = aiQuickActions(includeContext ? context : null), external = prefs.mode !== 'DISABLED' && prefs.mode !== 'LOCAL_ONLY';
  const inputReady = task === 'translation' ? !!translation.source.trim() && (translation.feedback === 'hint' || !!translation.attempt.trim())
    : !!draft.trim() && (task !== 'writing' || draft.length <= 1000) && (task !== 'conversation' || draft.length <= 500);
  const requiresContext = ['coach', 'conversation', 'speaking_review', 'practice_review'].includes(task);
  const retrySeconds = Math.max(0, Math.ceil((retryUntil - now) / 1000));
  const selectedMode = ['writing', 'translation', 'practice', 'conversation', 'speaking_review'].includes(task) ? task : 'tutor';
  const question = task === 'translation' ? (translation.feedback === 'hint' ? 'Gợi ý cách dịch để tôi tự thử trước.' : 'Góp ý bản dịch thử, chỉ rõ lỗi và cách dịch khác hợp lệ.')
    : task === 'writing' ? draft.trim() && draft.length <= 1000 ? writingQuestion(draft, intendedMeaning, language) : '' : draft.trim();
  const currentQuestion = aiQuestionText({ question, hskLevel, ...(task === 'translation' ? { translation } : {}) });
  const stop = useCallback(() => { generation.current++; controller.current?.abort(); controller.current = null; setPending(''); }, []);
  useEffect(() => { if (!ready) void load(); }, [load, ready]);
  useEffect(() => {
    if (retryUntil <= Date.now()) return;
    const timer = setInterval(() => {
      const time = Date.now(); setNow(time);
      if (time >= retryUntil) { clearInterval(timer); setRetryUntil(0); }
    }, 1000);
    return () => clearInterval(timer);
  }, [retryUntil]);
  useFocusEffect(useCallback(() => {
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => { stop(); listener.remove(); };
  }, [stop]));
  const send = async () => {
    if (controller.current || !inputReady || !ready || turns.length >= 8 || (task === 'conversation' && turns.length >= 7) || Date.now() < retryUntil || (requiresContext && (!includeContext || prefs.consent.scope !== 'selected'))) return;
    const request: AIRequest = { question, language, mode: prefs.mode, task, session, dailyLimit: prefs.dailyLimit, consent: prefs.consent, hskLevel: language === 'en' ? null : hskLevel,
      ...(task === 'translation' ? { translation } : {}), ...(task === 'practice' ? { exerciseKind } : {}),
      context: includeContext && prefs.consent.scope === 'selected' ? context : null,
      history: includeHistory && context?.kind !== 'conversation' && prefs.consent.scope === 'selected' ? turns.slice(-3).flatMap(t => [
        { role: 'user' as const, text: t.question.slice(0, 1500) }, { role: 'assistant' as const, text: `${t.result.answer.summary}\n${t.result.answer.explanation}`.slice(0, 1500) },
      ]) : [] };
    if (includeContext && launch?.senses && sense === null) { setError(new ChineseAIError('AI_INVALID_INPUT')); return; }
    const token = ++generation.current, requestController = new AbortController();
    controller.current = requestController; setPending(aiQuestionText(request)); setError(null);
    try {
      const result = await sendChineseAI(request, requestController.signal);
      if (generation.current !== token || requestController.signal.aborted) return;
      const noteTarget = request.context?.kind === 'character' && request.context.hanzi === launch?.noteTarget?.character ? launch.noteTarget : undefined;
      setTurns(previous => [...previous, { question: aiQuestionText(request), input: request.question, scene: request.context?.kind === 'conversation' ? request.context.scene : undefined, hskLevel: request.hskLevel ?? null, result, noteTarget, task: request.task }]);
      if (request.task !== 'translation') { setDraft(''); setIntendedMeaning(''); }
      setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 0);
    } catch (e) { if (generation.current === token) {
      const failure = e instanceof ChineseAIError ? e : new ChineseAIError('AI_NETWORK');
      setError(failure);
      if (failure.retryAfter) { setRetryUntil(Date.now() + failure.retryAfter * 1000); setNow(Date.now()); }
    } }
    finally { if (generation.current === token) { controller.current = null; setPending(''); } }
  };
  const body = { color: theme.textSecondary, fontSize: 15, lineHeight: 23 };
  const inputStyle = { color: theme.textPrimary, minHeight: 100, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, textAlignVertical: 'top' as const, fontSize: 16 };
  const changeTask = (next: AITask) => { setTask(next); setError(null); };
  const useCorrection = (text: string) => { changeTask('writing'); setDraft(text); setIntendedMeaning(''); scroll.current?.scrollToEnd({ animated: false }); };
  return <Screen title="4Chinese AI" hideHeader avoidKeyboard scrollRef={scroll}>
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 23, fontWeight: '800' }}>Hỏi để hiểu, luyện để nhớ</Text>
      <Text style={body}>{modeNames[prefs.mode]} · {external ? 'Khả dụng cần được máy chủ xác minh' : 'Không gửi dữ liệu ra ngoài'}</Text>
      <PrimaryButton label="Cài đặt AI & quyền riêng tư" variant="ghost" onPress={() => router.push('/ai/settings' as Href)} />
      {language === 'zh' ? <Disclosure title="Công cụ AI khác"><PrimaryButton label="Study Coach & quiz cá nhân" variant="ghost" onPress={() => router.push('/ai/coach' as Href)} /><PrimaryButton label="Biên tập nội dung nháp (admin)" variant="ghost" onPress={() => router.push('/ai/editor' as Href)} /></Disclosure> : <Text style={body}>Sửa câu tiếng Anh · giải thích bằng tiếng Việt. Chỉ gửi câu bạn nhập; không đọc kho từ hoặc tiến độ tiếng Anh.</Text>}
      {turns.length || draft || translation.source ? <PrimaryButton label="Bắt đầu phiên mới" variant="ghost" disabled={!!pending} onPress={async () => {
        if (await ask({ title: 'Bắt đầu phiên AI mới?', message: 'Hội thoại và bản nháp hiện tại sẽ được xóa khỏi phiên này. Tiến độ học giữ nguyên; số lượt AI đã dùng không được hoàn lại.', acceptLabel: 'Xóa phiên và bắt đầu lại' })) onNewSession();
      }} /> : null}
      <Text style={{ ...body, fontSize: 13 }}>AI có thể sai. Hội thoại chỉ giữ trong phiên; điểm luyện nháp không ghi vào bài học, lịch ôn hay XP.</Text>
    </View>
    {prefs.mode === 'LOCAL_ONLY' ? <View style={[themedCard(theme), { gap: 10 }]}><Text style={body}>Chế độ trên thiết bị dùng nội dung có sẵn. Chưa có model AI chạy cục bộ.</Text><OfflineLinks /></View> : null}
    {prefs.mode === 'DISABLED' ? <Text style={body}>Bạn có thể xem ngữ cảnh và soạn câu hỏi. Bật nhà cung cấp đã đồng ý trong Cài đặt AI để gửi.</Text> : null}
    {launch || context?.kind === 'conversation' ? <View style={[themedCard(theme), { gap: 10 }]}>
      <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '700' }}>Ngữ cảnh: {context?.kind === 'conversation' ? 'Luyện nói / transcript được chọn' : launch?.label}</Text>
      {launch?.senses && launch.senses.length > 1 ? <View style={{ gap: 8 }}>
        <Text style={body}>Chọn đúng một nghĩa muốn hỏi; chưa chọn sẽ không gửi ngữ cảnh từ.</Text>
        {launch.senses.map((item, i) => <Choice role="radio" key={`${i}:${item.meaning}`} label={`${item.meaning}${item.pos ? ` · ${item.pos}` : ''}`} selected={sense === i} disabled={!!pending} onPress={() => { stop(); setSense(i); setTurns([]); setIncludeHistory(false); }} />)}
      </View> : null}
      {launch?.context?.kind === 'reader' ? <View style={{ gap: 8 }}><Text style={body}>Sửa/giữ lại đúng câu hoặc đoạn muốn gửi (tối đa 1.200 ký tự).</Text><TextInput accessibilityLabel="Đoạn đọc chọn gửi AI" multiline maxLength={1200} value={readerText} editable={!pending} onChangeText={text => { setReaderText(text); setTurns([]); setIncludeHistory(false); }} style={{ color: theme.textPrimary, minHeight: 100, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, textAlignVertical: 'top' }} /></View> : null}
      {context ? <Disclosure title="Xem nội dung ngữ cảnh"><Text selectable style={body}>{contextText(context)}</Text></Disclosure> : null}
      {prefs.consent.scope === 'selected' ? <Choice label="Gửi thêm ngữ cảnh đang chọn" selected={includeContext} disabled={!!pending || !context} onPress={() => setIncludeContext(v => !v)} />
        : <Text style={body}>Quyền hiện tại: chỉ câu hỏi đang soạn. Ngữ cảnh trên chưa được gửi.</Text>}
    </View> : null}
    {turns.map((turn, i) => <View key={turn.result.requestId} style={{ gap: 10 }}>
      <Text style={{ ...body, color: theme.textPrimary, fontWeight: '700' }}>Bạn: {turn.question}</Text>
      <StudyTransition turnKey={turn.result.requestId} effect="reveal" animateOnMount><Answer result={turn.result} language={language} task={turn.task} hskLevel={turn.hskLevel} noteTarget={turn.noteTarget} busy={!!pending} onUseCorrection={useCorrection} onOralPractice={setOralTarget} /></StudyTransition>
      {i === turns.length - 1 && turns.length >= 8 ? <Text style={body}>Đã đủ 8 câu trả lời trong phiên. Bạn có thể làm lại bài nháp hoặc chọn Bắt đầu phiên mới; hạn mức ngày vẫn được giữ.</Text> : null}
    </View>)}
    {pending ? <View accessibilityLiveRegion="polite" style={{ gap: 10 }}><Text style={body}>Đang hỏi: {pending}</Text><ActivityIndicator color={theme.primary} /><Text style={body}>Đang chờ nhà cung cấp…</Text><PrimaryButton label="Dừng tạo câu trả lời" variant="secondary" onPress={() => { stop(); setError(new ChineseAIError('AI_CANCELLED')); }} /></View> : null}
    {error ? <View style={[themedCard(theme), { gap: 10 }]}><Text accessibilityRole="alert" style={{ ...body, color: theme.error }}>{error.message}</Text>
      {!pending && !['AI_CANCELLED', 'AI_DISABLED', 'AI_LOCAL_ONLY', 'AI_RATE_LIMITED'].includes(error.code) ? <PrimaryButton label="Thử gửi lại câu đang soạn" variant="secondary" disabled={!inputReady || retrySeconds > 0} onPress={() => void send()} /> : null}
      {error.code === 'AI_LOGIN_REQUIRED' ? <PrimaryButton label="Mở tài khoản Cloud" variant="ghost" onPress={() => router.push('/cloud' as Href)} /> : null}
      <OfflineLinks />
    </View> : null}
    {retrySeconds > 0 ? <Text style={body}>Máy chủ yêu cầu chờ thêm {retrySeconds} giây. App không tự gửi lại.</Text> : null}
    {turns.length < 8 ? <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 19, fontWeight: '800' }}>Bạn muốn luyện gì?</Text>
      {language === 'zh' ? <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['tutor', 'Hỏi đáp'], ['writing', 'Sửa câu'], ['translation', 'Luyện dịch'], ['practice', 'Luyện HSK'], ['conversation', 'Luyện nói']] as const).map(([value, label]) => <Choice role="radio" key={value} label={label} selected={selectedMode === value} disabled={!!pending} onPress={() => changeTask(value)} />)}</View> : null}
      {language === 'zh' ? <Disclosure title={`Độ khó ${hskLevel ? `· HSK ${hskLevel}` : '· chưa chọn cấp'}`}>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[null, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => <Choice role="radio" key={String(level)} label={level ? `HSK ${level}` : 'Tự chọn nội dung'} selected={hskLevel === level} disabled={!!pending} onPress={() => setHskLevel(level)} />)}</View>
        <Text style={body}>Mục tiêu độ khó do bạn chọn. Bài AI không thay thế đề thi hoặc xác nhận trình độ HSK.</Text>
      </Disclosure> : null}
      {language === 'zh' && context?.kind !== 'conversation' && (selectedMode === 'tutor' || includeContext) ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{actions.map(action => <PrimaryButton key={action.label} label={action.label} variant="ghost" disabled={!!pending} onPress={() => {
        changeTask(action.task); setDraft(action.question.slice(0, action.task === 'writing' ? 1000 : 1500));
        if (action.task === 'translation' && context?.kind === 'reader') {
          setTranslation({ source: context.text.slice(0, 600), attempt: '', direction: 'zh-vi', feedback: 'hint' }); setIncludeContext(false);
        }
        if (action.task === 'writing' && context?.kind === 'reader') { setDraft(context.text); setIncludeContext(false); }
      }} />)}</View> : null}
      {task === 'conversation' ? <View style={{ gap: 10 }}>
        <Text style={body}>Chọn tình huống hoặc nhập chủ đề tự do. Chỉ gửi transcript khi bạn chọn gửi; lời nói chưa được gửi tự động.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['Làm quen và sở thích', 'Gọi món ở nhà hàng', 'Hỏi đường', 'Hội thoại tự do'].map(value => <PrimaryButton key={value} label={value} variant="ghost" disabled={!!pending} onPress={() => { setScene(value); setIncludeHistory(false); }} />)}</View>
        <TextInput accessibilityLabel="Tình huống luyện nói" maxLength={150} value={scene} editable={!pending} onChangeText={value => { setScene(value); setIncludeHistory(false); }} style={inputStyle} />
        <Choice label="Luyện phản xạ 15 giây" selected={reflex} disabled={!!pending} onPress={() => setReflex(v => !v)} />
        <AIConversationTools key={`${scene}:${reflex}:${!!pending}:${!!oralTarget}`} disabled={!!pending || !!oralTarget} reflex={reflex} onText={setDraft} />
        <PrimaryButton label="Luyện thanh điệu & phát âm theo mẫu" variant="ghost" onPress={() => router.push('/speaking/tones' as Href)} />
        <PrimaryButton label="Nghe và ghi âm đối chiếu" variant="ghost" onPress={() => router.push('/speaking/shadowing' as Href)} />
      </View> : null}
      {dialogue.length && language === 'zh' ? <PrimaryButton label="Xem trước tổng kết hội thoại" variant="secondary" disabled={!!pending} onPress={() => { setTask('speaking_review'); setDraft('Tổng kết các lượt người học trong transcript đã chọn; nêu lỗi có bằng chứng và gợi ý luyện tiếp. Không chấm phát âm từ chữ.'); setIncludeHistory(false); }} /> : null}
      {task === 'speaking_review' ? <Text style={body}>Xem ngữ cảnh phía trên rồi chọn gửi để phân tích tối đa 6 cặp hội thoại gần nhất. AI chỉ đọc transcript, không nghe âm thanh.</Text> : null}
      {task === 'translation' ? <View style={[themedCard(theme), { gap: 12 }]}>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['vi-zh', 'Việt → Trung'], ['zh-vi', 'Trung → Việt']] as const).map(([direction, label]) => <Choice key={direction} role="radio" label={label} selected={translation.direction === direction} disabled={!!pending} onPress={() => setTranslation(value => ({ ...value, direction }))} />)}</View>
        <Text style={body}>1. Nhập câu gốc · 2. Tự dịch thử · 3. Nhận góp ý</Text>
        <TextInput accessibilityLabel="Câu gốc để luyện dịch" placeholder={translation.direction === 'vi-zh' ? 'Nhập câu tiếng Việt…' : 'Nhập câu tiếng Trung…'} placeholderTextColor={theme.textMuted} multiline maxLength={600} value={translation.source} editable={!pending} onChangeText={source => setTranslation(value => ({ ...value, source }))} style={inputStyle} />
        <TextInput accessibilityLabel="Bản dịch thử của bạn" placeholder={translation.direction === 'vi-zh' ? 'Bạn thử viết bằng tiếng Trung…' : 'Bạn thử dịch sang tiếng Việt…'} placeholderTextColor={theme.textMuted} multiline maxLength={600} value={translation.attempt} editable={!pending} onChangeText={attempt => setTranslation(value => ({ ...value, attempt }))} style={inputStyle} />
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['hint', 'Gợi ý trước'], ['review', 'Góp ý bản dịch']] as const).map(([feedback, label]) => <Choice key={feedback} role="radio" label={label} selected={translation.feedback === feedback} disabled={!!pending} onPress={() => setTranslation(value => ({ ...value, feedback }))} />)}</View>
        <Text style={{ ...body, fontSize: 12 }}>{translation.source.length}/600 ký tự câu gốc · {translation.attempt.length}/600 ký tự bản dịch thử. Chế độ góp ý cần có bản dịch của bạn.</Text>
      </View> : <>
        {task === 'practice' ? <View style={{ gap: 8 }}><Text style={body}>Chọn dạng bài, cấp HSK và chủ đề hoặc yêu cầu muốn luyện.</Text><View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['choice', 'Trắc nghiệm'], ['cloze', 'Câu đục lỗ'], ['mixed', 'Kết hợp']] as const).map(([kind, label]) => <Choice key={kind} role="radio" label={label} selected={exerciseKind === kind} disabled={!!pending} onPress={() => setExerciseKind(kind)} />)}</View></View> : null}
        <TextInput accessibilityLabel={task === 'writing' ? `Câu tiếng ${language === 'en' ? 'Anh' : 'Trung'} muốn sửa` : task === 'practice' ? 'Chủ đề hoặc yêu cầu luyện tập' : 'Câu hỏi gửi AI'} placeholder={task === 'writing' ? `Nhập câu tiếng ${language === 'en' ? 'Anh' : 'Trung'} bạn muốn sửa…` : task === 'practice' ? 'Ví dụ: lượng từ khi mua đồ, phân biệt 再 / 又…' : 'Bạn muốn hiểu điều gì?'} placeholderTextColor={theme.textMuted}
          multiline maxLength={task === 'writing' ? 1000 : task === 'conversation' ? 500 : 1500} value={draft} editable={!pending} onChangeText={setDraft} style={inputStyle} />
        {task === 'writing' ? <TextInput accessibilityLabel="Ý bạn muốn diễn đạt" placeholder="Ý bạn muốn nói bằng tiếng Việt (không bắt buộc)…" placeholderTextColor={theme.textMuted} multiline maxLength={300} value={intendedMeaning} editable={!pending} onChangeText={setIntendedMeaning} style={inputStyle} /> : null}
        <Text style={{ ...body, fontSize: 12 }}>{draft.length}/{task === 'writing' ? '1.000' : task === 'conversation' ? '500' : '1.500'} ký tự · Nhấn Gửi mới gọi AI.</Text>
        {task === 'writing' && draft.length > 1000 ? <Text accessibilityRole="alert" style={{ ...body, color: theme.error }}>Bản nháp đã được giữ. Rút gọn còn tối đa 1.000 ký tự để gửi sửa câu.</Text> : null}
      </>}
      {prefs.consent.scope === 'selected' && turns.length && task !== 'speaking_review' ? <Choice label="Gửi thêm tối đa 3 cặp hỏi đáp gần nhất của phiên" selected={includeHistory} disabled={!!pending} onPress={() => setIncludeHistory(v => !v)} /> : null}
      <Disclosure title="Kiểm tra dữ liệu sẽ gửi"><Text selectable style={body}>Câu hỏi: {currentQuestion || '(chưa nhập)'}{task === 'practice' ? `\nDạng bài: ${exerciseKind === 'cloze' ? 'câu đục lỗ' : exerciseKind === 'choice' ? 'trắc nghiệm' : 'kết hợp'}` : ''}{includeContext && context ? `\n\nNgữ cảnh:\n${contextText(context)}` : '\n\nKhông kèm ngữ cảnh.'}{includeHistory ? '\n\nKèm tối đa 3 cặp hỏi đáp gần nhất hiển thị phía trên.' : '\nKhông kèm lịch sử.'}</Text></Disclosure>
      {requiresContext && (!includeContext || prefs.consent.scope !== 'selected') ? <Text style={body}>Tác vụ này cần ngữ cảnh được chọn. Cho phép ngữ cảnh trong Cài đặt AI, xem trước nội dung rồi bật “Gửi thêm ngữ cảnh đang chọn”.</Text> : null}
      {task === 'conversation' && turns.length >= 7 ? <Text style={body}>Phiên đã có 7 phản hồi. Chọn xem trước tổng kết hội thoại hoặc bắt đầu phiên mới; hạn mức server vẫn áp dụng.</Text> : null}
      <PrimaryButton label={task === 'translation' ? translation.feedback === 'hint' ? 'Gửi để nhận gợi ý' : 'Gửi bản dịch để góp ý' : task === 'practice' ? 'Tạo bài luyện nháp' : 'Gửi câu hỏi'} disabled={!external || !ready || !!pending || !inputReady || retrySeconds > 0 || !prefs.consent.adult || !prefs.consent.providers.length || (includeContext && !context) || (requiresContext && (!includeContext || prefs.consent.scope !== 'selected')) || (task === 'conversation' && turns.length >= 7)} onPress={() => void send()} />
      {external && (!prefs.consent.adult || !prefs.consent.providers.length) ? <Text style={body}>Cần xác nhận độ tuổi và đồng ý ít nhất một nhà cung cấp trong Cài đặt AI.</Text> : null}
    </View> : null}
    {oralTarget ? <AIOralPractice text={oralTarget} onClose={() => setOralTarget(null)} /> : null}
    {dialog}
  </Screen>;
}
function Choice({ label, selected, disabled, onPress, role = 'checkbox' }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void; role?: 'checkbox' | 'radio' }) {
  const theme = useTheme();
  return <MotionPressable accessibilityRole={role} accessibilityState={{ checked: selected, disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={{ minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.surface, opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: theme.textPrimary, fontSize: 14 }}>{selected ? '✓ ' : ''}{label}</Text>
  </MotionPressable>;
}
function Answer({ result, task, language, hskLevel, noteTarget, busy, onUseCorrection, onOralPractice }: { result: AIResult; task: AITask; language: 'zh' | 'en'; hskLevel: number | null; noteTarget?: AILaunch['noteTarget']; busy: boolean; onUseCorrection: (text: string) => void; onOralPractice: (text: string) => void }) {
  const theme = useTheme(), answer = result.answer;
  const body = { color: theme.textSecondary, fontSize: 16, lineHeight: 24 };
  return <View style={[themedCard(theme), { gap: 14 }]}>
    <Text style={{ ...body, fontSize: 12 }}>{result.provider} · Nội dung AI, cần đối chiếu</Text>
    <Text selectable style={{ ...body, color: theme.textPrimary, fontWeight: '700' }}>{task === 'practice' ? 'Bài luyện theo yêu cầu của bạn' : answer.summary}</Text>
    {task !== 'practice' ? <>
      {answer.explanation ? <Text selectable style={body}>{answer.explanation}</Text> : null}
      {answer.examples.map((example, i) => <View key={i} style={{ gap: 8 }}><ExampleSentence item={{ chinese: example.hanzi, pinyin: example.pinyin, vietnamese: example.vietnamese }} />{language === 'zh' ? <PrimaryButton label={`Luyện nói câu mẫu ${i + 1}`} variant="ghost" disabled={busy} onPress={() => onOralPractice(example.hanzi)} /> : null}</View>)}
      {answer.corrections.map((c, i) => <View key={i} style={{ gap: 8, borderLeftWidth: 3, borderLeftColor: theme.primary, paddingLeft: 12 }}><Text selectable style={body}>Câu gốc: {c.original}</Text><Text selectable style={{ ...body, color: theme.textPrimary, fontWeight: '700' }}>Gợi ý sửa: {c.corrected}</Text><Text selectable style={body}>{c.reason}</Text>{language === 'en' ? <EnglishAudioButton text={c.corrected} compact /> : /\p{Script=Han}/u.test(c.corrected) ? <><AudioButton text={c.corrected} /><PrimaryButton label={`Luyện nói câu đã sửa ${i + 1}`} variant="ghost" disabled={busy} onPress={() => onOralPractice(c.corrected)} /></> : null}<PrimaryButton label="Viết lại câu này" variant="ghost" disabled={busy} onPress={() => onUseCorrection(c.corrected)} /></View>)}
    {answer.mnemonic ? <View style={{ gap: 10 }}><Text style={{ ...body, fontWeight: '700' }}>{mnemonicLabel}</Text><Text selectable style={body}>{answer.mnemonic}</Text>{noteTarget ? <SaveMnemonic target={noteTarget} text={`${mnemonicLabel}\n${answer.mnemonic}`} /> : null}</View> : null}
    </> : null}
    {answer.quiz.length ? <ChineseAIPractice key={result.requestId} quiz={answer.quiz} hskLevel={hskLevel} /> : null}
  </View>;
}
function SaveMnemonic({ target, text }: { target: NonNullable<AILaunch['noteTarget']>; text: string }) {
  const db = useSQLiteContext(), theme = useTheme();
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const lock = useRef(false);
  return <View style={{ gap: 8 }}>
    {!confirm ? <PrimaryButton label="Lưu mẹo nhớ này" variant="secondary" onPress={() => setConfirm(true)} /> : <>
      <Text style={{ color: theme.textSecondary, lineHeight: 22 }}>Lưu đúng nội dung xem trước ở trên vào mẹo chữ {target.character}? Mẹo cũ của chữ này sẽ được thay; ghi chú khác được giữ nguyên. Chỉ lưu được cho từ đã học.</Text>
      <PrimaryButton label="Xác nhận lưu mẹo vào ghi chú" loading={busy} onPress={async () => {
        if (lock.current) return;
        lock.current = true; setBusy(true); setMessage('');
        try { await saveMemoryMnemonic(db, target.wordId, target.character, text); setMessage('Đã lưu mẹo có nhãn AI vào ghi chú.'); setConfirm(false); }
        catch { setMessage('Chưa lưu được. Từ cần có tiến độ học sẵn; bạn vẫn có thể giữ nội dung trên màn hình để xem.'); }
        finally { lock.current = false; setBusy(false); }
      }} />
      <PrimaryButton label="Hủy lưu" variant="ghost" disabled={busy} onPress={() => setConfirm(false)} />
    </>}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: theme.textPrimary }}>{message}</Text> : null}
  </View>;
}
function OfflineLinks() {
  const { preferences } = useLearningLanguage();
  if (preferences.learningLanguage === 'en') return <PrimaryButton label="Về kho từ tiếng Anh" variant="ghost" onPress={() => router.push('/english' as Href)} />;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    <PrimaryButton label="Từ điển" variant="ghost" onPress={() => router.push('/search' as Href)} />
    <PrimaryButton label="Ngữ pháp" variant="ghost" onPress={() => router.push('/grammar' as Href)} />
    <PrimaryButton label="Củng cố trí nhớ" variant="ghost" onPress={() => router.push('/memory' as Href)} />
  </View>;
}
