import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { radius, spacing, themedCard } from "@/constants/design";
import { getDeckVocabulary, getSettings, listPersonalDecks } from "@/db/repository";
import { useStudySession } from "@/hooks/use-study-session";
import { buildDeckClozeQuiz, explainDeckClozeAnswer, type DeckClozeQuestion } from "@/services/decks/cloze-quiz";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";
import type { UserSettings, Vocabulary } from "@/types/models";

const QUIZ_SIZE = 10;

export default function DeckQuizScreen() {
  const { deckId = "" } = useLocalSearchParams<{ deckId?: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  if (loading) return <Screen title="Quiz điền từ"><ActivityIndicator color={theme.primary} size="large" /></Screen>;
  if (!questions.length) {
    return <Screen title="Quiz điền từ" subtitle={deckName}>
      <EmptyState icon="✎" variant="review" scene="deck" title="Cần ít nhất 2 từ có ví dụ" message="Quiz điền chỗ trống dùng ví dụ tiếng Trung của chính các từ trong bộ. Hãy thêm hoặc chỉnh ví dụ cho ít nhất hai từ." />
      <PrimaryButton label="Quay lại bộ từ" variant="secondary" onPress={() => router.back()} />
    </Screen>;
  }
  if (finished) {
    return <Screen title="Hoàn thành bài kiểm tra" subtitle={deckName}>
      <View style={[styles.card, styles.result]}>
        <Text style={styles.eyebrow}>KẾT QUẢ</Text><Text style={styles.score}>{correct}/{questions.length}</Text>
        <Text style={styles.resultCopy}>{Math.round((correct / questions.length) * 100)}% câu trả lời chính xác.</Text>
      </View>
      <PrimaryButton label="Làm lượt khác" icon="↻" onPress={() => start(words)} />
      <PrimaryButton label="Quay lại bộ từ" variant="secondary" onPress={() => router.back()} />
    </Screen>;
  }
  if (!question) return <Screen title="Quiz điền từ"><ActivityIndicator color={theme.primary} size="large" /></Screen>;
  const correctAnswer = selectedId === question.target.id;
  const explanation = selectedId ? explainDeckClozeAnswer(question, selectedId) : null;
  return <Screen title="Quiz điền từ" subtitle={`${deckName} · Câu ${index + 1}/${questions.length}`}>
    <View style={[styles.card, styles.promptCard]}>
      <Text style={styles.eyebrow}>ĐIỀN HÁN TỰ CÒN THIẾU</Text>
      <Text style={styles.sentence}>{question.sentence}</Text>
      <Text style={styles.hint}>Chọn từ đúng theo nghĩa của câu.</Text>
      <Text style={styles.translationHint}>{question.example.vietnamese.trim() ? `Nghĩa câu: ${question.example.vietnamese.trim()}` : `Nghĩa từ cần điền: ${question.target.primaryMeaningVi}`}</Text>
    </View>
    <View style={styles.choices}>{question.choices.map((choice, choiceIndex) => {
      const choiceLetter = String.fromCharCode(65 + choiceIndex);
      const chosen = selectedId === choice.id;
      const isCorrectChoice = selectedId !== null && choice.id === question.target.id;
      return <Pressable key={choice.id} accessibilityRole="button" accessibilityLabel={"Lựa chọn " + choiceLetter + ": " + choice.simplified} accessibilityState={{ disabled: selectedId !== null, selected: chosen }} disabled={selectedId !== null} onPress={() => choose(choice.id)} style={({ pressed }) => [styles.choice, isCorrectChoice && styles.choiceCorrect, chosen && !isCorrectChoice && styles.choiceWrong, pressed && !selectedId && styles.pressed]}>
        <Text style={styles.choiceLetter}>{choiceLetter}</Text><Text style={styles.choiceText}>{choice.simplified}</Text>
        {isCorrectChoice ? <Ionicons name="checkmark-circle" size={22} color={theme.success} /> : null}
        {chosen && !isCorrectChoice ? <Ionicons name="close-circle" size={22} color={theme.error} /> : null}
      </Pressable>;
    })}</View>
    {selectedId ? <View accessibilityLiveRegion="polite" style={[styles.card, styles.feedback, correctAnswer ? styles.feedbackCorrect : styles.feedbackWrong]}>
      <Text style={[styles.feedbackTitle, correctAnswer ? styles.feedbackTitleCorrect : styles.feedbackTitleWrong]}>{correctAnswer ? "Chính xác" : "Đáp án đúng"}</Text>
      <Text style={styles.answer}>{question.target.simplified}</Text><Text style={styles.pinyin}>{question.target.pinyin}</Text>
      <Text style={styles.meaning}>{question.target.primaryMeaningVi}</Text><AudioButton text={question.target.simplified} size={23} rate={settings?.speechRate} />
      {explanation ? <View style={styles.explanation}>
        <Text style={styles.explanationTitle}>Vì sao đáp án này đúng?</Text>
        <Text style={styles.explanationCopy}>{explanation.correctReason}</Text>
        <Text style={styles.completedSentence}>{question.example.chinese}</Text>
        {question.example.pinyin ? <Text style={styles.examplePinyin}>{question.example.pinyin}</Text> : null}
        {question.example.vietnamese ? <Text style={styles.explanationCopy}>{question.example.vietnamese}</Text> : null}
        <Text style={styles.explanationTitle}>Vì sao các đáp án khác không khớp?</Text>
        {explanation.alternatives.map(item => <View key={item.word.id} style={styles.alternativeReason}>
          {item.selected ? <Text style={styles.selectedReason}>Bạn đã chọn {item.word.simplified}</Text> : null}
          <Text style={styles.explanationCopy}>{item.reason}</Text>
        </View>)}
        <Text style={styles.explanationNote}>Giải thích dựa trên câu ví dụ đang học; từ khác có thể dùng trong ngữ cảnh khác.</Text>
      </View> : null}
    </View> : null}
    <PrimaryButton disabled={!selectedId} label={index === questions.length - 1 ? "Xem kết quả" : "Câu tiếp theo"} onPress={next} />
  </Screen>;
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    card: { ...themedCard(theme), borderWidth: 1, borderColor: theme.border },
    eyebrow: { color: theme.primaryText, fontSize: 11, fontWeight: "900", letterSpacing: .7 },
    promptCard: { gap: spacing.md, paddingVertical: spacing.xl }, sentence: { color: theme.textPrimary, fontSize: 29, fontWeight: "900", lineHeight: 43, textAlign: "center" }, hint: { color: theme.textMuted, fontSize: 14, textAlign: "center" },
    choices: { gap: spacing.sm }, choice: { alignItems: "center", backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.md, borderWidth: 1.5, flexDirection: "row", minHeight: 68, paddingHorizontal: spacing.md }, choiceCorrect: { borderColor: theme.success, backgroundColor: theme.successSoft }, choiceWrong: { borderColor: theme.error, backgroundColor: theme.errorSoft }, choiceLetter: { backgroundColor: theme.primarySoft, borderRadius: 99, color: theme.primaryText, fontSize: 13, fontWeight: "900", height: 28, lineHeight: 28, marginRight: spacing.md, textAlign: "center", width: 28 }, choiceText: { color: theme.textPrimary, flex: 1, fontSize: 30, fontWeight: "900" }, pressed: { opacity: .82, transform: [{ scale: .99 }] },
    feedback: { alignItems: "center", gap: 4, paddingVertical: spacing.lg }, feedbackCorrect: { backgroundColor: theme.successSoft }, feedbackWrong: { backgroundColor: theme.errorSoft }, feedbackTitle: { fontSize: 18, fontWeight: "900" }, feedbackTitleCorrect: { color: theme.success }, feedbackTitleWrong: { color: theme.error }, answer: { color: theme.textPrimary, fontSize: 49, fontWeight: "900", marginTop: spacing.xs }, pinyin: { color: theme.primaryText, fontSize: 19, fontWeight: "800" }, meaning: { color: theme.textMuted, fontSize: 16 },
    result: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl }, score: { color: theme.primaryText, fontSize: 58, fontWeight: "900" }, resultCopy: { color: theme.textMuted, fontSize: 16 },
    explanation: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: spacing.md },
    explanationTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: "800", marginTop: spacing.xs },
    translationHint: { color: theme.textSecondary, fontSize: 15, lineHeight: 23, textAlign: "center" },
    explanationCopy: { color: theme.textPrimary, fontSize: 15, lineHeight: 23 },
    completedSentence: { color: theme.textPrimary, fontSize: 24, fontWeight: "700", lineHeight: 34 },
    examplePinyin: { color: theme.textSecondary, fontSize: 15, lineHeight: 23 },
    alternativeReason: { gap: 4 }, selectedReason: { color: theme.error, fontSize: 14, fontWeight: "800" },
    explanationNote: { color: theme.textMuted, fontSize: 12, lineHeight: 18 },
  });
}
