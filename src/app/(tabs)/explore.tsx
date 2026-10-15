import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { EnglishQuickDictionary } from "@/components/english/EnglishQuickDictionary";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { EnglishAvailability } from "@/services/languages/LanguageRuntime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export default function EnglishExploreTab() {
  const { preferences } = useLearningLanguage();
  const theme = useTheme();
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [query, setQuery] = useState("");
  if (preferences.learningLanguage !== "en") return <Screen title="Khám phá"><Text style={{ color: theme.textPrimary }}>Tab này chỉ dùng trong chế độ tiếng Anh.</Text></Screen>;

  return <EnglishAvailability><ExploreContent dictionaryOpen={dictionaryOpen} setDictionaryOpen={setDictionaryOpen} query={query} setQuery={setQuery} /></EnglishAvailability>;
}

function ExploreContent({ dictionaryOpen, setDictionaryOpen, query, setQuery }: {
  dictionaryOpen: boolean;
  setDictionaryOpen: (value: boolean) => void;
  query: string;
  setQuery: (value: string) => void;
}) {
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const openDictionary = (value = "") => { setQuery(value); setDictionaryOpen(true); };
  return (
    <Screen title="Khám phá tiếng Anh" subtitle="Đọc, nghe và lưu từ trong ngữ cảnh.">
      <Pressable accessibilityRole="button" onPress={() => openDictionary()} style={[s.search, { backgroundColor: p.surface, borderColor: p.border }]}>
        <Ionicons name="search" size={20} color={p.primary} /><Text style={{ color: p.textMuted, flex: 1 }}>Tra từ tiếng Anh hoặc nghĩa tiếng Việt</Text><Ionicons name="arrow-forward" size={18} color={p.primary} />
      </Pressable>
      <Text style={[s.heading, { color: p.textPrimary }]}>Bài đọc và truyện ngắn</Text>
      <HubCard icon="book-outline" color={p.reading} title="Thư viện bài đọc gốc" description="4 bài đọc/truyện có câu hỏi và tra từ. Bài thử đang chờ duyệt; mở thư viện để tự chọn xem, không phải giáo trình CEFR đã xác nhận." action="Mở thư viện bài đọc" onPress={() => router.push('/english/library' as Href)} />
      <HubCard icon="headset-outline" color={p.spelling} title="Hội thoại và luyện nghe" description="6 hội thoại nhiều lượt: nghe mẫu, nhắc lại và đóng vai. Giọng đọc máy, không có điểm phát âm giả." action="Chọn hội thoại thử" onPress={() => router.push('/english-speaking' as Href)} />
      <Text style={[s.heading, { color: p.textPrimary }]}>Tài liệu và từ của bạn</Text>
      <HubCard icon="book-outline" color={p.reading} title="Reader cá nhân" description="Dán văn bản của bạn, chạm từ để xem những thẻ cá nhân đã lưu; bản nháp được lưu cục bộ." action="Mở Reader" onPress={() => router.push("/english/reader" as Href)} />
      <HubCard icon="albums-outline" color={p.primary} title="Bộ từ của tôi" description="Tạo bộ từ, nhập nhiều từ, chia sẻ bằng mã và ôn lại theo lịch SRS hiện tại." action="Mở bộ từ" onPress={() => router.push("/english/decks" as Href)} />
      <HubCard icon="mic-outline" color={p.spelling} title="Luyện nói" description="Câu mẫu do ứng dụng biên soạn, TTS và nhận dạng offline khi hệ điều hành có mô hình phù hợp. Không có chấm điểm AI." action="Luyện nói" onPress={() => router.push("/english-speaking" as Href)} />
      <HubCard icon="stats-chart-outline" color={p.cefr} title="Tiến độ & cấp độ" description="Xem số liệu thực của lượt ôn. CEFR hiện là khung tự định hướng, chưa phải bài kiểm tra xếp trình độ." action="Xem tiến độ" onPress={() => router.push("/(tabs)/stats" as Href)} />
      <HubCard icon="person-circle-outline" color={p.primary} title="Hồ sơ & cài đặt" description="Mở cài đặt tiếng Anh và đổi ngôn ngữ mà không xóa tiến độ." action="Mở cài đặt" onPress={() => router.push("/(tabs)/profile" as Href)} />
      <View style={[s.unavailable, { backgroundColor: p.surfaceSubtle, borderColor: p.border }]}>
        <Text style={[s.unavailableTitle, { color: p.textPrimary }]}>Nguồn nội dung</Text>
        <Text style={{ color: p.textSecondary, lineHeight: 21 }}>Bài thử gốc được ghi rõ trạng thái cần duyệt. Video, sách và bài báo bên ngoài chưa có nguồn/phạm vi phân phối đã xác nhận nên không hiển thị catalogue giả.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/english/dictionary-source" as Href)} style={s.textAction}><Text style={{ color: p.primary, fontWeight: "800" }}>Xem nguồn và tình trạng giấy phép từ điển</Text></Pressable>
      </View>
      {dictionaryOpen ? <EnglishQuickDictionary initialQuery={query} onClose={() => setDictionaryOpen(false)} /> : null}
    </Screen>
  );
}

function HubCard({ icon, color, title, description, action, onPress }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; description: string; action: string; onPress: () => void }) {
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  return <View style={[s.card, { backgroundColor: p.surface, borderColor: p.border }]}>
    <View style={[s.icon, { backgroundColor: `${color}18` }]}><Ionicons name={icon} size={24} color={color} /></View>
    <Text style={[s.cardTitle, { color: p.textPrimary }]}>{title}</Text>
    <Text style={{ color: p.textSecondary, lineHeight: 21 }}>{description}</Text>
    <Pressable accessibilityRole="button" onPress={onPress} style={s.textAction}><Text style={{ color, fontWeight: "900" }}>{action} →</Text></Pressable>
  </View>;
}

const s = StyleSheet.create({ search: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 }, heading: { fontSize: 20, fontWeight: "900", marginTop: 8 }, card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 }, icon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" }, cardTitle: { fontSize: 18, fontWeight: "900" }, textAction: { minHeight: 44, justifyContent: "center" }, unavailable: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 }, unavailableTitle: { fontSize: 18, fontWeight: "900" } });
