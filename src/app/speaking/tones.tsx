import { useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { LocalVoiceRecorder } from '@/components/LocalVoiceRecorder';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Disclosure } from '@/components/chinese/Disclosure';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { ToneContour } from '@/components/visual/ToneContour';
import { designColors, spacing, themedCard } from '@/constants/design';
import { recordLessonActivityEvidence } from '@/db/learning-path';
import { listToneWords, saveSpeakingPractice } from '@/db/speaking';
import { useStudySession } from '@/hooks/use-study-session';
import { speakChinese, stopChineseSpeech } from '@/services/audio/chinese-speech';
import { buildToneSamples, toneChoices, toneLabel, withoutPinyinToneMarks, type ToneWord } from '@/services/speaking/tones';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';

export default function TonesScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const card = themedCard(theme);
  const { lessonActivityId } = useLocalSearchParams<{ lessonActivityId?: string }>();
  useStudySession(db);
  const [words, setWords] = useState<ToneWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pair, setPair] = useState(false);
  const [listen, setListen] = useState(Boolean(lessonActivityId));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [heard, setHeard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [guide, setGuide] = useState({ tone: 1, replay: 0, animate: false });
  const focused = useIsFocused();
  const guideSample = useMemo(() => buildToneSamples(words, false).find(item => item.answer === String(guide.tone) && item.listeningSafe), [guide.tone, words]);
  const lock = useRef(false);
  const generation = useRef(0);
  const active = useRef(false);
  const samples = useMemo(() => buildToneSamples(words, pair).filter((sample) => !listen || sample.listeningSafe), [words, pair, listen]);
  const sample = samples[index % Math.max(1, samples.length)];
  const [attemptId, setAttemptId] = useState(() => `tone-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const stop = useCallback(() => { generation.current++; setPlaying(false); void stopChineseSpeech().catch(() => undefined); }, []);
  const recordingChanged = useCallback((busy: boolean) => { setMicBusy(busy); if (busy) stop(); }, [stop]);
  useFocusEffect(useCallback(() => {
    active.current = true;
    setLoading(true);
    void listToneWords(db).then((rows) => { if (active.current) setWords(rows); })
      .catch(() => { if (active.current) setNotice('Chưa tải được kho từ. Hãy mở lại màn hình.'); })
      .finally(() => { if (active.current) setLoading(false); });
    const listener = AppState.addEventListener('change', (state) => {
      active.current = state === 'active'; if (!active.current) stop();
    });
    return () => { active.current = false; listener.remove(); stop(); };
  }, [db, stop]));
  const reset = () => {
    stop(); setAnswer(null); setHeard(false); setNotice(null);
    setAttemptId(`tone-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  };
  const play = async (text: string, target = true) => {
    const request = ++generation.current;
    setPlaying(true);
    try {
      const result = await speakChinese(text, { onDone: () => {
        if (active.current && request === generation.current) { setPlaying(false); if (target) setHeard(true); }
      }, onError: () => { if (active.current && request === generation.current) { setPlaying(false); setNotice('Chưa phát được giọng tiếng Trung.'); } } });
      if (!result.ok && active.current && request === generation.current) { setPlaying(false); setNotice('Hãy cài giọng Mandarin trên thiết bị để nghe mẫu.'); }
    } catch { if (active.current && request === generation.current) { setPlaying(false); setNotice('Chưa phát được giọng tiếng Trung.'); } }
  };
  const choose = async (value: string) => {
    if (!sample || answer || lock.current || (listen && !heard)) return;
    lock.current = true; setSaving(true);
    try {
      await saveSpeakingPractice(db, { id: attemptId, kind: 'tone', targetId: sample.id, correct: value === sample.answer, listening: listen });
      if (lessonActivityId && listen && heard) {
        void recordLessonActivityEvidence(db, lessonActivityId, 'REVIEW_ATTEMPT_RECORDED', sample.id + ':' + value).catch(() => undefined);
      }
      setAnswer(value); setNotice(null);
    } catch { if (active.current) setNotice('Chưa lưu được kết quả. Hãy thử chọn lại.'); }
    finally { lock.current = false; setSaving(false); }
  };
  return <Screen subtitle="Thanh 1–4, thanh nhẹ và 16 cặp thanh. Đáp án theo pinyin trong kho từ.">
    <Disclosure title="Khám phá đường thanh">
      <View style={[card, styles.content]} testID="tone-guide">
        <View accessibilityRole="radiogroup" accessibilityLabel="Chọn đường thanh để tìm hiểu" style={styles.choices}>
          {[1, 2, 3, 4, 5].map(tone => <MotionPressable key={tone} accessibilityRole="radio" accessibilityLabel={`Xem ${toneLabel(String(tone)).toLowerCase()}`} accessibilityState={{ checked: tone === guide.tone }} onPress={() => setGuide(current => ({ tone, replay: current.replay + 1, animate: true }))} style={[styles.guideChoice, { backgroundColor: tone === guide.tone ? theme.primarySoft : theme.surface, borderColor: tone === guide.tone ? theme.primary : theme.border }]}><Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{tone === 5 ? 'Nhẹ' : tone}</Text></MotionPressable>)}
        </View>
        <View accessible accessibilityRole="image" accessibilityLabel={`Mô hình tham khảo ${toneLabel(String(guide.tone)).toLowerCase()}`} style={{ alignItems: 'center' }}>
          <ToneContour tone={guide.tone} color={theme.primaryText} width={240} height={108} revealKey={focused && guide.animate ? `${guide.tone}:${guide.replay}` : undefined} />
        </View>
        <Text style={styles.pinyin}>{['', 'Thanh 1 · đều', 'Thanh 2 · đi lên', 'Thanh 3 · xuống rồi lên', 'Thanh 4 · đi xuống', 'Thanh nhẹ · phụ thuộc âm tiết trước'][guide.tone]}</Text>
        <Text style={styles.copy}>Mô hình thanh gốc tham khảo, không đo giọng nói và không đồng bộ với âm thanh. Thanh 3 minh họa dạng đầy đủ; đường thanh nhẹ chỉ là ký hiệu.</Text>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          <PrimaryButton label="Minh họa lại" variant="secondary" onPress={() => setGuide(current => ({ ...current, replay: current.replay + 1, animate: true }))} />
          <PrimaryButton label="Hiện toàn đường" variant="ghost" onPress={() => setGuide(current => ({ ...current, animate: false }))} />
        </View>
        {guideSample ? <PrimaryButton label={playing ? 'Dừng âm mẫu' : `Nghe ví dụ: ${guideSample.hanzi} · ${guideSample.pinyin}`} disabled={micBusy || saving} variant="ghost" onPress={() => playing ? stop() : void play(guideSample.hanzi, false)} /> : <Text style={styles.copy}>Chưa có từ một âm tiết phù hợp để nghe minh họa thanh này.</Text>}
      </View>
    </Disclosure>
    <View style={styles.row}>
      <PrimaryButton style={styles.flex} label={pair ? 'Cặp thanh' : 'Một thanh'} disabled={saving || micBusy} variant="secondary" onPress={() => { reset(); setIndex(0); setPair(!pair); }} />
      <PrimaryButton style={styles.flex} label={listen ? 'Nghe rồi chọn' : 'Đọc pinyin'} disabled={saving || micBusy} variant="ghost" onPress={() => { reset(); setIndex(0); setListen(!listen); }} />
    </View>
    {loading ? <ActivityIndicator color={theme.primaryText} /> : sample ? <View style={[card, styles.content]}>
      <Text style={styles.copy}>Bài {(index % samples.length) + 1}/{samples.length}</Text>
      {!listen || answer ? <><Text style={styles.hanzi}>{sample.hanzi}</Text><Text style={styles.pinyin}>{answer ? sample.pinyin : withoutPinyinToneMarks(sample.pinyin)}</Text><Text style={styles.copy}>{sample.meaning}</Text></> : <Text style={styles.hanzi}>?</Text>}
      <PrimaryButton label={playing ? 'Dừng mẫu' : 'Nghe mẫu'} disabled={micBusy || saving} onPress={() => playing ? stop() : void play(sample.hanzi)} />
      <View accessibilityRole="radiogroup" accessibilityLabel={pair ? 'Chọn cặp thanh điệu' : 'Chọn thanh điệu'} style={styles.choices}>{toneChoices(pair).map((value) => {
        const selected = answer === value;
        const disabled = !!answer || saving || micBusy || (listen && !heard);
        const contour = value.split('-').map(Number);
        return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={toneLabel(value)} accessibilityState={{ checked: selected, disabled }} disabled={disabled}
          onPress={() => void choose(value)} style={[styles.choice, selected && styles.choiceSelected, disabled && !selected && styles.choiceDisabled]}>
          <View style={styles.contourRow}>{contour.map((tone, part) => <ToneContour key={`${value}-${part}`} tone={tone!} width={pair ? 34 : 54} color={selected ? theme.onPrimary : theme.primaryText} />)}</View>
          <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{toneLabel(value)}</Text>
        </Pressable>;
      })}</View>
      {answer ? <>
        <Text accessibilityLiveRegion="polite" style={styles.pinyin}>{answer === sample.answer ? 'Đúng' : 'Chưa đúng'} · {toneLabel(sample.answer)}</Text>
        <Text style={styles.copy}>{sample.listeningSafe ? 'Có thể nghe và ghi âm đối chiếu bên dưới.' : 'Đây là thanh gốc trong từ điển. Khi đọc liền có biến điệu, nên không dùng mẫu này để chấm bài nghe thanh gốc.'}</Text>
        <LocalVoiceRecorder key={`${sample.id}-${index}-${pair}-${listen}`} playbackBlocked={playing} onRecordingChange={recordingChanged} />
        <PrimaryButton label="Bài tiếp" disabled={micBusy} onPress={() => { reset(); setIndex(index + 1); }} />
      </> : null}
      {!listen && !answer ? <Text style={styles.copy}>Chọn thanh ghi trong pinyin; nghe mẫu không thay thế thanh gốc.</Text> : null}
      {answer && samples.find((item) => item.answer !== sample.answer && item.listeningSafe) ?
        <PrimaryButton variant="secondary" label="Nghe một thanh khác để đối chiếu" disabled={micBusy} onPress={() => {
          const other = samples.find((item) => item.answer !== sample.answer && item.listeningSafe)!;
          setNotice(`Mẫu đối chiếu: ${other.hanzi} · ${other.pinyin} · ${toneLabel(other.answer)}`);
          void play(other.hanzi, false);
        }} /> : null}
    </View> : <Text style={styles.copy}>Chưa có từ phù hợp cho kiểu bài này.</Text>}
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.copy}>{notice}</Text> : null}
    <Text style={styles.copy}>Giọng mẫu là TTS trên thiết bị, không phải bản thu chứng nhận thanh điệu. Ghi âm chỉ để tự nghe lại, không chấm điểm giọng nói.</Text>
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { const colors = designColors(theme); return StyleSheet.create({ content: { gap: spacing.md }, row: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1 },
  guideChoice: { minWidth: 44, minHeight: 48, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { minWidth: '28%', flexGrow: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 14, backgroundColor: theme.surface, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, gap: 2 },
  choiceSelected: { backgroundColor: theme.primary, borderColor: theme.primary }, choiceDisabled: { opacity: 0.62 }, contourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  choiceLabel: { color: theme.textPrimary, fontSize: 12, fontWeight: '800', textAlign: 'center' }, choiceLabelSelected: { color: theme.onPrimary },
  hanzi: { color: colors.text, fontSize: 40, textAlign: 'center', fontWeight: '800' }, pinyin: { color: colors.primaryText, fontSize: 20, textAlign: 'center' },
  copy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 } }); }
