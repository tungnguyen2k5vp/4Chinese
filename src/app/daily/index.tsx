import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { spacing, themedCard } from "@/constants/design";
import { getMistakeFocus, listMistakes, type PracticeSkill } from "@/db/mistakes";
import { getDashboardStats, getDueCount, getDueVocabulary, getSettings, getUnlearnedVocabulary, getWeakVocabulary, listRecentReviewSkillAttempts } from "@/db/repository";
import { AnalyticsEvent, track } from "@/services/analytics/analytics-service";
import { buildDailySessionPlan, type DailySessionPlan } from "@/services/learning/daily-session";
import { normalizeQuickSessionMinutes } from "@/services/learning/next-best-action";
import { buildSkillMastery, skillLabel } from "@/services/review/skill-mastery";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";

const mistakeSkillLabel: Record<PracticeSkill, string> = {
  MEANING: "nghĩa", PINYIN: "pinyin", LISTENING: "nghe", HANZI: "nhớ Hán tự",
  WRITING: "viết", SPEAKING: "nói", GRAMMAR: "ngữ pháp",
};

export default function DailySessionScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { minutes: requestedMinutes } = useLocalSearchParams<{ minutes?: string | string[] }>();
  const quickMinutes = normalizeQuickSessionMinutes(requestedMinutes);
  const setLearnQueue = useAppStore((state) => state.setLearnQueue);
  const setReviewQueue = useAppStore((state) => state.setReviewQueue);
  const setSettings = useAppStore((state) => state.setSettings);
  const [plan, setPlan] = useState<DailySessionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setPlan(null);
    void getSettings(db).then(async (settings) => {
      const [stats, dueWords, weakWords, unlearnedWords, attempts, mistakes, mistakeFocus, totalDue] = await Promise.all([
        getDashboardStats(db, settings.selectedHskBands),
        getDueVocabulary(db, settings.reviewSessionSize),
        getWeakVocabulary(db, 30),
        getUnlearnedVocabulary(db, settings.selectedHskBands, settings.learnSessionSize),
        listRecentReviewSkillAttempts(db),
        listMistakes(db),
        getMistakeFocus(db),
        getDueCount(db),
      ]);
      if (!active) return;
      setSettings(settings);
      setPlan(buildDailySessionPlan({
        dueWords, weakWords, unlearnedWords,
        dailyNewWordGoal: settings.dailyNewWordGoal,
        learnedToday: stats.newToday,
        learnSessionSize: settings.learnSessionSize,
        reviewSessionSize: settings.reviewSessionSize,
        studyTimeGoalMinutes: settings.dailyStudyMinutes,
        sessionDurationMinutes: quickMinutes ?? undefined,
        studiedSecondsToday: quickMinutes == null ? stats.studySeconds : 0,
        totalDueCount: totalDue,
        recentMistakeCount: mistakes.length,
        recentWrongAttempts: attempts.slice(0, 5).filter((attempt) => !attempt.correct).length,
        mistakeFocusLabel: mistakeFocus ? mistakeSkillLabel[mistakeFocus.skill] + " (" + mistakeFocus.openCount + " mục, " + mistakeFocus.totalWrong + " lần sai)" : undefined,
        skillStats: buildSkillMastery(attempts),
      }));
    }).catch(() => { if (active) setPlan(null); }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [db, quickMinutes, setSettings]));

  const startDueReview = () => {
    if (!plan?.dueWords.length) return;
    const startedAt = Date.now();
    if (quickMinutes != null) track(AnalyticsEvent.QUICK_SESSION_STARTED, { minutes: quickMinutes, activity: "review" });
    setReviewQueue(plan.dueWords);
    router.push({ pathname: "/review/session", params: {
      mode: plan.primaryReviewMode,
      ...(quickMinutes == null ? {} : { quickSessionMinutes: String(quickMinutes), quickStartedAt: String(startedAt) }),
    } } as Href);
  };
  const startNewWords = () => {
    if (!plan?.newWords.length) return;
    const startedAt = Date.now();
    if (quickMinutes != null) track(AnalyticsEvent.QUICK_SESSION_STARTED, { minutes: quickMinutes, activity: "new-words" });
    setLearnQueue(plan.newWords);
    router.push({ pathname: "/learn/session", params: {
      ...(quickMinutes == null ? {} : { quickSessionMinutes: String(quickMinutes), quickStartedAt: String(startedAt) }),
    } } as Href);
  };

  if (loading) return <Screen title={quickMinutes == null ? "Học hôm nay" : `Phiên nhanh · ${quickMinutes} phút`}><ActivityIndicator color={theme.primary} size="large" /></Screen>;
  if (!plan) return <Screen title={quickMinutes == null ? "Học hôm nay" : `Phiên nhanh · ${quickMinutes} phút`}><EmptyState title="Chưa thể lập phiên học" message="Hãy thử mở lại màn hình này." /></Screen>;

  const primarySkill = plan.skillPractices[0];
  return <Screen title={quickMinutes == null ? "Học hôm nay" : `Phiên nhanh · ${quickMinutes} phút`} subtitle="Ưu tiên lịch ôn hiện có, sau đó mới đến từ mới và kỹ năng cần củng cố.">
    <View style={[themedCard(theme), styles.hero]}>
      <Text style={styles.eyebrow}>{quickMinutes == null ? "PHIÊN GỢI Ý HÔM NAY" : "KẾ HOẠCH PHIÊN NGẮN"}</Text>
      <Text style={styles.heroTitle}>{plan.dueWords.length + plan.newWords.length} thẻ chính</Text>
      <Text style={styles.copy}>{quickMinutes == null
        ? `Còn ${Math.ceil(plan.remainingSeconds / 60)} phút theo mục tiêu · phiên gợi ý khoảng ${Math.ceil(plan.estimatedSeconds / 60)} phút`
        : `Ngân sách ${quickMinutes} phút · thời lượng gợi ý khoảng ${Math.ceil(plan.estimatedSeconds / 60)} phút`}</Text>
      <Text style={styles.copy}>Từ đến hạn luôn được xử lý trước. Từ yếu chưa đến hạn chỉ là gợi ý, không bị đổi lịch SRS.</Text>
      {plan.pacing === "light" ? <Text style={styles.pacingNote}>Nhịp nhẹ hôm nay · giảm từ mới theo các lượt gần đây</Text> : null}
    </View>

    <View style={[themedCard(theme), styles.block]}>
      <Text style={styles.blockTitle}>1. Ôn theo lịch</Text>
      <Text style={styles.blockValue}>{plan.dueWords.length} từ đến hạn trong phiên</Text>
      <Text style={styles.copy}>{plan.weakDueWords.length ? `${plan.weakDueWords.length} từ yếu đã nằm trong lượt ôn này.` : "Không có từ yếu đến hạn bị thêm ngoài lịch."}</Text>
      <PrimaryButton label={plan.dueWords.length ? `Ôn ${plan.dueWords.length} từ` : "Không có thẻ trong phiên gợi ý"} disabled={!plan.dueWords.length} onPress={startDueReview} />
    </View>

    <View style={[themedCard(theme), styles.block]}>
      <Text style={styles.blockTitle}>2. Học từ mới</Text>
      <Text style={styles.blockValue}>{plan.newWords.length} từ mới</Text>
      <Text style={styles.copy}>Còn {plan.remainingNewToday} từ theo mục tiêu; số từ gợi ý được giới hạn theo thời gian còn lại.</Text>
      <PrimaryButton variant="secondary" label={plan.newWords.length ? `Học ${plan.newWords.length} từ mới` : plan.remainingNewToday ? "Không còn thời lượng trong phiên gợi ý" : "Đã đủ mục tiêu từ mới"} disabled={!plan.newWords.length} onPress={startNewWords} />
    </View>

    <View style={[themedCard(theme), styles.block]}>
      <Text style={styles.blockTitle}>3. Củng cố an toàn</Text>
      <Text style={styles.blockValue}>{plan.weakPracticeWords.length} từ yếu chưa đến hạn</Text>
      <Text style={styles.copy}>{primarySkill ? `Ưu tiên ${skillLabel(primarySkill.skill).toLowerCase()} (${primarySkill.wordCount} bài gợi ý). Phiên ôn ở trên sẽ dùng đúng kiểu bài này.` : "Hãy hoàn thành vài lượt ôn để app xác định kỹ năng cần ưu tiên."}</Text>
      <PrimaryButton variant="ghost" label="Xem từ cần củng cố" onPress={() => router.push("/review/weak")} />
    </View>
    {plan.activities.map((activity) => <View key={activity.kind} style={[themedCard(theme), styles.block]}>
      <Text style={styles.blockTitle}>{activity.kind === "mistakes" ? "Sổ lỗi" : activity.kind === "writing" ? "Luyện viết" : "Đọc & tra từ"} · {activity.minutes} phút gợi ý</Text>
      <PrimaryButton variant="secondary" label="Mở luyện tập" onPress={() => router.push((activity.kind === "mistakes" ? "/mistakes" : activity.kind === "writing" ? "/writing" : "/reader") as Href)} />
    </View>)}
    {plan.recommendations.length > 0 && <View style={[themedCard(theme), styles.block]}>
      <Text style={styles.blockTitle}>Gợi ý theo kết quả học</Text>
      {plan.recommendations.map((text) => <Text key={text} style={styles.copy}>{text}</Text>)}
    </View>}
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  hero: { gap: spacing.sm, backgroundColor: theme.primarySoft },
  eyebrow: { color: theme.primaryText, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  heroTitle: { color: theme.textPrimary, fontSize: 27, fontWeight: "900" },
  block: { gap: spacing.sm },
  blockTitle: { color: theme.primaryText, fontSize: 14, fontWeight: "900" },
  blockValue: { color: theme.textPrimary, fontSize: 23, fontWeight: "900" },
  copy: { color: theme.textMuted, fontSize: 13, lineHeight: 20 },
  pacingNote: { color: theme.warning, fontSize: 12, fontWeight: "800", lineHeight: 18 },
}); }
