import { Ionicons } from "@expo/vector-icons";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { StudyTransition } from "@/components/ui/StudyTransition";
import { LearningGuide } from "@/components/visual/LearningGuide";
import { designColors, spacing, themedCard } from "@/constants/design";
import { getDashboardStats } from "@/db/repository";
import { AnalyticsEvent, track } from "@/services/analytics/analytics-service";
import { normalizeQuickSessionMinutes } from "@/services/learning/next-best-action";
import { parseReviewLevelChanges, type ReviewChangeDirection, type ReviewLevelChange } from "@/services/review/result-summary";
import { formatDueInterval } from "@/services/srs/scheduler";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
export default function Result() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const db = useSQLiteContext();
  const p = useLocalSearchParams<Record<string, string | string[]>>();
  const learning = p.mode === "learn";
  const quickMinutes = normalizeQuickSessionMinutes(p.quickSessionMinutes);
  const quickEnd = p.quickEnd === 'time' || p.quickEnd === 'stopped' ? p.quickEnd : 'queue';
  const completionTracked = useRef(false);
  const lastReviewedWord = useAppStore((state) => state.lastReviewedWord);
  const lastReviewedHanzi = useAppStore((state) => state.lastReviewedHanzi);
  const [streak, setStreak] = useState<number | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<ReviewChangeDirection | null>(null);
  const levelChanges = useMemo(() => parseReviewLevelChanges(p.changes), [p.changes]);
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
    track(AnalyticsEvent.QUICK_SESSION_COMPLETED, {
      minutes: quickMinutes,
      activity: learning ? "new-words" : "review",
      elapsed_seconds: elapsedSeconds,
      end_reason: quickEnd,
    });
  }, [elapsedSeconds, learning, quickEnd, quickMinutes]);
  return (
    <Screen>
      <View style={[themedCard(theme), styles.card]}>
        <LearningGuide mood={quickMinutes != null && reviewed === 0 ? 'encourage' : 'celebrate'} size={196} interactive autoPlay={false} />
        <Text style={styles.eyebrow}>{quickMinutes == null ? 'MỘT BƯỚC TIẾN MỚI' : `PHIÊN ${quickMinutes} PHÚT`}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {quickMinutes != null ? quickEnd === 'time' ? 'Đã hết thời gian phiên học' : quickEnd === 'stopped' ? 'Đã kết thúc phiên học' : 'Đã xong bộ từ!' : learning ? "Hoàn thành buổi học!" : "Đã ôn xong!"}
        </Text>
        <Text style={styles.copy}>
          {learning
            ? `${p.correct ?? 0}/${p.total ?? 0} từ hoàn tất 3 lượt. Chỉ những từ này vào Cấp 1 và được ôn khi đến hạn (sau 30 phút).`
            : `${reviewed}/${p.total ?? reviewed} từ đã xử lý · ${p.correct ?? 0} đạt`}
        </Text>
        {quickMinutes != null ? <View testID="quick-session-summary" style={{ alignSelf: 'stretch', gap: 8, padding: 14, borderRadius: 14, backgroundColor: theme.primarySoft }}>
          <Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '800', textAlign: 'center' }}>{elapsedLabel ?? '0 phút 0 giây'} / {quickMinutes} phút</Text>
          <Text style={styles.copy}>{quickEnd === 'queue' ? 'Bạn hoàn tất bộ từ trước khi hết giờ.' : 'Các lượt chưa hoàn tất không được tính thành từ đã học hoặc đã ôn.'} Thời gian ở nền không tính vào đồng hồ.</Text>
        </View> : null}
        {!learning ? <View style={styles.metrics}>
          <Stat label="Độ chính xác" value={`${accuracy}%`} skill="reading" />
          {elapsedLabel ? <Stat label="Thời gian" value={elapsedLabel} skill="listening" /> : null}
          {streak !== null ? <Stat label="Chuỗi học hiện tại" value={`${streak} ngày`} skill="review" /> : null}
        </View> : null}
        {learning ? (
          <View style={styles.metrics}>
            <Stat label="Từ đã học" value={String(p.correct ?? 0)} skill="reading" />
            <Stat label="Đã biết" value={String(p.known ?? 0)} skill="listening" />
            <Stat label="Bỏ qua" value={String(p.skipped ?? 0)} skill="review" />
          </View>
        ) : null}
        {!learning ? (
          <View style={styles.changeBlock}>
            <Text style={styles.changeTitle}>Thay đổi cấp nhớ</Text>
            <Text style={styles.changeHint}>Chạm vào từng nhóm để xem từ, cấp nhớ mới và thời điểm ôn tiếp theo.</Text>
            <ChangeBar
              testID="review-level-change-up"
              label="Tăng cấp"
              value={Number(p.up ?? 0)}
              total={reviewed}
              color={theme.success}
              rows={levelChanges.filter(row => row.direction === "up")}
              expanded={expandedGroup === "up"}
              onPress={() => setExpandedGroup(value => value === "up" ? null : "up")}
            />
            <ChangeBar
              testID="review-level-change-same"
              label="Giữ cấp"
              value={Number(p.same ?? 0)}
              total={reviewed}
              color={theme.primary}
              rows={levelChanges.filter(row => row.direction === "same")}
              expanded={expandedGroup === "same"}
              onPress={() => setExpandedGroup(value => value === "same" ? null : "same")}
            />
            <ChangeBar
              testID="review-level-change-down"
              label="Giảm cấp"
              value={Number(p.down ?? 0)}
              total={reviewed}
              color={theme.error}
              rows={levelChanges.filter(row => row.direction === "down")}
              expanded={expandedGroup === "down"}
              onPress={() => setExpandedGroup(value => value === "down" ? null : "down")}
            />
            {expandedGroup && levelChanges.length === 0 ? <Text style={styles.changeHint}>Danh sách chi tiết chưa có trong kết quả của lượt ôn này.</Text> : null}
            <Text style={styles.copy}>Đạt trí nhớ sâu (cấp 6): {p.deep ?? 0} từ · tính trong nhóm đã xử lý.</Text>
          </View>
        ) : null}
      </View>
      {!learning && lastReviewedWord && (quickMinutes == null || reviewed > 0) ? (
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
function Stat({ label, value, skill }: { label: string; value?: string; skill: keyof ReturnType<typeof useTheme>['skillColors'] }) {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const focused = useIsFocused();
  return (
    <StudyTransition active={focused} turnKey={`${label}:${value}`} effect="reveal" animateOnMount style={[styles.stat, { backgroundColor: theme.skillSurfaces[skill] }]}>
      <Text style={[styles.statValue, { color: theme.skillColors[skill] }]}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </StudyTransition>
  );
}
function ChangeBar({
  testID,
  label,
  value,
  total,
  color,
  rows,
  expanded,
  onPress,
}: {
  testID: string;
  label: string;
  value: number;
  total: number;
  color: string;
  rows: ReviewLevelChange[];
  expanded: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const bounded = Math.max(0, Math.min(total, Number.isFinite(value) ? value : 0));
  return <View style={styles.changeGroup}>
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${label}, ${bounded} từ. ${expanded ? "Ẩn danh sách" : "Xem danh sách từ"}`}
      onPress={onPress}
      style={styles.changeBarButton}
    >
      <View style={styles.changeBarHeading}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '800' }}>{label}</Text>
          <Text style={styles.changeHint}>{expanded ? "Chạm để thu gọn" : "Chạm để xem từ và lịch ôn"}</Text>
        </View>
        <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '900' }}>{bounded}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.textMuted} />
      </View>
      <AnimatedProgressBar progress={total ? bounded / total : 0} color={color} trackColor={theme.border} height={7} accessibilityLabel={`${label}: ${bounded} trên ${total} từ`} />
    </Pressable>
    {expanded ? (
      <View testID={`${testID}-list`} style={styles.changeRows}>
        {rows.length ? rows.map(row => (
          <View key={row.id} style={styles.changeWordRow}>
            <View style={styles.changeWordHeading}>
              <Text style={styles.changeHanzi}>{row.hanzi}</Text>
              <Text style={styles.changeLevel}>Cấp {row.levelBefore} → {row.levelAfter}</Text>
            </View>
            <PinyinText value={row.pinyin} visible style={styles.changePinyin} />
            <Text style={styles.changeMeaning}>{row.meaning}</Text>
            <Text style={styles.changeDue}>Ôn tiếp theo: {formatDueInterval(row.nextReviewAt)}</Text>
          </View>
        )) : <Text style={styles.changeHint}>Không có từ trong nhóm này.</Text>}
      </View>
    ) : null}
  </View>;
}
function createStyles(theme: ReturnType<typeof useTheme>) {
  const colors = designColors(theme);
  return StyleSheet.create({
  card: {
    marginTop: spacing.md,
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  eyebrow: { color: theme.skillColors.hanzi, fontSize: 10, letterSpacing: 1.2, fontWeight: "800" },
  title: { fontSize: 25, color: colors.text, fontWeight: "900", textAlign: "center" },
  copy: { color: colors.textMuted, textAlign: "center", lineHeight: 22 },
  wordCard: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.md },
  wordHanzi: { color: colors.text, fontSize: 42, fontWeight: "900" },
  wordPinyin: { fontSize: 22 },
  wordMeaning: { color: colors.text, fontSize: 17, fontWeight: "700" },
  metrics: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  changeBlock: { width: '100%', gap: spacing.md, borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.md },
  changeTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  changeHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  changeGroup: { gap: spacing.sm },
  changeBarButton: { gap: 7, paddingVertical: spacing.xs },
  changeBarHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  changeRows: { gap: spacing.sm, paddingLeft: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.border },
  changeWordRow: { gap: 3, padding: spacing.sm, borderRadius: 12, backgroundColor: colors.background },
  changeWordHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  changeHanzi: { color: colors.text, fontSize: 23, fontWeight: '900' },
  changeLevel: { color: colors.text, fontSize: 12, fontWeight: '900' },
  changePinyin: { fontSize: 16 },
  changeMeaning: { color: colors.text, fontSize: 14, fontWeight: '700' },
  changeDue: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  stat: {
    flex: 1,
    minWidth: 104,
    flexGrow: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "900", color: colors.text, textAlign: "center" },
  statLabel: { fontSize: 12, color: theme.textSecondary, marginTop: 2, textAlign: "center" },
}); }
