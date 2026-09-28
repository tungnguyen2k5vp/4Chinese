import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { MasteryChart } from "@/components/MasteryChart";
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from "@/components/Screen";
import { card, colors, spacing } from "@/constants/design";
import { getKnowledgeMap, type KnowledgeSkill } from '@/db/knowledge-map';
import { getDailyActivity, getDashboardStats, getHskProgress, getSettings, listRecentReviewSkillAttempts } from "@/db/repository";
import { buildSkillMastery, skillLabel } from "@/services/review/skill-mastery";
import { buildStudyHeatmap } from "@/services/stats/heatmap";
import type { DashboardStats, SkillMasteryMetric } from "@/types/models";

type HskProgress = { band: string; total: number; learned: number; mastered: number };

export default function StatsScreen() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hsk, setHsk] = useState<HskProgress[]>([]);
  const [studyGoal, setStudyGoal] = useState(30);
  const [heatmap, setHeatmap] = useState<ReturnType<typeof buildStudyHeatmap>>([]);
  const [skillMastery, setSkillMastery] = useState<SkillMasteryMetric[]>([]);
  const [knowledgeMap, setKnowledgeMap] = useState<KnowledgeSkill[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([getDashboardStats(db), getHskProgress(db), getSettings(db), getDailyActivity(db), listRecentReviewSkillAttempts(db), getKnowledgeMap(db)]).then(
        ([nextStats, nextHsk, settings, activity, attempts, map]) => {
          if (!active) return;
          setStats(nextStats);
          setHsk(nextHsk);
          setStudyGoal(settings.dailyStudyMinutes);
          setHeatmap(buildStudyHeatmap(activity));
          setSkillMastery(buildSkillMastery(attempts));
          setKnowledgeMap(map);
        },
      ).catch(() => { if (active) Alert.alert('Chưa tải được thống kê', 'Vui lòng mở lại màn hình.'); });
      return () => { active = false; };
    }, [db]),
  );

  const accuracy = stats?.reviewedToday
    ? Math.round((stats.correctToday / stats.reviewedToday) * 100)
    : 0;
  const studySeconds = stats?.studySeconds ?? 0;
  const studyMinutes = Math.floor(studySeconds / 60);
  const studyProgress = Math.min(1, studySeconds / (studyGoal * 60));
  const metrics: [string, number, string][] = [
    ["Đã học", stats?.learned ?? 0, "từ"],
    ["Đã biết", stats?.known ?? 0, "từ"],
    ["Bỏ qua", stats?.skipped ?? 0, "từ"],
    ["Nhớ sâu", stats?.mastered ?? 0, "từ"],
    ["Đến hạn", stats?.due ?? 0, "từ"],
    ["Chính xác", accuracy, "%"],
    ["Chuỗi ngày", stats?.streak ?? 0, "ngày"],
    ["Hôm nay", studyMinutes, "phút"],
  ];

  return (
    <Screen title="Tiến độ học tập" subtitle="Theo dõi tiến độ học.">
      <PrimaryButton variant="secondary" label="XP · Thành tích · Mục tiêu tuần" onPress={() => router.push('/achievements' as Href)} />
      <View style={styles.grid}>
        {metrics.map(([label, value, unit]) => (
          <View key={label} style={[card, styles.metric]}>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricUnit}>{unit}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={card}>
        <Text style={styles.section}>Thời gian học hôm nay</Text>
        <Text style={styles.studyValue}>
          {studyMinutes} / {studyGoal} phút
        </Text>
        <View style={styles.studyTrack}>
          <View style={[styles.studyFill, { width: `${studyProgress * 100}%` }]} />
        </View>
        <Text style={styles.note}>
          Chỉ tính thời gian app đang ở màn hình học hoặc ôn.
        </Text>
      </View>

      <View style={card}>
        <Text style={styles.section}>Cấp độ ghi nhớ</Text>
        <MasteryChart values={stats?.mastery ?? [0, 0, 0, 0, 0, 0, 0]} />
      </View>

      <View style={card}>
        <Text style={styles.section}>Kỹ năng gần đây</Text>
        <Text style={styles.note}>Dựa trên các lượt ôn mới, không thay đổi lịch SRS.</Text>
        <View style={styles.skillList}>
          {skillMastery.map((metric) => (
            <View key={metric.skill} style={styles.skillRow}>
              <Text style={styles.skillLabel}>{skillLabel(metric.skill)}</Text>
              <Text style={[styles.skillValue, metric.status === "weak" && styles.skillWeak]}>
                {metric.accuracy === null ? "Chưa đủ dữ liệu" : `${metric.accuracy}% · ${metric.attempts} lượt`}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={card}>
        <Text style={styles.section}>Bản đồ kỹ năng lưu bền</Text>
        <Text style={styles.note}>Chỉ tính nội dung có dữ liệu luyện. Điểm từ vựng là chỉ số theo dõi 0–100; ngữ pháp là tỷ lệ đúng.</Text>
        <View style={styles.skillList}>{knowledgeMap.map((metric) => <View key={metric.skill} style={styles.skillRow}>
          <Text style={styles.skillLabel}>{metric.label}</Text>
          <Text style={styles.skillValue}>{metric.score === null ? 'Chưa có dữ liệu' : `${metric.score}${metric.skill === 'GRAMMAR' ? '%' : '/100'} · ${metric.wordCount} ${metric.skill === 'GRAMMAR' ? 'cấu trúc' : 'từ'}`}</Text>
        </View>)}</View>
      </View>

      <View style={card}>
        <Text style={styles.section}>Tiến độ HSK</Text>
        <View style={styles.hskList}>
          {hsk.map((row) => {
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
      </View>

      <View style={card}>
        <Text style={styles.section}>Lịch học 28 ngày</Text>
        <View style={styles.heatmap}>
          {heatmap.map((day) => (
            <View
              key={day.date}
              accessibilityLabel={`${day.date}: ${day.activity} lượt học`}
              style={[styles.cell, { opacity: [0.12, 0.32, 0.52, 0.74, 1][day.level] }]}
            />
          ))}
        </View>
        <Text style={styles.note}>Đậm hơn = nhiều lượt học và ôn hoàn tất hơn.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metric: {
    width: "30%",
    flexGrow: 1,
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  metricValue: { color: colors.text, fontSize: 24, fontWeight: "900" },
  metricUnit: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  metricLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  section: { color: colors.text, fontSize: 17, fontWeight: "800", marginBottom: spacing.lg },
  studyValue: { color: colors.text, fontSize: 28, fontWeight: "900", marginBottom: spacing.md },
  studyTrack: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: "hidden" },
  studyFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 5 },
  skillList: { gap: spacing.sm, marginTop: spacing.md },
  skillRow: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: spacing.sm },
  skillLabel: { color: colors.text, fontSize: 14, fontWeight: "800" },
  skillValue: { color: colors.success, fontSize: 12, fontWeight: "800" },
  skillWeak: { color: colors.danger },
  hskList: { gap: spacing.md },
  hskRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hskLabel: { width: 62, color: colors.text, fontSize: 12, fontWeight: "700" },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  percent: { width: 36, color: colors.textMuted, fontSize: 11, textAlign: "right" },
  heatmap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.success },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
});
