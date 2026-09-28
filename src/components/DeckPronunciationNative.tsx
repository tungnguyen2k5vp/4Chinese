import { Ionicons } from "@expo/vector-icons";
import { requireOptionalNativeModule } from "expo-modules-core";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import { getDeckVocabulary, getSettings, listPersonalDecks } from "@/db/repository";
import { useStudySession } from "@/hooks/use-study-session";
import { cancelMandarinPronunciation, isNativePronunciationAvailable, NativePronunciationError, recognizeMandarinPronunciation } from "@/services/pronunciation/native-pronunciation";
import type { PronunciationResult } from "@/services/pronunciation/provider";
import type { UserSettings, Vocabulary } from "@/types/models";

const PRACTICE_BATCH_SIZE = 10;
const hasExpoAudio = Boolean(requireOptionalNativeModule("ExpoAudio"));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AiPronunciationPanel = hasExpoAudio ? require("@/components/AiPronunciationPanel").AiPronunciationPanel : null;

export default function DeckPronunciationNative() {
  const { deckId = "" } = useLocalSearchParams<{ deckId?: string }>();
  const db = useSQLiteContext();
  useStudySession(db);
  const [deckName, setDeckName] = useState("Bộ từ riêng");
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    void Promise.all([getDeckVocabulary(db, deckId), listPersonalDecks(db), getSettings(db)])
      .then(([deckWords, decks, nextSettings]) => {
        if (!active) return;
        setWords(deckWords);
        setSettings(nextSettings);
        setDeckName(decks.find((deck) => deck.id === deckId)?.name ?? "Bộ từ riêng");
        setIndex(0);
        setResult(null);
        setNotice(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      requestId.current += 1;
      cancelMandarinPronunciation();
    };
  }, [db, deckId]);
  useFocusEffect(load);

  const word = words[index];
  const speechContext = useMemo(
    () => words.slice(0, 60).flatMap((item) => [item.simplified, item.traditional, item.pinyin]),
    [words],
  );
  const nativeAvailable = isNativePronunciationAvailable();

  const startRecognition = async () => {
    if (!word || listening) return;
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setListening(true);
    setResult(null);
    setNotice("Đang nghe tiếng Trung…");
    try {
      const nextResult = await recognizeMandarinPronunciation(word, speechContext);
      if (requestId.current !== currentRequest) return;
      setResult(nextResult);
      setNotice(null);
    } catch (error) {
      if (requestId.current !== currentRequest) return;
      setNotice(error instanceof NativePronunciationError ? error.message : "Chưa thể nhận diện giọng nói. Hãy thử lại sau.");
    } finally {
      if (requestId.current === currentRequest) setListening(false);
    }
  };

  const stopRecognition = () => {
    requestId.current += 1;
    cancelMandarinPronunciation();
    setListening(false);
    setNotice("Đã dừng nghe.");
  };

  const next = () => {
    if (!words.length) return;
    requestId.current += 1;
    cancelMandarinPronunciation();
    setListening(false);
    setIndex((current) => (current + 1) % words.length);
    setResult(null);
    setNotice(null);
  };

  if (loading) return <Screen title="Luyện phát âm"><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (!word) return <Screen title="Luyện phát âm" subtitle={deckName}><EmptyState icon="🎙" title="Bộ từ đang trống" message="Hãy thêm từ vào bộ trước khi luyện phát âm." /><PrimaryButton label="Quay lại bộ từ" variant="secondary" onPress={() => router.back()} /></Screen>;

  const batch = Math.floor(index / PRACTICE_BATCH_SIZE) + 1;
  const batchTotal = Math.ceil(words.length / PRACTICE_BATCH_SIZE);
  return <Screen title="Luyện phát âm" subtitle={`${deckName} · Lượt ${batch}/${batchTotal} · Từ ${index + 1}/${words.length}`}>
    <View style={[card, styles.wordCard]}>
      <Text style={styles.eyebrow}>NGHE MẪU, RỒI ĐỌC LẠI</Text><Text style={styles.hanzi}>{word.simplified}</Text><Text style={styles.pinyin}>{word.pinyin}</Text><Text style={styles.meaning}>{word.primaryMeaningVi}</Text><AudioButton text={word.simplified} size={29} rate={settings?.speechRate} />
    </View>
    <View style={[card, styles.practiceCard]}>
      <Text style={styles.practiceTitle}>Nhận diện giọng nói trên thiết bị</Text>
      <Text style={styles.practiceHint}>Miễn phí. Kết quả cho biết máy nhận được từ nào, không phải điểm phát âm hay chấm thanh điệu.</Text>
      <Pressable accessibilityLabel={listening ? "Dừng nhận diện giọng nói" : "Bắt đầu nhận diện giọng nói"} accessibilityRole="button" disabled={!nativeAvailable} onPress={() => void (listening ? stopRecognition() : startRecognition())} style={({ pressed }) => [styles.recordButton, listening && styles.recordingButton, !nativeAvailable && styles.disabled, pressed && nativeAvailable && styles.pressed]}>
        <Ionicons color="#FFFFFF" name={listening ? "stop" : "mic"} size={27} /><Text style={styles.recordButtonText}>{listening ? "Dừng nghe" : "Bắt đầu nói"}</Text>
      </Pressable>
      {!nativeAvailable ? <Text style={styles.notice}>Micro nhận diện cần bản development/release có mô-đun speech; Expo Go chỉ hỗ trợ các phần học khác.</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    </View>
    {result ? <View style={[card, styles.resultCard, result.exactMatch ? styles.resultGood : styles.resultRetry]}>
      <Text style={styles.eyebrow}>KẾT QUẢ NHẬN DIỆN</Text><Text style={styles.resultStatus}>{result.exactMatch ? "Nhận đúng từ" : result.partialMatch ? "Có chứa từ mục tiêu" : "Chưa khớp từ mục tiêu"}</Text><Text style={styles.transcriptLabel}>MÁY NHẬN ĐƯỢC</Text><Text style={styles.transcript}>{result.transcript || "(không rõ)"}</Text><Text style={styles.feedback}>{result.feedback}</Text>
    </View> : null}
    {AiPronunciationPanel ? <AiPronunciationPanel key={word.id} word={word} /> : null}
    <PrimaryButton label="Từ tiếp theo" disabled={listening} onPress={next} />
    <Text style={styles.privacy}>Mẹo: đọc chậm, rõ từng âm tiết và nghe mẫu trước khi nói. Phản hồi AI nâng cao là tùy chọn; buổi luyện cơ bản luôn dùng nhận diện trên thiết bị.</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  wordCard: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 0.7 }, hanzi: { color: colors.text, fontSize: 78, fontWeight: "900", marginTop: spacing.xs }, pinyin: { color: colors.primary, fontSize: 24, fontWeight: "900" }, meaning: { color: colors.textMuted, fontSize: 18, fontWeight: "700" },
  practiceCard: { alignItems: "center", gap: spacing.md }, practiceTitle: { color: colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" }, practiceHint: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: "center" }, recordButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 66, paddingHorizontal: spacing.xl, width: "100%" }, recordingButton: { backgroundColor: colors.danger }, recordButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" }, disabled: { opacity: 0.5 }, pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] }, notice: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  resultCard: { alignItems: "center", gap: 5, paddingVertical: spacing.lg }, resultGood: { backgroundColor: "#E9F9F0" }, resultRetry: { backgroundColor: "#FFF6EA" }, resultStatus: { color: colors.text, fontSize: 24, fontWeight: "900", textAlign: "center" }, transcriptLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "900", letterSpacing: 0.7, marginTop: spacing.xs }, transcript: { color: colors.text, fontSize: 28, fontWeight: "900" }, feedback: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" }, privacy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
});
