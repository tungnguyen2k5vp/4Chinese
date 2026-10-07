import { Redirect, router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { LearningLandscape } from '@/components/visual/LearningLandscape';
import { spacing } from '@/constants/design';
import { getStoryDraftPreview, type StoryDraft } from '@/data/stories-v5';
import { getStory, getStoryQuestions, recordStoryQuiz, splitStorySentences, type Story, type StoryQuestion } from '@/db/stories';
import { speakChinese, stopChineseSpeech } from '@/services/audio/chinese-speech';
import { useAppStore } from '@/stores/app-store';
import { useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function StoryDetailScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  if (preview === '1' && !__DEV__) return <Redirect href="/stories" />;
  return <StoryDetail key={`${id}-${preview}`} id={id} preview={preview === '1'} />;
}

function StoryDetail({ id, preview }: { id: string; preview: boolean }) {
  const db = useSQLiteContext();
  const styles = useThemeStyles(createStyles);
  const settings = useAppStore((state) => state.settings);
  const [story, setStory] = useState<Story | null>(null);
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [questions, setQuestions] = useState<StoryQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [rate, setRate] = useState(settings?.speechRate ?? 0.82);
  const [audioMessage, setAudioMessage] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showVi, setShowVi] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const request = useRef(0);
  const focused = useRef(false);
  const submission = useRef(false);
  const stop = useCallback(() => {
    request.current++;
    setSpeaking(false);
    void stopChineseSpeech().catch(() => { if (focused.current) setAudioMessage('Không dừng được TTS. Hãy thử lại.'); });
  }, []);

  useFocusEffect(useCallback(() => {
    let live = true;
    focused.current = true;
    setLoading(true); setError('');
    const load = async () => {
      if (preview) {
        const item = getStoryDraftPreview(id);
        if (!item) throw new Error('NOT_FOUND');
        if (!live) return;
        setDraft(item);
        setQuestions(item.questions.map((q, index) => ({ id: `${item.id}-q${index + 1}`, story_id: item.id,
          prompt_vi: q.promptVi, choices_json: JSON.stringify(q.choices), correct_index: q.answer })));
      } else {
        const [item, rows] = await Promise.all([getStory(db, id), getStoryQuestions(db, id)]);
        if (!item) throw new Error('NOT_FOUND');
        if (!live) return;
        setStory(item); setQuestions(rows);
      }
    };
    void load().catch(() => { if (live) setError('Không mở được truyện hoặc truyện không còn trong thư viện.'); })
      .finally(() => { if (live) setLoading(false); });
    const listener = AppState.addEventListener('change', (state) => { if (state !== 'active') stop(); });
    return () => { live = false; focused.current = false; request.current++; listener.remove(); void stopChineseSpeech().catch(() => undefined); };
  // Retry is an intentional reload trigger; focus cleanup cancels the previous request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, id, preview, retry, stop]));

  const sentences = draft?.sentences ?? splitStorySentences(story?.content ?? '').map((hanzi) => ({ hanzi, pinyin: '', translationVi: '' }));
  const play = async (index: number) => {
    if (!(settings?.soundEnabled ?? true) || !sentences[index]) return;
    const ticket = ++request.current;
    const current = () => focused.current && request.current === ticket;
    setSentenceIndex(index); setAudioMessage(''); setSpeaking(true);
    try {
      const result = await speakChinese(sentences[index]!.hanzi, { rate,
        onDone: () => { if (current()) setSpeaking(false); },
        onStopped: () => { if (current()) setSpeaking(false); },
        onError: () => { if (current()) { setSpeaking(false); setAudioMessage('TTS gặp lỗi. Hãy thử lại.'); } },
      });
      if (current() && !result.ok) {
        setSpeaking(false);
        setAudioMessage(result.reason === 'missing-mandarin-voice' ? 'Thiết bị chưa có giọng tiếng Trung. Hãy kiểm tra cài đặt giọng đọc.' : 'Đã hủy phát âm.');
      }
    } catch { if (current()) { setSpeaking(false); setAudioMessage('Không phát được giọng đọc. Hãy kiểm tra cài đặt và âm lượng.'); } }
  };
  const complete = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);
  const correctCount = questions.filter((q) => answers[q.id] === q.correct_index).length;
  const submit = async () => {
    if (!complete || submitted || submission.current) return;
    if (preview) { setSubmitted(true); return; }
    submission.current = true; setSaving(true); setSaveError('');
    try {
      await recordStoryQuiz(db, id, questions.map((q) => answers[q.id]!));
      if (focused.current) setSubmitted(true);
    } catch { if (focused.current) setSaveError('Chưa lưu được bài làm. Lựa chọn được giữ nguyên; hãy thử lại.'); }
    finally { submission.current = false; if (focused.current) setSaving(false); }
  };

  return <Screen title={draft?.title ?? story?.title ?? 'Truyện'} subtitle={preview ? 'Xem trước bản nháp · không lưu tiến độ' : 'Đọc từng câu, nghe và kiểm tra đọc hiểu.'}>
    {loading ? <Text accessibilityLiveRegion="polite" style={styles.note}>Đang mở truyện…</Text> : null}
    {error ? <><Text accessibilityRole="alert" style={styles.note}>{error}</Text><PrimaryButton label="Thử mở lại" onPress={() => setRetry((value) => value + 1)} /></> : null}
    {!loading && !error ? <>
      <View style={styles.readingFrame}><LearningLandscape mood="reading" height={92} /></View>
      <Text style={styles.note}>{draft?.description ?? story?.description}</Text>
      <Text style={styles.note}>Mức ước tính {draft?.level ?? story?.hsk_level} · không phải chứng nhận HSK chính thức.</Text>
      {preview ? <Text accessibilityRole="alert" style={styles.notice}>AI hỗ trợ · DRAFT / UNREVIEWED. Chưa có thẩm định độc lập; không xuất bản, không nhận XP và không lưu tiến độ.</Text> : null}
      {draft ? <View style={styles.section}><Text style={styles.title}>Mục tiêu đọc</Text>
        <Text style={styles.note}>Từ: {draft.targetWords.join(' · ')}</Text><Text style={styles.note}>Ngữ pháp: {draft.grammarTargets.join(' · ')}</Text>
        <PrimaryButton variant="ghost" label={showPinyin ? 'Ẩn pinyin' : 'Hiện pinyin'} onPress={() => setShowPinyin((value) => !value)} />
        <PrimaryButton variant="ghost" label={showVi ? 'Ẩn bản dịch tiếng Việt' : 'Hiện bản dịch tiếng Việt'} onPress={() => setShowVi((value) => !value)} />
      </View> : null}
      <View style={styles.section}><Text style={styles.title}>Nghe từng câu bằng giọng đọc máy</Text>
        <Text style={styles.note}>Đây không phải bản thu người bản ngữ. Tốc độ đọc phụ thuộc thiết bị.</Text>
        {!(settings?.soundEnabled ?? true) ? <Text style={styles.note}>Âm thanh đang tắt trong cài đặt học.</Text> : null}
        <View style={styles.row}>{[0.65, 0.82, 1].map((speed) => <PrimaryButton key={speed} style={styles.flex} variant={rate === speed ? 'primary' : 'secondary'}
          label={`TTS ${speed}${rate === speed ? ' ✓' : ''}`} onPress={() => { stop(); setRate(speed); }} />)}</View>
        <Text style={styles.note}>Câu {sentenceIndex + 1}/{sentences.length}</Text>
        <PrimaryButton label={`Phát lại câu ${sentenceIndex + 1}`} disabled={!sentences.length || !(settings?.soundEnabled ?? true)} onPress={() => void play(sentenceIndex)} />
        <PrimaryButton variant="ghost" label="Dừng TTS" disabled={!speaking} onPress={stop} />
        <View style={styles.row}><PrimaryButton style={styles.flex} variant="secondary" label="Câu trước" disabled={sentenceIndex === 0} onPress={() => { stop(); setSentenceIndex((index) => index - 1); }} />
          <PrimaryButton style={styles.flex} variant="secondary" label="Câu sau" disabled={sentenceIndex + 1 >= sentences.length} onPress={() => { stop(); setSentenceIndex((index) => index + 1); }} /></View>
        {audioMessage ? <Text accessibilityRole="alert" style={styles.note}>{audioMessage}</Text> : null}
      </View>
      {sentences.map((sentence, index) => <View key={index} style={styles.section}>
        <Text style={styles.note}>{index + 1}{index === sentenceIndex ? ' · Câu đang chọn' : ''}</Text>
        <Text selectable style={styles.hanzi}>{sentence.hanzi}</Text>
        {showPinyin && sentence.pinyin ? <Text selectable style={styles.note}>{sentence.pinyin}</Text> : null}
        {showVi && sentence.translationVi ? <Text selectable style={styles.note}>{sentence.translationVi}</Text> : null}
        <PrimaryButton variant="secondary" label={`Nghe câu ${index + 1}`} disabled={!(settings?.soundEnabled ?? true)} onPress={() => void play(index)} />
      </View>)}
      {!preview ? <><PrimaryButton variant="secondary" label="Tra từ trong trình đọc" onPress={() => { stop(); router.push(`/reader?storyId=${id}` as Href); }} />
        {questions.length > 1 ? <Text style={styles.note}>Trình đọc cũ chỉ hỗ trợ một câu hỏi. Hãy làm toàn bộ bài đọc hiểu tại trang truyện này để lưu tiến độ.</Text> : null}</> : null}
      <Text style={styles.title}>Kiểm tra đọc hiểu · {questions.length} câu</Text>
      {questions.map((question, index) => <View key={question.id} style={styles.section}>
        <Text style={styles.title}>{index + 1}. {question.prompt_vi}</Text>
        {(JSON.parse(question.choices_json) as string[]).map((choice, choiceIndex) => <PrimaryButton key={choiceIndex}
          variant={answers[question.id] === choiceIndex ? 'primary' : 'secondary'}
          label={`${choice}${answers[question.id] === choiceIndex ? ' · đã chọn' : ''}`} disabled={submitted || saving}
          onPress={() => setAnswers((previous) => ({ ...previous, [question.id]: choiceIndex }))} />)}
        {submitted ? <Text style={styles.note}>{answers[question.id] === question.correct_index ? 'Đúng.' : 'Chưa đúng.'} Đáp án: {(JSON.parse(question.choices_json) as string[])[question.correct_index]}
          {draft ? ` — ${draft.questions[index]!.explanationVi}` : ''}</Text> : null}
      </View>)}
      {saveError ? <Text accessibilityRole="alert" style={styles.note}>{saveError}</Text> : null}
      {!submitted ? <PrimaryButton label={preview ? 'Kiểm tra thử · không lưu' : 'Nộp toàn bộ bài đọc hiểu'} disabled={!complete} loading={saving} onPress={() => void submit()} /> :
        <Text accessibilityLiveRegion="polite" style={styles.title}>{correctCount}/{questions.length} câu đúng{preview ? ' · Xem trước, không lưu' : ' · Đã lưu một lượt làm bài'}</Text>}
    </> : null}
  </Screen>;
}

function createStyles(theme: ThemeTokens) { return StyleSheet.create({
  readingFrame: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: theme.border },
  section: { padding: spacing.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.readingBackground, borderRadius: 12, gap: spacing.sm },
  title: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
  hanzi: { color: theme.textPrimary, fontSize: 24, lineHeight: 38 },
  note: { color: theme.textSecondary, fontSize: 15, lineHeight: 23 },
  notice: { color: theme.primaryText, fontSize: 15, lineHeight: 24 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, flex: { flexGrow: 1 },
}); }
