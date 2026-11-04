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
  TextInput,
  View,
} from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { themedCard } from "@/constants/design";
import {
  loadWrittenAttempt,
  openWrittenDraft,
  saveWrittenAttempt,
  type WrittenAttempt,
} from "@/db/written-practice";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useStudySession } from "@/hooks/use-study-session";
import {
  checkWrittenAnswer,
  createTimedWrittenExercise,
  getWrittenRemainingSeconds,
  getWrittenSelfReview,
  writtenPracticeMinutes,
  type WrittenPracticeMinutes,
  type WrittenExercise,
} from "@/services/exam/written-practice";
import { useTheme } from "@/theme/ThemeProvider";

export default function WrittenSession() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const attemptId = typeof id === 'string' ? id.trim() : Array.isArray(id) ? id[0]?.trim() ?? '' : '';
  const db = useSQLiteContext();
  const theme = useTheme();
  const navigation = useNavigation();
  const { ask, dialog } = useConfirmation();
  useStudySession(db);
  const [attempt, setAttempt] = useState<WrittenAttempt | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [minutes, setMinutes] = useState<WrittenPracticeMinutes>(5);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const locked = useRef(false);
  const leave = useRef(false);
  const live = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!attemptId) throw new Error('WRITTEN_ID_MISSING');
      const saved = await loadWrittenAttempt(db, attemptId);
      if (live.current) {
        leave.current = false;
        setAttempt(saved);
        setAnswer(saved.answer);
        setClockNow(Date.now());
      }
    } catch (reason) {
      if (live.current) {
        setAttempt(null);
        setError(reason instanceof Error && reason.message === 'WRITTEN_NOT_FOUND'
          ? 'Bản nháp này không còn trong lịch sử. Bài viết khác vẫn được giữ nguyên.'
          : reason instanceof Error && reason.message === 'WRITTEN_ID_MISSING'
            ? 'Thiếu liên kết tới bản nháp. Hãy quay lại danh sách để mở bài.'
            : 'Không thể tải bản nháp trên thiết bị. Dữ liệu hiện có vẫn được giữ nguyên; hãy thử lại hoặc mở danh sách bài.');
      }
    } finally {
      if (live.current) setLoading(false);
    }
  }, [attemptId, db]);
  useEffect(() => {
    const tick = () => setClockNow(Date.now());
    const timer = setInterval(tick, 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      live.current = true;
      void load();
      return () => {
        live.current = false;
      };
    }, [load]),
  );
  const dirty = !!attempt && answer !== attempt.answer;
  const save = useCallback(
    async (review = false) => {
      if (!attempt || locked.current) return false;
      locked.current = true;
      setBusy(true);
      setError("");
      try {
        const saved = await saveWrittenAttempt(db, attempt, answer, review);
        if (live.current) setAttempt(saved);
        return true;
      } catch {
        if (live.current)
          setError(
            "Chưa lưu được. Bản nháp cũ vẫn giữ; hãy bấm Lưu bản nháp để thử lại.",
          );
        return false;
      } finally {
        locked.current = false;
        if (live.current) setBusy(false);
      }
    },
    [answer, attempt, db],
  );
  useEffect(() => {
    if (!dirty || busy || error || attempt?.status !== "DRAFT") return;
    const timer = setTimeout(() => {
      void save();
    }, 800);
    return () => clearTimeout(timer);
  }, [dirty, busy, error, attempt?.status, save]);
  usePreventRemove(dirty || busy, ({ data }) => {
    if (leave.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (locked.current) {
      setError("Vui lòng chờ lưu xong trước khi rời bài.");
      return;
    }
    void ask({
      title: "Bản nháp chưa lưu",
      message: "Bạn có thể lưu trước khi rời màn hình.",
      acceptLabel: "Lưu và rời",
    }).then(async (accepted) => {
      if (accepted && (await save())) {
        leave.current = true;
        navigation.dispatch(data.action);
      }
    });
  });
  const exercise = attempt
    ? (JSON.parse(attempt.snapshot_json) as WrittenExercise)
    : null;
  const check = exercise ? checkWrittenAnswer(exercise, answer) : null;
  const remaining = exercise
    ? getWrittenRemainingSeconds(exercise, clockNow)
    : null;
  const expired = remaining === 0;
  const selfReview =
    exercise && attempt
      ? getWrittenSelfReview(exercise, answer, attempt.status)
      : null;
  const startTimed = async () => {
    if (
      !exercise ||
      !attempt ||
      locked.current ||
      dirty ||
      answer.trim() ||
      exercise.timing ||
      attempt.status !== "DRAFT"
    )
      return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const timed = createTimedWrittenExercise(exercise, minutes);
      const saved = await openWrittenDraft(db, timed);
      // Each explicit start opens a separate variant; history resumes its immutable deadline.
      leave.current = true; // Internal replacement is safe: original draft is empty and unchanged.
      router.replace({
        pathname: "/exam/written",
        params: { id: saved.id },
      } as unknown as Href);
    } catch {
      setError(
        "Chưa mở được bài có giờ. Bản nháp ban đầu vẫn giữ nguyên; hãy thử lại.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen
      title={exercise?.title ?? "Bài viết"}
      subtitle="Bản nháp lưu trên máy sau khi bạn ngừng gõ. Không gửi bài lên AI."
    >
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? (
        <View>
          <Text accessibilityLiveRegion="polite" style={{ color: theme.error }}>
            {error}
          </Text>
          {!attempt ? <PrimaryButton label={attemptId ? "Quay lại danh sách bài" : "Quay lại danh sách bài"} onPress={() => router.replace('/exam/skills' as Href)} /> : <PrimaryButton label="Thử tải lại" onPress={() => void load()} />}
        </View>
      ) : null}
      {exercise && attempt && check ? (
        <>
          <View style={[themedCard(theme), { gap: 12 }]}>
            <Text style={{ color: theme.primaryText }}>
              Mức HSK {exercise.level} · {exercise.minLength}–
              {exercise.maxLength} {check.unit}
            </Text>
            <Text
              selectable
              style={{ color: theme.textPrimary, fontSize: 20, lineHeight: 29 }}
            >
              {exercise.prompt}
            </Text>
            <Text style={{ color: theme.textMuted, lineHeight: 23 }}>
              Bài luyện tự biên soạn trong ứng dụng, không phải đề thi chính thức.
              {exercise.provenance === "ORIGINAL_AI_ASSISTED"
                ? " Có hỗ trợ AI khi biên soạn."
                : " Dùng để tự đối chiếu cách viết."}
            </Text>
          </View>
          {!exercise.timing &&
          attempt.status === "DRAFT" &&
          !answer.trim() &&
          !dirty ? (
            <View style={{ gap: 12 }}>
              <Text style={{ color: theme.textPrimary }}>
                Tùy chọn bài riêng có giờ
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {writtenPracticeMinutes.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: minutes === value,
                      disabled: busy,
                    }}
                    disabled={busy}
                    onPress={() => setMinutes(value)}
                    style={{
                      minHeight: 48,
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor:
                        minutes === value ? theme.primarySoft : theme.surface,
                    }}
                  >
                    <Text style={{ color: theme.textPrimary }}>
                      {minutes === value ? "✓ " : ""}
                      {value} phút
                    </Text>
                  </Pressable>
                ))}
              </View>
              <PrimaryButton
                label={`Bắt đầu lượt riêng ${minutes} phút`}
                variant="secondary"
                disabled={busy}
                onPress={() => void startTimed()}
              />
              <Text style={{ color: theme.textMuted, lineHeight: 23 }}>
                Bản nháp ban đầu được giữ. Đây là lượt mới; để tiếp tục lượt có
                giờ đã mở, hãy dùng lịch sử bản nháp. Hạn giờ đã lưu không thay
                đổi khi mở lại.
              </Text>
            </View>
          ) : null}
          {remaining !== null ? (
            <Text
              accessibilityLiveRegion="none"
              style={{ color: theme.textMuted, lineHeight: 23 }}
            >
              {expired
                ? "Hết thời gian luyện. Không tự nộp và không tự mở đáp án; hãy lưu rồi tự đối chiếu khi sẵn sàng."
                : `Còn ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} · Đồng hồ tiếp tục khi rời ứng dụng.`}
            </Text>
          ) : attempt.status === "DRAFT" ? (
            <Text style={{ color: theme.textMuted }}>
              Bản nháp này không có hạn giờ; bài cũ không bị áp đồng hồ mới.
            </Text>
          ) : null}
          <TextInput
            accessibilityLabel="Bài viết của tôi"
            value={answer}
            onChangeText={(value) => {
              if (
                attempt.status === "DRAFT" &&
                getWrittenRemainingSeconds(exercise, Date.now()) !== 0
              )
                setAnswer(value);
            }}
            autoComplete="off"
            autoCorrect={false}
            spellCheck={false}
            multiline
            textAlignVertical="top"
            maxLength={12000}
            editable={!busy && !expired && attempt.status === "DRAFT"}
            placeholder={
              exercise.answerLanguage === "ZH"
                ? "Nhập câu trả lời tiếng Trung…"
                : "Nhập bản dịch tiếng Việt…"
            }
            placeholderTextColor={theme.textMuted}
            style={{
              minHeight: 190,
              padding: 16,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              color: theme.textPrimary,
              fontSize: 18,
              lineHeight: 28,
            }}
          />
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: theme.textMuted }}
          >
            {busy
              ? "Đang lưu…"
              : dirty
                ? "Có thay đổi chưa lưu"
                : "Đã lưu trên máy"}{" "}
            · {check.length} {check.unit}
          </Text>
          {attempt.status === "DRAFT" ? (
            <>
              <PrimaryButton
                label="Lưu bản nháp"
                loading={busy}
                onPress={() => void save()}
                variant="secondary"
              />
              <PrimaryButton
                label="Tự nộp để đối chiếu và xem mẫu"
                disabled={!answer.trim() || busy}
                onPress={() => void save(true)}
              />
            </>
          ) : selfReview ? (
            <View style={[themedCard(theme), { gap: 12 }]}>
              <Text
                style={{
                  color: theme.textPrimary,
                  fontSize: 20,
                  fontWeight: "800",
                }}
              >
                Tự kiểm tra — không phải điểm số
              </Text>
              <Text style={{ color: theme.textSecondary }}>
                Độ dài:{" "}
                {check.lengthInRange
                  ? "trong khoảng gợi ý"
                  : "ngoài khoảng gợi ý"}
                . Dấu kết thúc câu: {check.hasSentenceEnding ? "có" : "chưa có"}
                .
              </Text>
              <Text style={{ color: theme.textSecondary }}>
                {check.missingWords.length
                  ? `Chưa thấy từ yêu cầu: ${check.missingWords.join(", ")}.`
                  : "Các từ yêu cầu đã xuất hiện (nếu có). Điều này không chứng minh dùng đúng nghĩa/ngữ pháp."}
              </Text>
              {selfReview.checklist.map((item) => (
                <Text key={item} style={{ color: theme.textSecondary }}>
                  • {item}
                </Text>
              ))}
              <Text style={{ color: theme.primaryText, fontWeight: "800" }}>
                Một cách trả lời tham khảo
              </Text>
              <Text
                selectable
                style={{
                  color: theme.textPrimary,
                  fontSize: 19,
                  lineHeight: 29,
                }}
              >
                {selfReview.modelAnswer}
              </Text>
              <Text style={{ color: theme.textMuted }}>{selfReview.note}</Text>
              <Text style={{ color: theme.textMuted }}>
                Bài đã lưu nguyên trạng để xem lại. Khác đáp án mẫu không đồng
                nghĩa sai. Hệ thống chưa đánh giá nghĩa, độ tự nhiên hay tính
                đúng ngữ pháp.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
      {dialog}
    </Screen>
  );
}
