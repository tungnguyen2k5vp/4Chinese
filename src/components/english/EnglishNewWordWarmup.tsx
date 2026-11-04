import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { EnglishAudioButton } from "@/components/EnglishAudioButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { EnglishLearningProgress } from "@/components/english/EnglishLearningProgress";
import { StudyTransition } from "@/components/ui/StudyTransition";
import type { EnglishCard } from "@/db/english/learner";
import { isEnglishSpellingCorrect } from "@/services/review/english-spelling";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export function EnglishNewWordWarmup({ cards, onComplete, onExit }: {
  cards: EnglishCard[];
  onComplete: () => Promise<void>;
  onExit: () => void;
}) {
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [step, setStep] = useState<"COPY" | "RECALL">("COPY");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preparing = useRef(false);
  const card = cards[index];
  const copy = step === "COPY";
  const last = index === cards.length - 1;
  const check = () => {
    if (!card || !answer.trim() || busy) return;
    const correct = isEnglishSpellingCorrect(card.headword, answer);
    setResult(correct ? "correct" : "wrong");
    if (correct) Keyboard.dismiss();
  };
  const next = async () => {
    if (busy || preparing.current) return;
    if (!last || copy) {
      setIndex(last ? 0 : index + 1);
      if (last) setStep("RECALL");
      setAnswer("");
      setResult(null);
      return;
    }
    preparing.current = true;
    setBusy(true);
    setError("");
    try { await onComplete(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa mở được bài ôn. Hãy thử lại."); }
    finally { preparing.current = false; setBusy(false); }
  };

  return <Screen hideHeader avoidKeyboard compact>
    <View style={s.top}>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng phiên học từ mới" onPress={onExit} disabled={busy} style={s.icon}><Ionicons name="close" size={25} color={p.textPrimary} /></Pressable>
      <Text accessibilityRole="header" style={[s.title, { color: p.textPrimary }]}>Học từ mới</Text>
    </View>
    <EnglishLearningProgress completed={(copy ? 0 : cards.length) + index + (result === "correct" ? 1 : 0)} total={cards.length * 3} />
    <StudyTransition turnKey={`${step}:${card?.id}`} effect="reveal" testID="english-new-word-warmup" style={[s.prompt, { backgroundColor: p.surface, borderColor: p.border }]}>
      <Text style={[s.label, { color: p.primary }]}>{copy ? "Nhìn từ và gõ lại" : "Nhìn nghĩa, nhớ từ tiếng Anh"}</Text>
      <Text testID="english-learning-prompt" style={[copy ? s.word : s.meaning, { color: p.textPrimary }]}>{copy ? card?.headword : card?.meaning_vi}</Text>
      {copy && card ? <><Text style={[s.translation, { color: p.textSecondary }]}>{card.meaning_vi}</Text><EnglishAudioButton text={card.headword} compact /></> : null}
      <TextInput key={`${step}-${card?.id}`} testID="english-learning-answer" accessibilityLabel={copy ? "Gõ lại từ tiếng Anh theo mẫu" : "Nhập từ tiếng Anh theo nghĩa"} value={answer} onChangeText={value => { setAnswer(value); setResult(null); }} placeholder={copy ? "Gõ từ ở trên" : "Nhập từ tiếng Anh"} placeholderTextColor={p.textMuted} autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="off" returnKeyType="done" onSubmitEditing={check} editable={!busy && result !== "correct"} style={[s.input, { color: p.textPrimary, borderColor: result === "wrong" ? p.error : result === "correct" ? p.success : p.border, backgroundColor: p.surface }]} />
      {result ? <StudyTransition turnKey={`${step}:${index}:${result}`} effect={result === 'correct' ? 'success' : 'error'} durationMs={result === 'correct' ? 280 : 240} animateOnMount testID="english-warmup-feedback" accessibilityLiveRegion="polite" style={[s.feedback, { backgroundColor: result === "correct" ? p.successLight : p.errorLight }]}><Ionicons name={result === "correct" ? "checkmark-circle" : "refresh-outline"} size={22} color={result === "correct" ? p.success : p.error} /><Text style={{ flex: 1, color: result === "correct" ? p.success : p.error, lineHeight: 23, fontWeight: "700" }}>{result === "correct" ? "Đúng rồi!" : copy ? "Chưa đúng. Hãy gõ lại theo từ mẫu." : `Từ cần nhớ: ${card?.headword}. Hãy gõ lại để ghi nhớ.`}</Text></StudyTransition> : null}
    </StudyTransition>
    {error ? <Text accessibilityRole="alert" style={{ color: p.error }}>{error}</Text> : null}
    <PrimaryButton label={busy ? "Đang chuẩn bị…" : result !== "correct" ? "Kiểm tra" : "Tiếp tục"} loading={busy} disabled={busy || !answer.trim()} onPress={() => result === "correct" ? void next() : check()} />
    {busy ? <ActivityIndicator color={p.primary} /> : null}
  </Screen>;
}

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 21, fontWeight: "800" },
  prompt: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 20 },
  label: { fontSize: 15, fontWeight: "700" },
  word: { fontSize: 36, lineHeight: 46, fontWeight: "800", textAlign: "center" },
  meaning: { fontSize: 27, lineHeight: 37, fontWeight: "800", textAlign: "center", paddingVertical: 16 },
  translation: { fontSize: 19, lineHeight: 27, textAlign: "center" },
  input: { minHeight: 56, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, fontSize: 21 },
  feedback: { borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
});
