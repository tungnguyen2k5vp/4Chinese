import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { themedCard } from "@/constants/design";
import { listExamAttempts } from "@/db/exam";
import { listVocabulary } from "@/db/repository";
import { originalPracticeBank, practiceDurations, type PracticeDuration } from "@/services/exam/practice-bank";
import { getExamRemaining, getExamResult, type ExamAttempt } from "@/services/exam/session";
import { useTheme } from "@/theme/ThemeProvider";
import type { HskBand, Vocabulary } from "@/types/models";

const bands: HskBand[] = [1, 2, 3, 4, 5, 6, "7-9"];
const timeLabel = (seconds: number) => seconds === 0 ? "Đã hết giờ · chờ nộp" : `Còn ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function ExamCenterContent({ initialBand = 1, onBandChange }: { initialBand?: HskBand; onBandChange?: (band: HskBand) => void }) {
  const db = useSQLiteContext(); const theme = useTheme();
  const [localBand, setBand] = useState(initialBand);
  const band = onBandChange ? initialBand : localBand;
  const [minutes, setMinutes] = useState<PracticeDuration>(5);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0); const [showAllActive, setShowAllActive] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(""); setVocabulary([]);
    void Promise.all([listExamAttempts(db), listVocabulary(db, { band, filter: "all", limit: 500 })])
      .then(([saved, words]) => { if (live) { setAttempts(saved); setVocabulary(words); } })
      .catch(() => { if (live) setError("Chưa tải được bài và lịch sử. Dữ liệu đã lưu không bị xóa."); })
      .finally(() => { if (live) setLoading(false); });
    const timer = setInterval(() => { if (live) setNow(Date.now()); }, 1000);
    return () => { live = false; clearInterval(timer); };
  // refresh intentionally reruns the focused query after a failed load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band, db, refresh]));
  const active = attempts.filter(item => item.status === "IN_PROGRESS");
  const submitted = attempts.filter(item => item.status === "SUBMITTED");
  const bank = originalPracticeBank.find(item => item.profile.level === String(band));
  const eligibleCount = new Set(vocabulary.map(word => word.primaryMeaningVi.trim()).filter(meaning => meaning && !/biến thể|viết tắt|\[.*\]|\\u[0-9a-f]/i.test(meaning)).map(meaning => meaning.toLocaleLowerCase("vi"))).size;
  const vocabularyCount = eligibleCount >= 3 ? Math.min(minutes === 5 ? 10 : 20, eligibleCount) : 0;
  const open = (attempt: ExamAttempt) => router.push({ pathname: attempt.status === "SUBMITTED" ? "/exam/result" : "/exam/session", params: { id: attempt.id } } as Href);
  const setup = (kind: "context" | "vocabulary") => router.push({ pathname: "/exam/setup", params: { band: String(band), minutes: String(minutes), kind } } as Href);
  const text = { color: theme.textPrimary, fontSize: 15 };
  const muted = { color: theme.textMuted, fontSize: 13, lineHeight: 19 };
  const heading = { color: theme.textPrimary, fontSize: 18, fontWeight: "800" as const };
  const chip = (selected: boolean) => ({ minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : theme.surface, justifyContent: "center" as const });
  const skills = [
    { label: "Nghe", hint: "Nghe và ghép nghĩa", icon: "headset-outline", route: "/listening" },
    { label: "Đọc", hint: "Truyện và đọc hiểu", icon: "book-outline", route: "/stories" },
    { label: "Viết & dịch", hint: "Tự luyện câu, đoạn", icon: "create-outline", route: "/exam/skills" },
    { label: "Nói", hint: "Giao tiếp, phát âm", icon: "mic-outline", route: "/speaking" },
  ] as const;
  return <View style={{ gap: 16 }}>
    {active.length > 0 ? <View style={{ ...themedCard(theme), gap: 10 }}>
      <Text style={heading}>Tiếp tục bài đang làm · {active.length}</Text>
      {(showAllActive ? active : active.slice(0, 3)).map(attempt => {
        const answered = Object.keys(attempt.snapshot.answers).length; const total = attempt.snapshot.questions.length;
        return <Pressable key={attempt.id} accessibilityRole="button" onPress={() => open(attempt)} style={{ gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderColor: theme.border, minHeight: 64 }}>
          <Text style={{ ...text, fontWeight: "700" }}>{attempt.snapshot.profile.name} ›</Text>
          <Text style={muted}>HSK {attempt.snapshot.profile.level} · {answered}/{total} câu · {timeLabel(getExamRemaining(attempt, now))}</Text>
          <View style={{ height: 5, backgroundColor: theme.border, borderRadius: 3 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: theme.primary, width: `${total ? Math.min(100, answered / total * 100) : 0}%` }} /></View>
        </Pressable>;
      })}
      {active.length > 3 ? <PrimaryButton variant="ghost" label={showAllActive ? "Thu gọn" : "Xem tất cả bài đang làm"} onPress={() => setShowAllActive(value => !value)} /> : null}
    </View> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {bands.map(value => <Pressable key={String(value)} accessibilityRole="radio" accessibilityState={{ checked: band === value }} accessibilityLabel={`HSK ${value}`} onPress={() => { setBand(value); onBandChange?.(value); }} style={chip(band === value)}><Text style={{ ...text, color: band === value ? theme.onPrimary : theme.textPrimary, fontWeight: "700" }}>HSK {value}</Text></Pressable>)}
    </ScrollView>
    <View style={{ gap: 8 }}>
      <Text style={heading}>Luyện ngắn theo thời gian của bạn</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{practiceDurations.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: minutes === value }} onPress={() => setMinutes(value)} style={chip(minutes === value)}><Text style={{ ...text, color: minutes === value ? theme.onPrimary : theme.textPrimary }}>{value} phút</Text></Pressable>)}</View>
      <Text style={muted}>Đây là giới hạn thời gian bài luyện, không phải đề HSK chính thức.</Text>
    </View>
    <Text style={heading}>Bài luyện HSK {band}</Text>
    {loading ? <ActivityIndicator accessibilityLabel="Đang tải bài luyện" color={theme.primary} /> : null}
    {error ? <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={{ ...text, color: theme.error }}>{error}</Text><PrimaryButton variant="secondary" label="Thử tải lại" onPress={() => setRefresh(value => value + 1)} /></View> : null}
    {bank ? <Pressable accessibilityRole="button" disabled={loading || !!error} onPress={() => setup("context")} style={{ ...themedCard(theme), gap: 6, minHeight: 72 }}>
      <Text style={{ ...text, fontWeight: "800" }}>{bank.profile.name} ›</Text>
      <Text style={muted}>{bank.questions.length} câu · đọc hiểu & ngữ pháp trong ngữ cảnh · {minutes} phút</Text>
    </Pressable> : <Text style={muted}>Chưa có bài đọc cho cấp độ này.</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !vocabularyCount || loading || !!error }} disabled={!vocabularyCount || loading || !!error} onPress={() => setup("vocabulary")} style={{ ...themedCard(theme), gap: 6, minHeight: 72 }}>
      <Text style={{ ...text, fontWeight: "800" }}>Từ vựng và nghĩa ›</Text>
      <Text style={muted}>{loading ? "Đang kiểm tra kho từ…" : vocabularyCount ? `${vocabularyCount} câu · chọn nghĩa · ${minutes} phút` : "Chưa đủ từ có nghĩa riêng biệt để tạo bài."}</Text>
    </Pressable>
    <Text style={heading}>Tự luyện từng kỹ năng</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{skills.map(skill => <Pressable key={skill.label} accessibilityRole="button" accessibilityLabel={`${skill.label}: ${skill.hint}`} onPress={() => router.push(skill.route as Href)} style={{ ...themedCard(theme), flexBasis: "46%", flexGrow: 1, gap: 6, minHeight: 88 }}><Ionicons name={skill.icon} size={23} color={theme.primaryText} /><Text style={{ ...text, fontWeight: "800" }}>{skill.label}</Text><Text style={muted}>{skill.hint}</Text></Pressable>)}</View>
    <View style={{ gap: 8 }}><Text style={heading}>Kết quả gần đây</Text>
      {!loading && !submitted.length ? <Text style={muted}>Chưa có bài đã nộp. Kết quả sẽ xuất hiện sau bài đầu tiên.</Text> : submitted.slice(0, 3).map(attempt => { const result = getExamResult(attempt); return <Pressable key={attempt.id} accessibilityRole="button" onPress={() => open(attempt)} style={{ minHeight: 56, paddingVertical: 8, gap: 3, borderBottomWidth: 1, borderColor: theme.border }}><Text style={text}>HSK {attempt.snapshot.profile.level} · {result.correct}/{result.total} đúng · {result.percent}% ›</Text><Text style={muted}>{new Date(attempt.startedAtMs).toLocaleDateString("vi-VN")} · {attempt.snapshot.profile.name}</Text></Pressable>; })}
      <PrimaryButton variant="ghost" label="Lịch sử bài luyện" onPress={() => router.push("/exam/history" as Href)} />
      <PrimaryButton variant="secondary" label="Xem kỹ năng cần luyện thêm" onPress={() => router.push("/exam/readiness" as Href)} />
    </View>
  </View>;
}
