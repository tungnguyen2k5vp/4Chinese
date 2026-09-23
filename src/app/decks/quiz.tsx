import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import { getDeckVocabulary, getSettings, listPersonalDecks } from "@/db/repository";
import { useStudySession } from "@/hooks/use-study-session";
import { buildDeckClozeQuiz, type DeckClozeQuestion } from "@/services/decks/cloze-quiz";
import type { UserSettings, Vocabulary } from "@/types/models";

const QUIZ_SIZE = 10;

export default function DeckQuizScreen() {
  const { deckId = "" } = useLocalSearchParams<{ deckId?: string }>();
  const db = useSQLiteContext();
  useStudySession(db);
  const [deckName, setDeckName] = useState("Bộ từ riêng");
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [questions, setQuestions] = useState<DeckClozeQuestion[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const start = useCallback((deckWords: Vocabulary[]) => {
    setQuestions(buildDeckClozeQuiz(deckWords, QUIZ_SIZE));
    setIndex(0);
    setSelectedId(null);
    setCorrect(0);
    setFinished(false);
  }, []);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    void Promise.all([getDeckVocabulary(db, deckId), listPersonalDecks(db), getSettings(db)])
      .then(([deckWords, decks, nextSettings]) => {
        if (!active) return;
        setDeckName(decks.find((deck) => deck.id === deckId)?.name ?? "Bộ từ riêng");
        setWords(deckWords);
        setSettings(nextSettings);
        start(deckWords);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [db, deckId, start]);
  useFocusEffect(load);

  const question = questions[index];
  const choose = (choiceId: string) => {
    if (!question || selectedId) return;
    setSelectedId(choiceId);
    if (choiceId === question.target.id) setCorrect((value) => value + 1);
  };
  const next = () => {
    if (!selectedId) return;
    if (index === questions.length - 1) { setFinished(true); return; }
    setIndex((value) => value + 1);
    setSelectedId(null);
  };

  if (loading) return <Screen title="Quiz điền từ"><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (!questions.length) {
    return <Screen title="Quiz điền từ" subtitle={deckName}>
      <EmptyState icon="✎" title="Cần ít nhất 2 từ có ví dụ" message="Quiz điền chỗ trống dùng ví dụ tiếng Trung của chính các từ trong bộ. Hãy thêm hoặc chỉnh ví dụ cho ít nhất hai từ." />
      <PrimaryButton label="Quay lại bộ từ" variant="secondary" onPress={() => router.back()} />
    </Screen>;
  }
  if (finished) {
    return <Screen title="Hoàn thành bài kiểm tra" subtitle={deckName}>
      <View style={[card, styles.result]}>
        <Text style={styles.eyebrow}>KẾT QUẢ</Text><Text style={styles.score}>{correct}/{questions.length}</Text>
        <Text style={styles.resultCopy}>{Math.round((correct / questions.length) * 100)}% câu trả lời chính xác.</Text>
      </View>
      <PrimaryButton label="Làm lượt khác" icon="↻" onPress={() => start(words)} />
      <PrimaryButton label="Quay lại bộ từ" variant="secondary" onPress={() => router.back()} />
    </Screen>;
  }
  if (!question) return <Screen title="Quiz điền từ"><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  const correctAnswer = selectedId === question.target.id;
  return <Screen title="Quiz điền từ" subtitle={`${deckName} · Câu ${index + 1}/${questions.length}`}>
    <View style={[card, styles.promptCard]}>
      <Text style={styles.eyebrow}>ĐIỀN HÁN TỰ CÒN THIẾU</Text>
      <Text style={styles.sentence}>{question.sentence}</Text>
      <Text style={styles.hint}>Chọn từ đúng để hoàn thành câu.</Text>
    </View>
    <View style={styles.choices}>{question.choices.map((choice, choiceIndex) => {
      const chosen = selectedId === choice.id;
      const isCorrectChoice = selectedId !== null && choice.id === question.target.id;
      return <Pressable key={choice.id} accessibilityRole="button" disabled={selectedId !== null} onPress={() => choose(choice.id)} style={({ pressed }) => [styles.choice, isCorrectChoice && styles.choiceCorrect, chosen && !isCorrectChoice && styles.choiceWrong, pressed && !selectedId && styles.pressed]}>
        <Text style={styles.choiceLetter}>{String.fromCharCode(65 + choiceIndex)}</Text><Text style={styles.choiceText}>{choice.simplified}</Text>
        {isCorrectChoice ? <Ionicons name="checkmark-circle" size={22} color={colors.success} /> : null}
        {chosen && !isCorrectChoice ? <Ionicons name="close-circle" size={22} color={colors.danger} /> : null}
      </Pressable>;
    })}</View>
    {selectedId ? <View style={[card, styles.feedback, correctAnswer ? styles.feedbackCorrect : styles.feedbackWrong]}>
      <Text style={[styles.feedbackTitle, { color: correctAnswer ? colors.success : colors.danger }]}>{correctAnswer ? "Chính xác" : "Đáp án đúng"}</Text>
      <Text style={styles.answer}>{question.target.simplified}</Text><Text style={styles.pinyin}>{question.target.pinyin}</Text>
      <Text style={styles.meaning}>{question.target.primaryMeaningVi}</Text><AudioButton text={question.target.simplified} size={23} rate={settings?.speechRate} />
    </View> : null}
    <PrimaryButton disabled={!selectedId} label={index === questions.length - 1 ? "Xem kết quả" : "Câu tiếp theo"} onPress={next} />
  </Screen>;
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: .7 },
  promptCard: { gap: spacing.md, paddingVertical: spacing.xl }, sentence: { color: colors.text, fontSize: 29, fontWeight: "900", lineHeight: 43, textAlign: "center" }, hint: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  choices: { gap: spacing.sm }, choice: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, flexDirection: "row", minHeight: 68, paddingHorizontal: spacing.md }, choiceCorrect: { borderColor: colors.success, backgroundColor: "#E9F9F0" }, choiceWrong: { borderColor: colors.danger, backgroundColor: "#FFF1F1" }, choiceLetter: { backgroundColor: colors.primarySoft, borderRadius: 99, color: colors.primary, fontSize: 13, fontWeight: "900", height: 28, lineHeight: 28, marginRight: spacing.md, textAlign: "center", width: 28 }, choiceText: { color: colors.text, flex: 1, fontSize: 30, fontWeight: "900" }, pressed: { opacity: .82, transform: [{ scale: .99 }] },
  feedback: { alignItems: "center", gap: 4, paddingVertical: spacing.lg }, feedbackCorrect: { backgroundColor: "#E9F9F0" }, feedbackWrong: { backgroundColor: "#FFF4F4" }, feedbackTitle: { fontSize: 18, fontWeight: "900" }, answer: { color: colors.text, fontSize: 49, fontWeight: "900", marginTop: spacing.xs }, pinyin: { color: colors.primary, fontSize: 19, fontWeight: "800" }, meaning: { color: colors.textMuted, fontSize: 16 },
  result: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl }, score: { color: colors.primary, fontSize: 58, fontWeight: "900" }, resultCopy: { color: colors.textMuted, fontSize: 16 },
});
