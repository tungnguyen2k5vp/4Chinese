import { Ionicons } from "@expo/vector-icons";
import { router, useIsFocused, type Href } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { EnglishAudioButton } from "@/components/EnglishAudioButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { EnglishLearningProgress } from "@/components/english/EnglishLearningProgress";
import { EnglishNewWordWarmup } from "@/components/english/EnglishNewWordWarmup";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { StudyTransition } from "@/components/ui/StudyTransition";
import { englishReviewDemoCards } from "@/data/english-review-preview-fixtures";
import {
  defaultEnglishFlashcardSettings,
  ENGLISH_REVIEW_BATCH_SIZES,
  saveEnglishFlashcardSettings,
  type EnglishFlashcardSettings,
} from "@/db/english/flashcard-settings";
import {
  englishDueQueue,
  englishStatistics,
  reviewEnglishCard,
  type EnglishCard,
} from "@/db/english/learner";
import { beginEnglishNewWordReview, englishLearningIds, selectedEnglishNewCards } from "@/db/english/new-word-session";
import { useModalAnimationType } from "@/hooks/use-reduced-motion";
import { shuffleEnglishQueue } from "@/services/english/flashcards";
import { readEnglishContext } from "@/services/english/reading-context";
import { buildMeaningChoices, englishClozeForCard, exerciseForQuestion, nextReviewProgress, type EnglishReviewExercise, type EnglishReviewMode } from "@/services/english/review-exercises";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import type { LearningSessionContext } from "@/services/languages/config";
import { englishLocalId } from "@/services/languages/ids";
import { useLanguageProtection } from "@/services/languages/use-language-protection";
import { isEnglishSpellingCorrect } from "@/services/review/english-spelling";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

type Props = {
  mode?: string;
  quick?: boolean;
  deckId?: string;
  preview?: boolean;
  learn?: string;
};
type Phase = "SETUP" | "WARMUP" | "REVIEW" | "COMPLETE" | "EMPTY";
type Feedback = {
  card: EnglishCard;
  correct: boolean;
  answer: string;
  exercise: EnglishReviewExercise;
};

function reviewMode(value?: string): EnglishReviewMode {
  if (value === "MEANING" || value === "SPELLING" || value === "LISTENING") return value;
  return "MIXED";
}

function maskedAnswer(value: string) {
  const chars = Array.from(value.trim());
  if (chars.length <= 2) return chars[0] ? `${chars[0]} _` : "_";
  return chars.map((character, index) => {
    if (/\s/u.test(character)) return "   ";
    if (!/[\p{L}\p{N}]/u.test(character)) return character;
    return index === 0 || index === chars.length - 1 ? character : "_";
  }).join(" ").replace(/\s{2,}/gu, " ").trim();
}

function measureResponseTime(startedAt: number) {
  return Math.max(0, Date.now() - startedAt);
}

export function EnglishReviewFlow({ mode, quick = false, deckId, preview = false, learn }: Props) {
  const db = useEnglishDatabase();
  const { preferences } = useLearningLanguage();
  const theme = useTheme();
  const palette = getEnglishPalette(theme.mode === "dark");
  const modalAnimation = useModalAnimationType();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale >= 1.3;
  const selectedMode = reviewMode(mode);
  const visualPreview = __DEV__ && preview;
  const [settings, setSettings] = useState<EnglishFlashcardSettings>(defaultEnglishFlashcardSettings);
  const settingsRef = useRef<EnglishFlashcardSettings>(defaultEnglishFlashcardSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>(learn ? "WARMUP" : "SETUP");
  const [newWordSession, setNewWordSession] = useState(!!learn);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dueCount, setDueCount] = useState(0);
  const [remainingDue, setRemainingDue] = useState(0);
  const [queue, setQueue] = useState<EnglishCard[]>([]);
  const [roundCards, setRoundCards] = useState<EnglishCard[]>([]);
  const [roundTarget, setRoundTarget] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [firstPassCorrect, setFirstPassCorrect] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const screenFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const reviewedIds = useRef(new Set<string>());
  const previewOffset = useRef(0);
  const lock = useRef(false);
  const pendingAnswer = useRef<{ correct: boolean; hintUsed: boolean; responseTimeMs: number } | null>(null);
  const operationId = useRef(englishLocalId("operation"));
  const cardStartedAt = useRef(0);
  const activeElapsedMs = useRef(0);
  const [context] = useState<LearningSessionContext>(() => ({
    learningLanguage: "en",
    uiLocale: "vi",
    pronunciationVariant: preferences.englishVariant,
    sessionId: englishLocalId("session"),
  }));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      const active = state === "active";
      setAppActive(active);
      if (!active) void Speech.stop();
    });
    return () => subscription.remove();
  }, []);

  const startRound = useCallback(async (config = settingsRef.current, usePreview = visualPreview) => {
    setLoading(true);
    setError("");
    setFeedback(null);
    try {
      const rows = usePreview
        ? englishReviewDemoCards.slice(previewOffset.current, previewOffset.current + config.reviewBatchSize)
        : await englishDueQueue(db, new Date(), config.reviewBatchSize, deckId);
      const ordered = usePreview || !config.shuffleOnStart ? rows : shuffleEnglishQueue(rows);
      setRoundCards(ordered);
      setQueue(ordered);
      setRoundTarget(ordered.length);
      setProgress(0);
      setReviewedCount(0);
      setFirstPassCorrect(0);
      setQuestionIndex(0);
      setAnswerText("");
      setSelectedChoice(null);
      setHintVisible(false);
      setHintUsed(false);
      activeElapsedMs.current = 0;
      setActiveSeconds(0);
      reviewedIds.current = new Set();
      operationId.current = englishLocalId("operation");
      setRemainingDue(usePreview ? Math.max(0, englishReviewDemoCards.length - previewOffset.current - ordered.length) : ordered.length);
      setDueCount(usePreview ? Math.max(0, englishReviewDemoCards.length - previewOffset.current) : ordered.length);
      setPhase(ordered.length ? "REVIEW" : "EMPTY");
      setNewWordSession(false);
      cardStartedAt.current = Date.now();
    } catch {
      setError("Chưa tải được hàng đợi ôn tập. Dữ liệu và lịch của bạn vẫn được giữ nguyên.");
    } finally {
      setLoading(false);
    }
  }, [db, deckId, visualPreview]);

  useEffect(() => {
    let live = true;
    void (async () => {
      setLoading(true);
      try {
        const [savedSettings, stats, deckDue] = await Promise.all([
          import("@/db/english/flashcard-settings").then(({ readEnglishFlashcardSettings }) => readEnglishFlashcardSettings(db)),
          englishStatistics(db),
          deckId ? englishDueQueue(db, new Date(), 100, deckId) : Promise.resolve(null),
        ]);
        if (!live) return;
        settingsRef.current = savedSettings;
        setSettings(savedSettings);
        previewOffset.current = 0;
        setDueCount(visualPreview ? englishReviewDemoCards.length : deckDue ? deckDue.length : stats.due);
        setRemainingDue(visualPreview ? englishReviewDemoCards.length : deckDue ? deckDue.length : stats.due);
        setSettingsLoaded(true);
        if (learn) {
          const ids = englishLearningIds(learn);
          const selected = await selectedEnglishNewCards(db, ids, deckId);
          if (!live) return;
          setRoundCards(selected);
          setRoundTarget(selected.length);
          setNewWordSession(true);
          setPhase("WARMUP");
        }
      } catch {
        if (live) setError(learn ? "Chưa tải được các từ vừa chọn. Từ đã học hoặc đã bỏ qua cần được chọn lại." : "Chưa đọc được cài đặt hoặc dữ liệu ôn tập. Hãy thử tải lại.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [db, deckId, learn, loadAttempt, startRound, visualPreview]);

  const card = queue[0];
  const savedContext = card && settings.showContext !== false ? readEnglishContext(card.notes, card.sense_id) : null;
  const cloze = card ? englishClozeForCard(card, savedContext) : null;
  const rawExercise = exerciseForQuestion(questionIndex, selectedMode);
  const choices = card ? buildMeaningChoices(card, roundCards, questionIndex) : [];
  const exercise: EnglishReviewExercise = rawExercise === "CHOICE" && choices.length < 2 ? "LISTEN_CLOZE" : rawExercise;
  const answerKey = cloze?.answer ?? card?.headword ?? "";

  useLanguageProtection("SESSION", loading || busy || phase === "WARMUP" || (phase === "REVIEW" && queue.length > 0));

  useEffect(() => {
    if (phase !== "REVIEW" || feedback || settingsVisible || !screenFocused || !appActive) return;
    const segmentStartedAt = Date.now();
    const interval = setInterval(() => {
      setActiveSeconds(Math.floor((activeElapsedMs.current + Date.now() - segmentStartedAt) / 1000));
    }, 1000);
    return () => {
      clearInterval(interval);
      activeElapsedMs.current += Date.now() - segmentStartedAt;
    };
  }, [phase, feedback, settingsVisible, screenFocused, appActive]);

  useEffect(() => {
    if (phase !== "REVIEW" || !settingsLoaded || !settings.autoPlayOnShow || !card || exercise !== "LISTEN_CLOZE" || feedback || settingsVisible || !screenFocused || !appActive) return;
    void Speech.stop();
    Speech.speak(card.headword, { language: context.pronunciationVariant, rate: 0.9 });
    return () => { void Speech.stop(); };
  }, [phase, settingsLoaded, settings.autoPlayOnShow, card, exercise, feedback, settingsVisible, screenFocused, appActive, context.pronunciationVariant]);

  const updateSetting = async (patch: Partial<EnglishFlashcardSettings>) => {
    if (settingsBusy) return;
    const previous = settingsRef.current;
    const next = { ...previous, ...patch };
    settingsRef.current = next;
    setSettings(next);
    setSettingsBusy(true);
    setSettingsMessage("");
    try {
      const stored = await saveEnglishFlashcardSettings(db, next);
      settingsRef.current = stored;
      setSettings(stored);
      setSettingsMessage("Đã lưu trên thiết bị. Số từ mới áp dụng từ lượt kế tiếp.");
      if (phase === "SETUP") {
        const stats = await englishStatistics(db);
        setDueCount(visualPreview ? englishReviewDemoCards.length - previewOffset.current : deckId ? (await englishDueQueue(db, new Date(), 100, deckId)).length : stats.due);
      }
    } catch {
      settingsRef.current = previous;
      setSettings(previous);
      setSettingsMessage("Chưa lưu được tùy chọn. Phiên ôn và lịch SRS không bị thay đổi.");
    } finally {
      setSettingsBusy(false);
    }
  };

  const finishRound = async () => {
    setLoading(true);
    try {
      if (visualPreview) {
        previewOffset.current = Math.min(englishReviewDemoCards.length, previewOffset.current + roundTarget);
        const remaining = englishReviewDemoCards.length - previewOffset.current;
        setDueCount(remaining);
        setRemainingDue(remaining);
      }
      else if (deckId) setRemainingDue((await englishDueQueue(db, new Date(), 100, deckId)).length);
      else setRemainingDue((await englishStatistics(db)).due);
      setPhase("COMPLETE");
      setQueue([]);
    } catch {
      setError("Đã lưu lượt ôn, nhưng chưa cập nhật được số từ còn đến hạn. Hãy tải lại để xem lại.");
    } finally {
      setLoading(false);
    }
  };

  const recordAnswer = async (correct: boolean, answer: string, retrySave = false, responseTimeMs = 0) => {
    if (!card || lock.current || loading || feedback) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const input = pendingAnswer.current ?? {
      correct,
      hintUsed: hintUsed || !correct && answer === "Không biết",
      responseTimeMs: Math.max(0, responseTimeMs),
    };
    pendingAnswer.current = input;
    try {
      const firstReview = !reviewedIds.current.has(card.id);
      if (firstReview && !visualPreview) {
        await reviewEnglishCard(
          db,
          context,
          operationId.current,
          card.id,
          card.revision,
          // Guided first exposure keeps level 1; later scheduled reviews promote normally.
          newWordSession ? { ...input, rating: "hard" } : input,
          exercise === "CHOICE" ? "MEANING" : "LISTENING",
        );
      }
      if (firstReview) {
        reviewedIds.current.add(card.id);
        setReviewedCount(reviewedIds.current.size);
        if (correct) setFirstPassCorrect(value => value + 1);
      }
      setProgress(value => nextReviewProgress(value, roundTarget, correct));
      setQueue(rows => {
        const rest = rows.slice(1);
        return correct ? rest : [...rest, card];
      });
      setFeedback({ card, correct, answer, exercise });
      setAnswerText("");
      setSelectedChoice(null);
      setQuestionIndex(value => value + 1);
      operationId.current = englishLocalId("operation");
      pendingAnswer.current = null;
    } catch (failure) {
      setError(failure instanceof Error && /STALE|NOT_DUE/.test(failure.message)
        ? "Từ này đã được cập nhật ở nơi khác hoặc không còn đến hạn. Hãy tải lại hàng đợi."
        : "Chưa lưu được kết quả ôn. Bạn có thể thử lại; kết quả không bị ghi trùng.");
      // Preserve the exact answer/time so retrying cannot double-grade or alter the SRS record.
      if (retrySave) setSettingsMessage("");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const continueAfterFeedback = async () => {
    setFeedback(null);
    setHintVisible(false);
    setHintUsed(false);
    cardStartedAt.current = Date.now();
    if (reviewedCount >= roundTarget && progress >= roundTarget) {
      await finishRound();
      return;
    }
    if (queue.length === 0 && reviewedCount >= roundTarget) setQueue(roundCards);
  };

  const repeatFeedbackCard = () => {
    if (!feedback) return;
    const current = feedback.card;
    setProgress(value => Math.max(0, value - 1));
    setQueue(rows => [current, ...rows.filter(row => row.id !== current.id)]);
    setAnswerText("");
    setSelectedChoice(null);
    setHintVisible(false);
    setHintUsed(false);
    cardStartedAt.current = Date.now();
    setFeedback(null);
  };

  const dismissFeedback = () => {
    void continueAfterFeedback();
  };

  const openHint = () => {
    setHintVisible(true);
    setHintUsed(true);
  };

  if (phase === "WARMUP") {
    if (loading || !roundCards.length) return <Screen hideHeader compact><View style={styles.center}>{loading ? <ActivityIndicator color={palette.primary} /> : <><Text accessibilityRole="alert" style={{ color: palette.error }}>{error}</Text><PrimaryButton label="Thử tải lại" onPress={() => { setError(""); setLoadAttempt(value => value + 1); }} /><PrimaryButton variant="secondary" label="Quay lại chọn từ" onPress={() => router.back()} /></>}</View></Screen>;
    return <EnglishNewWordWarmup cards={roundCards} onExit={() => router.back()} onComplete={async () => {
      const ready = await beginEnglishNewWordReview(db, roundCards.map(item => item.id), deckId);
      setRoundCards(ready); setQueue(ready); setRoundTarget(ready.length);
      setProgress(0); setReviewedCount(0); setFirstPassCorrect(0); setQuestionIndex(0);
      reviewedIds.current = new Set(); operationId.current = englishLocalId("operation");
      cardStartedAt.current = Date.now(); setError(""); setPhase("REVIEW");
    }} />;
  }

  if (loading && !settingsLoaded && phase === "SETUP") {
    return <Screen hideHeader><View style={styles.center}><ActivityIndicator color={palette.primary} /><Text style={{ color: palette.textSecondary }}>Đang tải lượt ôn…</Text></View></Screen>;
  }

  if (phase === "SETUP") {
    return (
      <Screen title="Ôn tập tiếng Anh" subtitle={deckId ? "Bộ từ riêng · chọn số từ cho lượt này" : "Ôn từ đến hạn theo từng lượt, không bỏ sót phần còn lại."}>
        {error ? <View style={[styles.notice, { borderColor: palette.error, backgroundColor: palette.errorLight }]}><Text accessibilityRole="alert" style={{ color: palette.error }}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void startRound()}><Text style={{ color: palette.primary, fontWeight: "800" }}>Thử lại</Text></Pressable></View> : null}
        <View testID="english-review-setup" style={[styles.setupCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>CẦN ÔN TẬP</Text>
          <Text accessibilityRole="header" style={[styles.setupCount, { color: palette.textPrimary }]}>{dueCount} từ đến hạn</Text>
          {visualPreview ? <Text testID="english-review-preview-badge" style={[styles.bodySmall, { color: palette.primary, fontWeight: "800" }]}>DỮ LIỆU XEM THỬ · KHÔNG GHI VÀO LỊCH HỌC</Text> : null}
          <Text style={[styles.body, { color: palette.textSecondary }]}>Mỗi lượt sẽ xen kẽ chọn nghĩa và nghe/điền từ. Từ trả lời sai sẽ quay lại trong lượt để bạn củng cố.</Text>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Số từ mỗi lượt</Text>
          <View style={styles.batchRow} accessibilityLabel="Chọn số từ mỗi lượt">
            {ENGLISH_REVIEW_BATCH_SIZES.map(size => {
              const active = settings.reviewBatchSize === size;
              return <Pressable key={size} accessibilityRole="radio" accessibilityState={{ selected: active }} disabled={settingsBusy} onPress={() => void updateSetting({ reviewBatchSize: size })} style={[styles.batchOption, { backgroundColor: active ? palette.primary : palette.surface, borderColor: active ? palette.primary : palette.border }]}><Text style={{ color: active ? "#fff" : palette.textPrimary, fontSize: 18, fontWeight: "900" }}>{size}</Text></Pressable>;
            })}
          </View>
          <Text style={[styles.bodySmall, { color: palette.textMuted }]}>
            {dueCount === 0 ? "Hiện chưa có từ đến hạn." : `Lượt này ôn tối đa ${Math.min(settings.reviewBatchSize, dueCount)} từ; từ còn lại được giữ cho lượt tiếp theo.`}
          </Text>
          <PrimaryButton
            label={dueCount ? `Ôn ${Math.min(settings.reviewBatchSize, dueCount)} từ ngay` : "Chưa có từ đến hạn"}
            disabled={!dueCount || settingsBusy}
            onPress={() => void startRound()}
          />
          <PrimaryButton label="Ôn bằng flashcard · tự đánh giá" variant="ghost" disabled={!dueCount || settingsBusy} onPress={() => router.push({ pathname: '/english/review', params: { legacy: 'true', mode: 'MEANING', ...(deckId ? { deckId } : {}), ...(quick ? { quick: '1' } : {}), ...(visualPreview ? { preview: 'true' } : {}) } } as Href)} />
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backAction}><Text style={{ color: palette.textSecondary, fontWeight: "700" }}>Quay lại</Text></Pressable>
      </Screen>
    );
  }

  if (phase === "EMPTY") {
    return <Screen title="Ôn tập tiếng Anh"><View style={[styles.setupCard, { backgroundColor: palette.surface, borderColor: palette.border }]}><Text accessibilityRole="header" style={[styles.completionTitle, { color: palette.textPrimary }]}>Không còn từ đến hạn</Text><Text style={{ color: palette.textSecondary, lineHeight: 23 }}>Bạn đã hoàn thành các từ đang đến hạn trong bộ này. Các từ khác được giữ nguyên lịch ôn.</Text><PrimaryButton label="Về kế hoạch học" onPress={() => router.push("/english/activity" as Href)} /></View></Screen>;
  }

  if (phase === "COMPLETE") {
    return (
      <Screen hideHeader>
        <View testID="english-review-complete" style={[styles.completeScreen, { backgroundColor: palette.background }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng kết quả ôn tập" onPress={() => router.back()} style={styles.closeAction}><Ionicons name="close" size={26} color={palette.textMuted} /></Pressable>
          <View style={[styles.celebrationGraphic, { backgroundColor: palette.primaryLight }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.bar, { height: 26, backgroundColor: "#F59E0B" }]} />
            <View style={[styles.bar, { height: 54, backgroundColor: "#84CC16" }]} />
            <View style={[styles.bar, { height: 42, backgroundColor: "#14B8A6" }]} />
            <View style={[styles.bar, { height: 74, backgroundColor: palette.primary }]} />
            <View style={[styles.bar, { height: 60, backgroundColor: "#7C3AED" }]} />
            <Ionicons name="trending-up" size={36} color={palette.success} style={{ marginLeft: 5 }} />
            <Ionicons name="star" size={20} color="#FBBF24" style={styles.starIcon} />
          </View>
          <Text accessibilityRole="header" style={[styles.celebrationTitle, { color: palette.textPrimary }]}>{newWordSession ? `Đã học xong ${roundTarget} từ mới!` : "Hoàn thành lượt ôn!"}</Text>
          <View style={styles.scoreRow}><Ionicons name="arrow-up-circle" size={28} color={palette.success} /><Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{reviewedCount} từ đã ôn</Text><Text style={{ color: palette.textMuted }}>·</Text><Text style={{ color: palette.success, fontWeight: "800" }}>{firstPassCorrect} đúng lần đầu</Text></View>
          <View style={[styles.resultCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Tiến trình lượt này</Text>
            <Text style={[styles.progressResult, { color: palette.primary }]}>{roundTarget}/{roundTarget}</Text>
            <View style={[styles.progressTrack, { backgroundColor: palette.surfaceHighlight }]}><View style={[styles.progressFill, { width: "100%", backgroundColor: palette.primary }]} /></View>
            <Text style={{ color: palette.textSecondary, lineHeight: 22 }}>{remainingDue > 0 ? `Bạn còn ${remainingDue} từ cần ôn. Tiến độ của chúng được giữ lại cho lượt tiếp theo.` : "Tuyệt vời — hiện không còn từ nào đến hạn."}</Text>
          </View>
          {newWordSession && deckId ? <PrimaryButton label="Chọn thêm từ mới" onPress={() => router.replace({ pathname: "/english/decks/[id]/learn", params: { id: deckId } } as Href)} /> : null}
          {remainingDue > 0 ? <PrimaryButton label={newWordSession ? `Ôn ${Math.min(settings.reviewBatchSize, remainingDue)} từ đến hạn khác` : `Tiếp tục học · ôn tối đa ${Math.min(settings.reviewBatchSize, remainingDue)} từ`} onPress={() => void startRound()} /> : <PrimaryButton variant={newWordSession ? "secondary" : "primary"} label="Về kế hoạch học" onPress={() => router.push("/english/activity" as Href)} />}
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backAction}><Text style={{ color: palette.textSecondary, fontWeight: "700" }}>Dừng tại đây</Text></Pressable>
        </View>
      </Screen>
    );
  }

  const activeCard = card;
  const currentChoices = choices;
  const answerFill = () => {
    if (!activeCard) return;
    if (!answerText.trim()) return;
    void recordAnswer(isEnglishSpellingCorrect(answerKey, answerText), answerText.trim(), false, measureResponseTime(cardStartedAt.current));
  };
  const selectChoice = () => {
    if (!activeCard || !selectedChoice) return;
    const choice = currentChoices.find(item => item.cardId === selectedChoice);
    if (!choice) return;
    void recordAnswer(choice.correct, choice.meaning, false, measureResponseTime(cardStartedAt.current));
  };
  const dontKnow = () => {
    void recordAnswer(false, "Không biết", false, measureResponseTime(cardStartedAt.current));
  };

  return (
    <Screen hideHeader scroll={false} compact avoidKeyboard safeAreaEdges={["top", "bottom"]}>
      <View style={[styles.reviewRoot, { backgroundColor: palette.background }]}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Thoát lượt ôn" onPress={() => router.back()} style={styles.iconButton}><Ionicons name="close" size={25} color={palette.textPrimary} /></Pressable>
          <Text accessibilityRole="header" style={[styles.topTitle, { color: palette.textPrimary }]}>{newWordSession ? "Học từ mới" : exercise === "CHOICE" ? "Chọn nghĩa chính xác" : "Nghe & hoàn thiện câu"}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cài đặt lượt ôn" onPress={() => setSettingsVisible(true)} style={styles.iconButton}><Ionicons name="options-outline" size={23} color={palette.textPrimary} /></Pressable>
        </View>
        {newWordSession ? <EnglishLearningProgress completed={roundTarget * 2 + progress} total={roundTarget * 3} /> : <View style={styles.progressHeader}>
          <AnimatedProgressBar testID="english-review-progress" progress={roundTarget ? progress / roundTarget : 0} height={12} color={palette.primary} trackColor={palette.surfaceHighlight} accessibilityLabel="Tiến trình lượt ôn" accessibilityValue={{ min: 0, max: roundTarget, now: progress }} />
          <Text testID="english-review-progress-caption" style={[styles.progressCaption, { color: palette.textMuted }]}>{progress}/{roundTarget} · {reviewedCount}/{roundTarget} từ đã gặp · {Math.floor(activeSeconds / 60)}:{String(activeSeconds % 60).padStart(2, "0")}</Text>
        </View>}
        {visualPreview ? <Text testID="english-review-preview-badge" style={{ color: palette.primary, fontSize: 12, fontWeight: "800", textAlign: "center" }}>DỮ LIỆU XEM THỬ · KHÔNG GHI VÀO LỊCH HỌC</Text> : null}

        {error ? <View style={[styles.notice, { borderColor: palette.error, backgroundColor: palette.errorLight }]}><Text accessibilityRole="alert" style={{ color: palette.error, flex: 1 }}>{error}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => { if (pendingAnswer.current) void recordAnswer(pendingAnswer.current.correct, "", true); else void startRound(); }}><Text style={{ color: palette.primary, fontWeight: "800" }}>Thử lại</Text></Pressable></View> : null}

        {activeCard ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.questionContent, compact && styles.questionContentCompact]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <StudyTransition turnKey={`${questionIndex}:${activeCard.id}:${exercise}`} style={[styles.exerciseCard, { backgroundColor: palette.surface, borderColor: palette.border }]} testID="english-review-card">
              <View style={styles.cardMetaRow}>
                <View style={[styles.badge, { backgroundColor: palette.primaryLight }]}><Text style={{ color: palette.primary, fontWeight: "800" }}>{activeCard.pos || "TỪ VỰNG"}</Text></View>
                <Text style={{ color: palette.textMuted }}>{quick ? "ÔN NHANH" : `${Math.min(roundTarget, reviewedCount + 1)}/${roundTarget}`}</Text>
              </View>

              {exercise === "CHOICE" ? (
                <>
                  <Text style={[styles.questionLabel, { color: palette.textSecondary }]}>Chọn nghĩa tiếng Việt đúng</Text>
                  <Text testID="english-review-question" style={[styles.headword, { color: palette.textPrimary }]}>{activeCard.headword}</Text>
                  {activeCard.ipa ? <Text style={[styles.ipa, { color: palette.textMuted }]}>{activeCard.ipa}</Text> : null}
                  <EnglishAudioButton text={activeCard.headword} defaultAccent={context.pronunciationVariant === "en-GB" ? "en-GB" : "en-US"} />
                  <View style={styles.optionsGrid}>
                    {currentChoices.map(choice => {
                      const selected = choice.cardId === selectedChoice;
                      return <MotionPressable key={`${activeCard.id}-${choice.cardId}`} accessibilityRole="radio" accessibilityLabel={choice.meaning} accessibilityState={{ checked: selected, selected }} disabled={busy} onPress={() => setSelectedChoice(choice.cardId)} style={[styles.option, { backgroundColor: selected ? palette.primaryLight : palette.surface, borderColor: selected ? palette.primary : palette.border }]}><Text style={{ color: palette.textPrimary, fontSize: compact ? 16 : 18, fontWeight: selected ? "800" : "600", textAlign: "center" }}>{choice.meaning}</Text></MotionPressable>;
                    })}
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.questionLabel, { color: palette.textSecondary }]}>Nghe từ, rồi điền vào câu</Text>
                  <View style={[styles.audioPrompt, { backgroundColor: palette.surfaceSubtle, borderColor: palette.border }]}>
                    <Text style={[styles.audioPromptTitle, { color: palette.textPrimary }]}>{cloze ? "Câu ví dụ" : "Từ cần ôn"}</Text>
                    {cloze ? <Text testID="english-review-cloze" style={[styles.clozeText, { color: palette.textPrimary }]}>{cloze.sentence}</Text> : <Text style={[styles.body, { color: palette.textSecondary }]}>Từ này chưa có câu ví dụ được lưu. Nghe phát âm, dựa vào nghĩa và điền từ.</Text>}
                    <Text style={[styles.meaningCue, { color: palette.textMuted }]}>Nghĩa: {activeCard.meaning_vi}</Text>
                    <EnglishAudioButton text={activeCard.headword} defaultAccent={context.pronunciationVariant === "en-GB" ? "en-GB" : "en-US"} />
                  </View>
                  <TextInput
                    accessibilityLabel="Điền từ tiếng Anh còn thiếu"
                    testID="english-review-answer"
                    value={answerText}
                    onChangeText={setAnswerText}
                    placeholder="Nhập từ còn thiếu"
                    placeholderTextColor={palette.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={answerFill}
                    editable={!busy}
                    style={[styles.answerInput, { backgroundColor: palette.surface, color: palette.textPrimary, borderColor: palette.border }]}
                  />
                  {hintVisible ? <StudyTransition turnKey={`${questionIndex}:hint`} effect="reveal" animateOnMount accessibilityLiveRegion="polite" style={[styles.hintCard, { backgroundColor: palette.primaryLight }]}><Text style={{ color: palette.primary, fontWeight: "900" }}>Gợi ý</Text><Text style={[styles.hintText, { color: palette.textPrimary }]}>{maskedAnswer(answerKey)}</Text></StudyTransition> : null}
                  <View style={styles.hintActions}>
                    <Pressable accessibilityRole="button" onPress={openHint} disabled={hintVisible || busy} style={[styles.secondaryAction, { borderColor: palette.border }]}><Text style={{ color: palette.primary, fontWeight: "800" }}>{hintVisible ? "Đã hiện gợi ý" : "Gợi ý"}</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={dontKnow} disabled={busy} style={[styles.secondaryAction, { borderColor: palette.border }]}><Text style={{ color: palette.error, fontWeight: "800" }}>Không biết</Text></Pressable>
                  </View>
                </>
              )}
            </StudyTransition>
            <PrimaryButton label="Kiểm tra" disabled={busy || (exercise === "CHOICE" ? !selectedChoice : !answerText.trim())} onPress={exercise === "CHOICE" ? selectChoice : answerFill} />
          </ScrollView>
        ) : <View style={styles.center}><ActivityIndicator color={palette.primary} /><Text style={{ color: palette.textSecondary }}>Đang chuẩn bị câu tiếp theo…</Text></View>}
      </View>

      <Modal visible={!!feedback} transparent animationType={modalAnimation} onRequestClose={dismissFeedback}>
        <View style={styles.sheetOverlay}>
          <Pressable accessibilityLabel="Đóng phản hồi" onPress={dismissFeedback} style={styles.scrim} />
          <ScrollView style={[styles.feedbackSheet, { backgroundColor: palette.surface, borderColor: palette.border }]} contentContainerStyle={styles.feedbackContent} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            {feedback ? <StudyTransition turnKey={`${questionIndex}:${feedback.card.id}:${feedback.correct}`} effect={feedback.correct ? 'success' : 'error'} durationMs={feedback.correct ? 280 : 240} animateOnMount testID="english-answer-feedback" accessibilityLiveRegion="polite" style={[styles.feedbackHeader, { borderColor: palette.border }]}><Ionicons name={feedback.correct ? "checkmark-circle" : "refresh-outline"} size={34} color={feedback.correct ? palette.success : palette.error} /><Text accessibilityRole="header" style={{ color: feedback.correct ? palette.success : palette.error, fontSize: 22, fontWeight: "900" }}>{feedback.correct ? "Chính xác!" : "Cùng xem lại nhé"}</Text></StudyTransition> : null}
            {feedback ? <>
              {!feedback.correct ? <Text style={{ color: palette.textSecondary }}>Bạn đã trả lời: {feedback.answer}</Text> : null}
              <View style={styles.resultLabels}><Text style={[styles.resultBadge, { backgroundColor: palette.surfaceSubtle, color: palette.primary }]}>{feedback.card.pos || "TỪ VỰNG"}</Text><Text style={[styles.resultBadge, { backgroundColor: palette.surfaceSubtle, color: palette.textSecondary }]}>{feedback.exercise === "CHOICE" ? "CHỌN NGHĨA" : "NGHE & ĐIỀN"}</Text></View>
              <Text style={[styles.feedbackWord, { color: palette.textPrimary }]}>{feedback.answer === "Không biết" || !feedback.correct ? (feedback.exercise === "LISTEN_CLOZE" ? answerKeyForFeedback(feedback) : feedback.card.headword) : feedback.card.headword}</Text>
              {feedback.card.ipa ? <Text style={[styles.ipa, { color: palette.textMuted }]}>{feedback.card.ipa}</Text> : null}
              <EnglishAudioButton text={feedback.card.headword} defaultAccent={context.pronunciationVariant === "en-GB" ? "en-GB" : "en-US"} />
              <View style={[styles.definitionCard, { backgroundColor: palette.surfaceSubtle }]}><Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{feedback.card.meaning_vi}</Text>{feedback.card.notes ? <Text style={{ color: palette.textSecondary, lineHeight: 21 }}>{feedback.card.notes.split("\n[4Chinese English context v1]\n")[0]}</Text> : null}</View>
              <Text style={{ color: palette.textMuted, lineHeight: 20 }}>{feedback.correct ? "Tiến trình tăng một bước màu xanh." : `Đáp án: ${feedback.exercise === "LISTEN_CLOZE" ? answerKeyForFeedback(feedback) : feedback.card.headword}. Tiến trình lùi một bước; từ này sẽ quay lại để ôn thêm.`}</Text>
              <View style={styles.feedbackActions}><Pressable accessibilityRole="button" disabled={busy} onPress={repeatFeedbackCard} style={[styles.repeatButton, { borderColor: palette.border }]}><Text style={{ color: palette.textPrimary, fontWeight: "800", textAlign: "center" }}>Nhắc lại từ này</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => void continueAfterFeedback()} style={[styles.continueButton, { backgroundColor: palette.primary }]}><Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>Tiếp tục</Text></Pressable></View>
            </> : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={settingsVisible} transparent animationType={modalAnimation} onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.sheetOverlay}><Pressable accessibilityLabel="Đóng cài đặt" onPress={() => setSettingsVisible(false)} style={styles.scrim} /><ScrollView style={[styles.settingsSheet, { backgroundColor: palette.surface, borderColor: palette.border }]} contentContainerStyle={{ gap: 15 }}><View style={styles.handle} /><View style={styles.settingsHeading}><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Cài đặt lượt ôn</Text><Text style={{ color: palette.textMuted }}>Số từ chọn được áp dụng từ lượt kế tiếp.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setSettingsVisible(false)} style={styles.iconButton}><Ionicons name="close" size={23} color={palette.textPrimary} /></Pressable></View>
          <Text style={{ color: palette.textPrimary, fontWeight: "900" }}>Số từ mỗi lượt</Text><View style={styles.batchRow}>{ENGLISH_REVIEW_BATCH_SIZES.map(size => <Pressable key={size} accessibilityRole="radio" accessibilityState={{ selected: settings.reviewBatchSize === size }} disabled={settingsBusy} onPress={() => void updateSetting({ reviewBatchSize: size })} style={[styles.batchOption, { backgroundColor: settings.reviewBatchSize === size ? palette.primary : palette.surface, borderColor: settings.reviewBatchSize === size ? palette.primary : palette.border }]}><Text style={{ color: settings.reviewBatchSize === size ? "#fff" : palette.textPrimary, fontSize: 18, fontWeight: "900" }}>{size}</Text></Pressable>)}</View>
          <SettingSwitch label="Trộn thứ tự ở lượt mới" value={settings.shuffleOnStart} onChange={value => void updateSetting({ shuffleOnStart: value })} palette={palette} />
          <SettingSwitch label="Tự phát âm khi hiện câu nghe" value={settings.autoPlayOnShow} onChange={value => void updateSetting({ autoPlayOnShow: value })} palette={palette} />
          <SettingSwitch label="Hiện câu ngữ cảnh đã lưu" value={settings.showContext !== false} onChange={value => void updateSetting({ showContext: value })} palette={palette} />
          {settingsMessage ? <Text accessibilityLiveRegion="polite" style={{ color: palette.textSecondary }}>{settingsMessage}</Text> : null}<PrimaryButton label="Xong" onPress={() => setSettingsVisible(false)} /></ScrollView></View>
      </Modal>
    </Screen>
  );
}

function answerKeyForFeedback(feedback: Feedback) {
  const context = readEnglishContext(feedback.card.notes, feedback.card.sense_id);
  return englishClozeForCard(feedback.card, context)?.answer ?? feedback.card.headword;
}

function SettingSwitch({ label, value, onChange, palette }: { label: string; value: boolean; onChange: (value: boolean) => void; palette: ReturnType<typeof getEnglishPalette> }) {
  return <View style={[styles.settingRow, { borderColor: palette.border }]}><Text style={{ flex: 1, color: palette.textPrimary, fontWeight: "700" }}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: palette.primary }} /></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28 },
  setupCard: { borderWidth: 1, borderRadius: 26, padding: 22, gap: 16, marginTop: 10 },
  eyebrow: { fontSize: 13, fontWeight: "900", letterSpacing: 1.1 },
  setupCount: { fontSize: 28, lineHeight: 36, fontWeight: "900" },
  body: { fontSize: 16, lineHeight: 24 },
  bodySmall: { fontSize: 14, lineHeight: 21 },
  sectionTitle: { fontSize: 18, lineHeight: 25, fontWeight: "900" },
  batchRow: { flexDirection: "row", gap: 8 },
  batchOption: { flex: 1, minHeight: 54, borderRadius: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  backAction: { minHeight: 48, justifyContent: "center", alignItems: "center", marginTop: 8 },
  notice: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginVertical: 8 },
  completeScreen: { flex: 1, gap: 18, paddingTop: 6, paddingBottom: 22 },
  completionTitle: { fontSize: 25, lineHeight: 32, fontWeight: "900" },
  closeAction: { alignSelf: "flex-start", width: 44, height: 44, justifyContent: "center" },
  celebrationGraphic: { alignSelf: "center", width: 230, height: 150, borderRadius: 78, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 8, paddingHorizontal: 22, paddingBottom: 28, marginTop: 6 },
  bar: { width: 24, borderRadius: 14 },
  starIcon: { position: "absolute", right: 42, top: 20 },
  celebrationTitle: { textAlign: "center", fontSize: 25, lineHeight: 34, fontWeight: "900", paddingHorizontal: 8 },
  scoreRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8 },
  resultCard: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  progressResult: { fontSize: 27, fontWeight: "900" },
  progressTrack: { height: 12, borderRadius: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 8 },
  reviewRoot: { flex: 1, minHeight: 0 },
  topBar: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "900" },
  progressHeader: { paddingTop: 6, paddingBottom: 10, gap: 7 },
  progressCaption: { fontSize: 12, textAlign: "center", fontWeight: "700" },
  questionContent: { gap: 14, paddingBottom: 18, paddingTop: 8 },
  questionContentCompact: { paddingTop: 4 },
  exerciseCard: { borderWidth: 1, borderRadius: 24, padding: 20, gap: 13, alignItems: "center" },
  cardMetaRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36 },
  badge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  questionLabel: { textAlign: "center", fontSize: 16, lineHeight: 23, fontWeight: "700" },
  headword: { width: "100%", textAlign: "center", fontSize: 34, lineHeight: 42, fontWeight: "900" },
  ipa: { fontSize: 17, lineHeight: 24, textAlign: "center" },
  optionsGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  option: { width: "48%", minHeight: 88, flexGrow: 1, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  audioPrompt: { width: "100%", borderWidth: 1, borderRadius: 18, padding: 16, gap: 12, alignItems: "center" },
  audioPromptTitle: { fontSize: 15, fontWeight: "900" },
  clozeText: { fontSize: 21, lineHeight: 30, fontWeight: "800", textAlign: "center" },
  meaningCue: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  answerInput: { width: "100%", minHeight: 56, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, fontSize: 18 },
  hintCard: { width: "100%", borderRadius: 14, padding: 13, gap: 5 },
  hintText: { fontSize: 20, letterSpacing: 2, fontWeight: "900" },
  hintActions: { width: "100%", flexDirection: "row", gap: 10 },
  secondaryAction: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 8 },
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.50)" },
  scrim: { ...StyleSheet.absoluteFill },
  feedbackSheet: { maxHeight: "86%", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 20 },
  feedbackContent: { paddingBottom: 24, gap: 16 },
  handle: { alignSelf: "center", width: 54, height: 6, borderRadius: 6, backgroundColor: "#94A3B8", marginTop: 10 },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 14, borderBottomWidth: 1 },
  resultLabels: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  resultBadge: { overflow: "hidden", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, fontWeight: "800" },
  feedbackWord: { fontSize: 31, lineHeight: 39, fontWeight: "900" },
  definitionCard: { width: "100%", borderRadius: 16, padding: 15, gap: 7 },
  feedbackActions: { flexDirection: "row", gap: 10, marginTop: 3 },
  repeatButton: { flex: 1, minHeight: 58, borderRadius: 15, borderWidth: 1.5, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  continueButton: { flex: 1, minHeight: 58, borderRadius: 15, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  settingsSheet: { maxHeight: "88%", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 26 },
  settingsHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
});
