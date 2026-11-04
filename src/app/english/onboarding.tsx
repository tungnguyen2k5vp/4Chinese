import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { defaultEnglishProfilePreferences, englishDailyMinutes, englishGoals, englishSelfLevels, englishTopics, readEnglishProfilePreferences, saveEnglishProfilePreferences, type EnglishProfilePreferences } from "@/db/english/profile";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

const labels: Record<string, string> = {
  conversation: "Giao tiếp", work: "Công việc", study: "Học tập", exam: "Thi cử", reading: "Đọc hiểu",
  beginner: "Mới bắt đầu", basic: "Cơ bản", intermediate: "Trung cấp", "upper-intermediate": "Khá", advanced: "Nâng cao",
  technology: "Công nghệ", travel: "Du lịch", education: "Giáo dục", business: "Kinh doanh", lifestyle: "Đời sống", sports: "Thể thao", science: "Khoa học",
};
const headings = ["Bạn học tiếng Anh để làm gì?", "Bạn tự mô tả mức hiện tại", "Bạn quan tâm chủ đề nào?", "Bạn muốn học bao lâu mỗi ngày?"];

/** Optional English-only setup. Only completion writes existing English preferences. */
export default function EnglishOnboarding() {
  const db = useEnglishDatabase();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [step, setStep] = useState(0);
  const [value, setValue] = useState<EnglishProfilePreferences>(defaultEnglishProfilePreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void readEnglishProfilePreferences(db).then((stored) => { if (live) setValue(stored); })
      .catch(() => { if (live) setError("Chưa đọc được tùy chọn. Hãy quay lại hồ sơ để thử lại."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [db]);

  const finish = async () => {
    if (saving) return;
    setSaving(true); setError("");
    try {
      await saveEnglishProfilePreferences(db, value);
      router.replace("/(tabs)" as Href);
    } catch {
      setError("Chưa lưu được lựa chọn. Hãy thử lại; bộ từ và tiến độ học vẫn được giữ.");
    } finally { setSaving(false); }
  };
  const ready = step === 0 ? !!value.goal : step === 1 ? !!value.level : step === 2 ? value.topics.length > 0 : true;
  const options: readonly (string | number)[] = step === 0 ? englishGoals : step === 1 ? englishSelfLevels : step === 2 ? englishTopics : englishDailyMinutes;
  const isSelected = (option: string | number) => step === 0 ? value.goal === option : step === 1 ? value.level === option : step === 2 ? value.topics.includes(option as EnglishProfilePreferences["topics"][number]) : value.dailyMinutes === option;
  const select = (option: string | number) => setValue((current) => {
    if (step === 0) return { ...current, goal: option as EnglishProfilePreferences["goal"] };
    if (step === 1) return { ...current, level: option as EnglishProfilePreferences["level"] };
    if (step === 2) {
      const topic = option as EnglishProfilePreferences["topics"][number];
      return { ...current, topics: current.topics.includes(topic) ? current.topics.filter((item) => item !== topic) : [...current.topics, topic] };
    }
    return { ...current, dailyMinutes: option as EnglishProfilePreferences["dailyMinutes"] };
  });
  return <Screen key={step} hideHeader title="Bắt đầu học tiếng Anh">
    <View style={{ gap: 12, paddingTop: 16 }}>
    <Text style={{ color: p.primary, fontWeight: "800" }}>Bước {step + 1}/4</Text>
    <View style={s.progress}>{headings.map((_, index) => <View key={index} style={[s.bar, { backgroundColor: index <= step ? p.primary : p.border }]} />)}</View>
    {loading ? <ActivityIndicator accessibilityLabel="Đang tải tùy chọn" color={p.primary} /> : <>
      <Text style={[s.heading, { color: p.textPrimary }]}>{headings[step]}</Text>
      <Text style={{ color: p.textSecondary, lineHeight: 22 }}>{step === 1 ? "Mức tự chọn giúp mô tả nhu cầu, không phải kết quả thi hoặc chứng nhận CEFR." : step === 2 ? "Chọn một hoặc nhiều chủ đề. Gợi ý nội dung chỉ xuất hiện khi có nguồn phù hợp." : step === 3 ? "Đây là mục tiêu cá nhân; app không tự thay đổi số từ hoặc lịch ôn." : "Chọn mục tiêu phù hợp nhất với bạn."}</Text>
      <View style={[s.options, step === 2 && s.topicOptions]}>{options.map((option) => {
        const selected = isSelected(option);
        return <Pressable key={option} accessibilityRole={step === 2 ? "checkbox" : "radio"} accessibilityState={{ checked: selected }} onPress={() => select(option)} style={[s.option, step === 2 && s.topicOption, { backgroundColor: selected ? p.primaryLight : p.surface, borderColor: selected ? p.primary : p.border }]}><Text style={{ color: selected ? p.primary : p.textPrimary, fontSize: 17, fontWeight: "800" }}>{selected ? "✓ " : ""}{typeof option === "number" ? `${option} phút` : labels[option]}</Text></Pressable>;
      })}</View>
      {error ? <Text accessibilityRole="alert" style={{ color: p.error }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={!ready || saving || !!error && step < 3} onPress={() => step < 3 ? setStep(step + 1) : void finish()} style={[s.primary, { backgroundColor: p.primary, opacity: !ready || saving ? 0.5 : 1 }]}><Text style={s.primaryText}>{saving ? "Đang lưu…" : step < 3 ? "Tiếp tục" : "Hoàn tất và vào trang chủ"}</Text></Pressable>
      {step > 0 ? <Pressable accessibilityRole="button" disabled={saving} onPress={() => setStep(step - 1)} style={s.secondary}><Text style={{ color: p.primary, fontWeight: "800" }}>Quay lại bước trước</Text></Pressable> : null}
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => router.replace("/(tabs)" as Href)} style={s.secondary}><Text style={{ color: p.textSecondary }}>Để sau · vào trang chủ</Text></Pressable>
    </>}
    </View>
  </Screen>;
}

const s = StyleSheet.create({ progress: { flexDirection: "row", gap: 8 }, bar: { height: 5, borderRadius: 3, flex: 1 }, heading: { fontSize: 26, lineHeight: 34, fontWeight: "900", marginTop: 8 }, options: { gap: 10, marginVertical: 12 }, topicOptions: { flexDirection: "row", flexWrap: "wrap" }, topicOption: { flexBasis: "47%", flexGrow: 1 }, option: { minHeight: 58, borderRadius: 16, borderWidth: 1.5, padding: 16, justifyContent: "center" }, primary: { minHeight: 54, borderRadius: 16, padding: 12, alignItems: "center", justifyContent: "center" }, primaryText: { color: "white", fontSize: 16, fontWeight: "900" }, secondary: { minHeight: 44, justifyContent: "center", alignItems: "center" } });
