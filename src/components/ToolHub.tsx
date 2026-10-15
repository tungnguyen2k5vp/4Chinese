import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { LearningLandscape, type LandscapeMood } from "@/components/visual/LearningLandscape";
import type { SceneName } from "@/components/visual/scene-registry";
import { radius, spacing } from "@/constants/design";
import type { ToolGroup } from "@/services/app/tool-hubs";
import { useTheme } from "@/theme/ThemeProvider";

function toolIcon(id: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    review: "repeat", weak: "analytics-outline", mistakes: "document-text-outline", upcoming: "calendar-outline",
    "recording-library": "mic-outline", "pronunciation-pairs": "ear-outline", "listening-library": "headset-outline", listening: "volume-high-outline", tones: "pulse-outline", shadowing: "radio-outline", speaking: "mic-circle-outline", conversation: "chatbubbles-outline",
    hanzi: "brush-outline", grammar: "git-branch-outline", "grammar-focus": "bulb-outline", confusables: "swap-horizontal-outline", exam: "school-outline", written: "create-outline", "timed-speaking": "timer-outline",
    stories: "book-outline", reader: "reader-outline", "global-search": "search-outline", decks: "albums-outline", dictionary: "library-outline", "grammar-reference": "document-text-outline", hsk: "layers-outline",
  };
  return icons[id] ?? "sparkles-outline";
}

function toolTone(id: string, theme: ReturnType<typeof useTheme>) {
  if (["reader", "stories", "listening-library"].includes(id)) return { color: theme.skillColors.reading, soft: theme.mode === "dark" ? "#17382F" : "#E8F3EC" };
  if (["speaking", "conversation", "tones", "shadowing", "pronunciation-pairs", "recording-library"].includes(id)) return { color: theme.skillColors.speaking, soft: theme.mode === "dark" ? "#3A2E39" : "#F5EAF0" };
  if (["exam", "written", "timed-speaking"].includes(id)) return { color: theme.skillColors.exam, soft: theme.mode === "dark" ? "#27324B" : "#E9EDF6" };
  if (["grammar", "grammar-focus", "grammar-reference"].includes(id)) return { color: theme.skillColors.grammar, soft: theme.mode === "dark" ? "#302A4A" : "#F0EDFA" };
  if (["review", "weak", "mistakes", "upcoming"].includes(id)) return { color: theme.skillColors.review, soft: theme.mode === "dark" ? "#3C341E" : "#F8F0DB" };
  return { color: theme.primaryText, soft: theme.primarySoft };
}

export function ToolHub({
  title,
  subtitle,
  groups,
  scene,
}: {
  title: string;
  subtitle: string;
  groups: readonly ToolGroup[];
  scene?: SceneName;
}) {
  const theme = useTheme();
  const mood: LandscapeMood = title === "Thư viện" ? "reading" : "progress";
  const styles = StyleSheet.create({
    hero: { overflow: "hidden", borderRadius: radius.lg, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    heroArt: { position: "relative" },
    heroLabel: { position: "absolute", left: spacing.md, bottom: spacing.md, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.9)", color: "#334239", fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
    heroBody: { padding: spacing.md, gap: 4 },
    heroKicker: { color: theme.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
    heroTitle: { color: theme.textPrimary, fontSize: 19, lineHeight: 25, fontWeight: "900" },
    heroCopy: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
    group: { gap: spacing.md, paddingTop: spacing.md },
    groupHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.sm },
    groupTitle: { flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: "900" },
    groupCount: { color: theme.textMuted, fontSize: 11, fontWeight: "800" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    tile: { flexBasis: "46%", flexGrow: 1, minHeight: 96, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, gap: spacing.sm },
    tileIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    tileBottom: { gap: 5 },
    tileTitle: { color: theme.textPrimary, fontSize: 16, lineHeight: 23, fontWeight: "800" },
    tileDescription: { color: theme.textMuted, fontSize: 13, lineHeight: 19 },
    tileArrow: { position: "absolute", right: spacing.md, top: spacing.md },
  });
  return (
    <Screen title={title} subtitle={subtitle} hideHeader>
      <View style={styles.hero}>
        <View style={styles.heroArt}><LearningLandscape mood={mood} scene={scene ?? (title === "Thư viện" ? "read" : "learn")} height={64} /><Text style={styles.heroLabel}>{title === "Thư viện" ? "GÓC ĐỌC VÀ KHÁM PHÁ" : "LUYỆN TẬP MỖI NGÀY"}</Text></View>
        <View style={styles.heroBody}><Text style={styles.heroKicker}>{title === "Thư viện" ? "KHÔNG GIAN KHÁM PHÁ" : "PHÒNG LUYỆN TẬP"}</Text><Text style={styles.heroTitle}>{title === "Thư viện" ? "Đọc sâu, nghe kỹ, lưu điều hay" : "Chọn đúng kỹ năng cho hôm nay"}</Text><Text style={styles.heroCopy}>{title === "Thư viện" ? "Từ truyện ngắn đến nội dung cá nhân, mọi thứ bạn đọc đều ở trong tầm tay." : "Mỗi công cụ có mục tiêu riêng. Tiến độ và lịch ôn hiện tại được giữ nguyên."}</Text></View>
      </View>
      {groups.map((group, groupIndex) => (
        <View key={group.title} style={styles.group}>
          <View style={styles.groupHead}><Text accessibilityRole="header" style={styles.groupTitle}>{group.title}</Text><Text style={styles.groupCount}>{String(groupIndex + 1).padStart(2, "0")} / {String(groups.length).padStart(2, "0")}</Text></View>
          <View style={styles.grid}>
            {group.tools.map((tool) => {
              const tone = toolTone(tool.id, theme);
              return <MotionPressable key={tool.id} haptic accessibilityLabel={`${tool.title}. ${tool.description}`} onPress={() => router.push(tool.href as unknown as Href)} style={styles.tile}>
                <View style={[styles.tileIcon, { backgroundColor: tone.soft }]}><Ionicons name={toolIcon(tool.id)} size={21} color={tone.color} /></View>
                <View style={styles.tileBottom}><Text style={styles.tileTitle}>{tool.title}</Text><Text style={styles.tileDescription}>{tool.description}</Text></View>
                <Ionicons name="arrow-forward" size={15} color={tone.color} style={styles.tileArrow} />
              </MotionPressable>;
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}
