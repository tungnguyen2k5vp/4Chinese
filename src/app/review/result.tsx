import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { designColors, spacing, themedCard } from "@/constants/design";
import { getDashboardStats } from "@/db/repository";
import { AnalyticsEvent, track } from "@/services/analytics/analytics-service";
import { normalizeQuickSessionMinutes } from "@/services/learning/next-best-action";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
export default function Result() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const db = useSQLiteContext();
  const p = useLocalSearchParams<Record<string, string>>();
  const learning = p.mode === "learn";
  const quickMinutes = normalizeQuickSessionMinutes(p.quickSessionMinutes);
  const completionTracked = useRef(false);
  const lastReviewedWord = useAppStore((state) => state.lastReviewedWord);
  const lastReviewedHanzi = useAppStore((state) => state.lastReviewedHanzi);
  const [streak, setStreak] = useState<number | null>(null);
  const reviewed = Math.max(0, Number(p.correct ?? 0) + Number(p.wrong ?? 0));
  const accuracy = reviewed ? Math.round((Number(p.correct ?? 0) / reviewed) * 100) : 0;
  const elapsed = Number(p.elapsedSeconds);
  const elapsedSeconds = Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 43_200 ? Math.floor(elapsed) : null;
  const elapsedLabel = elapsedSeconds == null ? null : `${Math.floor(elapsedSeconds / 60)} phút ${elapsedSeconds % 60} giây`;
  useEffect(() => {
    let live = true;
    void getDashboardStats(db).then((stats) => { if (live) setStreak(stats.streak); }).catch(() => undefined);
    return () => { live = false; };
  }, [db]);
  useEffect(() => {
    if (quickMinutes == null || completionTracked.current) return;
    completionTracked.current = true;
    const startedAt = Number(p.quickStartedAt);
    const elapsedSeconds = Number.isFinite(startedAt) && startedAt > 0
      ? Math.max(0, Math.min(43_200, Math.round((Date.now() - startedAt) / 1_000)))
      : null;
    track(AnalyticsEvent.QUICK_SESSION_COMPLETED, {
      minutes: quickMinutes,
      activity: learning ? "new-words" : "review",
      elapsed_seconds: elapsedSeconds,
    });
  }, [learning, p.quickStartedAt, quickMinutes]);
  return (
    <Screen>
      <View style={[themedCard(theme), styles.card]}>
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
        <Text style={styles.title}>
          {learning ? "Hoàn thành buổi học!" : "Đã ôn xong!"}
        </Text>
        <Text style={styles.copy}>
          {learning
            ? "Từ mới đã vào Cấp 1 và chỉ xuất hiện trong Ôn tập khi đến hạn (sau 30 phút)."
            : `${reviewed}/${p.total ?? reviewed} từ đã xử lý · ${p.correct ?? 0} đạt`}
        </Text>
        {!learning ? <View style={styles.metrics}>
          <Stat label="Độ chính xác" value={`${accuracy}%`} />
          {elapsedLabel ? <Stat label="Thời gian" value={elapsedLabel} /> : null}
          {streak !== null ? <Stat label="Chuỗi học hiện tại" value={`${streak} ngày`} /> : null}
        </View> : null}
        {learning ? (
          <Text style={styles.copy}>
            Đã biết: {p.known ?? 0} · Bỏ qua: {p.skipped ?? 0}
          </Text>
        ) : null}
        {!learning ? (
          <View style={styles.changeBlock}>
            <Text style={styles.changeTitle}>Thay đổi cấp nhớ</Text>
            <ChangeBar label="Tăng cấp" value={Number(p.up ?? 0)} total={reviewed} color={theme.success} />
            <ChangeBar label="Giữ cấp" value={Number(p.same ?? 0)} total={reviewed} color={theme.primary} />
            <ChangeBar label="Giảm cấp" value={Number(p.down ?? 0)} total={reviewed} color={theme.error} />
            <Text style={styles.copy}>Đạt trí nhớ sâu (cấp 6): {p.deep ?? 0} từ · tính trong nhóm đã xử lý.</Text>
          </View>
        ) : null}
      </View>
      {!learning && lastReviewedWord ? (
        <View style={[themedCard(theme), styles.wordCard]}>
          <Text style={styles.wordHanzi}>{lastReviewedHanzi ?? lastReviewedWord.simplified}</Text>
          <PinyinText value={lastReviewedWord.pinyin} style={styles.wordPinyin} />
          <Text style={styles.wordMeaning}>{lastReviewedWord.primaryMeaningVi}</Text>
        </View>
      ) : null}
      <PrimaryButton
        label="Về trang chủ"
        onPress={() => router.replace("/(tabs)")}
      />
      <PrimaryButton
        variant="secondary"
        label="Xem thống kê"
        onPress={() => router.replace("/(tabs)/stats")}
      />
    </Screen>
  );
}
function Stat({ label, value }: { label: string; value?: string }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function ChangeBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const theme = useTheme();
  const bounded = Math.max(0, Math.min(total, Number.isFinite(value) ? value : 0));
  return <View style={{ gap: 5 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '800' }}>{bounded}</Text>
    </View>
    <AnimatedProgressBar progress={total ? bounded / total : 0} color={color} trackColor={theme.border} height={7} accessibilityLabel={`${label}: ${bounded} trên ${total} từ`} />
  </View>;
}
function createStyles(theme: ReturnType<typeof useTheme>) {
  const colors = designColors(theme);
  return StyleSheet.create({
  card: {
    marginTop: spacing.md,
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  check: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: theme.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { fontSize: 40, color: colors.success, fontWeight: "900" },
  title: { fontSize: 25, color: colors.text, fontWeight: "900" },
  copy: { color: colors.textMuted, textAlign: "center", lineHeight: 22 },
  wordCard: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.md },
  wordHanzi: { color: colors.text, fontSize: 42, fontWeight: "900" },
  wordPinyin: { fontSize: 22 },
  wordMeaning: { color: colors.text, fontSize: 17, fontWeight: "700" },
  metrics: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  changeBlock: { width: '100%', gap: spacing.md, borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.md },
  changeTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  stat: {
    flex: 1,
    minWidth: 104,
    flexGrow: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "900", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
}); }
