import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
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
import { EnglishEmptyState } from "@/components/english/EnglishEmptyState";
import { EmptyReviewIllustration } from "@/components/english/EnglishIllustrations";
import { EnglishQuickDictionary } from "@/components/english/EnglishQuickDictionary";
import { EnglishReviewFlow } from "@/components/english/EnglishReviewFlow";
import { FlashcardFlip } from "@/components/ui/FlashcardFlip";
import { StudyTransition } from "@/components/ui/StudyTransition";
import { englishDemoCards } from "@/data/english-preview-fixtures";
import { defaultEnglishFlashcardSettings, readEnglishFlashcardSettings, saveEnglishFlashcardSettings, type EnglishFlashcardSettings } from "@/db/english/flashcard-settings";
import {
  englishDueQueue,
  englishQuickQueue,
  reviewEnglishCard,
  type EnglishCard,
} from "@/db/english/learner";
import { useModalAnimationType } from "@/hooks/use-reduced-motion";
import { shuffleEnglishQueue } from "@/services/english/flashcards";
import { readEnglishContext } from "@/services/english/reading-context";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import type { LearningSessionContext } from "@/services/languages/config";
import { englishLocalId } from "@/services/languages/ids";
import { useLanguageProtection } from "@/services/languages/use-language-protection";
import { ActiveStudyClock } from "@/services/review/active-study-clock";
import { isEnglishSpellingCorrect } from "@/services/review/english-spelling";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export default function EnglishReviewRoute() {
  const params = useLocalSearchParams<{
    mode?: string;
    quick?: string;
    deckId?: string;
    preview?: string;
    flow?: string;
    legacy?: string;
    learn?: string;
  }>();
  const previewLegacy = params.preview === "true" && params.flow !== "true";
  if (params.legacy === "true" || previewLegacy) return <LegacyEnglishReview />;
  return (
    <EnglishReviewFlow
      mode={typeof params.mode === "string" ? params.mode : undefined}
      quick={params.quick === "1"}
      deckId={typeof params.deckId === "string" ? params.deckId : undefined}
      preview={params.preview === "flow" || params.flow === "true"}
      learn={typeof params.learn === "string" ? params.learn : undefined}
    />
  );
}

function LegacyEnglishReview() {
  const db = useEnglishDatabase();
  const { preferences } = useLearningLanguage();
  const theme = useTheme();
  const { width: viewportWidth, fontScale } = useWindowDimensions();
  const isDark = theme.mode === "dark";
  const compactLayout = viewportWidth < 380 || fontScale >= 1.3;
  const palette = getEnglishPalette(isDark);
  const modalAnimation = useModalAnimationType();

  const params = useLocalSearchParams<{ mode?: string; quick?: string; deckId?: string; preview?: string }>();
  const deckId = typeof params.deckId === "string" ? params.deckId : undefined;
  const [quick] = useState(() => params.quick === "1");
  const [mode, setMode] = useState<"MEANING" | "SPELLING" | "LISTENING">(() =>
    params.mode === "SPELLING" || params.mode === "LISTENING" ? params.mode : "MEANING",
  );

  const [spelling, setSpelling] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const [flashcardSettings, setFlashcardSettings] = useState<EnglishFlashcardSettings>(defaultEnglishFlashcardSettings);
  const flashcardSettingsRef = useRef<EnglishFlashcardSettings>(defaultEnglishFlashcardSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [dictionaryVisible, setDictionaryVisible] = useState(false);
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [queue, setQueue] = useState<EnglishCard[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [reverseMeaning, setReverseMeaning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const [clock] = useState(() => new ActiveStudyClock());
  const [activeMs, setActiveMs] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [nextDueDates, setNextDueDates] = useState<string[]>([]);
  const [screenFocused, setScreenFocused] = useState(false);
  const operation = useRef("");
  const pendingAnswer = useRef<{
    correct: boolean;
    responseTimeMs: number;
  } | null>(null);
  const [canRetrySave, setCanRetrySave] = useState(false);
  const [showDemoPreview, setShowDemoPreview] = useState(
    () => __DEV__ && params.preview === "true",
  );

  const [context] = useState<LearningSessionContext>(() => ({
    learningLanguage: "en",
    uiLocale: "vi",
    pronunciationVariant: preferences.englishVariant,
    sessionId: englishLocalId("session"),
  }));

  useEffect(() => {
    let live = true;
    void readEnglishFlashcardSettings(db)
      .then((settings) => {
        if (!live) return;
        flashcardSettingsRef.current = settings;
        setFlashcardSettings(settings);
      })
      .catch(() => {
        if (live) setSettingsMessage("Cài đặt flashcard chưa tải được; đang dùng tùy chọn mặc định cho phiên này.");
      })
      .finally(() => { if (live) setSettingsLoaded(true); });
    return () => { live = false; };
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      clock.setFocused(true);
      setScreenFocused(true);
      return () => { clock.setFocused(false); setScreenFocused(false); void Speech.stop(); };
    }, [clock]),
  );

  useEffect(() => {
    clock.setForeground(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (state) => {
      clock.setForeground(state === "active");
      if (state !== 'active') void Speech.stop();
    });
    const interval = setInterval(
      () => setActiveMs(clock.snapshot().activeMs),
      1000,
    );
    return () => {
      clearInterval(interval);
      subscription.remove();
      clock.setForeground(false);
    };
  }, [clock]);

  const load = async () => {
    clock.setRunning(false);
    setLoading(true);
    setError("");
    try {
      const rows = quick
        ? await englishQuickQueue(db, new Date(), completed, deckId)
        : await englishDueQueue(db, new Date(), 10, deckId);
      setQueue(flashcardSettingsRef.current.shuffleOnStart ? shuffleEnglishQueue(rows) : rows);
      clock.nextCard();
      clock.setRunning(rows.length > 0);
      operation.current = englishLocalId("operation");
      pendingAnswer.current = null;
      setCanRetrySave(false);
      setRevealed(false);
      setSpelling("");
    } catch {
      setError("Không tải được hàng đợi. Dữ liệu của bạn vẫn được giữ nguyên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!settingsLoaded) return;
    let live = true;
    void (quick
      ? englishQuickQueue(db, new Date(), 0, deckId)
      : englishDueQueue(db, new Date(), 10, deckId))
      .then((rows) => {
        if (!live) return;
        setQueue(flashcardSettingsRef.current.shuffleOnStart ? shuffleEnglishQueue(rows) : rows);
        clock.nextCard();
        clock.setRunning(rows.length > 0);
        operation.current = englishLocalId("operation");
        setLoading(false);
      })
      .catch(() => {
        if (live) {
          setError(
            "Không tải được hàng đợi. Dữ liệu của bạn vẫn được giữ nguyên.",
          );
          setLoading(false);
        }
      });
    return () => {
      live = false;
      clock.setRunning(false);
    };
  }, [db, quick, clock, deckId, settingsLoaded]);

  const activeQueue = showDemoPreview && !deckId ? englishDemoCards.slice(completed) : queue;
  const card = activeQueue[0];
  const cardId = card?.id;
  const cardHeadword = card?.headword;
  const savedContext = card ? readEnglishContext(card.notes, card.sense_id) : null;

  useEffect(() => {
    if (!settingsLoaded || !flashcardSettings.autoPlayOnShow || !cardHeadword || loading || reverseMeaning || dictionaryVisible || !screenFocused || AppState.currentState !== 'active') return;
    void Speech.stop();
    Speech.speak(cardHeadword, { language: context.pronunciationVariant, rate: 0.9 });
    return () => { void Speech.stop(); };
  }, [cardHeadword, cardId, context.pronunciationVariant, flashcardSettings.autoPlayOnShow, loading, settingsLoaded, reverseMeaning, dictionaryVisible, screenFocused]);

  useEffect(() => {
    if (!revealed || !flashcardSettings.autoPlayOnReveal || !cardHeadword || dictionaryVisible || !screenFocused || AppState.currentState !== 'active') return;
    Speech.speak(cardHeadword, { language: context.pronunciationVariant, rate: 0.9 });
    return () => { void Speech.stop(); };
  }, [revealed, cardHeadword, cardId, flashcardSettings.autoPlayOnReveal, context.pronunciationVariant, dictionaryVisible, screenFocused]);

  const updateFlashcardSetting = async (patch: Partial<EnglishFlashcardSettings>) => {
    const previous = flashcardSettingsRef.current;
    const next = { ...previous, ...patch };
    flashcardSettingsRef.current = next;
    setFlashcardSettings(next);
    setSettingsMessage("");
    try {
      const stored = await saveEnglishFlashcardSettings(db, next);
      flashcardSettingsRef.current = stored;
      setFlashcardSettings(stored);
      setSettingsMessage("Đã lưu trên thiết bị. Trộn thẻ chỉ áp dụng khi tải một phiên mới.");
    } catch {
      flashcardSettingsRef.current = previous;
      setFlashcardSettings(previous);
      setSettingsMessage("Chưa lưu được tùy chọn. Các thẻ và lịch ôn không bị thay đổi.");
    }
  };

  useLanguageProtection("SESSION", loading || busy || queue.length > 0);

  const answer = async (correct: boolean, retry = false) => {
    if (!card || lock.current || loading || (error && !retry)) return;
    if (showDemoPreview) {
      // Visual preview mode: cycle in-memory without database write
      setCompleted((n) => n + 1);
      if (correct) setCorrectCount((n) => n + 1);
      setFeedback(
        mode === "SPELLING"
          ? correct
            ? `Chính tả đúng: ${card.headword}. Kết quả này chỉ nằm trong phiên xem thử.`
            : `Chính tả chưa đúng. Đáp án: ${card.headword} — ${card.meaning_vi}. Kết quả này chỉ nằm trong phiên xem thử.`
          : correct
            ? `Đúng · ${card.headword} — ${card.meaning_vi}`
            : `Đáp án: ${card.headword} — ${card.meaning_vi}. Thẻ cần được ôn lại.`,
      );
      setFeedbackCorrect(correct);
      setRevealed(false);
      setSpelling("");
      return;
    }

    lock.current = true;
    setBusy(true);
    setError("");
    clock.setRunning(false);
    const input = pendingAnswer.current ?? {
      correct,
      responseTimeMs: clock.snapshot().cardMs,
    };
    pendingAnswer.current = input;
    try {
      const result = await reviewEnglishCard(
        db,
        context,
        operation.current,
        card.id,
        card.revision,
        input,
        mode,
      );
      setNextDueDates(values => [...values, result.nextReviewAt]);
      setFeedback(correct
        ? `Đúng · ${card.headword} — ${card.meaning_vi}`
        : `Đáp án: ${card.headword} — ${card.meaning_vi}. Thẻ cần được ôn lại.`);
      setFeedbackCorrect(correct);
      setQueue((rows) => rows.slice(1));
      setCompleted((n) => n + 1);
      if (correct) setCorrectCount((n) => n + 1);
      setRevealed(false);
      if (mode === "SPELLING")
        setFeedback(
          correct
            ? `Chính tả đúng: ${card.headword}. Đã lưu kết quả ôn.`
            : `Chính tả chưa đúng. Đáp án: ${card.headword} — ${card.meaning_vi}. Đã lưu kết quả ôn.`,
        );
      setSpelling("");
      clock.nextCard();
      clock.setRunning(queue.length > 1);
      setActiveMs(clock.snapshot().activeMs);
      operation.current = englishLocalId("operation");
      pendingAnswer.current = null;
      setCanRetrySave(false);
    } catch (failure) {
      setCanRetrySave(
        !(failure instanceof Error && /STALE|NOT_DUE/.test(failure.message)),
      );
      setError(
        failure instanceof Error && /STALE|NOT_DUE/.test(failure.message)
          ? "Thẻ đã thay đổi hoặc không còn đến hạn. Tải lại hàng đợi để tiếp tục."
          : "Chưa lưu được kết quả. Bạn có thể thử lại, không bị ghi trùng.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <Screen
      hideHeader
      title={
        quick
          ? "Ôn nhanh tiếng Anh"
          : mode === "LISTENING"
            ? "Nghe nhận diện từ"
          : mode === "SPELLING"
            ? "Luyện chính tả"
            : "Ôn tập Flashcard"
      }
      subtitle={
        deckId
          ? `Ôn các từ đến hạn trong bộ riêng · ${mode === "SPELLING" ? "viết từ theo nghĩa" : mode === "LISTENING" ? "nghe TTS và nhớ từ" : "ôn ngắt quãng SRS"}`
          : mode === "SPELLING"
          ? "Viết từ tiếng Anh tương ứng với nghĩa đã lưu"
          : mode === "LISTENING"
            ? "Nghe TTS, tự nhớ nghĩa rồi đánh giá câu trả lời"
            : "Ôn tập ngắt quãng SRS theo độ ghi nhớ"
      }
      avoidKeyboard
    >
      {/* Visual QA Preview Toggle */}
      {__DEV__ && showDemoPreview ? (
        <View style={styles.demoBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bật chế độ thử nghiệm ôn tập có thẻ"
            onPress={() => setShowDemoPreview((v) => !v)}
            style={[
              styles.demoButton,
              {
                backgroundColor: showDemoPreview ? palette.primary : palette.surfaceSubtle,
                borderColor: palette.primary,
              },
            ]}
          >
            <Ionicons
              name={showDemoPreview ? "eye" : "eye-outline"}
              size={14}
              color={showDemoPreview ? "#FFFFFF" : palette.primary}
            />
            <Text
              style={[
                styles.demoButtonText,
                { color: showDemoPreview ? "#FFFFFF" : palette.primary },
              ]}
            >
              {showDemoPreview ? "Đang bật: PREVIEW DATA (3 thẻ mẫu)" : "Bật Preview Data để kiểm tra Flashcard"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Progress & Session Stats Bar */}
      <View
        style={[
          styles.sessionBar,
          compactLayout && styles.sessionBarCompact,
          {
            backgroundColor: isDark ? "#172338" : "#FFFFFF",
            borderColor: isDark ? "#25334D" : "#E2E8F0",
          },
        ]}
      >
        <View style={styles.sessionStat}>
          <Ionicons name="layers-outline" size={16} color={palette.primary} />
          <Text style={[styles.sessionStatText, { color: palette.textPrimary }]}>
            {card ? `Còn ${activeQueue.length} thẻ` : "Hoàn tất"}
          </Text>
        </View>

        <View style={[styles.sessionDivider, compactLayout && styles.sessionDividerCompact]} />

        <View style={styles.sessionStat}>
          <Ionicons name="checkmark-done" size={16} color={palette.success} />
          <Text style={[styles.sessionStatText, { color: palette.textPrimary }]}>
            {completed} đã ôn ({correctCount} đúng)
          </Text>
        </View>

        <View style={[styles.sessionDivider, compactLayout && styles.sessionDividerCompact]} />

        <View style={styles.sessionStat}>
          <Ionicons name="time-outline" size={16} color={palette.review} />
          <Text style={[styles.sessionStatText, { color: palette.textPrimary }]}>
            {Math.floor(activeMs / 1000)}s
          </Text>
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={() => setSettingsVisible(true)} style={[styles.settingsAction, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Ionicons name="settings-outline" size={17} color={palette.primary} />
        <Text style={{ color: palette.primary, fontWeight: "800" }}>Cài đặt flashcard</Text>
      </Pressable>

      <View style={styles.modeRow} accessibilityLabel="Chọn cách ôn tiếng Anh">
        {([
          ["MEANING", "Ôn nghĩa"],
          ["SPELLING", "Chính tả"],
          ["LISTENING", "Nghe"],
        ] as const).map(([value, label]) => {
          const active = mode === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setMode(value);
                setRevealed(false);
                setSpelling("");
                setFeedback("");
                setFeedbackCorrect(null);
              }}
              style={[
                styles.modeChip,
                { backgroundColor: active ? palette.primary : palette.surface, borderColor: active ? palette.primary : palette.border },
              ]}
            >
              <Text style={{ color: active ? "#FFFFFF" : palette.textPrimary, fontWeight: "700" }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {card && mode !== "SPELLING" && (mode !== "LISTENING" || revealed) ? (
        <Pressable accessibilityRole="button" onPress={() => { clock.setRunning(false); setDictionaryQuery(card.headword); setDictionaryVisible(true); }} style={[styles.settingsAction, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={{ color: palette.primary, fontWeight: "800" }}>Tra từ điển: {card.headword}</Text>
        </Pressable>
      ) : null}

      {/* Loading state */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Đang tải hàng đợi thẻ ôn…
          </Text>
        </View>
      ) : null}

      {/* Error state */}
      {error ? (
        <View style={[styles.alertCard, { backgroundColor: palette.errorLight, borderColor: palette.error }]}>
          <Ionicons name="alert-circle" size={20} color={palette.error} />
          <Text style={[styles.alertText, { color: palette.error }]}>{error}</Text>
          <Pressable
            onPress={() => {
              if (canRetrySave && pendingAnswer.current) {
                void answer(pendingAnswer.current.correct, true);
              } else {
                void load();
              }
            }}
            style={[styles.smallButton, { backgroundColor: palette.error }]}
          >
            <Text style={styles.smallButtonText}>
              {canRetrySave ? "Thử lưu lại" : "Tải lại hàng đợi"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Feedback message (for spelling mode) */}
      {feedback && card ? (
        <StudyTransition turnKey={`${completed}:${feedback}`} effect={feedbackCorrect ? 'success' : 'error'} durationMs={feedbackCorrect ? 280 : 240} animateOnMount accessibilityLiveRegion="polite" style={[styles.feedbackBanner, {
          backgroundColor: feedbackCorrect ? palette.successLight : palette.errorLight,
          borderColor: feedbackCorrect ? palette.success : palette.error,
        }]}>
          <Ionicons
            name={feedbackCorrect ? "checkmark-circle-outline" : "refresh-circle-outline"}
            size={18}
            color={feedbackCorrect ? palette.success : palette.error}
          />
          <Text style={[styles.feedbackText, { color: feedbackCorrect ? palette.success : palette.error }]}>{feedback}</Text>
        </StudyTransition>
      ) : null}

      {/* EMPTY REVIEW STATE */}
      {!loading && !error && !card && completed > 0 ? (
        <View testID="english-review-complete" style={[styles.completionCard, { backgroundColor: isDark ? "#172338" : "#FFFFFF", borderColor: palette.success }]}>
          <View style={[styles.cardTypeBadge, { backgroundColor: palette.successLight }]}>
            <Ionicons name="checkmark-done-circle" size={18} color={palette.success} />
            <Text style={[styles.cardTypeBadgeText, { color: palette.success }]}>ĐÃ HOÀN THÀNH</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.completionTitle, { color: palette.textPrimary }]}>
            {quick ? "Hoàn thành phiên ôn nhanh" : "Hoàn thành phiên ôn"}
          </Text>
          <Text style={[styles.completionLead, { color: palette.textSecondary }]}>
            Đã ôn {completed} thẻ · đúng {correctCount} · cần ôn lại {completed - correctCount}
          </Text>
          <View style={styles.completionStats}>
            <View style={[styles.completionStat, { backgroundColor: palette.surfaceSubtle }]}>
              <Text style={[styles.completionValue, { color: palette.primary }]}>{Math.round((correctCount / completed) * 100)}%</Text>
              <Text style={{ color: palette.textMuted }}>{mode === 'SPELLING' ? 'Chính tả đúng' : 'Tự đánh giá nhớ'}</Text>
            </View>
            <View style={[styles.completionStat, { backgroundColor: palette.surfaceSubtle }]}>
              <Text style={[styles.completionValue, { color: palette.review }]}>{Math.floor(activeMs / 1000)}s</Text>
              <Text style={{ color: palette.textMuted }}>Thời gian học</Text>
            </View>
          </View>
          <Text style={[styles.completionFootnote, { color: palette.textMuted }]}>
            {showDemoPreview
              ? "Đây là phiên xem thử; không có kết quả nào được ghi vào dữ liệu học."
              : "Lịch ôn tiếp theo đã được lưu bằng bộ lập lịch hiện tại. Phiên này đã dừng; bạn có thể tiếp tục sau."}
          </Text>
          {nextDueDates.length ? <Text style={{ color: palette.textSecondary }}>Lịch gần nhất đã lưu: {new Date([...nextDueDates].sort()[0]!).toLocaleString('vi-VN')}</Text> : null}
          <PrimaryButton label="Tiếp tục học từ mới" onPress={() => router.navigate("/(tabs)/vocabulary" as Href)} />
          <Pressable accessibilityRole="button" onPress={() => router.push("/english/activity" as Href)} style={styles.stopAction}>
            <Text style={{ color: palette.textSecondary, fontWeight: "700" }}>Dừng tại đây</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && !card && completed === 0 ? (
        <EnglishEmptyState
          illustration={<EmptyReviewIllustration width={150} height={120} />}
          title={quick ? "Đã xong phiên ôn nhanh!" : "Không còn thẻ đến hạn ôn"}
          description={
            quick
              ? "Bạn đã hoàn thành phiên ôn nhanh. Kết quả đã được lưu an toàn trên máy; các thẻ tương lai sẽ xuất hiện đúng lịch."
              : "Thật tuyệt vời! Toàn bộ thẻ trong thư viện đều đang được nhớ tốt. Bạn có thể thêm từ mới hoặc quay lại khi có lịch ôn tiếp theo."
          }
          primaryActionLabel="Mở kho từ vựng tiếng Anh"
          onPrimaryAction={() => router.navigate("/(tabs)/vocabulary" as Href)}
          secondaryActionLabel="Về trang kế hoạch"
          onSecondaryAction={() => router.push("/english/activity" as Href)}
        />
      ) : null}

      {/* ACTIVE CARD: SPELLING REVIEW MODE */}
      {card && !loading && !error && mode === "SPELLING" ? (
        <View
          style={[
            styles.flashcardContainer,
            compactLayout && styles.flashcardContainerCompact,
            {
              backgroundColor: isDark ? "#172338" : "#FFFFFF",
              borderColor: palette.spelling,
            },
          ]}
        >
          {/* Top Mode Badge */}
          <View style={[styles.cardTypeBadge, { backgroundColor: palette.spellingLight }]}>
            <Ionicons name="create-outline" size={14} color={palette.spelling} />
            <Text style={[styles.cardTypeBadgeText, { color: palette.spelling }]}>
              LUYỆN CHÍNH TẢ
            </Text>
          </View>

          <Text style={[styles.spellingPromptLabel, { color: palette.textMuted }]}>
            Nghĩa tiếng Việt đã lưu:
          </Text>
          <Text style={[styles.spellingPromptText, { color: palette.textPrimary }]}>
            {card.meaning_vi}
          </Text>

          <TextInput
            accessibilityLabel="Nhập từ hoặc cụm tiếng Anh chính xác"
            placeholder="Gõ từ hoặc cụm tiếng Anh tại đây…"
            placeholderTextColor={palette.textMuted}
            value={spelling}
            onChangeText={setSpelling}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={300}
            editable={!busy && !loading}
            style={[
              styles.spellingInput,
              {
                color: palette.textPrimary,
                backgroundColor: isDark ? "#0B0F19" : "#F8FAFC",
                borderColor: palette.border,
              },
            ]}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kiểm tra chính tả"
            disabled={busy || loading || !spelling.trim()}
            onPress={() =>
              void answer(isEnglishSpellingCorrect(card.headword, spelling))
            }
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: !spelling.trim() ? palette.surfaceSubtle : palette.spelling,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
            <Text
              style={[
                styles.submitButtonText,
                { color: !spelling.trim() ? palette.textMuted : "#FFFFFF" },
              ]}
            >
              Kiểm tra & Lưu kết quả
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* ACTIVE CARD: MEANING REVIEW MODE (FLASHCARD REVEAL) */}
      {card && mode === 'MEANING' ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setReverseMeaning(value => !value); setRevealed(false); void Speech.stop(); }} style={{ minHeight: 44 }}><Text style={{ color: palette.primary }}>{reverseMeaning ? 'Việt → Anh · đổi chiều' : 'Anh → Việt · đổi chiều'}</Text></Pressable> : null}
      {card && !loading && !error && mode !== "SPELLING" ? (
        <FlashcardFlip revealed={revealed} turnKey={`${card.id}:${mode}:${reverseMeaning}`} testID="english-flashcard-flip">{showAnswer => (
        <View
          style={[
            styles.flashcardContainer,
            compactLayout && styles.flashcardContainerCompact,
            {
              backgroundColor: isDark ? "#172338" : "#FFFFFF",
              borderColor: showAnswer ? palette.primary : (isDark ? "#2A3C59" : "#DBEAFE"),
            },
          ]}
          testID="english-review-card"
        >
          {/* Top Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardTypeBadge, { backgroundColor: palette.primaryLight }]}>
              <Ionicons name="flash-outline" size={14} color={palette.primary} />
              <Text style={[styles.cardTypeBadgeText, { color: palette.primary }]}>
                {quick ? "ÔN NHANH" : mode === "LISTENING" ? "NGHE NHẬN DIỆN" : "FLASHCARD SRS"}
              </Text>
            </View>
            <Text style={[styles.deckHint, { color: palette.textMuted }]}>
              {mode === "LISTENING" ? "Nghe trước · tự đánh giá" : card.notes ? "Có ghi chú" : "Nhớ nghĩa"}
            </Text>
          </View>

          {/* Prompt: English Headword */}
          <Text
            accessibilityRole="header"
            testID="english-review-question"
            style={[styles.headword, { color: palette.textPrimary }]}
          >
            {mode === "LISTENING" && !showAnswer ? "Nghe từ tiếng Anh rồi thử nhớ nghĩa" : reverseMeaning && mode === 'MEANING' && !showAnswer ? card.meaning_vi : card.headword}
          </Text>

          {/* IPA & Pronunciation Audio */}
          {!(reverseMeaning && mode === 'MEANING' && !showAnswer) ? <View style={styles.audioRow}>
            {card.ipa && (mode !== "LISTENING" || showAnswer) ? (
              <Text style={[styles.ipaText, { color: palette.textMuted }]}>
                {card.ipa}
              </Text>
            ) : null}
            <EnglishAudioButton
              key={card.id}
              text={card.headword}
              defaultAccent={
                context.pronunciationVariant === "en-GB" ? "en-GB" : "en-US"
              }
            />
          </View> : null}
          {savedContext && flashcardSettings.showContext && mode === 'MEANING' ? <View style={{ gap: 6 }}><Text style={{ color: palette.textMuted }}>Câu bạn đã đồng ý lưu · {savedContext.sourceTitle}</Text><Text style={{ color: palette.textPrimary }}>{showAnswer ? savedContext.sentence : savedContext.cloze}</Text>{showAnswer ? <Text style={{ color: palette.textSecondary }}>Dạng trong câu: {savedContext.surface}</Text> : null}</View> : null}

          {/* Revealed Answer Area */}
          {showAnswer ? (
            <View
              style={[
                styles.revealedSection,
                {
                  backgroundColor: isDark ? "#121A2B" : "#F8FAFC",
                  borderColor: isDark ? "#25334D" : "#E2E8F0",
                },
              ]}
            >
              <Text style={[styles.meaningLabel, { color: palette.textMuted }]}>
                Nghĩa tiếng Việt:
              </Text>
              <Text style={[styles.meaningText, { color: palette.textPrimary }]}>
                {card.meaning_vi}
              </Text>

              {card.notes ? (
                <Text style={[styles.notesText, { color: palette.textSecondary }]}>
                  {savedContext ? card.notes.split('\n[4Chinese English context v1]\n')[0] : card.notes}
                </Text>
              ) : null}

              {/* Rating Actions: Chưa nhớ (Coral/Red) vs Đã nhớ (Green) */}
              <View style={styles.ratingButtonsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Chưa nhớ từ này"
                  disabled={busy}
                  onPress={() => void answer(false)}
                  style={({ pressed }) => [
                    styles.rateButtonForgot,
                    {
                      backgroundColor: isDark ? "#4C0519" : "#FFF1F2",
                      borderColor: palette.error,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons name="close-circle" size={20} color={palette.error} />
                  <Text style={[styles.rateButtonForgotText, { color: palette.error }]}>
                    Chưa nhớ
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đã nhớ từ này"
                  disabled={busy}
                  onPress={() => void answer(true)}
                  style={({ pressed }) => [
                    styles.rateButtonRemembered,
                    {
                      backgroundColor: palette.success,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.rateButtonRememberedText}>Đã nhớ</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
        )}</FlashcardFlip>
      ) : null}
      {card && !loading && !error && mode !== 'SPELLING' ? <PrimaryButton label={revealed ? 'Xem mặt trước' : 'Hiện nghĩa đã lưu'} variant={revealed ? 'ghost' : 'primary'} disabled={busy} onPress={() => setRevealed(value => !value)} /> : null}
      {settingsVisible ? (
        <Modal visible transparent animationType={modalAnimation} onRequestClose={() => setSettingsVisible(false)}>
          <View style={styles.settingsOverlay}>
            <Pressable accessibilityLabel="Đóng cài đặt flashcard" onPress={() => setSettingsVisible(false)} style={styles.settingsScrim} />
            <ScrollView style={{ maxHeight: '90%' }} contentContainerStyle={[styles.settingsSheet, { backgroundColor: isDark ? "#172338" : "#FFFFFF", borderColor: palette.border }]}>
              <View style={styles.settingsHandle} />
              <View style={styles.settingsTitleRow}>
                <View style={{ flex: 1 }}><Text style={{ color: palette.textPrimary, fontSize: 21, fontWeight: "900" }}>Cài đặt flashcard</Text><Text style={{ color: palette.textMuted, marginTop: 3 }}>Chỉ điều khiển phiên ôn tiếng Anh.</Text></View>
                <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setSettingsVisible(false)} style={styles.settingsClose}><Ionicons name="close" size={22} color={palette.textPrimary} /></Pressable>
              </View>
              <View style={[styles.settingRow, { borderColor: palette.border }]}>
                <View style={{ flex: 1, gap: 4 }}><Text style={{ color: palette.textPrimary, fontWeight: "800" }}>Trộn thứ tự ở phiên mới</Text><Text style={{ color: palette.textMuted, lineHeight: 18 }}>Xáo trộn hàng đợi trong bộ nhớ khi tải phiên; không sửa thứ tự hoặc lịch trong cơ sở dữ liệu.</Text></View>
                <Switch accessibilityLabel="Trộn thứ tự thẻ ở phiên mới" value={flashcardSettings.shuffleOnStart} onValueChange={(value) => void updateFlashcardSetting({ shuffleOnStart: value })} trackColor={{ true: palette.primary }} />
              </View>
              <View style={[styles.settingRow, { borderColor: palette.border }]}>
                <View style={{ flex: 1, gap: 4 }}><Text style={{ color: palette.textPrimary, fontWeight: "800" }}>Tự phát âm khi hiện thẻ</Text><Text style={{ color: palette.textMuted, lineHeight: 18 }}>Dùng giọng đọc TTS của thiết bị; không phải âm thanh thu sẵn trong từ điển.</Text></View>
                <Switch accessibilityLabel="Tự đọc từ bằng TTS khi hiện thẻ" value={flashcardSettings.autoPlayOnShow} onValueChange={(value) => void updateFlashcardSetting({ autoPlayOnShow: value })} trackColor={{ true: palette.primary }} />
              </View>
              <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 17 }}>Không có tự lật, tự chấm “đã nhớ” hay tự chuyển thẻ. Các câu trả lời vẫn cần thao tác rõ ràng của bạn.</Text>
              <View style={styles.settingRow}><Text style={{ color: palette.textPrimary, flex: 1 }}>Phát âm khi hiện đáp án</Text><Switch accessibilityLabel="Phát âm khi hiện đáp án" value={!!flashcardSettings.autoPlayOnReveal} onValueChange={value => void updateFlashcardSetting({ autoPlayOnReveal: value })} /></View>
              <View style={styles.settingRow}><Text style={{ color: palette.textPrimary, flex: 1 }}>Hiện câu ngữ cảnh đã lưu</Text><Switch accessibilityLabel="Hiện câu ngữ cảnh đã lưu" value={flashcardSettings.showContext !== false} onValueChange={value => void updateFlashcardSetting({ showContext: value })} /></View>
              {settingsMessage ? <Text accessibilityLiveRegion="polite" style={{ color: palette.textSecondary }}>{settingsMessage}</Text> : null}
              <Pressable accessibilityRole="button" onPress={() => setSettingsVisible(false)} style={[styles.settingsDone, { backgroundColor: palette.primary }]}><Text style={{ color: "white", fontWeight: "900" }}>Xong</Text></Pressable>
            </ScrollView>
          </View>
        </Modal>
      ) : null}
      {dictionaryVisible ? <EnglishQuickDictionary initialQuery={dictionaryQuery} onClose={() => { setDictionaryVisible(false); if (card) clock.setRunning(true); }} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  demoBar: {
    marginBottom: 10,
  },
  demoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  demoButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sessionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.2,
    marginBottom: 16,
  },
  sessionBarCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  settingsAction: { minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10, paddingHorizontal: 12 },
  settingsOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.38)" },
  settingsScrim: { ...StyleSheet.absoluteFill },
  settingsSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 26, gap: 14 },
  settingsHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 5, backgroundColor: "#94A3B8", marginBottom: 4 },
  settingsTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingsClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  settingRow: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10 },
  settingsDone: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sessionStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    flexShrink: 1,
  },
  sessionStatText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sessionDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(148, 163, 184, 0.3)",
  },
  sessionDividerCompact: {
    width: "100%",
    height: 1,
  },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  modeChip: { minHeight: 42, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderRadius: 22 },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
  },
  completionCard: { borderWidth: 1, borderRadius: 22, padding: 20, gap: 14 },
  completionTitle: { fontSize: 25, lineHeight: 32, fontWeight: "800" },
  completionLead: { fontSize: 16, lineHeight: 23 },
  completionStats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  completionStat: { flexGrow: 1, flexBasis: 95, minHeight: 80, justifyContent: "center", alignItems: "center", padding: 10, borderRadius: 16, gap: 2 },
  completionValue: { fontSize: 22, fontWeight: "800" },
  completionFootnote: { fontSize: 13, lineHeight: 19 },
  stopAction: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  flashcardContainer: {
    width: "100%",
    minWidth: 0,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.8,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    marginVertical: 10,
  },
  flashcardContainerCompact: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  cardTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  cardTypeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  deckHint: {
    fontSize: 12,
    fontWeight: "500",
  },
  headword: {
    width: "100%",
    flexShrink: 1,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  audioRow: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    minWidth: 0,
    gap: 8,
    marginBottom: 24,
  },
  ipaText: {
    width: "100%",
    maxWidth: "100%",
    flexShrink: 1,
    fontSize: 16,
    fontStyle: "italic",
    fontWeight: "500",
    textAlign: "center",
  },
  revealedSection: {
    width: "100%",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.2,
    alignItems: "center",
    gap: 10,
  },
  meaningLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  meaningText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },
  notesText: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  ratingButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
    marginTop: 14,
  },
  rateButtonForgot: {
    flex: 1,
    minWidth: 130,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  rateButtonForgotText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  rateButtonRemembered: {
    flex: 1,
    minWidth: 130,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  rateButtonRememberedText: {
    flexShrink: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  spellingPromptLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  spellingPromptText: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 20,
  },
  spellingInput: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    gap: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
