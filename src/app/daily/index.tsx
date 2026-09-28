import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, spacing } from "@/constants/design";
import { listMistakes } from "@/db/mistakes";
import { getDashboardStats, getDueVocabulary, getSettings, getUnlearnedVocabulary, getWeakVocabulary, listRecentReviewSkillAttempts } from "@/db/repository";
import { buildDailySessionPlan, type DailySessionPlan } from "@/services/learning/daily-session";
import { buildSkillMastery, skillLabel } from "@/services/review/skill-mastery";
import { useAppStore } from "@/stores/app-store";

export default function DailySessionScreen() {
  const db = useSQLiteContext();
  const setLearnQueue = useAppStore((state) => state.setLearnQueue);
  const setReviewQueue = useAppStore((state) => state.setReviewQueue);
  const [plan, setPlan] = useState<DailySessionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setPlan(null);
    void getSettings(db).then(async (settings) => {
      const [stats, dueWords, weakWords, unlearnedWords, attempts, mistakes] = await Promise.all([
        getDashboardStats(db, settings.selectedHskBands),
        getDueVocabulary(db, settings.reviewSessionSize, settings.selectedHskBands),
        getWeakVocabulary(db, 30),
        getUnlearnedVocabulary(db, settings.selectedHskBands, settings.learnSessionSize),
        listRecentReviewSkillAttempts(db),
        listMistakes(db),
      ]);
      if (!active) return;
      setPlan(buildDailySessionPlan({
        dueWords, weakWords, unlearnedWords,
        dailyNewWordGoal: settings.dailyNewWordGoal,
        learnedToday: stats.newToday,
        learnSessionSize: settings.learnSessionSize,
        reviewSessionSize: settings.reviewSessionSize,
        studyTimeGoalMinutes: settings.dailyStudyMinutes,
        studiedSecondsToday: stats.studySeconds,
        totalDueCount: stats.due,
        recentMistakeCount: mistakes.length,
        skillStats: buildSkillMastery(attempts),
      }));
    }).catch(() => { if (active) setPlan(null); }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [db]));

  const startDueReview = () => {
    if (!plan?.dueWords.length) return;
    setReviewQueue(plan.dueWords);
    router.push({ pathname: "/review/session", params: { mode: plan.primaryReviewMode } } as Href);
  };
  const startNewWords = () => {
    if (!plan?.newWords.length) return;
    setLearnQueue(plan.newWords);
    router.push("/learn/session");
  };

  if (loading) return <Screen title="Học hôm nay"><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (!plan) return <Screen title="Học hôm nay"><EmptyState title="Chưa thể lập phiên học" message="Hãy thử mở lại màn hình này." /></Screen>;

  const primarySkill = plan.skillPractices[0];
  return <Screen title="Học hôm nay" subtitle="Ưu tiên lịch ôn hiện có, sau đó mới đến từ mới và kỹ năng cần củng cố.">
    <View style={[card, styles.hero]}>
      <Text style={styles.eyebrow}>PHIÊN GỢI Ý HÔM NAY</Text>
      <Text style={styles.heroTitle}>{plan.dueWords.length + plan.newWords.length} thẻ chính</Text>
      <Text style={styles.copy}>Còn {Math.ceil(plan.remainingSeconds / 60)} phút theo mục tiêu · phiên gợi ý khoảng {Math.ceil(plan.estimatedSeconds / 60)} phút</Text>
      <Text style={styles.copy}>Từ đến hạn luôn được xử lý trước. Từ yếu chưa đến hạn chỉ là gợi ý, không bị đổi lịch SRS.</Text>
    </View>

    <View style={[card, styles.block]}>
      <Text style={styles.blockTitle}>1. Ôn theo lịch</Text>
      <Text style={styles.blockValue}>{plan.dueWords.length} từ đến hạn trong phiên</Text>
      <Text style={styles.copy}>{plan.weakDueWords.length ? `${plan.weakDueWords.length} từ yếu đã nằm trong lượt ôn này.` : "Không có từ yếu đến hạn bị thêm ngoài lịch."}</Text>
      <PrimaryButton label={plan.dueWords.length ? `Ôn ${plan.dueWords.length} từ` : "Không có thẻ trong phiên gợi ý"} disabled={!plan.dueWords.length} onPress={startDueReview} />
    </View>

    <View style={[card, styles.block]}>
      <Text style={styles.blockTitle}>2. Học từ mới</Text>
      <Text style={styles.blockValue}>{plan.newWords.length} từ mới</Text>
      <Text style={styles.copy}>Còn {plan.remainingNewToday} từ theo mục tiêu; số từ gợi ý được giới hạn theo thời gian còn lại.</Text>
      <PrimaryButton variant="secondary" label={plan.newWords.length ? `Học ${plan.newWords.length} từ mới` : plan.remainingNewToday ? "Không còn thời lượng trong phiên gợi ý" : "Đã đủ mục tiêu từ mới"} disabled={!plan.newWords.length} onPress={startNewWords} />
    </View>

    <View style={[card, styles.block]}>
      <Text style={styles.blockTitle}>3. Củng cố an toàn</Text>
      <Text style={styles.blockValue}>{plan.weakPracticeWords.length} từ yếu chưa đến hạn</Text>
      <Text style={styles.copy}>{primarySkill ? `Ưu tiên ${skillLabel(primarySkill.skill).toLowerCase()} (${primarySkill.wordCount} bài gợi ý). Phiên ôn ở trên sẽ dùng đúng kiểu bài này.` : "Hãy hoàn thành vài lượt ôn để app xác định kỹ năng cần ưu tiên."}</Text>
      <PrimaryButton variant="ghost" label="Xem từ cần củng cố" onPress={() => router.push("/review/weak")} />
    </View>
    {plan.activities.map((activity) => <View key={activity.kind} style={[card, styles.block]}>
      <Text style={styles.blockTitle}>{activity.kind === "mistakes" ? "Sổ lỗi" : activity.kind === "writing" ? "Luyện viết" : "Đọc & tra từ"} · {activity.minutes} phút gợi ý</Text>
      <PrimaryButton variant="secondary" label="Mở luyện tập" onPress={() => router.push((activity.kind === "mistakes" ? "/mistakes" : activity.kind === "writing" ? "/writing" : "/reader") as Href)} />
    </View>)}
    {plan.recommendations.length > 0 && <View style={[card, styles.block]}>
      <Text style={styles.blockTitle}>Gợi ý theo kết quả học</Text>
      {plan.recommendations.map((text) => <Text key={text} style={styles.copy}>{text}</Text>)}
    </View>}
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, backgroundColor: "#F0F5FF" },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  heroTitle: { color: colors.text, fontSize: 27, fontWeight: "900" },
  block: { gap: spacing.sm },
  blockTitle: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  blockValue: { color: colors.text, fontSize: 23, fontWeight: "900" },
  copy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
});
