import { router, type Href } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { englishDailyMinutes, englishGoals, englishSelfLevels, englishTopics, readEnglishProfilePreferences, saveEnglishProfilePreferences, type EnglishGoal, type EnglishProfilePreferences, type EnglishSelfLevel, type EnglishTopic } from "@/db/english/profile";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

const labels: Record<string, string> = {
  conversation: "Giao tiếp", work: "Công việc", study: "Học tập", exam: "Thi cử", reading: "Đọc hiểu",
  beginner: "Mới bắt đầu", basic: "Cơ bản", intermediate: "Trung cấp", "upper-intermediate": "Khá", advanced: "Nâng cao",
  technology: "Công nghệ", travel: "Du lịch", education: "Giáo dục", business: "Kinh doanh", lifestyle: "Đời sống", sports: "Thể thao", science: "Khoa học",
};

export default function EnglishProfile() {
  const db = useEnglishDatabase();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [value, setValue] = useState<EnglishProfilePreferences>({ goal: null, level: null, topics: [], dailyMinutes: 10 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true);
    void readEnglishProfilePreferences(db).then((stored) => { if (live) setValue(stored); }).catch(() => { if (live) setMessage("Chưa tải được tùy chọn học tiếng Anh; các dữ liệu học khác không bị thay đổi."); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [db]));

  const update = (patch: Partial<EnglishProfilePreferences>) => setValue((current) => ({ ...current, ...patch }));
  const toggleTopic = (topic: EnglishTopic) => update({ topics: value.topics.includes(topic) ? value.topics.filter((item) => item !== topic) : [...value.topics, topic] });
  const save = async () => {
    setSaving(true); setMessage("");
    try { const stored = await saveEnglishProfilePreferences(db, value); setValue(stored); setMessage("Đã lưu lựa chọn tiếng Anh trên thiết bị. Lựa chọn này chưa tự xếp hạng nội dung."); }
    catch { setMessage("Chưa lưu được lựa chọn. Những cài đặt hiện tại vẫn được giữ."); }
    finally { setSaving(false); }
  };
  if (loading) return <Screen title="Hồ sơ tiếng Anh"><Text style={{ color: p.textSecondary }}>Đang tải tùy chọn…</Text></Screen>;
  return (
    <Screen hideTitle title="Hồ sơ tiếng Anh" subtitle="Mục tiêu và sở thích học của bạn.">
      <Pressable accessibilityRole="button" onPress={() => router.push("/english/onboarding" as Href)} style={s.link}><Text style={{ color: p.primary, fontWeight: "800" }}>Thiết lập từng bước →</Text></Pressable>
      <Text style={[s.heading, { color: p.textPrimary }]}>Bạn học tiếng Anh để làm gì?</Text>
      <View style={s.wrap}>{englishGoals.map((item) => <Choice key={item} label={labels[item]!} selected={value.goal === item} onPress={() => update({ goal: item as EnglishGoal })} />)}</View>
      <Text style={[s.heading, { color: p.textPrimary }]}>Bạn tự mô tả mức hiện tại</Text>
      <Text style={{ color: p.textMuted, lineHeight: 20 }}>Đây là lựa chọn tự khai, không phải bài thi hoặc chứng nhận CEFR.</Text>
      <View style={s.wrap}>{englishSelfLevels.map((item) => <Choice key={item} label={labels[item]!} selected={value.level === item} onPress={() => update({ level: item as EnglishSelfLevel })} />)}</View>
      <Text style={[s.heading, { color: p.textPrimary }]}>Chủ đề bạn quan tâm</Text>
      <View style={s.wrap}>{englishTopics.map((item) => <Choice key={item} label={labels[item]!} selected={value.topics.includes(item)} onPress={() => toggleTopic(item)} />)}</View>
      <Text style={[s.heading, { color: p.textPrimary }]}>Thời gian học mỗi ngày</Text>
      <View style={s.wrap}>{englishDailyMinutes.map((minutes) => <Choice key={minutes} label={`${minutes} phút`} selected={value.dailyMinutes === minutes} onPress={() => update({ dailyMinutes: minutes })} />)}</View>
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={[s.primary, { backgroundColor: p.primary, opacity: saving ? 0.6 : 1 }]}><Text style={s.primaryText}>{saving ? "Đang lưu…" : "Lưu tùy chọn"}</Text></Pressable>
      {message ? <Text accessibilityLiveRegion="polite" style={{ color: p.textSecondary, lineHeight: 21 }}>{message}</Text> : null}
      <View style={[s.note, { backgroundColor: p.surface, borderColor: p.border }]}><Text style={[s.noteTitle, { color: p.textPrimary }]}>Thông tin học thật</Text><Text style={{ color: p.textSecondary, lineHeight: 21 }}>Số từ, lịch ôn và hoạt động được lấy từ bộ từ và lịch sử trên thiết bị. Streak, thành tích, nội dung đã tải và đồng bộ đám mây chỉ hiện khi có dữ liệu hoặc dịch vụ thực.</Text></View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/profile" as Href)} style={s.link}><Text style={{ color: p.primary, fontWeight: "800" }}>Ngôn ngữ, thông báo và cài đặt ứng dụng →</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/stats" as Href)} style={s.link}><Text style={{ color: p.primary, fontWeight: "800" }}>Thống kê học tiếng Anh →</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/hsk" as Href)} style={s.link}><Text style={{ color: p.primary, fontWeight: "800" }}>Khung tự định hướng CEFR →</Text></Pressable>
    </Screen>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[s.choice, { backgroundColor: selected ? p.primaryLight : p.surface, borderColor: selected ? p.primary : p.border }]}><Text style={{ color: selected ? p.primary : p.textPrimary, fontWeight: selected ? "900" : "700" }}>{selected ? "✓ " : ""}{label}</Text></Pressable>;
}

const s = StyleSheet.create({ heading: { fontSize: 18, fontWeight: "900", marginTop: 8 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { minHeight: 44, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center" }, primary: { minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" }, primaryText: { color: "white", fontSize: 16, fontWeight: "900" }, note: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 }, noteTitle: { fontSize: 17, fontWeight: "900" }, link: { minHeight: 48, justifyContent: "center" } });
