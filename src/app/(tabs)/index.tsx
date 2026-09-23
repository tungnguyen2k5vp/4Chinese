import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { DueReviewCard } from "@/components/DueReviewCard";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing, typography } from "@/constants/design";
import {
  getDashboardStats,
  getSettings,
  listVocabulary,
} from "@/db/repository";
import { useAppStore } from "@/stores/app-store";
import type { DashboardStats, Vocabulary } from "@/types/models";

const quick = [
  ["Bộ từ riêng", "albums", "/decks"],
  ["Học từ mới", "add-circle", "/learn/setup"],
  ["Ôn tập", "repeat", "/review"],
  ["Từ cần củng cố", "alert-circle", "/review/weak"],
  ["HSK", "layers", "/(tabs)/hsk"],
  ["Lịch ôn sắp tới", "time-outline", "/review/upcoming"],
  ["Luyện viết", "brush", "/writing"],
  ["Luyện nghe", "headset", "/review?mode=audio"],
] as const;

export default function Home() {
  const db = useSQLiteContext();
  const setSettings = useAppStore((s) => s.setSettings);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [daily, setDaily] = useState<Vocabulary | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;

      const refresh = async () => {
        const settings = await getSettings(db);
        const [next, words] = await Promise.all([
          getDashboardStats(db, settings.selectedHskBands),
          listVocabulary(db, { limit: 1 }),
        ]);
        if (live) {
          setStats(next);
          setDaily(words[0] ?? null);
          setSettings(settings);
        }
      };

      void refresh();
      return () => {
        live = false;
      };
    }, [db, setSettings]),
  );
  const settings = useAppStore((s) => s.settings);
  const progress = Math.min(
    1,
    (stats?.newToday ?? 0) / (settings?.dailyNewWordGoal ?? 10),
  );
  return (
    <Screen>
      <View style={styles.top}>
        <View>
          <Text style={styles.hello}>Xin chào 👋</Text>
          <Text style={styles.question}>Hôm nay bạn muốn học gì?</Text>
        </View>
        <View style={styles.streak}>
          <Text>🔥</Text>
          <Text style={styles.streakText}>{stats?.streak ?? 0} ngày</Text>
        </View>
      </View>
      <View style={[card, styles.focus]}>
        <View style={styles.focusTop}>
          <View style={styles.focusCopy}>
            <Text style={styles.eyebrow}>TIẾN ĐỘ HÔM NAY</Text>
            <Text style={styles.focusTitle}>
              {stats?.newToday ?? 0} / {settings?.dailyNewWordGoal ?? 10} từ mới
            </Text>
            <Text style={styles.softText}>
              {stats?.due ?? 0} từ đang chờ ôn
            </Text>
          </View>
          <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <PrimaryButton
          label="Tiếp tục học"
          onPress={() => router.push("/learn/setup")}
        />
      </View>
      <DueReviewCard
        count={stats?.due ?? 0}
        onPress={() => router.push("/review")}
      />
      <View>
        <Text style={styles.section}>Học nhanh</Text>
        <View style={styles.quickGrid}>
          {quick.map(([label, icon, href]) => (
            <Pressable
              key={label}
              onPress={() => router.push(href as Href)}
              style={styles.quick}
            >
              <View style={styles.quickIcon}>
                <Ionicons name={icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {daily ? (
        <View>
          <Text style={styles.section}>今日词汇 · Từ hôm nay</Text>
          <Pressable
            onPress={() => router.push(`/word/${daily.id}`)}
            style={[card, styles.daily]}
          >
            <View style={styles.dailyIcon}>
              <Text style={styles.dailyMark}>字</Text>
            </View>
            <View style={styles.dailyCopy}>
              <Text style={styles.dailyHanzi}>{daily.simplified}</Text>
              <PinyinText value={daily.pinyin} />
              <Text style={styles.muted}>{daily.primaryMeaningVi}</Text>
            </View>
            <AudioButton text={daily.simplified} />
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingTop: spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hello: { color: colors.textMuted, fontSize: 15 },
  question: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  streak: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#FFF4DD",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  streakText: { color: colors.warning, fontWeight: "800" },
  focus: { backgroundColor: colors.primary, gap: spacing.lg },
  focusTop: { flexDirection: "row", justifyContent: "space-between" },
  focusCopy: { gap: 5 },
  eyebrow: {
    color: "#C9D5FF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  focusTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  softText: { color: "#D5DEFF", fontSize: 14 },
  percent: { color: "#fff", fontSize: 21, fontWeight: "900" },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF33",
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.accent, borderRadius: 4 },
  section: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  quick: {
    width: "30%",
    flexGrow: 1,
    minHeight: 104,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  daily: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dailyIcon: {
    width: 60,
    height: 76,
    borderRadius: radius.md,
    backgroundColor: "#FFF2E4",
    alignItems: "center",
    justifyContent: "center",
  },
  dailyMark: { color: colors.warning, fontSize: 32, fontWeight: "700" },
  dailyCopy: { flex: 1, gap: 2 },
  dailyHanzi: { color: colors.text, fontSize: 29, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: 14 },
});
