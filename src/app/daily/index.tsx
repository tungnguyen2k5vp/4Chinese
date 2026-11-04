import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
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
  const [retry, setRetry] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    if (retry > 0) setDetailsOpen(false);
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
  }, [db, quickMinutes, retry, setSettings]));

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

  if (loading) return <Screen hideHeader><ActivityIndicator accessibilityLabel="Đang chuẩn bị phiên học" color={theme.primary} size="large" /></Screen>;
  if (!plan) return <Screen hideHeader><EmptyState title="Chưa thể lập phiên học" message="Dữ liệu học vẫn được giữ nguyên." /><PrimaryButton label="Thử lại" onPress={() => setRetry(value => value + 1)} /></Screen>;

  const primarySkill = plan.skillPractices[0];
  const due = plan.dueWords.length;
  const fresh = plan.newWords.length;
  const rows = [
    ...(quickMinutes == null && (due || !fresh) ? [{ key: "new", icon: "sparkles-outline" as const, label: "Học từ mới", meta: fresh ? `${fresh} từ sẵn sàng` : "Chọn từ trong bộ của bạn", open: () => fresh ? startNewWords() : router.push("/learn/setup") }] : []),
    { key: "weak", icon: "fitness-outline" as const, label: "Củng cố từ khó", meta: `${plan.weakPracticeWords.length} từ cần luyện thêm`, open: () => router.push("/review/weak") },
    ...plan.activities.map(activity => ({ key: activity.kind, icon: activity.kind === "mistakes" ? "book-outline" as const : activity.kind === "writing" ? "brush-outline" as const : "reader-outline" as const, label: activity.kind === "mistakes" ? "Sổ lỗi" : activity.kind === "writing" ? "Luyện viết" : "Đọc & tra từ", meta: `${activity.minutes} phút`, open: () => router.push((activity.kind === "mistakes" ? "/mistakes" : activity.kind === "writing" ? "/writing" : "/reader") as Href) })),
  ];
  return <Screen hideHeader>
    <PrimaryButton label="Lập gợi ý theo mục tiêu với Study Coach" variant="ghost" onPress={() => router.push('/ai/coach' as Href)} />
    {quickMinutes != null ? <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={styles.heroTitle}>Bạn có bao nhiêu phút?</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{([3, 5, 10] as const).map(minutes => <Pressable key={minutes} accessibilityRole="radio" accessibilityLabel={`${minutes} phút`} accessibilityState={{ selected: minutes === quickMinutes }} onPress={() => router.setParams({ minutes: String(minutes) })} style={{ flex: 1, minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: minutes === quickMinutes ? theme.primary : theme.border, backgroundColor: minutes === quickMinutes ? theme.primarySoft : theme.surface }}><Text style={{ color: theme.primaryText, fontSize: 18, fontWeight: '800' }}>{minutes} phút</Text></Pressable>)}</View>
    </View> : null}
    <View testID="daily-primary-action" style={[themedCard(theme), styles.hero]}>
      <View style={styles.heroHeading}><Ionicons name={due ? "refresh-outline" : fresh ? "sparkles-outline" : "checkmark-circle-outline"} size={23} color={theme.primaryText} /><Text style={styles.eyebrow}>{quickMinutes == null ? "BẮT ĐẦU TỪ ĐÂY" : `PHIÊN ${quickMinutes} PHÚT`}</Text></View>
      <Text style={styles.heroTitle}>{due ? `Ôn ${due} từ đến hạn` : fresh ? `Học ${fresh} từ mới` : quickMinutes != null ? 'Chưa có từ sẵn sàng cho phiên này' : "Kế hoạch hôm nay đã hoàn tất"}</Text>
      <Text style={styles.copy}>{quickMinutes != null ? due || fresh ? `Đếm ngược ${quickMinutes}:00 khi bạn bấm bắt đầu. Kết thúc khi hết giờ hoặc xong bộ từ; thời gian thực tế và số từ đã hoàn tất sẽ hiện trong kết quả.` : 'Không có từ đến hạn hoặc từ mới trong mục tiêu hiện tại. Bạn có thể chọn bài bên dưới để luyện thêm.' : due || fresh ? `Khoảng ${Math.max(1, Math.ceil((due ? due * 45 : fresh * 90) / 60))} phút` : "Bạn vẫn có thể chọn bài để luyện thêm."}</Text>
      {quickMinutes != null && (due || fresh) ? <Text style={styles.copy}>Chỉ tính lượt đã lưu. Từ chưa hoàn tất giữ nguyên trạng thái; đồng hồ tạm dừng khi app xuống nền.</Text> : null}
      <PrimaryButton label={due ? quickMinutes != null ? `Ôn ngay · ${quickMinutes} phút` : "Bắt đầu ôn" : fresh ? quickMinutes != null ? `Học ngay · ${quickMinutes} phút` : "Bắt đầu học" : "Chọn bài ôn"} onPress={due ? startDueReview : fresh ? startNewWords : () => router.push("/review")} />
      {quickMinutes != null && due > 0 && fresh > 0 ? <PrimaryButton variant="secondary" label={`Học ${fresh} từ mới · ${quickMinutes} phút`} onPress={startNewWords} /> : null}
    </View>
    <Text style={styles.sectionTitle}>{quickMinutes == null ? 'Luyện thêm' : 'Luyện riêng · không bấm giờ'}</Text>
    <View style={styles.toolList}>{rows.map(row => <Pressable key={row.key} accessibilityRole="button" accessibilityLabel={`${row.label}, ${row.meta}`} onPress={row.open} style={styles.toolRow}>
      <View style={styles.toolIcon}><Ionicons name={row.icon} size={23} color={theme.primaryText} /></View>
      <View style={{ flex: 1, gap: 4 }}><Text style={styles.toolTitle}>{row.label}</Text><Text style={styles.copy}>{row.meta}</Text></View>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </Pressable>)}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Chi tiết kế hoạch" accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsOpen(value => !value)} style={styles.detailsToggle}><Ionicons name="information-circle-outline" size={20} color={theme.textMuted} /><Text style={styles.copy}>Chi tiết kế hoạch</Text><Ionicons name={detailsOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.textMuted} /></Pressable>
    {detailsOpen ? <View testID="daily-plan-details" style={[themedCard(theme), styles.block]}>
      <Text style={styles.copy}>Ôn từ đến hạn trước. Luyện thêm từ chưa đến hạn không đổi lịch SRS.</Text>
      <Text style={styles.copy}>Còn {plan.remainingNewToday} từ mới và {Math.ceil(plan.remainingSeconds / 60)} phút theo mục tiêu.</Text>
      {plan.pacing === "light" ? <Text style={styles.copy}>Nhịp nhẹ hôm nay: giảm số từ mới theo kết quả gần đây.</Text> : null}
      {primarySkill ? <Text style={styles.copy}>Kỹ năng ưu tiên: {skillLabel(primarySkill.skill)}.</Text> : null}
      {plan.recommendations.map(text => <Text key={text} style={styles.copy}>{text}</Text>)}
    </View> : null}
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  hero: { gap: 14, backgroundColor: theme.primarySoft },
  heroHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: { color: theme.primaryText, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  heroTitle: { color: theme.textPrimary, fontSize: 27, fontWeight: "900" },
  block: { gap: spacing.sm },
  sectionTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: "800" },
  copy: { color: theme.textMuted, fontSize: 13, lineHeight: 20 },
  toolList: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 20, overflow: "hidden" },
  toolRow: { flexDirection: "row", alignItems: "center", minHeight: 80, padding: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.divider },
  toolIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" },
  toolTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: "700" },
  detailsToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48 },
}); }
