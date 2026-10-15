import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { HanziHandwritingPad } from "@/components/HanziHandwritingPad";
import { PersonalContextCard } from '@/components/PersonalContextCard';
import { PinyinHanziComposer } from "@/components/PinyinHanziComposer";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StudySettingsSheet } from "@/components/StudySettingsSheet";
import { resolveReviewSelection, reviewModeForTurn } from "@/components/review/review-selection";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { radius, spacing, themedCard } from "@/constants/design";
import { getOfflineVocabulary } from "@/db/database";
import { recordLessonActivityEvidence } from '@/db/learning-path';
import {
  getProgress,
  getSettings,
  markVocabularyNeedsReinforcement,
  reviewWord,
  saveSettings,
} from "@/db/repository";
import { contextCloze, listVocabularyContexts } from '@/db/vocabulary-context';
import { useStudySession } from "@/hooks/use-study-session";
import {
  speakChinese,
  stopChineseSpeech,
} from "@/services/audio/chinese-speech";
import { playFeedback } from "@/services/feedback/feedback-service";
import { normalizeQuickSessionMinutes } from "@/services/learning/next-best-action";
import type { PinyinHanziCandidate } from "@/services/pinyin-ime/candidateSearch";
import { evaluateComposeAnswer } from "@/services/pinyin-ime/composeAnswer";
import { contextualReviewPrompt } from "@/services/review/contextual-prompt";
import { exerciseForReviewMode } from "@/services/review/exercise";
import { normalizeReviewAttempt } from "@/services/review/exercise-attempt";
import {
  buildInterleavedReviewQueue,
  emptyWordReviewState,
  hasPassedWord,
  recordReviewAttempt,
  type WordReviewState,
} from "@/services/review/interleaved-session";
import { buildReviewMeaningOptions, buildReviewPinyinOptions, type ReviewChoiceCandidate } from "@/services/review/meaning-options";
import type { ReviewLevelChange } from "@/services/review/result-summary";
import { applyReview, formatDueInterval } from "@/services/srs/scheduler";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";
import { visualModePresentation } from "@/theme/visual-modes";
import type {
  ProgressRow,
  ReviewMode,
  ReviewRating,
  UserSettings,
} from "@/types/models";

const ratingMeta: [ReviewRating, string][] = [
  ["again", "Quên"],
  ["hard", "Khó"],
  ["good", "Nhớ"],
  ["easy", "Dễ"],
];

function ratingColor(theme: ThemeTokens, rating: ReviewRating) {
  switch (rating) {
    case "again": return theme.error;
    case "hard": return theme.warning;
    case "good": return theme.success;
    case "easy": return theme.primaryText;
  }
}

const writingModes = new Set<ReviewMode>([
  "meaning-hanzi",
  "pinyin-hanzi",
  "audio-hanzi",
  "writing",
  "cloze",
]);

function secondsSince(startedAt: number): number {
  return Math.max(0, Math.min(43_200, Math.round((Date.now() - startedAt) / 1_000)));
}

export default function ReviewSession() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const db = useSQLiteContext();
  const { mode: requestedMode, lessonActivityId, quickSessionMinutes: requestedQuickMinutes, quickStartedAt } = useLocalSearchParams<{ mode?: string; lessonActivityId?: string; quickSessionMinutes?: string; quickStartedAt?: string }>();
  const quickMinutes = normalizeQuickSessionMinutes(requestedQuickMinutes);
  const source = useAppStore((state) => state.reviewQueue);
  const completeStudySession = useStudySession(db, source.length ? "review" : undefined);
  const clear = useAppStore((state) => state.clearSession);
  const setLastReviewedWord = useAppStore((state) => state.setLastReviewedWord);
  const [queue] = useState(() => buildInterleavedReviewQueue(source));
  const [index, setIndex] = useState(0);
  const [wordStates, setWordStates] = useState<Record<string, WordReviewState>>(
    {},
  );
  const [answerMethod, setAnswerMethod] = useState<"handwriting" | "pinyin">(
    "handwriting",
  );
  const [recognizedHanzi, setRecognizedHanzi] = useState("");
  const [practicePinyin, setPracticePinyin] = useState<string | null>(null);
  const [practiceMeaning, setPracticeMeaning] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [pinyinQuery, setPinyinQuery] = useState("");
  const [selectedHanzi, setSelectedHanzi] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<
    PinyinHanziCandidate[]
  >([]);
  const [composeSubmitted, setComposeSubmitted] = useState(false);
  const [composeHintVisible, setComposeHintVisible] = useState(false);
  const [selectedCandidateRank, setSelectedCandidateRank] = useState<
    number | null
  >(null);
  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [personalContextState,setPersonalContextState] = useState<{wordId:string;ready:boolean;sentence:string|null}|null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    up: 0,
    same: 0,
    down: 0,
    deep: 0,
  });
  const [meaningDistractorPool, setMeaningDistractorPool] = useState<ReviewChoiceCandidate[]>([]);
  // Immutable bundled vocabulary supplies real distractors even if a custom
  // deck is tiny or the SQLite lookup is temporarily unavailable.
  const offlineChoiceCatalog = useMemo(() => getOfflineVocabulary().map(({ id, primaryMeaningVi, pinyin, hskBand }) => ({ id, primaryMeaningVi, pinyin, hskBand })), []);
  const choiceCatalog = useMemo(() => [...meaningDistractorPool, ...offlineChoiceCatalog], [meaningDistractorPool, offlineChoiceCatalog]);
  const [meaningPoolBand, setMeaningPoolBand] = useState<string | null>(null);
  const [levelChanges, setLevelChanges] = useState<ReviewLevelChange[]>([]);
  const [wrongInSession, setWrongInSession] = useState(0);
  const started = useRef(0);
  const sessionStartedAt = useRef(0);
  useEffect(() => { sessionStartedAt.current = Date.now(); }, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const setGlobalSettings = useAppStore((state) => state.setSettings);
  const entry = queue[index];
  const word = entry?.word;

  useEffect(() => {
    if (!word) return;
    // Start the response timer when the new question is mounted, not when a
    // later keystroke or candidate selection occurs.
    started.current = Date.now();
    Promise.all([getProgress(db, word.id), getSettings(db)]).then(
      ([nextProgress, nextSettings]) => {
        setProgress(nextProgress);
        setSettings(nextSettings);
        setGlobalSettings(nextSettings);
        setFeedback(null);
      },
    );
  }, [db, index, setGlobalSettings, word]);

  useEffect(() => {
    if (!word) return;
    let active = true;
    void listVocabularyContexts(db,word.id,20).then(rows => {
      const selected = rows.find(row => contextCloze(row.sentence,[word.simplified,word.traditional]) !== null);
      if (active) setPersonalContextState({wordId:word.id,ready:true,sentence:selected?.sentence ?? null});
    }).catch(() => {
      // A local context lookup failure safely falls back to the bundled example.
      if (active) setPersonalContextState({wordId:word.id,ready:true,sentence:null});
    });
    return () => { active = false; };
  },[db,index,word]);

  const selection = resolveReviewSelection(requestedMode);
  const requested = reviewModeForTurn(selection, source.findIndex(item => item.id === word?.id), entry?.pass ?? 1);
  const personalContextReady = !!word && personalContextState?.wordId === word.id && personalContextState.ready;
  const contextualPrompt = word && personalContextReady
    ? contextualReviewPrompt(personalContextState?.sentence ?? null,word.examples.map(item=>item.chinese),[word.simplified,word.traditional])
    : null;
  // Contextual review uses a user-selected local encounter first, then an
  // existing bundled sentence, and otherwise falls back to the normal prompt.
  const hasContextualPrompt = contextualPrompt?.source !== 'FALLBACK';
  const mode = requested === "cloze" && personalContextReady && !hasContextualPrompt
    ? "meaning-hanzi" : requested;
  const visualMode = visualModePresentation(theme, "REVIEW");
  const exercise = exerciseForReviewMode(mode);
  const needsWriting = writingModes.has(mode);
  const meaningBand = word ? String(word.hskBand) : null;

  useEffect(() => {
    if (meaningBand === null) return;
    const band = meaningBand;
    if (meaningPoolBand === band) return;
    let active = true;
    void db.getAllAsync<ReviewChoiceCandidate>(
      `SELECT v.id,v.primary_meaning_vi AS primaryMeaningVi,v.pinyin,v.hsk_band AS hskBand
       FROM vocabulary v
       WHERE trim(v.primary_meaning_vi)<>''
         AND (v.deck_id IS NULL OR EXISTS (
           SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL
         ))
       ORDER BY CASE WHEN v.hsk_band=? THEN 0 ELSE 1 END,
         COALESCE(v.frequency_rank,999999),v.pinyin_numeric,v.id
       LIMIT 160`,
      band,
    ).then(rows => {
      if (!active) return;
      setMeaningDistractorPool(rows);
      setMeaningPoolBand(band);
    }).catch(() => {
      if (!active) return;
      setMeaningDistractorPool([]);
      setMeaningPoolBand(band);
    });
    return () => { active = false; };
  }, [db, meaningBand, meaningPoolBand, mode]);

  useEffect(() => {
    if (!word || !settings) return;
    if (
      mode !== "hanzi-recall-pinyin-compose" &&
      settings.soundEnabled && (exercise.playsAudio || (selection !== "mixed" && mode !== "hanzi-pinyin" && settings.autoPlayAudio))
    ) {
      // Audio is intentionally played only when the card changes, not on each
      // render, so the session remains responsive and quiet while choosing.
      void speakChinese(word.simplified, { rate: settings.speechRate });
      return () => {
        void stopChineseSpeech();
      };
    }
  }, [exercise.playsAudio, mode, selection, settings, word]);

  const pinyinOptions = useMemo(() => {
    if (!word) return [];
    return buildReviewPinyinOptions(word, queue.map(item => item.word), choiceCatalog);
  }, [choiceCatalog, queue, word]);

  const meaningOptions = useMemo(() => {
    if (!word) return [];
    return buildReviewMeaningOptions(
      word,
      queue.map(item => item.word),
      choiceCatalog,
    );
  }, [choiceCatalog, queue, word]);
  const meaningOptionsLoading = Boolean(meaningBand && meaningPoolBand !== meaningBand);

  const intervals = useMemo(
    () =>
      ratingMeta.map(([rating]) => {
        if (!progress) return "30 phút";
        const result = applyReview(progress, {
          correct: rating !== "again",
          rating,
          hintUsed: usedHint,
          responseTimeMs: 8_000,
        });
        return formatDueInterval(result.nextReviewAt);
      }),
    [usedHint, progress],
  );

  useEffect(() => {
    if (!word && queue.length === 0) router.replace("/review");
  }, [queue.length, word]);

  if (!word) return null;

  const submittedHanzi =
    answerMethod === "pinyin" ? selectedHanzi : recognizedHanzi;
  const normalizedHanzi = submittedHanzi.trim().replace(/\s+/g, "");
  const expectedHanzi = word.simplified.trim().replace(/\s+/g, "");
  const traditionalHanzi = word.traditional.trim().replace(/\s+/g, "");
  const expectedScript =
    settings?.simplifiedOrTraditional === "traditional"
      ? traditionalHanzi
      : expectedHanzi;
  const hanziComplete =
    Array.from(normalizedHanzi).length >= Array.from(expectedHanzi).length;
  const hanziCorrect =
    hanziComplete &&
    (normalizedHanzi === expectedHanzi || normalizedHanzi === traditionalHanzi);
  const pinyinCorrect = practicePinyin === word.pinyin.trim();
  const meaningCorrect = practiceMeaning === word.primaryMeaningVi.trim();
  const composeOutcome = composeSubmitted
    ? evaluateComposeAnswer(expectedScript, selectedHanzi, usedHint)
    : null;
  const composeCorrect =
    composeOutcome === "SUCCESS" || composeOutcome === "ASSISTED";
  const answerVisible =
    mode === "hanzi-recall-pinyin-compose"
      ? composeSubmitted || composeHintVisible
      : Boolean(showAnswer || recognizedHanzi);
  const responseComplete =
    mode === "hanzi-recall-pinyin-compose"
      ? composeSubmitted
      : showAnswer ||
        (mode === "hanzi-meaning" || mode === "audio-meaning"
          ? Boolean(practiceMeaning)
          : mode === "hanzi-pinyin"
            ? Boolean(practicePinyin)
            : mode === "meaning-hanzi"
              ? Boolean(hanziComplete)
              : mode === "pinyin-hanzi" || mode === "audio-hanzi"
                ? Boolean(hanziComplete)
                : Boolean(hanziComplete));
  const answerCorrect =
    mode === "hanzi-recall-pinyin-compose"
      ? composeCorrect
      : !showAnswer &&
        (() => {
          switch (mode) {
            case "hanzi-meaning":
            case "audio-meaning":
              return meaningCorrect;
            case "hanzi-pinyin":
              return pinyinCorrect;
            case "meaning-hanzi":
              return hanziCorrect;
            case "pinyin-hanzi":
            case "audio-hanzi":
              return hanziCorrect;
            case "writing":
            case "cloze":
              return hanziCorrect;
            default:
              return false;
          }
        })();

  const resetResponse = () => {
    setRecognizedHanzi("");
    setPracticePinyin(null);
    setPracticeMeaning(null);
    setShowAnswer(false);
    setUsedHint(false);
    setPinyinQuery("");
    setSelectedHanzi("");
    setSelectedCandidates([]);
    setComposeSubmitted(false);
    setComposeHintVisible(false);
    setSelectedCandidateRank(null);
    setAnswerMethod("handwriting");
    setFeedback(null);
  };

  const rate = async (rating: ReviewRating) => {
    if (saving || !responseComplete) return;
    setSaving(true);
    if (rating === "again") {
      await markVocabularyNeedsReinforcement(db, word.id);
    }
    const passedAttempt = answerCorrect && rating !== "again" && !usedHint;
    const previousState = wordStates[word.id] ?? emptyWordReviewState();
    const nextWordState = recordReviewAttempt(
      previousState,
      passedAttempt,
      elapsedMs(started.current),
    );
    const nextWordStates = { ...wordStates, [word.id]: nextWordState };
    setWordStates(nextWordStates);
    if (!passedAttempt) setWrongInSession((value) => value + 1);

    let nextStats = stats;
    let nextLevelChanges = levelChanges;
    if (nextWordState.attempts >= 3) {
      const passedWord = hasPassedWord(nextWordState);
      const normalizedAttempt = normalizeReviewAttempt({
        correct: passedWord,
        hintUsed: false,
        responseTimeMs: nextWordState.responseTimeMs / 3,
        attemptCount: nextWordState.attempts,
        exerciseType: exercise.type,
      });
      const result = await reviewWord(
        db,
        word.id,
        {
          correct: normalizedAttempt.correct,
          rating: passedWord ? (rating === "easy" ? "easy" : "good") : "again",
          hintUsed: normalizedAttempt.hintUsed,
          responseTimeMs: normalizedAttempt.responseTimeMs,
          typedPinyin: answerMethod === "pinyin" ? pinyinQuery : undefined,
          selectedHanzi: submittedHanzi || undefined,
          candidateRank:
            answerMethod === "pinyin"
              ? (selectedCandidates.at(-1)?.candidateRank ??
                selectedCandidateRank ??
                undefined)
              : undefined,
        },
        mode,
      );
      if (!result) {
        setFeedback(
          "Từ này không còn đến hạn hoặc đã được cập nhật ở nơi khác.",
        );
        setSaving(false);
        return;
      }
      if (lessonActivityId) void recordLessonActivityEvidence(db, lessonActivityId, "REVIEW_ATTEMPT_RECORDED", word.id).catch(() => undefined);
      nextStats = {
        correct: stats.correct + (passedWord ? 1 : 0),
        wrong: stats.wrong + (passedWord ? 0 : 1),
        up: stats.up + (result.direction === "up" ? 1 : 0),
        same: stats.same + (result.direction === "same" ? 1 : 0),
        down: stats.down + (result.direction === "down" ? 1 : 0),
        deep:
          stats.deep +
          (result.memoryLevel === 6 && result.levelBefore < 6 ? 1 : 0),
      };
      setStats(nextStats);
      nextLevelChanges = [
        ...levelChanges,
        {
          id: word.id,
          hanzi: expectedScript,
          pinyin: word.pinyin,
          meaning: word.primaryMeaningVi,
          levelBefore: result.levelBefore,
          levelAfter: result.memoryLevel,
          nextReviewAt: result.nextReviewAt,
          direction: result.direction,
        },
      ];
      setLevelChanges(nextLevelChanges);
    }
    void playFeedback(passedAttempt ? 'success' : 'error', { hapticEnabled: settings?.hapticEnabled, soundEnabled: settings?.soundEnabled });
    if (index >= queue.length - 1) {
      setLastReviewedWord(word, expectedScript);
      completeStudySession();
      clear();
      router.replace(
        `/review/result?total=${source.length}&correct=${nextStats.correct}&wrong=${nextStats.wrong}&up=${nextStats.up}&same=${nextStats.same}&down=${nextStats.down}&deep=${nextStats.deep}&elapsedSeconds=${secondsSince(sessionStartedAt.current)}&changes=${encodeURIComponent(JSON.stringify(nextLevelChanges))}${quickMinutes == null ? "" : `&quickSessionMinutes=${quickMinutes}&quickStartedAt=${encodeURIComponent(quickStartedAt ?? "")}`}`,
      );
      return;
    }
    setIndex((value) => value + 1);
    resetResponse();
    setProgress(null);
    setSaving(false);
  };

  const chooseHanzi = (value: string) => {
    setRecognizedHanzi(value.trim().replace(/\s+/g, ""));
    setPracticePinyin(null);
    setPracticeMeaning(null);
    setShowAnswer(false);
    setFeedback(null);
  };

  const chooseComposeCandidate = (candidate: PinyinHanziCandidate) => {
    const value =
      settings?.simplifiedOrTraditional === "traditional"
        ? candidate.word.traditional
        : candidate.word.simplified;
    setSelectedHanzi((current) => {
      // Whole-word candidates replace a partial fallback; single characters
      // append, enabling the explicit per-character composition path.
      if (!current || Array.from(value).length > 1) return value;
      return `${current}${value}`;
    });
    setSelectedCandidateRank(candidate.candidateRank);
    setSelectedCandidates((current) => [
      ...current.filter((item) => item.word.id !== candidate.word.id),
      candidate,
    ]);
    setPinyinQuery("");
    setComposeSubmitted(false);
    setFeedback(null);
  };

  const deleteLastComposeCharacter = () => {
    setSelectedHanzi((current) => Array.from(current).slice(0, -1).join(""));
    setComposeSubmitted(false);
    setFeedback(null);
  };

  const clearCompose = () => {
    setSelectedHanzi("");
    setPinyinQuery("");
    setSelectedCandidates([]);
    setSelectedCandidateRank(null);
    setComposeSubmitted(false);
    setFeedback(null);
  };

  const checkCompose = () => {
    if (!selectedHanzi.trim()) return;
    const outcome = evaluateComposeAnswer(
      expectedScript,
      selectedHanzi,
      usedHint,
    );
    setComposeSubmitted(true);
    setFeedback(
      outcome !== "FAIL"
        ? outcome === "ASSISTED"
          ? "Đúng có gợi ý · lượt này giữ nguyên cấp."
          : "Chính xác! Bạn đã chọn đúng chữ Hán."
        : "Chưa đúng. Đáp án đã hiện để bạn ghi nhớ và ôn lại sớm hơn.",
    );
    void playFeedback(outcome !== "FAIL" ? 'success' : 'error', { hapticEnabled: settings?.hapticEnabled, soundEnabled: settings?.soundEnabled });
  };

  const revealAnswer = () => {
    if (mode === "hanzi-recall-pinyin-compose") {
      setUsedHint(true);
      setComposeHintVisible(true);
      setFeedback(
        "Gợi ý: pinyin đầy đủ đã hiện. Nếu chọn đúng, lượt này được ghi nhận là ASSISTED.",
      );
      return;
    }
    setUsedHint(true);
    setShowAnswer(true);
    setPracticePinyin(null);
    setPracticeMeaning(null);
    setFeedback("Đáp án đã hiện. Lượt này được ghi nhận là cần ôn lại sớm.");
  };

  const updateSettings = async (patch: Partial<UserSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setGlobalSettings(next);
    await saveSettings(db, next);
  };

  const sessionProgress = Math.max(
    0,
    Math.min(1, index / Math.max(1, queue.length) - wrongInSession * 0.03),
  );
  const example = word.examples[0];

  if (requested === 'cloze' && !personalContextReady) return <Screen title="Đang chuẩn bị câu ôn" subtitle="Đang kiểm tra ngữ cảnh riêng lưu trên thiết bị.">
    <View style={themedCard(theme)}><ActivityIndicator color={theme.primary}/></View>
  </Screen>;

  return (
    <Screen>
      <View style={styles.top}>
        <Text style={styles.counter}>
          {index + 1} / {queue.length}
        </Text>
        <AnimatedProgressBar progress={sessionProgress} color={visualMode.accent} trackColor={theme.border} accessibilityLabel={"Ti\u1ebfn \u0111\u1ed9 bu\u1ed5i \u00f4n"} style={styles.progressTrack} />
        <Text style={styles.level}>Cấp {progress?.memoryLevel ?? 1}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở cài đặt ôn tập"
          onPress={() => setSettingsOpen(true)}
          hitSlop={10}
          style={styles.gear}
        >
          <Ionicons
            name="settings-outline"
            size={21}
            color={theme.textMuted}
          />
        </Pressable>
      </View>
      <Text style={styles.progressLabel}>
        Lượt {entry.pass}/3 của từ này · các lượt được xen kẽ với từ khác · sai
        sẽ hạ cấp
      </Text>

      <View style={[themedCard(theme), styles.challengeHeader]}>
        <Text style={styles.challengeLabel}>
          ÔN TẬP · LƯỢT {entry.pass}/3 · {exercise.label}
        </Text>
        {mode === "hanzi-meaning" ? (
          <>
            <Text style={styles.sourceHanzi}>{word.simplified}</Text>
            {meaningCorrect && !showAnswer ? (
              <PinyinText value={word.pinyin} visible style={styles.answerPinyin} />
            ) : null}
          </>
        ) : mode === "pinyin-hanzi" ? (
          <PinyinText value={word.pinyin} visible style={styles.sourcePinyin} />
        ) : mode === "hanzi-recall-pinyin-compose" ? (
          <>
            <Text style={styles.sourceHanzi}>{expectedScript}</Text>
            <Text style={styles.challengePrompt}>{word.primaryMeaningVi}</Text>
          </>
        ) : mode === "audio-meaning" || mode === "audio-hanzi" ? (
          <AudioButton text={word.simplified} size={34} allowWhenSoundDisabled />
        ) : mode === "hanzi-pinyin" ? (
          <Text style={styles.sourceHanzi}>{word.simplified}</Text>
        ) : mode === "cloze" ? (
          <Text style={styles.challengePrompt}>
            {contextualPrompt?.prompt ?? example?.chinese?.replace(word.simplified, "＿＿＿＿") ??
              "Điền từ còn thiếu vào câu"}
          </Text>
        ) : (
          <>
            <Text style={styles.challengePrompt}>{word.primaryMeaningVi}</Text>
            {mode === "writing" ? (
              <PinyinText value={word.pinyin} visible style={styles.sourcePinyin} />
            ) : null}
          </>
        )}
        <Text style={styles.challengeHint}>{exercise.prompt}</Text>
      </View>

      <PersonalContextCard key={`${word.id}:${index}`} vocabularyId={word.id}
        answers={[word.simplified,word.traditional]} reveal={showAnswer}
        onHint={() => setUsedHint(true)} />

      {mode === "hanzi-recall-pinyin-compose" ? (
        <>
          <View style={[themedCard(theme), styles.composeCard]}>
            <Text style={styles.composeInstruction}>
              Hãy nhớ cách đọc và gõ Pinyin:
            </Text>
            {composeHintVisible || composeSubmitted ? (
              <View style={styles.revealedPinyin}>
                <PinyinText value={word.pinyin} visible style={styles.sourcePinyin} />
                <AudioButton text={word.simplified} size={30} />
              </View>
            ) : null}
          </View>
          <View style={[themedCard(theme), styles.composerCard]}>
            <PinyinHanziComposer
              db={db}
              disabled={composeSubmitted || saving}
              onClear={clearCompose}
              onDeleteLast={deleteLastComposeCharacter}
              onHint={revealAnswer}
              onPinyinChange={(value) => {
                setPinyinQuery(value);
                setComposeSubmitted(false);
                setFeedback(null);
              }}
              onSelectCandidate={chooseComposeCandidate}
              pinyinQuery={pinyinQuery}
              scriptMode={settings?.simplifiedOrTraditional ?? "simplified"}
              selectedHanzi={selectedHanzi}
              targetWord={word}
            />
            <PrimaryButton
              disabled={!selectedHanzi.trim() || composeSubmitted || saving}
              label="Kiểm tra"
              onPress={checkCompose}
            />
          </View>
          {composeSubmitted ? (
            <View style={[themedCard(theme), styles.composeResult]}>
              <Text
                style={answerCorrect ? styles.feedbackGood : styles.feedbackBad}
              >
                {answerCorrect
                  ? composeOutcome === "ASSISTED"
                    ? "✓ Đúng có gợi ý · ASSISTED"
                    : "✓ Chính xác"
                  : "✗ Chưa đúng"}
              </Text>
              <Text style={styles.resultHanzi}>{expectedScript}</Text>
              <PinyinText value={word.pinyin} visible style={styles.resultPinyin} />
              <Text style={styles.resultMeaning}>{word.primaryMeaningVi}</Text>
              {!answerCorrect ? (
                <Text style={styles.feedbackBad}>
                  Bạn đã chọn: {selectedHanzi}
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      {needsWriting ? (
        <View style={[themedCard(theme), styles.methodCard]}>
          <Text style={styles.challengeLabel}>CHỌN CÁCH TRẢ LỜI</Text>
          <View style={styles.methodRow}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: answerMethod === "handwriting" }}
              onPress={() => {
                setAnswerMethod("handwriting");
                setSelectedHanzi("");
                setPinyinQuery("");
                setFeedback(null);
              }}
              style={[
                styles.methodButton,
                answerMethod === "handwriting" && styles.methodButtonActive,
              ]}
            >
              <Ionicons
                name="brush-outline"
                size={19}
                color={answerMethod === "handwriting" ? theme.onPrimary : theme.primaryText}
              />
              <Text
                style={[
                  styles.methodText,
                  answerMethod === "handwriting" && styles.methodTextActive,
                ]}
              >
                Tự viết Hán tự
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: answerMethod === "pinyin" }}
              onPress={() => {
                setAnswerMethod("pinyin");
                setRecognizedHanzi("");
                setFeedback(null);
              }}
              style={[
                styles.methodButton,
                answerMethod === "pinyin" && styles.methodButtonActive,
              ]}
            >
              <Ionicons
                name="keypad-outline"
                size={19}
                color={answerMethod === "pinyin" ? theme.onPrimary : theme.primaryText}
              />
              <Text
                style={[
                  styles.methodText,
                  answerMethod === "pinyin" && styles.methodTextActive,
                ]}
              >
                Nhập pinyin
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {needsWriting && answerMethod === "handwriting" ? (
        <View style={[themedCard(theme), styles.padCard]}>
          <HanziHandwritingPad
            key={`${word.id}-${mode}-${entry.pass}`}
            characterCount={Array.from(expectedHanzi).length}
            targetWord={expectedScript}
            onSelect={chooseHanzi}
            onHintUsed={() => {
              setUsedHint(true);
              setFeedback(
                "Đã mở một nét gợi ý mờ. Lượt này vẫn tiếp tục để bạn tự hoàn thành chữ.",
              );
            }}
          />
          {answerVisible ? (
            <View style={styles.answerCheck}>
              <Text style={styles.challengeLabel}>CHỮ ĐÃ CHỌN</Text>
              <Text style={styles.recognizedHanzi}>
                {showAnswer ? expectedScript : submittedHanzi}
              </Text>
              {entry.pass === 1 && hanziCorrect && !showAnswer ? (
                <PinyinText value={word.pinyin} visible style={styles.answerPinyin} />
              ) : null}
              <Text
                style={
                  hanziCorrect && !showAnswer
                    ? styles.feedbackGood
                    : styles.feedbackBad
                }
              >
                {showAnswer
                  ? `Đáp án: ${expectedScript}`
                  : hanziCorrect
                    ? "Đúng chữ."
                    : hanziComplete
                      ? "Chữ chưa khớp; hãy xóa nét và viết lại."
                      : "Đã chọn chưa đủ chữ; hãy viết tiếp."}
              </Text>
              <AudioButton text={word.simplified} />
            </View>
          ) : null}
        </View>
      ) : null}

      {needsWriting && answerMethod === "pinyin" ? (
        <View style={[themedCard(theme), styles.composerCard]}>
          <Text style={styles.optionHint}>
            Gõ pinyin để chọn ứng viên của app, hoặc bật bàn phím Pinyin tiếng
            Trung và chọn Hán tự ngay trên bàn phím.
          </Text>
          <PinyinHanziComposer
            key={`${word.id}-${entry.pass}`}
            db={db}
            disabled={saving || showAnswer}
            onClear={clearCompose}
            onDeleteLast={deleteLastComposeCharacter}
            onHint={revealAnswer}
            onPinyinChange={(value) => {
              const directHanzi = value.replace(/\s+/g, "");
              if (/[\u3400-\u9fff]/u.test(directHanzi)) {
                setSelectedHanzi(
                  Array.from(directHanzi)
                    .slice(0, Array.from(expectedScript).length)
                    .join(""),
                );
                setPinyinQuery("");
              } else {
                setPinyinQuery(value);
              }
              setFeedback(null);
            }}
            onSelectCandidate={chooseComposeCandidate}
            pinyinQuery={pinyinQuery}
            scriptMode={settings?.simplifiedOrTraditional ?? "simplified"}
            selectedHanzi={selectedHanzi}
            targetWord={word}
          />
        </View>
      ) : null}

      {(mode === "hanzi-meaning" || mode === "audio-meaning") && !showAnswer ? (
        <OptionCard
          label="CHỌN NGHĨA ĐÚNG"
          options={meaningOptions}
          loading={meaningOptionsLoading}
          selected={practiceMeaning}
          onSelect={(value) => {
            setPracticeMeaning(value);
            setFeedback(null);
          }}
          correctValue={word.primaryMeaningVi.trim()}
          correct={meaningCorrect}
        />
      ) : null}
      {mode === "hanzi-pinyin" && !showAnswer ? (
        <OptionCard
          label="CHỌN PINYIN ĐÚNG"
          options={pinyinOptions}
          selected={practicePinyin}
          onSelect={(value) => {
            setPracticePinyin(value);
            setFeedback(null);
          }}
          pinyin
          correctValue={word.pinyin.trim()}
          loading={meaningOptionsLoading}
          correct={pinyinCorrect}
        />
      ) : null}
      {needsWriting &&
      (mode === "writing" || mode === "cloze") &&
      answerVisible &&
      !showAnswer ? (
        <View style={styles.selectedSummary}>
          <Text style={styles.optionHint}>
            Bạn đã viết lại từ. Xác nhận để chấm lượt ôn này.
          </Text>
        </View>
      ) : null}

      {mode !== "hanzi-recall-pinyin-compose" &&
      !answerVisible &&
      !practicePinyin &&
      !practiceMeaning ? (
        <View style={styles.actions}>
          {!(needsWriting && answerMethod === "handwriting") ? (
            <PrimaryButton
              variant="secondary"
              label="Gợi ý"
              onPress={revealAnswer}
            />
          ) : null}
          <PrimaryButton
            variant={
              needsWriting && answerMethod === "handwriting"
                ? "secondary"
                : undefined
            }
            label={
              needsWriting && answerMethod === "handwriting"
                ? "Bỏ cuộc · xem đáp án"
                : "Xem đáp án"
            }
            onPress={revealAnswer}
          />
        </View>
      ) : null}

      {feedback ? <Text style={styles.feedbackMessage}>{feedback}</Text> : null}
      {responseComplete ? (
        <View style={[themedCard(theme), styles.ratingsCard]}>
          {answerCorrect ? (
            <>
              <Text style={styles.ratingTitle}>
                Chính xác · lượt {entry.pass}/3
              </Text>
              <Text style={styles.optionHint}>
                {usedHint
                  ? "Lượt có gợi ý chưa được tính là pass; từ này vẫn tiếp tục xuất hiện trong buổi ôn."
                  : entry.pass < 3
                    ? "Xác nhận để cất từ này xuống hàng đợi; app sẽ trộn các từ khác trước khi hỏi lại."
                    : "Nếu cả ba lượt đều đúng, từ mới được tăng cấp và lưu lịch ôn tiếp theo."}
              </Text>
              {settings?.reviewStyle === "automatic" ? (
                <View style={styles.autoRatings}>
                  <PrimaryButton
                    variant="danger"
                    label="Chưa nhớ"
                    disabled={saving}
                    onPress={() => void rate("again")}
                    style={styles.autoButton}
                  />
                  <PrimaryButton
                    label="Đã nhớ"
                    disabled={saving}
                    onPress={() => void rate("good")}
                    style={styles.autoButton}
                  />
                </View>
              ) : (
                <View style={styles.ratings}>
                  {ratingMeta.slice(1).map(([rating, label], i) => (
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving}
                      key={rating}
                      onPress={() => void rate(rating)}
                      style={[styles.rating, { borderColor: ratingColor(theme, rating) }]}
                    >
                      <Text style={[styles.ratingLabel, { color: ratingColor(theme, rating) }]}>
                        {label}
                      </Text>
                      <Text style={styles.interval}>
                        {entry.pass < 3
                          ? `lượt ${entry.pass}/3`
                          : intervals[i + 1]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.ratingTitle, styles.feedbackBad]}>
                Chưa chính xác
              </Text>
              <Text style={styles.optionHint}>
                Từ vẫn được trộn để hỏi đủ ba lượt, nhưng kết quả cuối sẽ hạ cấp
                và xếp lịch ôn sớm hơn.
              </Text>
              <PrimaryButton
                variant="danger"
                label="Ghi nhận sai · ôn lại sớm"
                disabled={saving}
                onPress={() => void rate("again")}
              />
            </>
          )}
        </View>
      ) : null}

      <StudySettingsSheet
        visible={settingsOpen}
        settings={settings}
        mode="review"
        onClose={() => setSettingsOpen(false)}
        onChange={(patch) => void updateSettings(patch)}
      />
    </Screen>
  );
}

function OptionCard({
  label,
  options,
  selected,
  onSelect,
  pinyin = false,
  correctValue,
  correct,
  loading = false,
}: {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  pinyin?: boolean;
  correctValue: string;
  correct: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <View style={[themedCard(theme), styles.challengeSection]}>
      <Text style={styles.challengeLabel}>{label}</Text>
      <View style={pinyin ? styles.pinyinOptions : styles.challengeOptions}>
        {loading ? (
          <View style={styles.optionLoading}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.optionHint}>Đang chuẩn bị đủ 4 đáp án…</Text>
          </View>
        ) : options.length !== 4 ? (
          <Text style={styles.optionHint}>
            Chưa đủ dữ liệu để tạo 4 đáp án riêng biệt. Hãy xem đáp án để tiếp tục.
          </Text>
        ) : options.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selected === option }}
            accessibilityLabel={option}
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.challengeOption,
              pinyin && styles.pinyinOption,
              selected === option && styles.challengeOptionActive,
              selected === option && (correct ? styles.correct : styles.wrong),
              selected &&
                option !== selected &&
                option === correctValue &&
                styles.correct,
            ]}
          >
            {pinyin ? (
              <PinyinText value={option} visible numberOfLines={1} />
            ) : (
              <Text style={styles.optionText}>{option}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function elapsedMs(start: number): number {
  return Math.max(0, Date.now() - start);
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    top: {
      marginTop: spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    counter: { color: theme.textMuted, fontWeight: "700", minWidth: 40 },
    progressTrack: {
      flex: 1,
      height: 8,
      borderRadius: 99,
      backgroundColor: theme.border,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 99,
      backgroundColor: theme.primary,
    },
    level: { color: theme.warning, fontWeight: "900" },
    gear: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    progressLabel: {
      color: theme.textMuted,
      fontSize: 11,
      textAlign: "center",
      marginTop: -spacing.md,
    },
    challengeHeader: { alignItems: "center", gap: spacing.sm },
    composeCard: { alignItems: "center", gap: spacing.sm },
    composeInstruction: {
      color: theme.textSecondary,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    revealedPinyin: { alignItems: "center", gap: spacing.xs },
    composerCard: { gap: spacing.md },
    composeResult: { alignItems: "center", gap: spacing.xs },
    methodCard: { gap: spacing.sm },
    methodRow: { flexDirection: "row", gap: spacing.sm },
    methodButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.primaryText,
      backgroundColor: theme.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
    },
    methodButtonActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    methodText: { color: theme.primaryText, fontSize: 12, fontWeight: "900" },
    methodTextActive: { color: theme.onPrimary },
    resultHanzi: { color: theme.textPrimary, fontSize: 42, fontWeight: "900" },
    resultPinyin: { fontSize: 24 },
    resultMeaning: { color: theme.textPrimary, fontSize: 18, fontWeight: "700" },
    challengeLabel: {
      color: theme.primaryText,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.8,
      textAlign: "center",
    },
    challengePrompt: {
      color: theme.textPrimary,
      fontSize: 25,
      fontWeight: "900",
      textAlign: "center",
    },
    sourceHanzi: {
      color: theme.textPrimary,
      fontSize: 54,
      fontWeight: "900",
      textAlign: "center",
    },
    sourcePinyin: { fontSize: 25 },
    challengeHint: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
    },
    padCard: { alignItems: "center", gap: spacing.sm },
    answerCheck: { alignItems: "center", gap: spacing.sm },
    answerPinyin: { fontSize: 24 },
    recognizedHanzi: {
      color: theme.textPrimary,
      fontSize: 48,
      fontWeight: "900",
      textAlign: "center",
    },
    challengeStatus: { fontSize: 13, lineHeight: 19, textAlign: "center" },
    feedbackGood: { color: theme.success },
    feedbackBad: { color: theme.error },
    challengeSection: { gap: spacing.sm },
    challengeOptions: { gap: spacing.sm },
    optionLoading: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: spacing.sm },
    pinyinOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    pinyinOption: {
      flexBasis: "47%",
      flexGrow: 1,
      minWidth: 130,
      paddingHorizontal: spacing.sm,
    },
    challengeOption: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.md,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    challengeOptionActive: {
      borderColor: theme.primaryText,
      backgroundColor: theme.primarySoft,
    },
    optionText: { color: theme.textPrimary, fontSize: 15, fontWeight: "600" },
    optionHint: { color: theme.textMuted, fontSize: 12, lineHeight: 18 },
    correct: { borderColor: theme.success, backgroundColor: theme.successSoft },
    wrong: { borderColor: theme.error, backgroundColor: theme.errorSoft },
    actions: { gap: spacing.sm },
    feedbackMessage: {
      color: theme.textSecondary,
      textAlign: "center",
      fontSize: 13,
      lineHeight: 19,
    },
    selectedSummary: { alignItems: "center" },
    ratingsCard: { gap: spacing.sm },
    ratingTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: "900",
      textAlign: "center",
    },
    autoRatings: { flexDirection: "row", gap: spacing.sm },
    autoButton: { flex: 1 },
    ratings: { flexDirection: "row", gap: spacing.xs },
    rating: {
      flex: 1,
      minHeight: 72,
      borderRadius: radius.md,
      borderWidth: 1.5,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    ratingLabel: { fontSize: 12, fontWeight: "900" },
    interval: {
      color: theme.textMuted,
      fontSize: 10,
      marginTop: 3,
      textAlign: "center",
    },
  });
}
