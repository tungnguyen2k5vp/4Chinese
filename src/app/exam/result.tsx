import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { getExamAttempt } from "@/db/exam";
import { examSkillLabels } from "@/services/exam/engine";
import {
  getPracticeEvidence,
  practiceFocusLabels,
} from "@/services/exam/practice-bank";
import { getExamResult, type ExamAttempt } from "@/services/exam/session";
import { useTheme } from "@/theme/ThemeProvider";
import { visualModePresentation } from "@/theme/visual-modes";

export default function ExamResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const visualMode = visualModePresentation(theme, "EXAM");
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const saved = await getExamAttempt(db, id);
      if (saved.status !== "SUBMITTED") {
        router.replace({
          pathname: "/exam/session",
          params: { id },
        } as unknown as Href);
        return;
      }
      setAttempt(saved);
    } catch {
      setError("Không đọc được kết quả. Lịch sử vẫn được giữ trên máy.");
    } finally {
      setLoading(false);
    }
  }, [db, id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const result = attempt ? getExamResult(attempt) : null;
  const evidence = attempt
    ? getPracticeEvidence(attempt.snapshot.questions, attempt.snapshot.answers)
    : null;
  return (
    <Screen
      title="Kết quả bài luyện"
      subtitle="Tỉ lệ đúng của bài luyện gốc, không phải điểm thi quy đổi."
    >
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? (
        <>
          <Text accessibilityRole="alert" style={{ color: theme.error }}>
            {error}
          </Text>
          <PrimaryButton label="Thử lại" onPress={() => void load()} />
        </>
      ) : null}
      {attempt && result && evidence ? (
        <>
          <View style={{ gap: 8, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border, borderLeftWidth: 4, borderLeftColor: visualMode.accent, backgroundColor: visualMode.surface }}>
            <Text style={{ color: visualMode.accent, fontSize: 12, fontWeight: "800", letterSpacing: 0.6 }}>KẾT QUẢ BÀI LUYỆN</Text>
            <Text style={{ color: theme.textPrimary, fontSize: 28, fontWeight: "800" }}>
              {result.correct}/{result.total} đúng · {result.percent}%
            </Text>
            <Text style={{ color: theme.textMuted }}>
              Thời gian: {Math.floor(result.elapsedSeconds / 60)} phút{" "}
              {result.elapsedSeconds % 60} giây
            </Text>
            <Text style={{ color: theme.textMuted }}>
              Bài luyện trong ứng dụng, không phải thang điểm HSK và không dự đoán kết quả thi.
            </Text>
          </View>
          {evidence.sections.map((section) => (
            <View key={section.skill} style={{ gap: 7, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 16, backgroundColor: theme.surface }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text style={{ color: theme.textPrimary, fontWeight: '800', flex: 1 }}>{examSkillLabels[section.skill]}</Text>
                <Text style={{ color: visualMode.accent, fontWeight: '900' }}>{section.evidence === 'MISSING' ? '—' : `${section.correct}/${section.total}`}</Text>
              </View>
              {section.evidence === "MISSING" || section.percent === null
                ? <Text style={{ color: theme.textMuted }}>Chưa đủ dữ liệu trong bài này; không tính là 0 điểm.</Text>
                : <><AnimatedProgressBar progress={section.percent / 100} color={visualMode.accent} trackColor={theme.border} accessibilityLabel={`${examSkillLabels[section.skill]}: ${section.percent} phần trăm`} /><Text style={{ color: theme.textMuted, fontSize: 12 }}>{section.percent}% · {section.unanswered} câu chưa trả lời</Text></>}
            </View>
          ))}
          <Text style={{ color: theme.textMuted, lineHeight: 24 }}>
            {evidence.limitationVi}
          </Text>
          <PrimaryButton
            label={`Luyện tiếp: ${practiceFocusLabels[evidence.recommendedFocus]}`}
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/exam",
                params: { focus: evidence.recommendedFocus },
              } as unknown as Href)
            }
          />
          {evidence.missingSkills.includes("LISTENING") ||
          evidence.weakestType === "LISTENING_CHOICE" ? (
            <PrimaryButton
              label="Bổ sung tự luyện nghe TTS (không phải điểm thi)"
              variant="ghost"
              onPress={() => router.push("/listening" as Href)}
            />
          ) : null}
          {evidence.missingSkills.some((skill) =>
            ["WRITING", "SPEAKING", "TRANSLATION"].includes(skill),
          ) ? (
            <PrimaryButton
              label="Bổ sung viết, dịch và nói tự luyện"
              variant="ghost"
              onPress={() => router.push("/exam/skills" as Href)}
            />
          ) : null}
          {result.questionTypes.map((group) => (
            <Text key={group.type} style={{ color: theme.textMuted }}>
              {group.type === "READING_COMPREHENSION"
                ? "Đọc hiểu"
                : group.type === "LANGUAGE_IN_CONTEXT" ||
                    group.type === "LEGACY_CONTEXT"
                  ? "Ngôn ngữ trong ngữ cảnh"
                  : group.type}
              : {group.correct}/{group.total} đúng
            </Text>
          ))}
          <Text style={{ color: theme.textPrimary, lineHeight: 24 }}>
            {result.wrongIds.length
              ? "Ưu tiên đọc lại giải thích các câu cần ôn bên dưới, rồi luyện thêm ngữ pháp trong ngữ cảnh."
              : "Bạn đã làm đúng bài này. Mẫu bài ngắn chưa đủ để kết luận sẵn sàng thi; hãy luyện thêm bài khác."}
          </Text>
          {attempt.snapshot.questions.map((question, index) => (
            <View
              key={question.id}
              style={{
                gap: 10,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: theme.textPrimary,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                Câu {index + 1} ·{" "}
                {attempt.snapshot.answers[question.id] === question.correctIndex
                  ? "Đúng"
                  : "Cần ôn"}
                {attempt.snapshot.flaggedIds.includes(question.id)
                  ? " · Đã đánh dấu xem lại"
                  : ""}
              </Text>
              <Text
                style={{
                  color: theme.textPrimary,
                  fontSize: 19,
                  lineHeight: 30,
                }}
              >
                {question.prompt}
              </Text>
              <Text style={{ color: theme.textMuted }}>
                Đã chọn:{" "}
                {question.choices[
                  attempt.snapshot.answers[question.id] ?? -1
                ] ?? "Chưa trả lời"}
              </Text>
              <Text style={{ color: theme.success }}>
                Đáp án: {question.choices[question.correctIndex]}
              </Text>
              <Text style={{ color: theme.textPrimary, lineHeight: 24 }}>
                {question.explanationVi}
              </Text>
            </View>
          ))}
          <PrimaryButton
            label="Luyện thêm ngữ pháp"
            variant="secondary"
            onPress={() => router.push("/grammar")}
          />
        </>
      ) : null}
      <PrimaryButton
        label="Về trung tâm luyện thi"
        variant="ghost"
        onPress={() => router.dismissTo("/exam" as Href)}
      />
    </Screen>
  );
}
