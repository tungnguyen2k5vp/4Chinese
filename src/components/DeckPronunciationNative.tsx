import { Ionicons } from "@expo/vector-icons";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import { getDeckVocabulary, getSettings, listPersonalDecks } from "@/db/repository";
import { PronunciationScoreError, scorePronunciationAudio, type PronunciationScore } from "@/services/pronunciation/ai-pronunciation";
import type { UserSettings, Vocabulary } from "@/types/models";

const PRACTICE_BATCH_SIZE = 10;

export default function DeckPronunciationNative() {
  const { deckId = "" } = useLocalSearchParams<{ deckId?: string }>();
  const db = useSQLiteContext();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [deckName, setDeckName] = useState("Bộ từ riêng");
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<PronunciationScore | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    void Promise.all([getDeckVocabulary(db, deckId), listPersonalDecks(db), getSettings(db)])
      .then(([deckWords, decks, nextSettings]) => {
        if (!active) return;
        setWords(deckWords); setSettings(nextSettings);
        setDeckName(decks.find((deck) => deck.id === deckId)?.name ?? "Bộ từ riêng");
        setIndex(0); setResult(null);
      }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [db, deckId]);
  useFocusEffect(load);

  const word = words[index];
  const startRecording = async () => {
    if (recording || scoring) return;
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) { Alert.alert("Cần quyền micro", "Hãy cho phép 4Chinese sử dụng micro để AI chấm phát âm."); return; }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(); recorder.record(); setResult(null); setRecording(true);
    } catch {
      Alert.alert("Không thể ghi âm", "Hãy đóng ứng dụng khác đang dùng micro và thử lại.");
      await setAudioModeAsync({ allowsRecording: false });
    }
  };
  const stopAndScore = async () => {
    if (!recording || !word || scoring) return;
    setRecording(false); setScoring(true);
    try {
      await recorder.stop();
      if (!recorder.uri) throw new PronunciationScoreError("Chưa tạo được bản ghi âm. Hãy đọc lại từ một lần nữa.");
      setResult(await scorePronunciationAudio(recorder.uri, word));
    } catch (error) {
      Alert.alert("Chưa thể chấm phát âm", error instanceof PronunciationScoreError ? error.message : "Hãy thử lại sau.");
    } finally {
      await setAudioModeAsync({ allowsRecording: false }); setScoring(false);
    }
  };
  const next = () => { if (words.length) { setIndex((current) => (current + 1) % words.length); setResult(null); } };

  if (loading) return <Screen title="Luyện phát âm AI"><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (!word) return <Screen title="Luyện phát âm AI" subtitle={deckName}><EmptyState icon="🎙" title="Bộ từ đang trống" message="Hãy thêm từ vào bộ trước khi luyện phát âm." /><PrimaryButton label="Quay lại bộ từ" variant="secondary" onPress={() => router.back()} /></Screen>;
  const batch = Math.floor(index / PRACTICE_BATCH_SIZE) + 1;
  const batchTotal = Math.ceil(words.length / PRACTICE_BATCH_SIZE);
  return <Screen title="Luyện phát âm AI" subtitle={`${deckName} · Lượt ${batch}/${batchTotal} · Từ ${index + 1}/${words.length}`}>
    <View style={[card, styles.wordCard]}><Text style={styles.eyebrow}>NGHE MẪU, RỒI ĐỌC LẠI</Text><Text style={styles.hanzi}>{word.simplified}</Text><Text style={styles.pinyin}>{word.pinyin}</Text><Text style={styles.meaning}>{word.primaryMeaningVi}</Text><AudioButton text={word.simplified} size={29} rate={settings?.speechRate} /></View>
    <View style={[card, styles.recordCard]}><Text style={styles.recordTitle}>{recording ? "Đang ghi âm…" : scoring ? "AI đang nghe và chấm…" : "Đọc từ tiếng Trung của bạn"}</Text><Text style={styles.recordHint}>Điểm 0–100 đánh giá mức AI nghe hiểu được từ mục tiêu. Audio chỉ được gửi để chấm và không lưu trong app.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={recording ? "Dừng và chấm phát âm" : "Bắt đầu ghi âm phát âm"} disabled={scoring} onPress={() => void (recording ? stopAndScore() : startRecording())} style={({ pressed }) => [styles.recordButton, recording && styles.recordingButton, scoring && styles.disabled, pressed && !scoring && styles.pressed]}>{scoring ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons color="#FFFFFF" name={recording ? "stop" : "mic"} size={33} />}<Text style={styles.recordButtonText}>{recording ? "Dừng & chấm điểm" : scoring ? "Đang chấm" : "Bắt đầu nói"}</Text></Pressable>
    </View>
    {result ? <View style={[card, styles.scoreCard, result.score >= 80 ? styles.scoreGood : styles.scoreRetry]}><Text style={styles.eyebrow}>KẾT QUẢ AI</Text><Text style={styles.score}>{result.score}</Text><Text style={styles.scoreLabel}>/100</Text><Text style={styles.transcriptLabel}>AI nghe được</Text><Text style={styles.transcript}>{result.transcript || "(không rõ)"}</Text><Text style={styles.feedback}>{result.feedback}</Text></View> : null}
    <PrimaryButton label="Từ tiếp theo" disabled={recording || scoring} onPress={next} />
    <Text style={styles.privacy}>Mẹo: đọc chậm, rõ từng âm tiết và nghe mẫu trước khi nói. Cần development build mới sau khi thêm mô-đun ghi âm.</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  wordCard: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: .7 }, hanzi: { color: colors.text, fontSize: 78, fontWeight: "900", marginTop: spacing.xs }, pinyin: { color: colors.primary, fontSize: 24, fontWeight: "900" }, meaning: { color: colors.textMuted, fontSize: 18, fontWeight: "700" },
  recordCard: { alignItems: "center", gap: spacing.md }, recordTitle: { color: colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" }, recordHint: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: "center" }, recordButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 66, paddingHorizontal: spacing.xl, width: "100%" }, recordingButton: { backgroundColor: colors.danger }, recordButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" }, disabled: { opacity: .55 }, pressed: { opacity: .84, transform: [{ scale: .99 }] },
  scoreCard: { alignItems: "center", gap: 4, paddingVertical: spacing.lg }, scoreGood: { backgroundColor: "#E9F9F0" }, scoreRetry: { backgroundColor: "#FFF6EA" }, score: { color: colors.primary, fontSize: 65, fontWeight: "900", lineHeight: 70 }, scoreLabel: { color: colors.textMuted, fontSize: 16, fontWeight: "800", marginTop: -6 }, transcriptLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: spacing.xs }, transcript: { color: colors.text, fontSize: 24, fontWeight: "900" }, feedback: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" }, privacy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
});
