import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';

import { LocalVoiceRecorder } from '@/components/LocalVoiceRecorder';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { listToneWords, saveSpeakingPractice } from '@/db/speaking';
import { useStudySession } from '@/hooks/use-study-session';
import { speakChinese, stopChineseSpeech } from '@/services/audio/chinese-speech';
import { buildToneSamples, toneChoices, toneLabel, type ToneWord } from '@/services/speaking/tones';

export default function TonesScreen() {
  const db = useSQLiteContext();
  useStudySession(db);
  const [words, setWords] = useState<ToneWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pair, setPair] = useState(false);
  const [listen, setListen] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [heard, setHeard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
      setAnswer(value); setNotice(null);
    } catch { if (active.current) setNotice('Chưa lưu được kết quả. Hãy thử chọn lại.'); }
    finally { lock.current = false; setSaving(false); }
  };
  return <Screen subtitle="Thanh 1–4, thanh nhẹ và 16 cặp thanh. Đáp án theo pinyin trong kho từ.">
    <View style={styles.row}>
      <PrimaryButton style={styles.flex} label={pair ? 'Cặp thanh' : 'Một thanh'} disabled={saving || micBusy} variant="secondary" onPress={() => { reset(); setIndex(0); setPair(!pair); }} />
      <PrimaryButton style={styles.flex} label={listen ? 'Nghe rồi chọn' : 'Đọc pinyin'} disabled={saving || micBusy} variant="ghost" onPress={() => { reset(); setIndex(0); setListen(!listen); }} />
    </View>
    {loading ? <ActivityIndicator color={colors.primary} /> : sample ? <View style={[card, styles.content]}>
      <Text style={styles.copy}>Bài {(index % samples.length) + 1}/{samples.length}</Text>
      {!listen || answer ? <><Text style={styles.hanzi}>{sample.hanzi}</Text><Text style={styles.pinyin}>{sample.pinyin}</Text><Text style={styles.copy}>{sample.meaning}</Text></> : <Text style={styles.hanzi}>?</Text>}
      <PrimaryButton label={playing ? 'Dừng mẫu' : 'Nghe mẫu'} disabled={micBusy || saving} onPress={() => playing ? stop() : void play(sample.hanzi)} />
      <View style={styles.choices}>{toneChoices(pair).map((value) => <PrimaryButton key={value} label={toneLabel(value)}
        style={styles.choice} disabled={!!answer || saving || micBusy || (listen && !heard)} variant="ghost" onPress={() => void choose(value)} />)}</View>
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

const styles = StyleSheet.create({ content: { gap: spacing.md }, row: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { minWidth: '28%', flexGrow: 1 },
  hanzi: { color: colors.text, fontSize: 40, textAlign: 'center', fontWeight: '800' }, pinyin: { color: colors.primary, fontSize: 20, textAlign: 'center' },
  copy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 } });
