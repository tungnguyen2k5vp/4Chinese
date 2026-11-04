import { Ionicons } from "@expo/vector-icons";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { HanziHandwritingPad } from "@/components/HanziHandwritingPad";
import { PersonalContextCard } from '@/components/PersonalContextCard';
import { PinyinHanziComposer } from "@/components/PinyinHanziComposer";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QuickSessionTimer } from "@/components/QuickSessionTimer";
import { StudySettingsSheet } from "@/components/StudySettingsSheet";
import { Disclosure } from "@/components/chinese/Disclosure";
import { resolveReviewSelection, reviewModeForTurn } from "@/components/review/review-selection";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { AnswerFeedbackIcon } from "@/components/ui/AnswerFeedbackIcon";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { StudyTransition } from "@/components/ui/StudyTransition";
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
import { listVocabularyContexts } from '@/db/vocabulary-context';
import { useQuickSessionClock } from "@/hooks/use-quick-session-clock";
import { useStudySession } from "@/hooks/use-study-session";
import {
  speakChinese,
  stopChineseSpeech,
} from "@/services/audio/chinese-speech";
import { playFeedback } from "@/services/feedback/feedback-service";
import { normalizeQuickSessionMinutes } from "@/services/learning/next-best-action";
import type { PinyinHanziCandidate } from "@/services/pinyin-ime/candidateSearch";
import { evaluateComposeAnswer } from "@/services/pinyin-ime/composeAnswer";
import { createClozePractice, readLearnedClozeWords, type LearnedClozeWord } from "@/services/review/cloze-contexts";
import { buildClozeQuestion } from "@/services/review/cloze-question";
import { exerciseForReviewMode } from "@/services/review/exercise";
import { normalizeReviewAttempt } from "@/services/review/exercise-attempt";
import {
  buildInterleavedReviewQueue,
  emptyWordReviewState,
  hasPassedWord,
  interleavedReviewInput,
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
]);

function secondsSince(startedAt: number): number {
  return Math.max(0, Math.min(43_200, Math.round((Date.now() - startedAt) / 1_000)));
}

export default function ReviewSession() {
  const theme = useTheme();
  const focused = useIsFocused();
  const styles = useThemeStyles(createStyles);
  const db = useSQLiteContext();
  const { mode: requestedMode, lessonActivityId, quickSessionMinutes: requestedQuickMinutes, quickStartedAt, clozeOmitted } = useLocalSearchParams<{ mode?: string; lessonActivityId?: string; quickSessionMinutes?: string; quickStartedAt?: string; clozeOmitted?: string }>();
  const quickMinutes = normalizeQuickSessionMinutes(requestedQuickMinutes);
  const quickClock = useQuickSessionClock(quickMinutes);
  const readQuickClock = quickClock.read;
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
  const selectedClozeTurn = useRef(-1);
  const [practicePinyin, setPracticePinyin] = useState<string | null>(null);
  const [practiceMeaning, setPracticeMeaning] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [lightHintVisible, setLightHintVisible] = useState(false);
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
  const [progressIssue, setProgressIssue] = useState(false);
  const [progressAttempt, setProgressAttempt] = useState(0);
  const [personalContextState,setPersonalContextState] = useState<{wordId:string;ready:boolean;sentences:string[]}|null>(null);
  const [learnedClozeWords, setLearnedClozeWords] = useState<LearnedClozeWord[] | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saveLock = useRef(false);
  const finishing = useRef(false);
  const submittedTurn = useRef(-1);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
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
  const offlineChoiceCatalog = useMemo(() => getOfflineVocabulary(), []);
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

  const finishSession = useCallback((reason: 'queue' | 'time' | 'stopped', nextStats = stats, nextChanges = levelChanges) => {
    if (finishing.current) return;
    finishing.current = true;
    const lastChange = nextChanges.at(-1);
    const lastWord = source.find(item => item.id === lastChange?.id);
    if (lastWord && lastChange) setLastReviewedWord(lastWord, lastChange.hanzi);
    const elapsed = quickMinutes == null ? secondsSince(sessionStartedAt.current) : readQuickClock().elapsedSeconds;
    completeStudySession();
    clear();
    router.replace(`/review/result?total=${source.length}&correct=${nextStats.correct}&wrong=${nextStats.wrong}&up=${nextStats.up}&same=${nextStats.same}&down=${nextStats.down}&deep=${nextStats.deep}&elapsedSeconds=${elapsed}&changes=${encodeURIComponent(JSON.stringify(nextChanges))}${quickMinutes == null ? '' : `&quickSessionMinutes=${quickMinutes}&quickStartedAt=${encodeURIComponent(quickStartedAt ?? '')}&quickEnd=${reason}`}`);
  }, [clear, completeStudySession, levelChanges, readQuickClock, quickMinutes, quickStartedAt, setLastReviewedWord, source, stats]);

  useEffect(() => {
    // A deadline never interrupts a write. Its resulting counters are rendered
    // before this effect finishes the session, including a final in-flight save.
    if (quickMinutes != null && quickClock.expired && !saving && !saveLock.current && !saveError) finishSession('time');
  }, [finishSession, quickClock.expired, quickMinutes, saveError, saving]);

  useEffect(() => {
    if (!word) return;
    let active = true;
    // Start the response timer when the new question is mounted, not when a
    // later keystroke or candidate selection occurs.
    started.current = Date.now();
    Promise.all([getProgress(db, word.id), getSettings(db)]).then(
      ([nextProgress, nextSettings]) => {
        if (!active) return;
        setProgress(nextProgress);
        setSettings(nextSettings);
        setGlobalSettings(nextSettings);
        setProgressIssue(!nextProgress);
        setFeedback(nextProgress ? null : "Chưa đọc được mức nhớ của từ này. Hãy thử tải lại.");
      },
    ).catch(() => { if (active) { setProgressIssue(true); setFeedback("Chưa tải được mức nhớ. Hãy thử lại trước khi chấm."); } });
    return () => { active = false; };
  }, [db, index, progressAttempt, setGlobalSettings, word]);

  useEffect(() => {
    if (!word) return;
    let active = true;
    void listVocabularyContexts(db,word.id,20).then(rows => {
      if (active) setPersonalContextState({wordId:word.id,ready:true,sentences:rows.map(row => row.sentence)});
    }).catch(() => {
      // A local context lookup failure safely falls back to the bundled example.
      if (active) setPersonalContextState({wordId:word.id,ready:true,sentences:[]});
    });
    return () => { active = false; };
  },[db,index,word]);

  const selection = resolveReviewSelection(requestedMode);
  useEffect(() => {
    if (selection !== 'cloze' && selection !== 'mixed') return;
    let live = true;
    void readLearnedClozeWords(db).then(words => { if (live) setLearnedClozeWords(words); })
      .catch(() => { if (live) setLearnedClozeWords([]); });
    return () => { live = false; };
  }, [db, selection]);
  const clozePractice = useMemo(() => learnedClozeWords ? createClozePractice(offlineChoiceCatalog, [...learnedClozeWords, ...source]) : undefined, [learnedClozeWords, offlineChoiceCatalog, source]);
  const requested = reviewModeForTurn(selection, source.findIndex(item => item.id === word?.id), entry?.pass ?? 1);
  const personalContextReady = !!word && personalContextState?.wordId === word.id && personalContextState.ready && (requested !== 'cloze' || learnedClozeWords !== null);
  const clozeQuestion = requested === 'cloze' && word && personalContextReady
    ? buildClozeQuestion(word, personalContextState?.sentences ?? [], [...source, ...(learnedClozeWords ?? []), ...offlineChoiceCatalog], settings?.simplifiedOrTraditional === 'traditional', clozePractice)
    : null;
  // Mixed practice can choose another multiple-choice task; explicit cloze never changes into writing.
  const mode = requested === 'cloze' && selection === 'mixed' && personalContextReady && !clozeQuestion
    ? 'hanzi-meaning' : requested;
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
      `WITH choice_candidates AS (
       SELECT v.id,v.primary_meaning_vi AS primaryMeaningVi,v.pinyin,v.hsk_band AS hskBand,
         v.frequency_rank,v.pinyin_numeric,
         ROW_NUMBER() OVER (PARTITION BY v.simplified,LOWER(REPLACE(v.pinyin,' ',''))
           ORDER BY CASE WHEN COALESCE(p.studied,0)=1 OR p.status='KNOWN' THEN 0 ELSE 1 END,
             COALESCE(p.memory_level,0) DESC,COALESCE(p.review_count,0) DESC,
             COALESCE(p.updated_at,v.updated_at,v.created_at,'') DESC,v.id) AS identity_rank
       FROM vocabulary v LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
       WHERE trim(v.primary_meaning_vi)<>''
         AND (v.deck_id IS NULL OR EXISTS (
           SELECT 1 FROM personal_deck_vocabulary m JOIN personal_deck d ON d.id=m.deck_id
           WHERE m.vocabulary_id=v.id AND d.deleted_at IS NULL
         ))
       )
       SELECT id,primaryMeaningVi,pinyin,hskBand FROM choice_candidates WHERE identity_rank=1
       ORDER BY CASE WHEN hskBand=? THEN 0 ELSE 1 END,
         COALESCE(frequency_rank,999999),pinyin_numeric,id
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
      mode !== "hanzi-recall-pinyin-compose" && mode !== 'cloze' &&
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
          hintUsed: usedHint || !!(word && wordStates[word.id]?.assistedPasses),
          responseTimeMs: 8_000,
        });
        return formatDueInterval(result.nextReviewAt);
      }),
    [usedHint, progress, word, wordStates],
  );

  useEffect(() => {
    if (!finishing.current && !word && queue.length === 0) router.replace("/review");
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
  const assistedWord = usedHint || !!wordStates[word.id]?.assistedPasses;
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
          : mode === 'cloze'
            ? Boolean(recognizedHanzi)
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
    setLightHintVisible(false);
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
    if (finishing.current || submittedTurn.current === index || saveLock.current || saving || !progress || !responseComplete) return;
    if (quickMinutes != null && quickClock.read().expired && !saveError) { finishSession('time'); return; }
    saveLock.current = true;
    setSaving(true);
    setSaveError(false);
    try {
    if (rating === "again") {
      await markVocabularyNeedsReinforcement(db, word.id);
    }
    const passedAttempt = answerCorrect && rating !== "again";
    const previousState = wordStates[word.id] ?? emptyWordReviewState();
    const nextWordState = recordReviewAttempt(
      previousState,
      passedAttempt,
      elapsedMs(started.current),
      usedHint,
    );
    const nextWordStates = { ...wordStates, [word.id]: nextWordState };

    let nextStats = stats;
    let nextLevelChanges = levelChanges;
    if (nextWordState.attempts >= 3) {
      const passedWord = hasPassedWord(nextWordState);
      const wordInput = interleavedReviewInput(nextWordState, rating);
      const normalizedAttempt = normalizeReviewAttempt({
        correct: passedWord,
        hintUsed: !!wordInput.hintUsed,
        responseTimeMs: nextWordState.responseTimeMs / 3,
        attemptCount: nextWordState.attempts,
        exerciseType: exercise.type,
      });
      const result = await reviewWord(
        db,
        word.id,
        {
          correct: normalizedAttempt.correct,
          rating: wordInput.rating,
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
        if (!mounted.current) return;
        setFeedback(
          "Từ này không còn đến hạn hoặc đã được cập nhật ở nơi khác.",
        );
        setSaving(false);
        return;
      }
      if (lessonActivityId) void recordLessonActivityEvidence(db, lessonActivityId, "REVIEW_ATTEMPT_RECORDED", word.id).catch(() => undefined);
      if (!mounted.current) return;
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
    if (!mounted.current) return;
    submittedTurn.current = index;
    setWordStates(nextWordStates);
    if (!passedAttempt) setWrongInSession((value) => value + 1);
    void playFeedback(passedAttempt ? 'success' : 'error', { hapticEnabled: settings?.hapticEnabled, soundEnabled: settings?.soundEnabled });
    if (index >= queue.length - 1) {
      finishSession(quickMinutes != null && quickClock.read().expired ? 'time' : 'queue', nextStats, nextLevelChanges);
      return;
    }
    setIndex((value) => value + 1);
    resetResponse();
    setProgress(null);
    setSaving(false);
    } catch {
      if (mounted.current) setSaveError(true);
      if (mounted.current) setFeedback("Chưa lưu được lượt ôn. Bạn có thể thử lại; câu trả lời vẫn được giữ.");
    } finally {
      saveLock.current = false;
      if (mounted.current) setSaving(false);
    }
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

  const requestHint = () => {
    setUsedHint(true);
    if (mode === "hanzi-recall-pinyin-compose") setComposeHintVisible(true);
    else setLightHintVisible(true);
    setFeedback(null);
  };

  const revealAnswer = () => {
    if (mode === "hanzi-recall-pinyin-compose") {
      setUsedHint(true);
      setComposeHintVisible(true);
      setFeedback(
        "Đã hiện pinyin. Bạn vẫn chọn chữ Hán; đúng sẽ giữ cấp.",
      );
      return;
    }
    setUsedHint(true);
    setShowAnswer(true);
    setPracticePinyin(null);
    setPracticeMeaning(null);
    setFeedback("Hãy xem lại từ này, rồi tiếp tục luyện tập.");
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
  const selectedAnswer = practiceMeaning || practicePinyin || (mode === 'hanzi-recall-pinyin-compose' ? selectedHanzi : submittedHanzi);
  const showRecallActions = mode !== 'hanzi-recall-pinyin-compose' && !answerVisible && !practicePinyin && !practiceMeaning;
  const handwritingOnly = needsWriting && answerMethod === 'handwriting';

  if (requested === 'cloze' && !personalContextReady) return <Screen title="Đang chuẩn bị câu ôn" subtitle="Đang kiểm tra ngữ cảnh riêng lưu trên thiết bị.">
    <View style={themedCard(theme)}><ActivityIndicator color={theme.primary}/></View>
  </Screen>;

  if (mode === 'cloze' && !clozeQuestion) return <Screen title="Chưa có câu phù hợp" subtitle="Từ này chưa có câu ví dụ đủ ngữ cảnh để tạo bài trắc nghiệm.">
    <View style={[themedCard(theme), { gap: spacing.md }]}>
      <Text style={styles.sourceHanzi}>{word.simplified}</Text>
      <Text style={styles.optionHint}>Lượt này chưa được chấm. Bạn có thể xem từ hoặc chọn kiểu ôn khác.</Text>
      <PrimaryButton label="Chọn kiểu ôn khác" onPress={() => router.replace('/review')} />
      <PrimaryButton variant="secondary" label="Xem từ và câu ví dụ" onPress={() => router.push({ pathname: '/word/[id]', params: { id: word.id } })} />
    </View>
  </Screen>;

  return (
    <Screen avoidKeyboard>
      {quickMinutes != null ? <QuickSessionTimer minutes={quickMinutes} clock={quickClock} saving={saving} saveError={saveError} onFinish={() => { if (!saveLock.current) finishSession(quickClock.read().expired ? 'time' : 'stopped'); }} /> : null}
      {index === 0 && Number(clozeOmitted) > 0 ? <Text style={styles.optionHint}>{Math.min(100, Number(clozeOmitted))} từ chưa đủ ngữ cảnh vẫn giữ lịch ôn; phiên này chỉ gồm từ có câu phù hợp.</Text> : null}
      <View style={styles.top}>
        <Text style={styles.counter}>
          {index + 1} / {queue.length}
        </Text>
        <AnimatedProgressBar variant="stream" active={focused} height={12} testID="chinese-review-progress" progress={sessionProgress} color={visualMode.accent} trackColor={theme.border} accessibilityLabel={"Ti\u1ebfn \u0111\u1ed9 bu\u1ed5i \u00f4n"} style={styles.progressTrack} />
        <Text testID="review-memory-level" style={styles.level}>{progress ? `Cấp ${progress.memoryLevel}` : "…"}</Text>
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
        Lượt {entry.pass}/3 · ôn xen kẽ
      </Text>
      {progressIssue ? <PrimaryButton variant="secondary" label="Tải lại mức nhớ" onPress={() => { setProgressIssue(false); setProgressAttempt(value => value + 1); }} /> : null}

      <StudyTransition turnKey={`${index}:${entry.pass}:${word.id}`} testID="chinese-review-question" style={[themedCard(theme), styles.challengeHeader]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' }}>
        <Text style={[styles.challengeLabel, { flex: 1 }]}>
          ÔN TẬP · LƯỢT {entry.pass}/3 · {mode === "hanzi-recall-pinyin-compose" ? "GHÉP HÁN TỰ" : exercise.label}
        </Text>
        </View>
        {mode === "hanzi-meaning" ? (
          <>
            <Text style={styles.sourceHanzi}>{word.simplified}</Text>
            {meaningCorrect && !showAnswer ? (
              <View testID="review-correct-pronunciation" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {word.pinyin.trim() ? <PinyinText value={word.pinyin} visible style={styles.answerPinyin} /> : null}
                {word.simplified.trim() ? <AudioButton text={word.simplified} allowWhenSoundDisabled /> : null}
              </View>
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
          <>
            <StudyTransition active={focused} turnKey={`${index}:cloze:${Boolean(recognizedHanzi || showAnswer)}`} effect="reveal" durationMs={180} style={{ alignSelf: 'stretch' }}>
              <Text testID="review-cloze-sentence" style={styles.clozeSentence}>
                {clozeQuestion!.prompt.split('＿＿')[0]}<Text style={[styles.clozeBlank, (recognizedHanzi || showAnswer) && { color: theme.success, backgroundColor: theme.successSoft }]}>{recognizedHanzi || showAnswer ? clozeQuestion!.answer : '　？　'}</Text>{clozeQuestion!.prompt.split('＿＿')[1]}
              </Text>
            </StudyTransition>
            <Text testID="review-cloze-meaning" style={styles.clozeMeaning}>{clozeQuestion!.translation ? `Ý câu: ${clozeQuestion!.translation}` : `Nghĩa từ cần điền: ${word.primaryMeaningVi}`}</Text>
            {clozeQuestion!.support?.length ? <Text style={styles.clozeMeaning}>Từ hỗ trợ: {clozeQuestion!.support.map(item => `${item.text}${item.meaning ? ` (${item.meaning.split(/[,;]/u)[0]})` : ''}`).join(' · ')}</Text> : null}
            {recognizedHanzi || showAnswer ? <View style={{ alignItems: 'center', gap: 8 }}>
              <AudioButton text={clozeQuestion!.sentence} allowWhenSoundDisabled />
            </View> : null}
          </>
        ) : (
          <>
            <Text style={styles.challengePrompt}>{word.primaryMeaningVi}</Text>
            {mode === "writing" ? (
              <PinyinText value={word.pinyin} visible style={styles.sourcePinyin} />
            ) : null}
          </>
        )}
        <Text style={styles.challengeHint}>{mode === "hanzi-recall-pinyin-compose" ? "Nhập pinyin, rồi chọn chữ Hán tương ứng." : exercise.prompt}</Text>
      </StudyTransition>

      {mode !== 'cloze' ? <PersonalContextCard key={`${word.id}:${index}`} vocabularyId={word.id}
        answers={[word.simplified,word.traditional]} reveal={showAnswer}
        onHint={() => setUsedHint(true)} /> : null}

      {mode === "hanzi-recall-pinyin-compose" ? (
        <>
          <View style={[themedCard(theme), styles.composerCard]}>
            {composeHintVisible || composeSubmitted ? (
              <StudyTransition active={focused} turnKey={`${index}:${entry.pass}:${word.id}:compose-hint`} effect="reveal" durationMs={180} animateOnMount testID="review-compose-hint" style={styles.revealedPinyin}>
                <PinyinText value={word.pinyin} visible style={styles.sourcePinyin} />
                <AudioButton text={word.simplified} size={30} />
              </StudyTransition>
            ) : null}
            <PinyinHanziComposer
              db={db}
              disabled={composeSubmitted || saving}
              onClear={clearCompose}
              onDeleteLast={deleteLastComposeCharacter}
              onHint={requestHint}
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
          <PinyinHanziComposer
            key={`${word.id}-${entry.pass}`}
            db={db}
            disabled={saving || showAnswer}
            onClear={clearCompose}
            onDeleteLast={deleteLastComposeCharacter}
            onHint={requestHint}
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

      {mode === 'cloze' && !showAnswer ? <OptionCard label="CHỌN TỪ CÒN THIẾU" options={clozeQuestion!.options}
        selected={recognizedHanzi || null} disabled={Boolean(recognizedHanzi) || saving} correctValue={clozeQuestion!.answer} correct={hanziCorrect}
        onSelect={value => { if (selectedClozeTurn.current === index || saving) return; selectedClozeTurn.current = index; setRecognizedHanzi(value); setFeedback(null); }} /> : null}
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
      mode === "writing" &&
      answerVisible &&
      !showAnswer ? (
        <View style={styles.selectedSummary}>
          <Text style={styles.optionHint}>
            Bạn đã viết lại từ. Xác nhận để chấm lượt ôn này.
          </Text>
        </View>
      ) : null}

      {(showRecallActions && !handwritingOnly) || (lightHintVisible && !showAnswer) ? <Disclosure
        key={`${index}:${entry.pass}:${word.id}:hint`} title="Gợi ý" expanded={lightHintVisible && !showAnswer}
        onPress={showRecallActions && !handwritingOnly ? requestHint : undefined} testID="review-light-hint"
        style={{ paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: theme.primarySoft, borderWidth: 1, borderColor: theme.border }}
        trailing={showRecallActions && !handwritingOnly ? <PrimaryButton variant="ghost" label="Chưa nhớ · xem đáp án" onPress={revealAnswer} style={{ flex: 1 }} /> : undefined}>
        <View style={{ flex: 1, gap: 4 }}><Text style={styles.optionText}>{mode === "hanzi-pinyin" ? `Bắt đầu bằng: ${Array.from(word.pinyin)[0] ?? ""}…` : mode === "hanzi-meaning" || mode === "audio-meaning" || mode === "audio-hanzi" ? word.pinyin : `Chữ đầu: ${Array.from(expectedScript)[0] ?? ""}`}</Text><Text style={styles.optionHint}>Bạn vẫn chọn đáp án. Trả lời đúng có gợi ý sẽ giữ cấp.</Text></View>
      </Disclosure> : null}
      {showRecallActions && handwritingOnly ? <PrimaryButton variant="ghost" label="Bỏ cuộc · xem đáp án" onPress={revealAnswer} /> : null}
      {feedback ? <Text accessibilityLiveRegion="polite" style={styles.feedbackMessage}>{feedback}</Text> : null}
      {responseComplete ? (
        <StudyTransition active={focused} turnKey={`${index}:${entry.pass}:${word.id}:${answerCorrect}`} effect="reveal" durationMs={200} animateOnMount accessibilityLiveRegion="polite" testID="chinese-review-feedback" style={[themedCard(theme), styles.ratingsCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AnswerFeedbackIcon correct={answerCorrect} turnKey={`${index}:${entry.pass}:${word.id}:${answerCorrect}`} active={focused && !practiceMeaning && !practicePinyin} />
            <Text style={[styles.ratingTitle, { flex: 1 }, !answerCorrect && styles.feedbackBad]}>{answerCorrect ? `${usedHint ? 'Đúng có gợi ý' : 'Chính xác'} · lượt ${entry.pass}/3` : 'Chưa chính xác'}</Text>
          </View>
          <View testID="chinese-review-answer-details" style={{ gap: 8 }}>
            {!answerCorrect && !showAnswer && selectedAnswer ? <Text style={{ color: theme.textSecondary }}>
              {practiceMeaning ? `Nghĩa bạn chọn: ${selectedAnswer}` : practicePinyin ? `Pinyin bạn chọn: ${selectedAnswer}` : `Chữ bạn chọn: ${selectedAnswer}`}
            </Text> : null}
            <Text style={styles.challengeLabel}>TỪ CẦN NHỚ</Text>
            <Text selectable style={styles.resultHanzi}>{expectedScript}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              {word.pinyin.trim() ? <PinyinText value={word.pinyin} visible style={styles.resultPinyin} /> : null}
              {word.simplified.trim() && !(mode === 'hanzi-meaning' && meaningCorrect && !showAnswer) ? <AudioButton text={word.simplified} /> : null}
            </View>
            {word.primaryMeaningVi.trim() ? <Text selectable style={styles.resultMeaning}>{word.primaryMeaningVi}</Text> : null}
          </View>
          {answerCorrect ? (
            <>
              <Text style={styles.optionHint}>
                {assistedWord
                  ? "Từ này đã dùng gợi ý. Đúng các lượt còn lại sẽ giữ cấp, không hạ cấp vì gợi ý."
                  : entry.pass < 3
                    ? "Tiếp tục với từ khác; từ này sẽ xuất hiện lại."
                    : "Đúng cả ba lượt không gợi ý sẽ được tăng cấp."}
              </Text>
              {settings?.reviewStyle === "automatic" ? (
                <View style={styles.autoRatings}>
                  <PrimaryButton
                    variant="danger"
                    label="Chưa nhớ"
                    disabled={saving || !progress}
                    onPress={() => void rate("again")}
                    style={styles.autoButton}
                  />
                  <PrimaryButton
                    label={assistedWord ? "Tiếp tục" : "Đã nhớ"}
                    disabled={saving || !progress}
                    onPress={() => void rate("good")}
                    style={styles.autoButton}
                  />
                </View>
              ) : (
                <View style={styles.ratings}>
                  {ratingMeta.slice(1).map(([rating, label], i) => (
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving || !progress}
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
              <Text style={styles.optionHint}>
                Từ này sẽ được ôn lại sớm hơn để bạn ghi nhớ.
              </Text>
              <PrimaryButton
                variant="danger"
                label="Tiếp tục luyện tập"
                disabled={saving || !progress}
                onPress={() => void rate("again")}
              />
            </>
          )}
        </StudyTransition>
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
  disabled = false,
}: {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  pinyin?: boolean;
  correctValue: string;
  correct: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const focused = useIsFocused();
  return (
    <View testID="chinese-review-options" style={[themedCard(theme), styles.challengeSection]}>
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
          <MotionPressable
            pressedScale={0.96}
            disabled={disabled}
            accessibilityState={{ selected: selected === option }}
            accessibilityLabel={option}
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.challengeOption,
              { paddingRight: 38 },
              pinyin && styles.pinyinOption,
              selected === option && styles.challengeOptionActive,
              selected === option && (correct ? styles.correct : styles.wrong),
              selected &&
                option !== selected &&
                option === correctValue &&
                styles.correct,
            ]}
          >
            <StudyTransition active={focused && selected === option && !correct} turnKey={String(selected === option)} effect="error" durationMs={220} style={{ paddingVertical: 8 }}>
            {pinyin ? (
              <PinyinText value={option} visible numberOfLines={1} />
            ) : (
              <Text style={styles.optionText}>{option}</Text>
            )}
            </StudyTransition>
            {selected && (option === selected || option === correctValue) ? <View style={{ position: 'absolute', right: 8, top: 12 }}>
              <AnswerFeedbackIcon active={focused} correct={option === correctValue} turnKey={`${option}:${selected}`} size={24} />
            </View> : null}
          </MotionPressable>
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
      marginTop: spacing.xs,
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
    clozeSentence: { color: theme.textPrimary, fontSize: 28, lineHeight: 44, fontWeight: '700', textAlign: 'center', paddingVertical: 12 },
    clozeBlank: { color: theme.primaryText, backgroundColor: theme.primarySoft },
    clozeMeaning: { color: theme.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    composeCard: { alignItems: "center", gap: spacing.sm },
    composeInstruction: {
      color: theme.textSecondary,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    revealedPinyin: { alignItems: "center", gap: spacing.xs },
    composerCard: { gap: spacing.md },
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
    resultPinyin: { color: theme.textPrimary, fontSize: 24 },
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
    answerPinyin: { color: theme.textPrimary, fontSize: 24 },
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
    actions: { flexDirection: "row", gap: spacing.sm },
    feedbackMessage: {
      color: theme.textSecondary,
      textAlign: "center",
      fontSize: 13,
      lineHeight: 19,
    },
    lightHint: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: theme.primarySoft },
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
