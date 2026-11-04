import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, TextInput, View } from 'react-native';

import { ChineseAIPractice } from '@/components/ChineseAIPractice';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Disclosure } from '@/components/chinese/Disclosure';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { reviewedAIContent } from '@/services/ai/content';
import { shareAIContent } from '@/services/ai/export';
import { checkChineseAIBackend, ChineseAIError, parseAIAnswer, sendChineseAI, type AIAnswer, type AIExerciseKind } from '@/services/ai/gateway';
import { useAISettings } from '@/services/ai/preferences';
import { useLearningLanguage } from '@/services/languages/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function AIContentEditor() {
  const { preferences } = useLearningLanguage(), prefs = useAISettings(s => s.preferences);
  return preferences.learningLanguage === 'zh' ? <Editor key={JSON.stringify(prefs)} /> : <Screen title="Biên tập AI"><Text>Công cụ này dành cho nội dung tiếng Trung.</Text></Screen>;
}
function Editor() {
  const theme = useTheme(), { preferences: prefs, ready, load } = useAISettings();
  const [allowed, setAllowed] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [topic, setTopic] = useState(''), [source, setSource] = useState(''), [level, setLevel] = useState(1), [kind, setKind] = useState<AIExerciseKind>('mixed');
  const [answer, setAnswer] = useState<AIAnswer | null>(null), [reviewed, setReviewed] = useState(false), [exported, setExported] = useState('');
  const [draftMeta, setDraftMeta] = useState<{ topic: string; source: string; level: number; kind: AIExerciseKind } | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareLock = useRef(false);
  const [retryUntil, setRetryUntil] = useState(0), [now, setNow] = useState(Date.now);
  const [session] = useState(() => `edit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
  const controller = useRef<AbortController | null>(null);
  const stop = useCallback(() => { controller.current?.abort(); controller.current = null; setBusy(false); }, []);
  useEffect(() => { if (!ready) void load(); }, [load, ready]);
  useFocusEffect(useCallback(() => { const listener = AppState.addEventListener('change', s => { if (s !== 'active') stop(); }); return () => { stop(); listener.remove(); }; }, [stop]));
  useEffect(() => { if (!retryUntil) return; const timer = setInterval(() => { const t = Date.now(); setNow(t); if (t >= retryUntil) setRetryUntil(0); }, 1000); return () => clearInterval(timer); }, [retryUntil]);
  const external = prefs.mode !== 'DISABLED' && prefs.mode !== 'LOCAL_ONLY', wait = Math.max(0, Math.ceil((retryUntil - now) / 1000));
  const body = { color: theme.textSecondary, fontSize: 15, lineHeight: 23 }, field = { color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, minHeight: 55 };
  const invalidate = () => { setReviewed(false); setExported(''); };
  const work = async (action: (signal: AbortSignal) => Promise<void>) => {
    if (controller.current || Date.now() < retryUntil) return;
    const c = new AbortController(); controller.current = c; setBusy(true); setMessage('');
    try { await action(c.signal); }
    catch (e) { if (!c.signal.aborted) { const err = e instanceof ChineseAIError ? e : new ChineseAIError('AI_NETWORK'); setMessage(err.message); if (err.retryAfter) { setNow(Date.now()); setRetryUntil(Date.now() + err.retryAfter * 1000); } } }
    finally { if (controller.current === c) { controller.current = null; setBusy(false); } }
  };
  let valid = false;
  try { if (answer && draftMeta) { parseAIAnswer(answer, { task: 'content', exerciseKind: draftMeta.kind }); valid = true; } } catch { /* Editing can temporarily be invalid; retain the draft. */ }
  const edit = (index: number, change: Partial<AIAnswer['quiz'][number]>) => { invalidate(); setAnswer(a => a ? { ...a, quiz: a.quiz.map((q, i) => i === index ? { ...q, ...change } : q) } : a); };
  return <Screen title="Biên tập nội dung AI" avoidKeyboard>
    <Text style={body}>Soạn nháp → sửa từng câu → tự đối chiếu → xuất JSON. Không ghi vào kho bài, đề thi, database hoặc tiến độ. Quyền biên tập phải được server cấp riêng, không lấy từ nút bật trên app.</Text>
    <PrimaryButton label="Cài đặt AI" variant="ghost" onPress={() => router.push('/ai/settings' as Href)} />
    <PrimaryButton label="Kiểm tra quyền biên tập" disabled={!ready || !external || busy || wait > 0} onPress={() => void work(async signal => {
      const status = await checkChineseAIBackend(prefs.mode, signal); if (signal.aborted) return;
      setAllowed(status.canEditContent === true); setMessage(status.canEditContent ? 'Có quyền biên tập trong môi trường thử. Model vẫn cần được xác minh miễn phí trước mỗi lần gọi.' : 'Chưa có quyền biên tập hoặc máy chủ chưa được bật. Cần quản trị viên cấu hình allowlist admin; không gửi key qua chat.');
    })} />
    {allowed ? <>
      <TextInput accessibilityLabel="Chủ đề nội dung nháp" placeholder="Chủ đề và mục tiêu bài luyện…" placeholderTextColor={theme.textMuted} multiline maxLength={1000} editable={!busy} value={topic} onChangeText={t => { setTopic(t); invalidate(); }} style={field} />
      <TextInput accessibilityLabel="Đoạn nguồn biên tập" placeholder="Nguồn bạn có quyền sử dụng (tùy chọn, tối đa 1.200 ký tự)…" placeholderTextColor={theme.textMuted} multiline maxLength={1200} editable={!busy} value={source} onChangeText={t => { setSource(t); invalidate(); }} style={{ ...field, minHeight: 100 }} />
      <Text style={body}>Đoạn nguồn ở trên được gửi khi bấm Tạo nháp; cần cho phép ngữ cảnh trong Cài đặt AI. Không gửi ảnh hoặc toàn bộ tài liệu.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <PrimaryButton key={n} label={`HSK ${n}${level === n ? ' ✓' : ''}`} variant="ghost" disabled={busy} onPress={() => { setLevel(n); invalidate(); }} />)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['choice', 'Trắc nghiệm'], ['cloze', 'Câu đục lỗ'], ['mixed', 'Kết hợp']] as const).map(([k, label]) => <PrimaryButton key={k} label={`${label}${kind === k ? ' ✓' : ''}`} variant="secondary" disabled={busy} onPress={() => { setKind(k); invalidate(); }} />)}</View>
      <PrimaryButton label="Tạo 3 câu nháp" disabled={busy || !topic.trim() || !external || wait > 0 || !prefs.consent.adult || !prefs.consent.providers.length || (!!source.trim() && prefs.consent.scope !== 'selected')} onPress={() => void work(async signal => {
        invalidate(); const result = await sendChineseAI({ mode: prefs.mode, language: 'zh', task: 'content', question: topic, context: source.trim() ? { kind: 'reader', text: source.trim() } : null,
          consent: prefs.consent, history: [], hskLevel: level, exerciseKind: kind, session, dailyLimit: prefs.dailyLimit }, signal);
        if (!signal.aborted) { setAnswer({ ...result.answer, summary: 'Bản nháp luyện tập', explanation: '', examples: [], corrections: [], mnemonic: '' }); setDraftMeta({ topic, source, level, kind }); setMessage('Đã có bản nháp AI. Đối chiếu kiến thức, tính tự nhiên và đáp án trước khi duyệt.'); }
      })} />
    </> : null}
    {busy ? <PrimaryButton label="Dừng yêu cầu biên tập" variant="secondary" onPress={() => { stop(); setMessage('Đã dừng yêu cầu; bản nháp đang có được giữ.'); }} /> : null}
    {wait ? <Text style={body}>Máy chủ yêu cầu chờ {wait} giây; không tự gửi lại.</Text> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={body}>{message}</Text> : null}
    {answer && draftMeta ? <>
      <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 20, fontWeight: '800' }}>Bản nháp cần đối chiếu</Text>
      <Text style={body}>Theo yêu cầu đã tạo: {draftMeta.topic} · mục tiêu HSK {draftMeta.level} · {draftMeta.kind}. Thay form tạo nháp không đổi nguồn của bản nháp đang sửa.</Text>
      {answer.quiz.map((q, i) => <View key={i} style={{ gap: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 12 }}>
        <Text style={body}>Câu {i + 1}</Text>
        <TextInput accessibilityLabel={`Câu hỏi nháp ${i + 1}`} multiline value={q.question} maxLength={500} editable={!busy} onChangeText={question => edit(i, { question })} style={field} />
        {q.choices.map((choice, n) => <View key={n} style={{ gap: 6 }}><TextInput accessibilityLabel={`Đáp án ${n + 1} câu ${i + 1}`} value={choice} maxLength={160} editable={!busy} onChangeText={text => edit(i, { choices: q.choices.map((v, j) => j === n ? text : v) })} style={field} />
          <MotionPressable accessibilityRole="radio" accessibilityLabel={`Đánh dấu đáp án ${n + 1} đúng cho câu ${i + 1}`} accessibilityState={{ checked: q.answerIndex === n, disabled: busy }} disabled={busy} onPress={() => edit(i, { answerIndex: n })} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: theme.textPrimary }}>{q.answerIndex === n ? '● Đáp án đúng' : '○ Chọn là đáp án đúng'}</Text></MotionPressable></View>)}
        <TextInput accessibilityLabel={`Giải thích câu ${i + 1}`} multiline value={q.explanation} maxLength={800} editable={!busy} onChangeText={explanation => edit(i, { explanation })} style={field} />
      </View>)}
      {!valid ? <Text accessibilityRole="alert" style={{ ...body, color: theme.error }}>Bản nháp chưa hợp lệ: câu hỏi, giải thích và các đáp án cần có nội dung, đáp án không trùng; kiểm tra đúng dạng bài đã chọn.</Text> : null}
      <PrimaryButton label={reviewed ? 'Đã tự đối chiếu ✓' : 'Tôi đã đối chiếu từng câu và đáp án'} variant="secondary" disabled={busy || !valid} onPress={() => { setReviewed(v => !v); setExported(''); }} />
      <Text style={{ ...body, fontSize: 12 }}>Mỗi lần sửa sẽ bỏ trạng thái đã duyệt. Dấu duyệt chỉ xác nhận thao tác của người biên tập, không chứng minh kiến thức đúng hay đây là đề chính thức.</Text>
      {reviewed && valid ? <Disclosure title="Làm thử bản nháp như người học"><ChineseAIPractice key={JSON.stringify(answer.quiz)} quiz={answer.quiz} reviewed /></Disclosure> : null}
      <PrimaryButton label="Xuất JSON bản nháp đã duyệt" disabled={!reviewed || !valid || busy} onPress={() => {
        try { setExported(JSON.stringify(reviewedAIContent(answer, draftMeta.kind, reviewed, draftMeta.topic, draftMeta.source, draftMeta.level), null, 2)); } catch { setMessage('Chưa xuất được. Kiểm tra lại bản nháp và trạng thái đối chiếu.'); }
      }} />
      {exported ? <Disclosure title="JSON để xuất (gồm đoạn nguồn đã nhập)"><Text selectable style={body}>{exported}</Text><PrimaryButton label="Lưu hoặc chia sẻ tệp JSON" loading={sharing} variant="secondary" onPress={() => {
        if (shareLock.current) return;
        shareLock.current = true; setSharing(true);
        void shareAIContent(exported).catch(() => setMessage('Chưa xuất được tệp; JSON vẫn ở trên để chọn và sao chép.'))
          .finally(() => { shareLock.current = false; setSharing(false); });
      }} /></Disclosure> : null}
    </> : null}
  </Screen>;
}
