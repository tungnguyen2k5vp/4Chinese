import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Switch, Text, View } from 'react-native';

import { LocalVoiceRecorder } from './LocalVoiceRecorder';
import { PrimaryButton } from './PrimaryButton';

import { card, colors, spacing } from '@/constants/design';
import type { ShadowingSentence } from '@/db/speaking';
import { speakChinese, stopChineseSpeech } from '@/services/audio/chinese-speech';
import { nextShadowingIndex } from '@/services/speaking/tones';

/** Shared sentences, local-only recordings. No acoustic score is inferred from replay. */
export function ShadowingPlayer({ sentences, onPracticed }: {
  sentences: ShadowingSentence[]; onPracticed: (sentenceId: string, attemptId: string) => Promise<void>;
}) {
  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState(0.82);
  const [pause, setPause] = useState(3);
  const [loop, setLoop] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const [showHanzi, setShowHanzi] = useState(true);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [replayed, setReplayed] = useState(false);
  const [saving, setSaving] = useState(false);
  const generation = useRef(0);
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatCount = useRef(0);
  const attempt = useRef<string | null>(null);
  const config = useRef({ loop, autoNext, rate, pause });
  useEffect(() => { config.current = { loop, autoNext, rate, pause }; }, [loop, autoNext, rate, pause]);
  const stop = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPlaying(false);
    void stopChineseSpeech().catch(() => undefined);
  }, []);
  useFocusEffect(useCallback(() => {
    active.current = true;
    const subscription = AppState.addEventListener('change', (state) => {
      active.current = state === 'active';
      if (!active.current) stop();
    });
    return () => { active.current = false; subscription.remove(); stop(); };
  }, [stop]));
  const recordingChanged = useCallback((busy: boolean) => {
    setMicBusy(busy);
    if (busy) stop();
  }, [stop]);

  const play = async (nextIndex: number, continuing = false) => {
    if (!active.current || !sentences[nextIndex]) return;
    const request = ++generation.current;
    if (timer.current) clearTimeout(timer.current);
    if (!continuing) repeatCount.current = 0;
    setIndex(nextIndex); setPlaying(true); setNotice(null);
    const sentence = sentences[nextIndex];
    try {
      const result = await speakChinese(sentence.hanzi, { rate: config.current.rate,
        onDone: () => {
          if (!active.current || request !== generation.current) return;
          setHeard(sentence.id);
          const next = nextShadowingIndex(nextIndex, sentences.length, config.current.loop, config.current.autoNext);
          if (next === null || ++repeatCount.current >= 30) { setPlaying(false); return; }
          timer.current = setTimeout(() => {
            if (active.current && request === generation.current) {
              if (next !== nextIndex) { setReplayed(false); setHeard(null); attempt.current = null; }
              void play(next, true);
            }
          }, config.current.pause * 1000);
        },
        onError: () => {
          if (active.current && request === generation.current) { setPlaying(false); setNotice('Giọng đọc chưa khả dụng. Hãy kiểm tra giọng tiếng Trung trên thiết bị.'); }
        },
      });
      if (!result.ok && active.current && request === generation.current) {
        setPlaying(false); setNotice('Cần cài giọng Mandarin trên thiết bị để nghe mẫu.');
      }
    } catch {
      if (active.current && request === generation.current) { setPlaying(false); setNotice('Chưa phát được câu mẫu.'); }
    }
  };
  const sentence = sentences[index];
  if (!sentence) return <Text>Chưa có câu để luyện.</Text>;
  const select = (next: number) => { stop(); setIndex(next); setHeard(null); setReplayed(false); attempt.current = null; setNotice(null); };
  const completed = heard === sentence.id && replayed;
  return <View style={[card, styles.content]}>
    <Text style={styles.title}>Câu {index + 1}/{sentences.length}</Text>
    {showHanzi ? <Text selectable style={styles.hanzi}>{sentence.hanzi}</Text> : null}
    {showPinyin ? <Text selectable style={styles.pinyin}>{sentence.pinyin}</Text> : null}
    {showTranslation ? <Text selectable style={styles.copy}>{sentence.translation_vi}</Text> : null}
    {([['Hán tự', showHanzi, setShowHanzi], ['Pinyin', showPinyin, setShowPinyin], ['Nghĩa', showTranslation, setShowTranslation],
      ['Lặp câu', loop, setLoop], ['Tự sang câu tiếp', autoNext, setAutoNext]] as const).map(([label, value, change]) =>
      <View style={styles.row} key={label}><Text style={styles.copy}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={change} /></View>)}
    <View style={styles.row}>{[0.6, 0.82, 1].map((value) => <PrimaryButton key={value} style={styles.flex} label={`${value}×`} variant={rate === value ? 'secondary' : 'ghost'}
      onPress={() => { stop(); setRate(value); }} />)}</View>
    <Text style={styles.copy}>Khoảng nghỉ để đọc theo</Text>
    <View style={styles.row}>{[1, 3, 5].map((value) => <PrimaryButton key={value} style={styles.flex} label={`${value} giây`} variant={pause === value ? 'secondary' : 'ghost'} onPress={() => setPause(value)} />)}</View>
    <PrimaryButton label={playing ? 'Dừng mẫu / vòng lặp' : 'Nghe mẫu'} disabled={micBusy || saving} onPress={() => playing ? stop() : void play(index)} />
    <LocalVoiceRecorder key={sentence.id} playbackBlocked={playing} onRecordingChange={recordingChanged} onReplay={() => setReplayed(true)} />
    <PrimaryButton label="Lưu lượt đã luyện" disabled={!completed || saving || micBusy} loading={saving} variant="secondary" onPress={() => {
      if (!completed || saving) return;
      const id = attempt.current ?? `shadow-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      attempt.current = id;
      stop();
      const request = generation.current;
      setSaving(true);
      void onPracticed(sentence.id, id).then(() => {
        if (active.current && request === generation.current) setNotice('Đã lưu lượt đối chiếu. Đây không phải điểm phát âm.');
      }).catch(() => { if (active.current) setNotice('Chưa lưu được. Bấm lại để thử, không tính trùng lượt.'); })
        .finally(() => { setSaving(false); });
    }} />
    <View style={styles.row}>
      <PrimaryButton style={styles.flex} label="Câu trước" variant="ghost" disabled={!index || micBusy || saving} onPress={() => select(index - 1)} />
      <PrimaryButton style={styles.flex} label="Câu tiếp" variant="ghost" disabled={index === sentences.length - 1 || micBusy || saving} onPress={() => select(index + 1)} />
    </View>
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.copy}>{notice}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({ content: { gap: spacing.sm }, title: { color: colors.primary, fontWeight: '800' },
  hanzi: { color: colors.text, fontSize: 28, fontWeight: '800' }, pinyin: { color: colors.primary, fontSize: 18 },
  copy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 }, row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'space-between' }, flex: { flex: 1 } });
