import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, InteractionManager, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import { getDeckVocabulary, getSettings, listPersonalDecks } from "@/db/repository";
import { useStudySession } from "@/hooks/use-study-session";
import { speakChinese, stopChineseSpeech } from "@/services/audio/chinese-speech";
import { buildDeckListeningSession, type DeckListeningQuestion } from "@/services/listening/deck-listening";
import type { UserSettings, Vocabulary } from "@/types/models";

const LISTENING_BATCH_SIZE = 10;

export default function DeckListeningScreen() {
  const { deckId = "" } = useLocalSearchParams<{ deckId?: string }>();
  const db = useSQLiteContext();
  useStudySession(db);
  const [deckName, setDeckName] = useState("Bộ từ riêng");
  const [deckWords, setDeckWords] = useState<Vocabulary[]>([]);
  const [questions, setQuestions] = useState<DeckListeningQuestion[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    void Promise.all([getDeckVocabulary(db, deckId), listPersonalDecks(db), getSettings(db)])
      .then(([words, decks, nextSettings]) => {
        if (!active) return;
        setDeckName(decks.find((deck) => deck.id === deckId)?.name ?? "Bộ từ riêng");
        setDeckWords(words);
        setQuestions(buildDeckListeningSession(words, words.length));
        setSettings(nextSettings);
        setIndex(0);
        setSelectedId(null);
        setCorrect(0);
        setFinished(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [db, deckId]);

  useFocusEffect(load);

  const question = questions[index];
  const playQuestion = useCallback(() => {
    if (!question) return;
    void speakChinese(question.target.simplified, { rate: settings?.speechRate ?? 0.82 });
  }, [question, settings?.speechRate]);

  useEffect(() => {
    if (!question || finished || !settings?.soundEnabled || !settings.autoPlayAudio) return undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      playQuestion();
    });
    return () => {
      task.cancel();
      void stopChineseSpeech();
    };
  }, [finished, playQuestion, question, settings?.autoPlayAudio, settings?.soundEnabled]);

  const choose = (choiceId: string) => {
    if (!question || selectedId) return;
    setSelectedId(choiceId);
    if (choiceId === question.target.id) setCorrect((value) => value + 1);
  };

  const next = () => {
    if (!selectedId) return;
    if (index >= questions.length - 1) {
      setFinished(true);
      void stopChineseSpeech();
      return;
    }
    setIndex((value) => value + 1);
    setSelectedId(null);
  };

  const restart = () => {
    setQuestions(buildDeckListeningSession(deckWords, deckWords.length));
    setIndex(0);
    setSelectedId(null);
    setCorrect(0);
    setFinished(false);
  };

  if (loading) {
    return <Screen title="Luyện nghe trong bộ"><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  }

  if (!questions.length) {
    return (
      <Screen title="Luyện nghe trong bộ" subtitle={deckName}>
        <EmptyState icon="♫" title="Cần ít nhất 2 từ" message="Hãy thêm ít nhất hai từ vào bộ để app có thể phát âm và tạo các lựa chọn Hán tự từ chính bộ này." />
        <PrimaryButton label="Quay lại bộ từ" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (finished) {
    const percentage = Math.round((correct / questions.length) * 100);
    return (
      <Screen title="Hoàn thành luyện nghe" subtitle={deckName}>
        <View style={[card, styles.resultCard]}>
          <Text style={styles.eyebrow}>KẾT QUẢ LẦN LUYỆN</Text>
          <Text style={styles.resultNumber}>{correct}/{questions.length}</Text>
          <Text style={styles.resultCopy}>{percentage}% câu nghe và chọn đúng Hán tự.</Text>
          <Text style={styles.resultHint}>Luyện lại sau một lúc để củng cố những từ bạn còn phân vân.</Text>
        </View>
        <PrimaryButton icon="↻" label="Luyện lại" onPress={restart} />
        <PrimaryButton label="Quay lại bộ từ" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!question) {
    return <Screen title="Luyện nghe trong bộ"><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  }

  const isCorrect = selectedId === question.target.id;
  const batchNumber = Math.floor(index / LISTENING_BATCH_SIZE) + 1;
  const batchCount = Math.ceil(questions.length / LISTENING_BATCH_SIZE);
  const batchQuestionNumber = (index % LISTENING_BATCH_SIZE) + 1;
  const batchLength = Math.min(LISTENING_BATCH_SIZE, questions.length - (batchNumber - 1) * LISTENING_BATCH_SIZE);
  const isBatchEnd = (index + 1) % LISTENING_BATCH_SIZE === 0;
  return (
    <Screen title="Luyện nghe trong bộ" subtitle={`${deckName} · Lượt ${batchNumber}/${batchCount} · Câu ${batchQuestionNumber}/${batchLength}`}>
      <View style={[card, styles.listenCard]}>
        <Text style={styles.eyebrow}>NGHE VÀ CHỌN HÁN TỰ</Text>
        <Text style={styles.listenPrompt}>Nghe rồi chọn Hán tự.</Text>
        <Pressable accessibilityLabel="Nghe lại từ tiếng Trung" accessibilityRole="button" onPress={playQuestion} style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}>
          <Ionicons color="#FFFFFF" name="volume-high" size={35} />
          <Text style={styles.playButtonText}>Nghe lại</Text>
        </Pressable>
      </View>

      <View style={styles.choiceList}>
        {question.choices.map((choice, choiceIndex) => {
          const chosen = selectedId === choice.id;
          const correctChoice = selectedId !== null && choice.id === question.target.id;
          const wrongChoice = chosen && choice.id !== question.target.id;
          return (
            <Pressable
              accessibilityRole="button"
              disabled={selectedId !== null}
              key={choice.id}
              onPress={() => choose(choice.id)}
              style={({ pressed }) => [styles.choice, correctChoice && styles.choiceCorrect, wrongChoice && styles.choiceWrong, pressed && !selectedId && styles.pressed]}
            >
              <Text style={styles.choiceLetter}>{String.fromCharCode(65 + choiceIndex)}</Text>
              <Text style={[styles.choiceHanzi, (correctChoice || wrongChoice) && styles.choiceHanziAnswered]}>{choice.simplified}</Text>
              {correctChoice ? <Ionicons color={colors.success} name="checkmark-circle" size={23} /> : null}
              {wrongChoice ? <Ionicons color={colors.danger} name="close-circle" size={23} /> : null}
            </Pressable>
          );
        })}
      </View>

      {selectedId ? (
        <View style={[card, styles.feedbackCard, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
          <Text style={[styles.feedbackTitle, isCorrect ? styles.feedbackTitleCorrect : styles.feedbackTitleWrong]}>{isCorrect ? "Chính xác" : "Chưa đúng"}</Text>
          <Text style={styles.answerHanzi}>{question.target.simplified}</Text>
          <Text style={styles.answerPinyin}>{question.target.pinyin}</Text>
          <Text style={styles.answerMeaning}>{question.target.primaryMeaningVi}</Text>
        </View>
      ) : null}

      <PrimaryButton disabled={!selectedId} label={index === questions.length - 1 ? "Xem kết quả" : isBatchEnd ? "Sang lượt tiếp theo" : "Từ tiếp theo"} onPress={next} />
      <Text style={styles.sessionHint}>Không ảnh hưởng lịch SRS.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listenCard: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  listenPrompt: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: "center" },
  playButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, gap: 6, minWidth: 154, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  playButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  choiceList: { gap: spacing.sm },
  choice: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, flexDirection: "row", minHeight: 72, paddingHorizontal: spacing.md },
  choiceCorrect: { backgroundColor: "#E9F9F0", borderColor: colors.success },
  choiceWrong: { backgroundColor: "#FDECEC", borderColor: colors.danger },
  choiceLetter: { backgroundColor: colors.primarySoft, borderRadius: 99, color: colors.primary, fontSize: 13, fontWeight: "900", height: 28, lineHeight: 28, marginRight: spacing.md, textAlign: "center", width: 28 },
  choiceHanzi: { color: colors.text, flex: 1, fontSize: 34, fontWeight: "900" },
  choiceHanziAnswered: { fontSize: 36 },
  feedbackCard: { alignItems: "center", gap: 4, paddingVertical: spacing.lg },
  feedbackCorrect: { backgroundColor: "#E9F9F0" },
  feedbackWrong: { backgroundColor: "#FFF4F4" },
  feedbackTitle: { fontSize: 18, fontWeight: "900" },
  feedbackTitleCorrect: { color: colors.success },
  feedbackTitleWrong: { color: colors.danger },
  answerHanzi: { color: colors.text, fontSize: 48, fontWeight: "900", marginTop: spacing.xs },
  answerPinyin: { color: colors.primary, fontSize: 19, fontWeight: "800" },
  answerMeaning: { color: colors.textMuted, fontSize: 16 },
  sessionHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  resultCard: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  resultNumber: { color: colors.primary, fontSize: 56, fontWeight: "900" },
  resultCopy: { color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "center" },
  resultHint: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
});
