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
  Text,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { getExamAttempt, saveExamAttempt, submitExamAttempt } from "@/db/exam";
import { useConfirmation } from "@/hooks/use-confirmation";
import { examSkillLabels, getExamSectionWindow } from "@/services/exam/engine";
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
  const lock = useRef(false);
  const leave = useRef(false);
  const autoSubmitted = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let saved = await getExamAttempt(db, id);
      if (
        saved.status === "IN_PROGRESS" &&
        getExamRemaining(saved, Date.now()) === 0
      )
        saved = await submitExamAttempt(db, id);
      const now = Date.now();
      const resumedIndex = getExamCurrentIndex(saved, now);
      if (
        saved.status === "IN_PROGRESS" &&
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
        "Đáp án đã lưu trên máy. Thời gian vẫn tiếp tục chạy; hết giờ bài sẽ được nộp khi mở lại.",
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
  return (
    <Screen
      title="Bài luyện gốc"
      subtitle="Không phải đề thi HSK chính thức · đáp án được lưu sau mỗi thao tác."
    >
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? (
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="alert" style={{ color: theme.error }}>
            {error}
          </Text>
          <PrimaryButton
            label="Tải lại bài đã lưu"
            disabled={busy}
            onPress={() => void load()}
          />
        </View>
      ) : null}
      {!loading && attempt?.status === "IN_PROGRESS" && question && snapshot ? (
        <>
          <Text
            accessibilityLiveRegion="none"
            style={{ color: theme.textMuted }}
          >
            Câu {currentIndex + 1}/{snapshot.questions.length} · còn{" "}
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")} ·{" "}
            {Object.keys(snapshot.answers).length} đã trả lời
          </Text>
          <Text style={{ color: theme.textMuted, lineHeight: 23 }}>
            Bài luyện trong ứng dụng, không phải đề thi chính thức.{" "}
            {noBack
              ? "Không quay lại câu đã rời; cờ chỉ dùng khi xem kết quả."
              : "Có thể quay lại câu trong phần còn mở."}
          </Text>
          {window ? (
            <Text style={{ color: theme.primaryText }}>
              Phần {window.index + 1}: {examSkillLabels[window.skill]} · còn{" "}
              {window.remainingSeconds} giây. Không quay lại phần đã hết giờ.
            </Text>
          ) : null}
          <Text
            style={{ color: theme.textPrimary, fontSize: 22, lineHeight: 34 }}
          >
            {question.prompt}
          </Text>
          {question.choices.map((choice, index) => (
            <Pressable
              key={choice}
              accessibilityRole="radio"
              aria-checked={snapshot.answers[question.id] === index}
              aria-disabled={busy || remaining === 0}
              accessibilityState={{
                checked: snapshot.answers[question.id] === index,
                disabled: busy || remaining === 0,
              }}
              disabled={busy || remaining === 0}
              onPress={() =>
                void update({
                  ...snapshot,
                  currentIndex,
                  answers: { ...snapshot.answers, [question.id]: index },
                })
              }
              style={{
                padding: 16,
                minHeight: 48,
                borderWidth: 1,
                borderRadius: 16,
                borderColor:
                  snapshot.answers[question.id] === index
                    ? theme.primary
                    : theme.border,
                backgroundColor:
                  snapshot.answers[question.id] === index
                    ? theme.primarySoft
                    : theme.surface,
              }}
            >
              <Text style={{ color: theme.textPrimary, fontSize: 18 }}>
                {snapshot.answers[question.id] === index ? "✓ " : ""}
                {choice}
              </Text>
            </Pressable>
          ))}
          <PrimaryButton
            label={
              snapshot.flaggedIds.includes(question.id)
                ? "Bỏ đánh dấu xem lại"
                : "Đánh dấu xem lại"
            }
            variant="ghost"
            disabled={busy || remaining === 0}
            onPress={() =>
              void update({
                ...snapshot,
                currentIndex,
                flaggedIds: snapshot.flaggedIds.includes(question.id)
                  ? snapshot.flaggedIds.filter((item) => item !== question.id)
                  : [...snapshot.flaggedIds, question.id],
              })
            }
          />
          <View style={{ gap: 12 }}>
            <PrimaryButton
              label="Câu trước"
              variant="secondary"
              disabled={busy || remaining === 0 || currentIndex === firstIndex}
              onPress={() =>
                void update({ ...snapshot, currentIndex: currentIndex - 1 })
              }
            />
            <PrimaryButton
              label="Câu tiếp"
              variant="secondary"
              disabled={busy || remaining === 0 || currentIndex === lastIndex}
              onPress={() =>
                noBack
                  ? void ask({
                      title: "Chuyển câu và khóa câu hiện tại?",
                      message:
                        "Sau khi chuyển, bạn không thể sửa lại đáp án hoặc cờ của câu này, kể cả khi mở lại bài.",
                      acceptLabel: "Chuyển câu",
                      cancelLabel: "Làm tiếp câu này",
                    }).then((accepted) => {
                      if (accepted)
                        void update({
                          ...snapshot,
                          currentIndex: currentIndex + 1,
                        });
                    })
                  : void update({ ...snapshot, currentIndex: currentIndex + 1 })
              }
            />
          </View>
          {window &&
          currentIndex === lastIndex &&
          window.index < snapshot.profile.sections.length - 1 ? (
            <Text style={{ color: theme.textMuted }}>
              Phần tiếp theo mở khi đồng hồ phần này hết giờ; thời gian không
              tạm dừng.
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {snapshot.questions.map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{
                  disabled:
                    busy ||
                    remaining === 0 ||
                    index < firstIndex ||
                    (noBack && index !== currentIndex) ||
                    index > lastIndex,
                }}
                accessibilityLabel={`Câu ${index + 1}${snapshot.answers[item.id] !== undefined ? ", đã trả lời" : ""}${snapshot.flaggedIds.includes(item.id) ? ", đánh dấu xem lại" : ""}`}
                disabled={
                  busy ||
                  remaining === 0 ||
                  index < firstIndex ||
                  (noBack && index !== currentIndex) ||
                  index > lastIndex
                }
                onPress={() =>
                  void update({ ...snapshot, currentIndex: index })
                }
                style={{
                  minWidth: 48,
                  minHeight: 48,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.primarySoft,
                  opacity:
                    index < firstIndex ||
                    index > lastIndex ||
                    (noBack && index !== currentIndex)
                      ? 0.4
                      : 1,
                }}
              >
                <Text style={{ color: theme.primaryText }}>
                  {index + 1}
                  {snapshot.flaggedIds.includes(item.id) ? " ⚑" : ""}
                  {snapshot.answers[item.id] !== undefined ? " ✓" : ""}
                </Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton
            label={remaining === 0 ? "Nộp bài hết giờ" : "Nộp bài"}
            loading={busy}
            onPress={() => {
              void ask({
                title: "Nộp bài?",
                message: `Đã trả lời ${Object.keys(snapshot.answers).length}/${snapshot.questions.length} câu.`,
                acceptLabel: "Xác nhận nộp bài",
                cancelLabel: "Làm tiếp",
              }).then((accepted) => {
                if (accepted) void submit();
              });
            }}
          />
          <Text style={{ color: theme.textMuted }}>
            {busy ? "Đang lưu…" : "Đáp án hiện tại đã lưu trên máy."}
          </Text>
        </>
      ) : null}
      {dialog}
    </Screen>
  );
}
