import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  type Href,
} from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ExamNavigator } from '@/components/exam/ExamNavigator';
import { ExamQuestionCard } from '@/components/exam/ExamQuestionCard';
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { StudyTransition } from '@/components/ui/StudyTransition';
import { getExamAttempt, saveExamAttempt, submitExamAttempt } from "@/db/exam";
import { useConfirmation } from "@/hooks/use-confirmation";
import { examSkillLabels, getExamSectionWindow } from "@/services/exam/engine";
import { examAnswerCounts, examTimeLabel } from '@/services/exam/presentation';
import {
  getExamRemaining,
  getExamCurrentIndex,
  type ExamAttempt,
  type ExamSnapshot,
} from "@/services/exam/session";
import { useTheme } from "@/theme/ThemeProvider";

export default function ExamSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const navigation = useNavigation();
  const { ask, dialog } = useConfirmation();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [expiredUnsubmitted, setExpiredUnsubmitted] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const lock = useRef(false);
  const leave = useRef(false);
  const autoSubmitted = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let saved = await getExamAttempt(db, id);
      const expiredBeforeResume =
        saved.status === "IN_PROGRESS" &&
        getExamRemaining(saved, Date.now()) === 0;
      setExpiredUnsubmitted(expiredBeforeResume);
      autoSubmitted.current = expiredBeforeResume;
      const now = Date.now();
      const resumedIndex = getExamCurrentIndex(saved, now);
      if (
        saved.status === "IN_PROGRESS" &&
        !expiredBeforeResume &&
        resumedIndex !== saved.snapshot.currentIndex
      )
        saved = await saveExamAttempt(
          db,
          saved,
          { ...saved.snapshot, currentIndex: resumedIndex },
          now,
        );
      setAttempt(saved);
      setClockNow(Date.now());
      setRemaining(getExamRemaining(saved, Date.now()));
    } catch {
      setError(
        "Không đọc được bài luyện. Thử lại để tiếp tục từ đáp án đã lưu.",
      );
    } finally {
      setLoading(false);
    }
  }, [db, id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    if (attempt?.status !== "SUBMITTED") return;
    // Let the in-app confirmation Modal finish dismissing before the native
    // stack replaces this screen. This avoids overlapping Modal/ScreenStack
    // fragment transactions on Android after the result is already persisted.
    const timer = setTimeout(() => router.replace({
        pathname: "/exam/result",
        params: { id: attempt.id },
      } as unknown as Href), 250);
    return () => clearTimeout(timer);
  }, [attempt]);
  const submit = useCallback(async () => {
    if (lock.current || !attempt) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setAttempt(await submitExamAttempt(db, attempt.id));
    } catch {
      setError("Chưa nộp được bài. Đáp án đã lưu; hãy thử lại.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [attempt, db]);
  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;
    const tick = () => {
      const now = Date.now();
      setClockNow(now);
      const seconds = getExamRemaining(attempt, now);
      setRemaining(seconds);
      if (seconds === 0 && !lock.current && !autoSubmitted.current) {
        autoSubmitted.current = true;
        void submit();
      }
    };
    const initialTick = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearTimeout(initialTick);
      clearInterval(timer);
      subscription.remove();
    };
  }, [attempt, submit]);
  usePreventRemove(attempt?.status === "IN_PROGRESS" || busy, ({ data }) => {
    if (leave.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (lock.current) {
      setError("Chờ lưu xong trước khi rời bài.");
      return;
    }
    void ask({
      title: "Rời bài luyện?",
      message:
      "Đáp án đã lưu trên máy. Nếu thời gian đã hết khi bạn quay lại, bài sẽ giữ nguyên để bạn chủ động nộp; không tự chuyển thành kết quả.",
      acceptLabel: "Rời bài",
      cancelLabel: "Làm tiếp",
    }).then((accepted) => {
      if (accepted) {
        leave.current = true;
        navigation.dispatch(data.action);
      }
    });
  });
  const update = async (
    change: Pick<ExamSnapshot, "answers" | "flaggedIds" | "currentIndex">,
  ) => {
    if (!attempt || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setAttempt(await saveExamAttempt(db, attempt, change));
    } catch (err) {
      setError(
        err instanceof Error && err.message === "EXAM_SECTION_CLOSED"
          ? "Phần trước đã hết giờ. Tải lại để tiếp tục phần hiện tại."
          : err instanceof Error && err.message === "EXAM_NO_BACK"
            ? "Bài này không cho quay lại câu đã rời. Đáp án đã lưu vẫn giữ nguyên."
            : err instanceof Error && err.message === "EXAM_CLOSED"
              ? "Đã hết giờ. Hãy nộp bài."
              : "Không lưu được thao tác. Đáp án trước đó vẫn giữ nguyên; hãy tải lại bài.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const snapshot = attempt?.snapshot;
  const window =
    attempt && snapshot?.profile.navigation === "SECTION_TIMED"
      ? getExamSectionWindow(snapshot.profile, attempt.startedAtMs, clockNow)
      : null;
  const currentIndex = attempt ? getExamCurrentIndex(attempt, clockNow) : 0;
  const question = snapshot?.questions[currentIndex];
  const noBack = snapshot?.profile.backNavigation === "NO_BACK";
  const firstIndex = Math.max(
    window?.firstQuestionIndex ?? 0,
    noBack ? (snapshot?.furthestIndex ?? snapshot?.currentIndex ?? 0) : 0,
  );
  const lastIndex =
    window?.lastQuestionIndex ?? (snapshot?.questions.length ?? 1) - 1;
  const counts = snapshot ? examAnswerCounts(snapshot.questions, snapshot.answers) : null;
  const canGo = (index: number) => !busy && remaining > 0 && index >= firstIndex && index <= lastIndex && (!noBack || index === currentIndex);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [currentIndex]);
  return <Screen title="Bài luyện" hideTitle scroll={false}>
    {loading ? <ActivityIndicator color={theme.primary} /> : null}
    {error ? <View style={{ gap: 8 }}>
      <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>
      <PrimaryButton label="Tải lại bài đã lưu" disabled={busy} onPress={() => void load()} />
    </View> : null}
    {!loading && attempt?.status === 'IN_PROGRESS' && question && snapshot && counts ? <>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: theme.primaryText, fontWeight: '800', fontSize: 15 }}>{examSkillLabels[question.skill]} · Câu {currentIndex + 1}/{counts.total}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{busy ? 'Đang lưu…' : `${counts.answered} đã làm · ${counts.unanswered} chưa làm`}</Text>
          </View>
          <View style={{ padding: 10, borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
            <Text accessibilityLabel={`Thời gian còn lại ${examTimeLabel(remaining)}`} accessibilityLiveRegion="none" style={{ color: remaining <= 60 ? theme.error : theme.textPrimary, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{examTimeLabel(remaining)}</Text>
          </View>
        </View>
        <AnimatedProgressBar progress={counts.answered / Math.max(1, counts.total)} color={theme.primary} trackColor={theme.border} accessibilityLabel="Số câu đã trả lời" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
          {snapshot.profile.sections.map(section => {
            const start = snapshot.questions.findIndex(item => item.skill === section.skill);
            const active = question.skill === section.skill;
            const enabled = canGo(start);
            return <Pressable key={section.skill} accessibilityRole="tab" accessibilityState={{ selected: active, disabled: !enabled }} disabled={!enabled}
              onPress={() => void update({ ...snapshot, currentIndex: start })} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 14, backgroundColor: active ? theme.primarySoft : theme.surface, opacity: enabled || active ? 1 : 0.45 }}>
              <Text style={{ color: theme.primaryText, fontWeight: '700' }}>{examSkillLabels[section.skill]} · {section.questionCount}</Text>
            </Pressable>;
          })}
        </ScrollView>
      </View>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
        {remaining === 0 && expiredUnsubmitted ? <Text accessibilityRole="alert" style={{ color: theme.warning, lineHeight: 22 }}>Đã hết giờ. Đáp án vẫn được giữ nguyên; bấm “Nộp bài hết giờ” để xem kết quả.</Text> : null}
        {window ? <Text style={{ color: theme.textMuted, fontSize: 13 }}>Phần {window.index + 1} · còn {examTimeLabel(window.remainingSeconds)} · các phần đã hết giờ được khóa.</Text> : null}
        <StudyTransition active={attempt.status === 'IN_PROGRESS'} turnKey={question.id} durationMs={180}>
          <ExamQuestionCard question={question} answer={snapshot.answers[question.id]} disabled={busy || remaining === 0}
            onAnswer={answer => void update({ ...snapshot,
              answers: { ...snapshot.answers, [question.id]: answer },
              currentIndex: autoNext && !noBack ? Math.min(currentIndex + 1, lastIndex) : currentIndex,
            })} />
        </StudyTransition>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: snapshot.flaggedIds.includes(question.id), disabled: busy || remaining === 0 }}
            disabled={busy || remaining === 0} onPress={() => void update({ ...snapshot, currentIndex,
              flaggedIds: snapshot.flaggedIds.includes(question.id) ? snapshot.flaggedIds.filter(item => item !== question.id) : [...snapshot.flaggedIds, question.id],
            })} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }}>
            <Text style={{ color: theme.primaryText, fontWeight: '700' }}>{snapshot.flaggedIds.includes(question.id) ? '⚑ Đã đánh dấu' : '⚐ Đánh dấu xem lại'}</Text>
          </Pressable>
          {!noBack ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Tự chuyển câu</Text>
            <Switch accessibilityLabel="Tự chuyển câu sau khi chọn đáp án" disabled={busy} value={autoNext} onValueChange={setAutoNext} />
          </View> : null}
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 19 }}>{noBack ? 'Câu đã rời sẽ bị khóa. Kiểm tra đáp án trước khi chuyển.' : 'Có thể sửa đáp án trong phần còn mở. Đúng/sai chỉ hiện sau khi nộp.'}</Text>
        {window && currentIndex === lastIndex && window.index < snapshot.profile.sections.length - 1 ? <Text style={{ color: theme.textMuted }}>Phần tiếp theo mở khi đồng hồ phần này hết giờ; thời gian không tạm dừng.</Text> : null}
      </ScrollView>
      <View style={{ gap: 8, borderTopWidth: 1, borderColor: theme.border, paddingTop: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PrimaryButton label="Câu trước" style={{ flex: 1 }} variant="secondary" disabled={!canGo(currentIndex - 1)} onPress={() => void update({ ...snapshot, currentIndex: currentIndex - 1 })} />
          <PrimaryButton label="Bảng câu" style={{ flex: 1 }} variant="secondary" disabled={busy} onPress={() => setNavigatorOpen(true)} />
          <PrimaryButton label="Câu tiếp" style={{ flex: 1 }} variant="secondary" disabled={busy || remaining === 0 || currentIndex === lastIndex}
            onPress={() => noBack ? void ask({ title: 'Chuyển câu và khóa câu hiện tại?', message: 'Sau khi chuyển, bạn không thể sửa lại đáp án hoặc cờ của câu này, kể cả khi mở lại bài.', acceptLabel: 'Chuyển câu', cancelLabel: 'Làm tiếp câu này' }).then(accepted => { if (accepted) void update({ ...snapshot, currentIndex: currentIndex + 1 }); }) : void update({ ...snapshot, currentIndex: currentIndex + 1 })} />
        </View>
        <PrimaryButton label={remaining === 0 ? 'Nộp bài hết giờ' : `Nộp bài · ${counts.answered}/${counts.total}`} disabled={busy} loading={busy}
          onPress={() => void ask({ title: counts.unanswered ? `Còn ${counts.unanswered} câu chưa làm` : 'Nộp bài?',
            message: `Đã trả lời ${counts.answered}/${counts.total} câu · ${snapshot.flaggedIds.length} câu đánh dấu. ${counts.unanswered ? 'Câu bỏ trống được tính 0. ' : ''}Sau khi nộp, bạn có thể xem đáp án và giải thích nhưng không sửa bài này.`,
            acceptLabel: 'Xác nhận nộp bài', cancelLabel: 'Kiểm tra lại',
          }).then(accepted => { if (accepted) void submit(); })} />
      </View>
      <ExamNavigator visible={navigatorOpen} snapshot={snapshot} currentIndex={currentIndex} canGo={canGo}
        onClose={() => setNavigatorOpen(false)} onSelect={index => { setNavigatorOpen(false); void update({ ...snapshot, currentIndex: index }); }} />
    </> : null}
    {dialog}
  </Screen>;
}
