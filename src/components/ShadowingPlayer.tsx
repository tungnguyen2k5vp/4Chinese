import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { LocalVoiceRecorder } from './LocalVoiceRecorder';
import { PrimaryButton } from './PrimaryButton';

import { StudyTransition } from '@/components/ui/StudyTransition';
import { spacing, themedCard } from '@/constants/design';
import type { ShadowingSentence } from '@/db/speaking';
import { useModalAnimationType } from '@/hooks/use-reduced-motion';
import { speakChinese, stopChineseSpeech } from '@/services/audio/chinese-speech';
import { nextShadowingIndex } from '@/services/speaking/tones';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';

/** Shared sentences, local-only recordings. No acoustic score is inferred from replay. */
export function ShadowingPlayer({ sentences, onPracticed }: {
  sentences: ShadowingSentence[]; onPracticed: (sentenceId: string, attemptId: string) => Promise<void>;
}) {
  const theme = useTheme();
  const focused = useIsFocused();
  const styles = useThemeStyles(createStyles);
  const modalAnimation = useModalAnimationType();
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  return <View style={[themedCard(theme), styles.content]}>
    <View style={styles.topRow}><Text style={styles.title}>Câu {index + 1}/{sentences.length}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cài đặt luyện nghe nhắc lại" onPress={() => setSettingsOpen(true)} style={styles.settingsButton}><Text style={styles.settingsText}>⚙ Cài đặt</Text></Pressable></View>
    <Text style={styles.copy}>Dùng giọng đọc máy trên thiết bị, không phải bản thu người bản ngữ.</Text>
    <StudyTransition active={focused} turnKey={sentence.id} effect="reveal" testID="shadowing-current-sentence" style={{ gap: spacing.sm }}>
      {showHanzi ? <Text selectable style={styles.hanzi}>{sentence.hanzi}</Text> : null}
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={showPinyin ? 'Ẩn pinyin câu hiện tại' : 'Hiện pinyin câu hiện tại'} accessibilityState={{ expanded: showPinyin }} aria-expanded={showPinyin} onPress={() => setShowPinyin(value => !value)} style={styles.settingsButton}><Text style={styles.settingsText}>{showPinyin ? 'Ẩn pinyin' : 'Hiện pinyin'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={showTranslation ? 'Ẩn nghĩa câu hiện tại' : 'Hiện nghĩa câu hiện tại'} accessibilityState={{ expanded: showTranslation }} aria-expanded={showTranslation} onPress={() => setShowTranslation(value => !value)} style={styles.settingsButton}><Text style={styles.settingsText}>{showTranslation ? 'Ẩn nghĩa' : 'Hiện nghĩa'}</Text></Pressable>
      </View>
      {showPinyin ? <StudyTransition active={focused} turnKey={`${sentence.id}:pinyin`} effect="reveal" animateOnMount><Text selectable style={styles.pinyin}>{sentence.pinyin}</Text></StudyTransition> : null}
      {showTranslation ? <StudyTransition active={focused} turnKey={`${sentence.id}:meaning`} effect="reveal" animateOnMount><Text selectable style={styles.copy}>{sentence.translation_vi}</Text></StudyTransition> : null}
    </StudyTransition>
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
    <Modal visible={settingsOpen} transparent animationType={modalAnimation} onRequestClose={() => setSettingsOpen(false)} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng cài đặt" style={styles.modalScrim} onPress={() => setSettingsOpen(false)} />
        <View style={styles.settingsSheet}>
          <View style={styles.sheetHandle} />
          <ScrollView style={styles.settingsScroll} contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
            <View style={styles.settingsHeader}><View style={{ flex: 1, gap: 3 }}><Text style={styles.settingsTitle}>Cài đặt luyện nghe nhắc lại</Text><Text style={styles.copy}>Điều chỉnh cách nghe và nhịp luyện.</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng cài đặt" onPress={() => setSettingsOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
            {([['Hiện Hán tự', showHanzi, setShowHanzi], ['Hiện Pinyin', showPinyin, setShowPinyin], ['Hiện nghĩa', showTranslation, setShowTranslation],
              ['Lặp câu', loop, setLoop], ['Tự sang câu tiếp', autoNext, setAutoNext]] as const).map(([label, value, change]) =>
              <View style={styles.row} key={label}><Text style={styles.copy}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={change} /></View>)}
            <Text style={styles.copy}>Tốc độ đọc mẫu</Text>
            <View style={styles.row}>{[0.6, 0.82, 1].map((value) => <PrimaryButton key={value} style={styles.flex} label={`${value}×`} variant={rate === value ? 'secondary' : 'ghost'} onPress={() => { stop(); setRate(value); }} />)}</View>
            <Text style={styles.copy}>Khoảng nghỉ để đọc theo</Text>
            <View style={styles.row}>{[1, 3, 5].map((value) => <PrimaryButton key={value} style={styles.flex} label={`${value} giây`} variant={pause === value ? 'secondary' : 'ghost'} onPress={() => setPause(value)} />)}</View>
            <PrimaryButton label="Xong" onPress={() => setSettingsOpen(false)} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({ content: { gap: spacing.sm }, title: { color: theme.primaryText, fontWeight: '800' },
  hanzi: { color: theme.textPrimary, fontSize: 28, fontWeight: '800' }, pinyin: { color: theme.primaryText, fontSize: 18 },
  copy: { color: theme.textMuted, fontSize: 13, lineHeight: 20 }, row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'space-between', minHeight: 46 }, flex: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }, settingsButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 24, backgroundColor: theme.primarySoft }, settingsText: { color: theme.primaryText, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' }, modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay }, settingsSheet: { maxHeight: '86%', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }, sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: spacing.md }, settingsScroll: { flexShrink: 1, minHeight: 0 }, settingsContent: { gap: spacing.sm, paddingBottom: spacing.xs }, settingsHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs }, settingsTitle: { color: theme.textPrimary, fontSize: 19, fontWeight: '900' }, closeButton: { minWidth: 44, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSecondary }, closeText: { color: theme.textSecondary, fontSize: 30, lineHeight: 34 } }); }
