import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { EnglishAudioButton } from '@/components/EnglishAudioButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { EnglishQuickDictionary } from '@/components/english/EnglishQuickDictionary';
import { englishDialogues, type EnglishDialogue } from '@/data/english-learning-content';
import { EnglishSpeechPlayer } from '@/services/audio/english-speech';
import { readerLookupTarget, type EnglishReadingContext } from '@/services/english/reading-context';
import { useLocalSpeaking } from '@/services/english/use-local-speaking';
import { useLearningLanguage } from '@/services/languages/LanguageProvider';
import { EnglishAvailability, useEnglishDatabase } from '@/services/languages/LanguageRuntime';
import { tokenizeEnglishReading } from '@/services/reader/english-tokenizer';
import { useTheme } from '@/theme/ThemeProvider';
import { getEnglishPalette } from '@/theme/english-tokens';

type Mode = 'LISTEN' | 'REPEAT' | 'ROLE';
type Resume = { id: string; mode: Mode; role: 'A' | 'B'; turn: number };
const resumeKey = 'dialogue-position:v8.1';

export default function EnglishSpeakingTab() {
  const { preferences } = useLearningLanguage();
  if (preferences.learningLanguage !== 'en') return null;
  return <EnglishAvailability><ConversationWorkspace /></EnglishAvailability>;
}

function ConversationWorkspace() {
  const db = useEnglishDatabase();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === 'dark');
  const [showDrafts, setShowDrafts] = useState(false);
  const [lesson, setLesson] = useState<EnglishDialogue | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [role, setRole] = useState<'A' | 'B'>('A');
  const [turn, setTurn] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [translated, setTranslated] = useState(true);
  const [resume, setResume] = useState<Resume | null>(null);
  const [storageMessage, setStorageMessage] = useState('');
  const [lookup, setLookup] = useState<{ query: string; context: EnglishReadingContext } | null>(null);
  const [player] = useState(() => new EnglishSpeechPlayer(Speech));
  const speech = useLocalSpeaking();
  const persistLock = useRef(false);
  const current = lesson?.turns[turn];
  const completed = !!lesson && !!mode && turn >= lesson.turns.length;
  const cardStyle = { backgroundColor: p.surface, borderColor: p.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 } as const;
  const textStyle = { color: p.textPrimary, fontSize: 18, fontWeight: '800' } as const;

  useFocusEffect(useCallback(() => {
    let live = true;
    void db.getFirstAsync<{ payload_json: string }>('SELECT payload_json FROM en_drafts WHERE id=?', resumeKey).then(row => {
      if (!row || !live) return;
      try {
        const value = JSON.parse(row.payload_json) as Resume;
        const content = englishDialogues.find(item => item.id === value.id);
        if (content && ['LISTEN', 'REPEAT', 'ROLE'].includes(value.mode) && ['A', 'B'].includes(value.role) && Number.isSafeInteger(value.turn) && value.turn >= 0 && value.turn < content.turns.length) setResume(value);
      } catch { /* Preserve malformed drafts, never overwrite on read. */ }
    }).catch(() => { if (live) setStorageMessage('Chưa đọc được vị trí luyện tập. Không đặt lại dữ liệu.'); });
    return () => { live = false; void player.stop(); };
  }, [db, player]));
  useEffect(() => {
    if (mode !== 'ROLE' || !current || current.speaker === role || lookup) return;
    let live = true;
    void player.speak(current.en, 'en-US', error => { if (live && error) setStorageMessage('Chưa phát được giọng đọc. Bạn có thể xem câu mẫu hoặc thử giọng khác.'); }).then(status => { if (live && status === 'MISSING_VOICE') setStorageMessage('Chưa có giọng Anh Mỹ tại máy. Dùng nút UK để thử giọng khác hoặc tự xem câu mẫu.'); }).catch(() => { if (live) setStorageMessage('Giọng đọc chưa khả dụng.'); });
    return () => { live = false; void player.stop(); };
  }, [current, mode, role, player, lookup]);
  const begin = (nextMode: Mode) => { speech.clear(); setMode(nextMode); setTurn(0); setAttempts(0); setStorageMessage(''); };
  const next = async () => {
    if (!lesson || !mode || persistLock.current || speech.listening) return;
    persistLock.current = true; speech.clear();
    const position = turn + 1;
    try {
      await db.runAsync('INSERT INTO en_drafts(id,payload_json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json', resumeKey, JSON.stringify({ id: lesson.id, mode, role, turn: position }));
      setTurn(position); setResume(position < lesson.turns.length ? { id: lesson.id, mode, role, turn: position } : null);
    } catch { setStorageMessage('Chưa lưu được vị trí. Lượt hiện tại vẫn giữ nguyên; hãy thử lại.'); }
    finally { persistLock.current = false; }
  };
  const exit = () => { speech.clear(); void player.stop(); setLesson(null); setMode(null); setTurn(0); setLookup(null); };
  const wordLookup = (text: string, start: number) => {
    speech.cancel(); void player.stop();
    const target = readerLookupTarget(text, start);
    setLookup({ ...target, context: { ...target.context, sourceTitle: lesson?.title ?? '' } });
  };
  return <Screen title={lesson?.title ?? 'Luyện nói tiếng Anh'} subtitle={lesson ? lesson.scenario : 'Nghe · nhắc lại · tập đóng vai.'} avoidKeyboard key={`${lesson?.id ?? 'speaking-hub'}:${mode ?? 'detail'}:${turn}`}>
    {!lesson ? <>
      {resume ? <View style={cardStyle}><Text style={textStyle}>Tiếp tục luyện tập</Text><Text style={{ color: p.textSecondary }}>{englishDialogues.find(row => row.id === resume.id)?.title} · lượt {resume.turn + 1}</Text><PrimaryButton label="Tiếp tục bài thử" onPress={() => { setLesson(englishDialogues.find(row => row.id === resume.id)!); setMode(resume.mode); setRole(resume.role); setTurn(resume.turn); setShowDrafts(true); }} /></View> : null}
      <View style={cardStyle}><Text style={textStyle}>Hội thoại theo chủ đề</Text><Text style={{ color: p.textSecondary }}>6 hội thoại gốc, 6–8 lượt mỗi bài. Nội dung đang cần người biên soạn duyệt, không phải chương trình CEFR đã xác nhận.</Text><PrimaryButton label={showDrafts ? 'Ẩn bài thử chưa duyệt' : 'Xem bài thử chưa duyệt'} onPress={() => setShowDrafts(value => !value)} /></View>
      {showDrafts ? englishDialogues.map(item => <Pressable accessibilityRole="button" key={item.id} onPress={() => { setLesson(item); setMode(null); setTurn(0); }} style={cardStyle}><Text style={{ color: p.spelling }}>{item.topic} · BÀI THỬ</Text><Text style={textStyle}>{item.title}</Text><Text style={{ color: p.textSecondary }}>{item.turns.length} lượt · khoảng {item.minutes} phút · {item.level === 'Short sentences' ? 'Câu ngắn' : 'Câu dài hơn'}</Text><Text style={{ color: p.primary }}>Xem tình huống →</Text></Pressable>) : null}
      <Text style={{ color: p.textMuted }}>Không chấm điểm phát âm. Nhận dạng chỉ chạy ngoại tuyến nếu thiết bị hỗ trợ. Bản nhận dạng không được lưu vào lịch sử.</Text>
    </> : !mode ? <>
      <Pressable accessibilityRole="button" onPress={exit} style={{ minHeight: 44 }}><Text style={{ color: p.primary }}>← Danh sách hội thoại</Text></Pressable>
      <View style={cardStyle}><Text style={{ color: p.spelling }}>BÀI THỬ · CẦN DUYỆT</Text><Text style={textStyle}>Mục tiêu</Text>{lesson.goals.map(goal => <Text key={goal} style={{ color: p.textSecondary }}>{goal}</Text>)}<Text style={{ color: p.textSecondary }}>Vai A: {lesson.participants[0]} · Vai B: {lesson.participants[1]}</Text><Text style={{ color: p.textSecondary }}>{lesson.turns.length} lượt · khoảng {lesson.minutes} phút · giọng đọc máy</Text><Text style={{ color: p.textMuted }}>Từ sẽ gặp: {lesson.vocabulary.join(', ')}</Text></View>
      <PrimaryButton label="Nghe mẫu từng lượt" onPress={() => begin('LISTEN')} />
      <PrimaryButton label="Nghe và nhắc lại" onPress={() => begin('REPEAT')} />
      <View style={cardStyle}><Text style={textStyle}>Bạn muốn đóng vai nào?</Text>{(['A', 'B'] as const).map(value => <Pressable accessibilityRole="radio" accessibilityState={{ checked: role === value }} key={value} onPress={() => setRole(value)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: p.primary }}>{role === value ? '●' : '○'} {lesson.participants[value === 'A' ? 0 : 1]}</Text></Pressable>)}<PrimaryButton label="Bắt đầu hội thoại đóng vai" onPress={() => begin('ROLE')} /></View>
    </> : completed ? <View style={cardStyle} testID="english-dialogue-result"><Text style={textStyle}>Hoàn thành bài thử</Text><Text style={{ color: p.textSecondary }}>Đã xác nhận luyện/xem {turn}/{lesson.turns.length} lượt.</Text><Text style={{ color: p.textSecondary }}>{attempts} lần yêu cầu nhận dạng trong phiên này. Không đo độ chính xác hay phát âm.</Text><Text style={{ color: p.textSecondary }}>Từ trong tình huống: {lesson.vocabulary.join(', ')}</Text><Text style={{ color: p.textMuted }}>Vị trí được lưu tại máy. Bản nhận dạng và số lần thử chỉ thuộc phiên hiện tại; không có lịch sử hoặc điểm giả.</Text><PrimaryButton label="Luyện lại bài này" onPress={() => begin(mode)} /><PrimaryButton label="Chọn hội thoại tiếp theo" onPress={exit} /></View> : current ? <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><Text style={{ color: p.textSecondary }}>{mode === 'LISTEN' ? 'Nghe mẫu' : mode === 'REPEAT' ? 'Nhắc lại' : 'Đóng vai'} · lượt {turn + 1}/{lesson.turns.length}</Text><Pressable accessibilityRole="button" onPress={() => setTranslated(value => !value)}><Text style={{ color: p.primary }}>{translated ? 'Ẩn nghĩa Việt' : 'Hiện nghĩa Việt'}</Text></Pressable></View>
      <View style={[cardStyle, { backgroundColor: current.speaker === role ? p.primaryLight : p.surface }]} testID="english-dialogue-turn">
        <Text style={{ color: p.primary, fontWeight: '800' }}>{lesson.participants[current.speaker === 'A' ? 0 : 1]} {mode === 'ROLE' && current.speaker === role ? '· Lượt của bạn' : ''}</Text>
        <Text style={{ color: p.textPrimary, fontSize: 23, lineHeight: 34 }}>{tokenizeEnglishReading(current.en).map(token => token.word ? <Text key={token.start} accessibilityRole="button" accessibilityLabel={`Tra từ: ${token.text}`} onPress={() => wordLookup(current.en, token.start)}>{token.text}</Text> : <Text key={token.start}>{token.text}</Text>)}</Text>
        {translated ? <Text style={{ color: p.textSecondary, lineHeight: 25 }}>{current.vi}</Text> : null}
        <EnglishAudioButton key={`${lesson.id}:${turn}`} text={current.en} />
      </View>
      {(mode === 'REPEAT' || (mode === 'ROLE' && current.speaker === role)) ? <View style={cardStyle}><PrimaryButton label={speech.listening ? 'Hủy nhận dạng' : speech.preparing ? 'Hủy yêu cầu quyền' : 'Thử nói lượt này'} onPress={() => { if (speech.listening || speech.preparing) speech.cancel(); else { setAttempts(value => value + 1); void speech.start(); } }} />{speech.preparing ? <Text style={{ color: p.textSecondary }}>Đang kiểm tra quyền microphone…</Text> : null}{speech.transcript ? <Text style={{ color: p.textPrimary }}>Máy nhận được: {speech.transcript}</Text> : null}{speech.message ? <Text accessibilityLiveRegion="polite" style={{ color: p.textSecondary }}>{speech.message}</Text> : null}</View> : null}
      <PrimaryButton label={mode === 'LISTEN' ? 'Đã nghe/xem · lượt tiếp' : 'Đã tự luyện · lượt tiếp'} disabled={speech.listening} onPress={() => void next()} />
      <Pressable accessibilityRole="button" onPress={exit} style={{ minHeight: 48 }}><Text style={{ color: p.primary }}>Dừng và về danh sách</Text></Pressable>
    </> : null}
    {storageMessage ? <Text accessibilityLiveRegion="polite" style={{ color: p.error }}>{storageMessage}</Text> : null}
    {lookup ? <EnglishQuickDictionary initialQuery={lookup.query} readingContext={lookup.context} onClose={() => setLookup(null)} /> : null}
  </Screen>;
}
