import { Ionicons } from "@expo/vector-icons";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { File } from "expo-file-system";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing, themedCard } from "@/constants/design";
import { PronunciationScoreError, scorePronunciationAudio, type PronunciationScore } from "@/services/pronunciation/ai-pronunciation";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";
import type { Vocabulary } from "@/types/models";

/** Optional cloud evaluation. Standard practice never depends on this panel. */
export function AiPronunciationPanel({ word }: { word: Vocabulary }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<PronunciationScore | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const active = useRef(false);
  const busy = useRef(false);
  const recordingRef = useRef(false);
  const sequence = useRef(0);
  const upload = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteRecording = useCallback((uri: string | null) => {
    if (!uri) return;
    try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Best-effort temporary file cleanup. */ }
  }, []);
  useFocusEffect(useCallback(() => {
    active.current = true;
    const cancel = async () => {
      const cancellation = ++sequence.current;
      const wasRecording = recordingRef.current;
      upload.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      try { if (recordingRef.current || recorder.isRecording) await recorder.stop(); }
      catch { /* Interruption may already have stopped the recorder. */ }
      recordingRef.current = false;
      // An in-flight upload owns its file and removes it in its finally block.
      if (!upload.current) deleteRecording(recorder.uri);
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      if (wasRecording && !upload.current && cancellation === sequence.current) busy.current = false;
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        active.current = false;
        void cancel();
        setRecording(false); setScoring(false);
        setNotice('Đã hủy ghi âm khi app vào nền.');
      } else active.current = true;
    });
    return () => { active.current = false; subscription.remove(); void cancel(); };
  }, [deleteRecording, recorder]));

  const startRecording = async () => {
    if (!active.current || busy.current) return;
    busy.current = true;
    const request = ++sequence.current;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!active.current || request !== sequence.current) return;
      if (!permission.granted) { setNotice("Hãy cho phép micro để dùng phản hồi AI nâng cao."); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (!active.current || request !== sequence.current) { await recorder.stop(); return; }
      recorder.record({ forDuration: 20 });
      recordingRef.current = true;
      timer.current = setTimeout(() => {
        void (async () => {
          if (request !== sequence.current || !recordingRef.current) return;
          recordingRef.current = false;
          try { await recorder.stop(); } catch { /* Duration limit can stop natively first. */ }
          deleteRecording(recorder.uri);
          await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
          busy.current = false;
          if (active.current && request === sequence.current) {
            setRecording(false); setNotice('Đã đạt 20 giây; bản ghi đã hủy, không gửi lên máy chủ. Hãy ghi lại một lượt ngắn hơn.');
          }
        })();
      }, 20_000);
      setNotice(null);
      setResult(null);
      setRecording(true);
    } catch {
      if (active.current && request === sequence.current) setNotice("Chưa thể mở micro. Hãy kiểm tra quyền micro rồi thử lại.");
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    } finally {
      if (!recordingRef.current) busy.current = false;
    }
  };

  const stopAndScore = async () => {
    if (!active.current || !recordingRef.current) return;
    recordingRef.current = false;
    if (timer.current) clearTimeout(timer.current);
    const request = sequence.current;
    const controller = new AbortController();
    upload.current = controller;
    let recordingUri: string | null = null;
    setRecording(false);
    setScoring(true);
    try {
      await recorder.stop();
      recordingUri = recorder.uri;
      if (!recordingUri) throw new PronunciationScoreError("Không tạo được bản ghi âm.");
      const nextResult = await scorePronunciationAudio(recordingUri, word, controller.signal);
      if (active.current && request === sequence.current) { setResult(nextResult); setNotice(null); }
    } catch (error) {
      if (active.current && request === sequence.current) setNotice(error instanceof PronunciationScoreError ? error.message : "Phản hồi AI chưa khả dụng. Hãy thử lại.");
    } finally {
      deleteRecording(recordingUri);
      upload.current = null;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      busy.current = false;
      if (active.current && request === sequence.current) setScoring(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Phản hồi AI nâng cao (tùy chọn)</Text>
      <Text style={styles.hint}>Tối đa 20 giây. Bấm dừng sẽ gửi âm thanh lên máy chủ để nhận phản hồi nhận diện từ, không chấm chất lượng thanh điệu.</Text>
      <Pressable
        accessibilityLabel={recording ? "Dừng ghi âm để nhận phản hồi AI" : "Bắt đầu phản hồi AI nâng cao"}
        accessibilityHint={recording ? "Dừng ghi âm và gửi bản ghi để nhận kết quả." : "Bắt đầu ghi âm tối đa 20 giây; phần gửi lên máy chủ chỉ diễn ra sau khi bạn dừng."}
        accessibilityRole="button"
        accessibilityState={{ disabled: scoring, busy: scoring, selected: recording }}
        disabled={scoring}
        onPress={() => void (recording ? stopAndScore() : startRecording())}
        style={({ pressed }) => [styles.button, recording && styles.recording, scoring && styles.disabled, pressed && !scoring && styles.pressed]}
      >
        {scoring ? <ActivityIndicator color={theme.onPrimary} /> : <Ionicons color={recording ? theme.onError : theme.onPrimary} name={recording ? "stop" : "mic"} size={20} />}
        <Text style={[styles.buttonText, recording && styles.recordingText]}>{recording ? "Dừng và gửi" : scoring ? "Đang nhận phản hồi" : "Nhận phản hồi AI"}</Text>
      </Pressable>
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
      {result ? (
        <View accessibilityLiveRegion="polite" style={styles.result}>
          <Text style={styles.resultLabel}>MỨC KHỚP TỪ NHẬN DIỆN · KHÔNG PHẢI ĐIỂM THANH ĐIỆU</Text>
          <Text style={styles.score}>{result.score}/100</Text>
          <Text style={styles.transcript}>AI nghe: {result.transcript || "(không rõ)"}</Text>
          <Text style={styles.feedback}>{result.feedback}</Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    card: { ...themedCard(theme), gap: spacing.sm, borderWidth: 1, borderColor: theme.border },
    title: { color: theme.textPrimary, fontSize: 16, fontWeight: "900" },
    hint: { color: theme.textMuted, fontSize: 12, lineHeight: 18 },
    button: { minHeight: 52, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm, borderRadius: radius.md, backgroundColor: theme.primary, paddingHorizontal: spacing.md },
    recording: { backgroundColor: theme.error },
    disabled: { opacity: 0.55 },
    pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
    buttonText: { color: theme.onPrimary, fontSize: 15, fontWeight: "900" },
    recordingText: { color: theme.onError },
    notice: { color: theme.textMuted, fontSize: 12, lineHeight: 18 },
    result: { gap: 4, borderTopWidth: 1, borderTopColor: theme.divider, paddingTop: spacing.sm },
    resultLabel: { color: theme.primaryText, fontSize: 11, fontWeight: "900", letterSpacing: 0.7 },
    score: { color: theme.primaryText, fontSize: 28, fontWeight: "900" },
    transcript: { color: theme.textPrimary, fontSize: 14, fontWeight: "700" },
    feedback: { color: theme.textMuted, fontSize: 13, lineHeight: 19 },
  });
}
