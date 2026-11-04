import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EnglishStatistics } from "@/components/EnglishOverview";
import { MasteryChart } from "@/components/MasteryChart";
import { PrimaryButton } from '@/components/PrimaryButton';
import { XpJourneyCard } from '@/components/XpJourneyCard';
import { Disclosure } from "@/components/chinese/Disclosure";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { LearningLandscape } from "@/components/visual/LearningLandscape";
import { designColors, radius, spacing, themedCard } from "@/constants/design";
import { getGamificationSummary, type GamificationSummary } from '@/db/gamification';
import { getKnowledgeMap, type KnowledgeSkill } from '@/db/knowledge-map';
import { getDailyActivity, getDashboardStats, getHskProgress, getSettings, listRecentReviewSkillAttempts } from "@/db/repository";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { EnglishAvailability } from "@/services/languages/LanguageRuntime";
import { buildSkillMastery, skillLabel } from "@/services/review/skill-mastery";
import { buildStudyHeatmap } from "@/services/stats/heatmap";
import { buildVisibleStatsMetrics, hasMeaningfulStatsData } from '@/services/stats/presentation';
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { DashboardStats, SkillMasteryMetric } from "@/types/models";

type HskProgress = { band: string; total: number; learned: number; mastered: number };
const metricActions: Record<string, { icon: keyof typeof Ionicons.glyphMap; filter?: string; route?: Href }> = {
  'Đã học': { icon: 'school-outline', filter: 'learned' },
  'Đã biết': { icon: 'checkmark-circle-outline', filter: 'known' },
  'Bỏ qua': { icon: 'play-skip-forward-outline', filter: 'skipped' },
  'Nhớ sâu': { icon: 'diamond-outline', filter: 'mastered' },
  'Đến hạn': { icon: 'alarm-outline', filter: 'due' },
  'Chính xác': { icon: 'checkmark-done-outline', route: '/review' as Href },
  'Chuỗi ngày': { icon: 'flame-outline', route: '/achievements' as Href },
  'Hôm nay': { icon: 'time-outline', route: '/daily' as Href },
};

export default function StatsScreen() {
  const { preferences } = useLearningLanguage();
  return preferences.learningLanguage === "en" ? <EnglishAvailability><EnglishStatistics /></EnglishAvailability> : <ChineseStatsScreen />;
}

function ChineseStatsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hsk, setHsk] = useState<HskProgress[]>([]);
  const [studyGoal, setStudyGoal] = useState(30);
  const [heatmap, setHeatmap] = useState<ReturnType<typeof buildStudyHeatmap>>([]);
  const [skillMastery, setSkillMastery] = useState<SkillMasteryMetric[]>([]);
  const [knowledgeMap, setKnowledgeMap] = useState<KnowledgeSkill[]>([]);
  const [heatmapDays, setHeatmapDays] = useState<7 | 14 | 28>(28);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [xp, setXp] = useState<GamificationSummary | null>(null);
  const [xpError, setXpError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadError(false);
      setXpError(false);
      void Promise.all([getDashboardStats(db), getHskProgress(db), getSettings(db), getDailyActivity(db), listRecentReviewSkillAttempts(db), getKnowledgeMap(db)]).then(
        ([nextStats, nextHsk, settings, activity, attempts, map]) => {
          if (!active) return;
          setStats(nextStats);
          setHsk(nextHsk);
          setStudyGoal(settings.dailyStudyMinutes);
          setHeatmap(buildStudyHeatmap(activity));
          setSkillMastery(buildSkillMastery(attempts));
          setKnowledgeMap(map);
          void getGamificationSummary(db, settings.dailyStudyMinutes).then(value => {
            if (active) setXp(value);
          }).catch(() => { if (active) setXpError(true); });
        },
      ).catch(() => { if (active) setLoadError(true); });
      return () => { active = false; };
    // Reload is a deliberate trigger for this focus-scoped read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, reload]),
  );

  const accuracy = stats?.reviewedToday
    ? Math.round((stats.correctToday / stats.reviewedToday) * 100)
    : 0;
  const studySeconds = stats?.studySeconds ?? 0;
  const studyMinutes = Math.floor(studySeconds / 60);
  const studyProgress = studyGoal > 0 ? Math.min(1, studySeconds / (studyGoal * 60)) : 0;
  const visibleHeatmap = heatmap.slice(-heatmapDays);
  const activeDays = visibleHeatmap.filter((day) => day.activity > 0).length;
  const hasSkillHistory = skillMastery.some((metric) => metric.attempts > 0);
  const hasKnowledgeData = knowledgeMap.some((metric) => metric.score !== null);
  const hasPersonalData = stats ? hasMeaningfulStatsData(stats, activeDays) || hasSkillHistory || hasKnowledgeData : false;
  const visibleMetrics = stats ? buildVisibleStatsMetrics(stats, accuracy) : [];
  const metricsToShow = showAllMetrics ? visibleMetrics : visibleMetrics.slice(0, 6);
  const meaningfulHsk = hsk.filter((row) => row.learned > 0);
  return (
    // The tab bar owns the bottom system inset. Do not reserve it again here.
    <Screen title="Thống kê" subtitle="Nhìn lại tiến bộ · chọn bước tiếp theo" safeAreaEdges={["top"]}>
      {loadError ? <View accessibilityRole="alert" style={styles.errorBanner}><Text style={styles.errorTitle}>Chưa tải được thống kê</Text><Text style={styles.note}>Dữ liệu trên máy không bị thay đổi. Hãy thử đọc lại.</Text><MotionPressable haptic accessibilityLabel="Thử tải lại thống kê" style={styles.retry} onPress={() => setReload((value) => value + 1)}><Text style={styles.retryText}>THỬ LẠI</Text></MotionPressable></View> : null}
      {!stats && !loadError ? <ActivityIndicator accessibilityLabel="Đang tải thống kê" color={theme.primary} /> : null}
      {stats && !hasPersonalData ? <View style={[themedCard(theme), styles.emptyProgress]}>
        <LearningLandscape scene="stats" height={92} />
        <Text style={styles.eyebrow}>BẮT ĐẦU NHẸ NHÀNG</Text>
        <Text style={styles.insightTitle}>Chưa có dữ liệu học để tổng kết</Text>
        <Text style={styles.insightCopy}>Hoàn thành một phiên học hoặc ôn tập để xem từ vựng đã học, thời gian, độ chính xác và kỹ năng của bạn. Dữ liệu HSK có sẵn chưa được tính là tiến độ cá nhân.</Text>
        <PrimaryButton label="Bắt đầu phiên học 5 phút" onPress={() => router.push({ pathname: '/daily', params: { minutes: '5' } } as Href)} />
      </View> : null}
      {stats && hasPersonalData ? <>
      <View style={[themedCard(theme), styles.focusCard]}>
        <View style={styles.focusTop}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>HÔM NAY</Text><Text style={styles.studyValue}>{studyMinutes}<Text style={styles.metricLabel}> / {studyGoal} phút</Text></Text></View><View style={styles.focusBadge}><Ionicons name={studyProgress >= 1 ? 'checkmark' : 'time-outline'} size={19} color={theme.primaryText} /><Text style={styles.focusBadgeText}>{Math.round(studyProgress * 100)}%</Text></View></View>
        <AnimatedProgressBar progress={studyProgress} color={theme.primary} trackColor={theme.border} height={9} accessibilityLabel={`Học hôm nay ${studyMinutes} trên ${studyGoal} phút`} />
        <View style={styles.todayStrip}><Text style={styles.noteNoMargin}>{stats.reviewedToday} lượt ôn · {stats.newToday} từ mới</Text><Text style={styles.eyebrow}>{stats.reviewedToday > 0 ? `${accuracy}% đúng` : 'Chưa ôn hôm nay'}</Text></View>
        <PrimaryButton label={stats.due > 0 ? `Ôn ${stats.due} từ đến hạn` : 'Học tiếp hôm nay'} onPress={() => router.push((stats.due > 0 ? '/review' : '/daily') as Href)} />
      </View>
      {xp ? <XpJourneyCard totalXp={xp.totalXp} todayXp={xp.todayXp} onPress={() => router.push('/achievements' as Href)} /> : null}
      {xpError ? <PrimaryButton variant="ghost" label="Chưa tải được XP · thử lại" onPress={() => setReload(value => value + 1)} /> : null}
      <Text style={styles.section}>Kho từ của bạn</Text>
      {metricsToShow.length ? <View style={styles.grid}>
        {metricsToShow.map((metric) => {
          const action = metricActions[metric.label]!;
          return <MotionPressable haptic key={metric.label} accessibilityLabel={`${metric.label}: ${metric.value} ${metric.unit}. Xem chi tiết`} style={styles.metric}
            onPress={() => router.push(action.filter ? { pathname: '/stats/words', params: { filter: action.filter } } as Href : action.route!)}>
            <View style={styles.metricTop}><View style={styles.metricIcon}><Ionicons name={action.icon} size={22} color={theme.primaryText} /></View><Ionicons name="chevron-forward" size={16} color={theme.textMuted} /></View>
            <Text style={styles.metricValue}>{metric.value}<Text style={styles.metricLabel}> {metric.unit}</Text></Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </MotionPressable>;
        })}
      </View> : null}
      {visibleMetrics.length > 6 ? <PrimaryButton
        variant="ghost"
        label={showAllMetrics ? "Thu gọn chỉ số" : `Xem thêm ${visibleMetrics.length - 6} chỉ số`}
        onPress={() => setShowAllMetrics((value) => !value)}
      /> : null}

      {stats.mastery.some((value) => value > 0) ? <View style={themedCard(theme)}>
        <View style={styles.metricTop}><Ionicons name="bar-chart-outline" size={21} color={theme.primaryText} /><Text style={styles.section}>Mức nhớ từ vựng</Text></View>
        <MasteryChart values={stats.mastery} />
      </View> : null}

      {hasSkillHistory ? <View style={themedCard(theme)}>
        <Text style={styles.section}>Kỹ năng gần đây</Text>
        <Text style={styles.note}>Dựa trên các lượt ôn mới, không thay đổi lịch SRS.</Text>
        <View style={styles.skillList}>
          {skillMastery.filter((metric) => metric.attempts > 0).map((metric) => (
            <View key={metric.skill} style={styles.skillRow}>
              <View style={styles.skillCopy}><Text style={styles.skillLabel}>{skillLabel(metric.skill)}</Text><Text style={[styles.skillValue, metric.status === "weak" && styles.skillWeak]}>{metric.accuracy === null ? "Chưa đủ dữ liệu" : `${metric.accuracy}% · ${metric.attempts} lượt`}</Text></View>
              <View style={styles.skillTrack}><View style={[styles.skillFill, { width: `${metric.accuracy ?? 0}%`, backgroundColor: metric.status === "weak" ? theme.error : theme.success }]} /></View>
            </View>
          ))}
        </View>
      </View> : null}

      {hasKnowledgeData ? <View style={themedCard(theme)}>
        <Disclosure title="Chi tiết chỉ số kỹ năng">
        <Text style={styles.note}>Chỉ tính nội dung có dữ liệu luyện. Điểm từ vựng là chỉ số theo dõi 0–100; ngữ pháp là tỷ lệ đúng.</Text>
        <View style={styles.skillList}>{knowledgeMap.filter((metric) => metric.score !== null).map((metric) => <View key={metric.skill} style={styles.skillRow}>
          <Text style={styles.skillLabel}>{metric.label}</Text>
          <Text style={styles.skillValue}>{metric.score === null ? 'Chưa có dữ liệu' : `${metric.score}${metric.skill === 'GRAMMAR' ? '%' : '/100'} · ${metric.wordCount} ${metric.skill === 'GRAMMAR' ? 'cấu trúc' : 'từ'}`}</Text>
        </View>)}</View>
        </Disclosure>
      </View> : null}

      {meaningfulHsk.length ? <View style={themedCard(theme)}>
        <Text style={styles.section}>Tiến độ HSK</Text>
        <View style={styles.hskList}>
          {meaningfulHsk.map((row) => {
            const progress = row.total ? row.learned / row.total : 0;
            return (
              <View key={row.band} style={styles.hskRow}>
                <Text style={styles.hskLabel}>HSK {row.band}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
              </View>
            );
          })}
        </View>
      </View> : null}

      {activeDays > 0 ? <View style={themedCard(theme)}>
        <View style={styles.calendarTop}><View style={{ flex: 1, minWidth: 110 }}><Text style={styles.section}>Nhịp học gần đây</Text><Text style={styles.noteNoMargin}>{activeDays}/{heatmapDays} ngày có hoạt động</Text></View><View style={styles.periods}>{([7, 14, 28] as const).map((days) => <MotionPressable key={days} haptic accessibilityLabel={`Xem ${days} ngày`} onPress={() => setHeatmapDays(days)} style={[styles.period, heatmapDays === days && styles.periodActive]}><Text style={[styles.periodText, heatmapDays === days && styles.periodTextActive]}>{days}N</Text></MotionPressable>)}</View></View>
        <View style={styles.heatmap}>
          {visibleHeatmap.map((day) => (<View key={day.date} accessible accessibilityLabel={`${day.date}: ${day.activity} lượt học`} style={[styles.cell, { opacity: [0.12, 0.32, 0.52, 0.74, 1][day.level] }]} />))}
        </View>
        <Text style={styles.note}>Màu đậm hơn nghĩa là có nhiều lượt học và ôn được hoàn tất hơn.</Text>
      </View> : null}
      <View testID="stats-last-section"><Disclosure title="Các chỉ số được tính như thế nào?">
        <Text style={styles.note}>Thời gian chỉ tính trên màn hình học và ôn. Độ chính xác dựa trên lượt ôn hôm nay. Nhớ sâu là cấp SRS 6, không phải tất cả từ đã học.</Text>
        <Text style={styles.note}>Chuỗi tại đây đếm ngày học từ mới hoặc ôn từ. Thành tích tính cả luyện kỹ năng, đọc và học ít nhất một phút nên hai chuỗi có thể khác nhau. Đề cương HSK là danh sách tham chiếu, tách biệt kho đang học.</Text>
      </Disclosure></View>
      </> : null}
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  const colors = designColors(theme);
  return StyleSheet.create({
  insightTitle: { color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: "900" },
  insightCopy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  todayStrip: { flexDirection: "row", alignItems: "center", justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  errorBanner: { borderRadius: radius.md, padding: spacing.md, backgroundColor: theme.errorSoft, gap: spacing.xs },
  emptyProgress: { overflow: 'hidden', gap: spacing.md, padding: spacing.md },
  errorTitle: { color: theme.error, fontSize: 15, fontWeight: "900" },
  retry: { minHeight: 44, justifyContent: "center" },
  retryText: { color: theme.error, fontSize: 12, fontWeight: "900", letterSpacing: 0.7 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingVertical: spacing.xs },
  metric: {
    width: "47%",
    flexGrow: 1,
    minHeight: 130,
    justifyContent: "center",
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.md,
    borderColor: colors.border,
    backgroundColor: theme.surface,
  },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metricIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: colors.text, fontSize: 26, fontWeight: "900" },
  metricLabel: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  section: { color: colors.text, fontSize: 17, fontWeight: "800" },
  eyebrow: { color: colors.primaryText, fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  focusCard: { gap: spacing.md, backgroundColor: theme.infoSoft },
  focusTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  focusBadge: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  focusBadgeText: { color: colors.primaryText, fontSize: 15, fontWeight: "900" },
  studyValue: { color: colors.text, fontSize: 28, fontWeight: "900", marginBottom: spacing.md },
  skillList: { gap: spacing.sm, marginTop: spacing.md },
  skillRow: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.xs, paddingBottom: spacing.sm },
  skillCopy: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  skillLabel: { color: colors.text, fontSize: 14, fontWeight: "800", flex: 1 },
  skillValue: { color: colors.success, fontSize: 12, fontWeight: "800" },
  skillWeak: { color: colors.danger },
  skillTrack: { height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" },
  skillFill: { height: "100%", borderRadius: 3 },
  hskList: { gap: spacing.md },
  hskRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hskLabel: { width: 62, color: colors.text, fontSize: 12, fontWeight: "700" },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  percent: { width: 36, color: colors.textMuted, fontSize: 11, textAlign: "right" },
  calendarTop: { flexDirection: "row", flexWrap: 'wrap', alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.md },
  noteNoMargin: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  periods: { flexDirection: "row", gap: 4 },
  period: { minWidth: 44, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  periodActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  periodTextActive: { color: "#FFFFFF" },
  heatmap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.success },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
}); }
