import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { ChineseScreen } from "@/components/ChineseScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { listExamAttempts } from "@/db/exam";
import { getExamResult, type ExamAttempt } from "@/services/exam/session";
import { useTheme } from "@/theme/ThemeProvider";

export default function ExamHistory() {
  const db = useSQLiteContext(); const theme = useTheme();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState<"all" | "IN_PROGRESS" | "SUBMITTED">("all");
  useFocusEffect(useCallback(() => { let live = true; const requestVersion = refresh; setLoading(true); setError(""); void listExamAttempts(db).then(rows => { if (live && requestVersion === refresh) setAttempts(rows); }).catch(() => { if (live && requestVersion === refresh) setError("Chưa tải được lịch sử."); }).finally(() => { if (live && requestVersion === refresh) setLoading(false); }); return () => { live = false; }; }, [db, refresh]));
  const visible = attempts.filter(item => filter === "all" || item.status === filter);
  return <ChineseScreen>
    <Text style={{ color: theme.textMuted, fontSize: 14 }}>Tối đa 30 bài gần đây trên thiết bị này.</Text>
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{([{ value: "all", label: "Tất cả" }, { value: "IN_PROGRESS", label: "Đang làm" }, { value: "SUBMITTED", label: "Đã nộp" }] as const).map(item => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: filter === item.value }} onPress={() => setFilter(item.value)} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 12, borderRadius: 12, backgroundColor: filter === item.value ? theme.primarySoft : theme.surface }}><Text style={{ color: theme.textPrimary }}>{item.label}</Text></Pressable>)}</View>
    {loading ? <ActivityIndicator color={theme.primary} /> : null}
    {error ? <><Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text><PrimaryButton label="Thử lại" onPress={() => setRefresh(value => value + 1)} /></> : null}
    {!loading && !error && !visible.length ? <Text style={{ color: theme.textMuted }}>Chưa có bài trong nhóm này.</Text> : null}
    {visible.map(attempt => <Pressable key={attempt.id} accessibilityRole="button" onPress={() => router.push({ pathname: attempt.status === "SUBMITTED" ? "/exam/result" : "/exam/session", params: { id: attempt.id } } as Href)} style={{ paddingVertical: 12, minHeight: 64, gap: 5, borderBottomWidth: 1, borderColor: theme.border }}><Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: "700" }}>{attempt.snapshot.profile.name} ›</Text><Text style={{ color: theme.textMuted, fontSize: 13 }}>HSK {attempt.snapshot.profile.level} · {new Date(attempt.startedAtMs).toLocaleString("vi-VN")}</Text><Text style={{ color: theme.primaryText }}>{attempt.status === "SUBMITTED" ? `${getExamResult(attempt).correct}/${attempt.snapshot.questions.length} đúng · ${getExamResult(attempt).percent}%` : `${Object.keys(attempt.snapshot.answers).length}/${attempt.snapshot.questions.length} đã trả lời · đang làm`}</Text></Pressable>)}
  </ChineseScreen>;
}
