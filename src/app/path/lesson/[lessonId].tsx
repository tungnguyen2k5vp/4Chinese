import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { LearningGuide } from "@/components/visual/LearningGuide";
import { LearningLandscape } from "@/components/visual/LearningLandscape";
import { radius, spacing, themedCard } from "@/constants/design";
import {
  completeLesson,
  getLessonCourseId,
  listCompletedLessonActivityIds,
  listLearningLessons,
  listLessonActivities,
  parseLearningVocabularyTarget,
  startLesson,
  type LearningActivity,
  type LearningLesson,
} from "@/db/learning-path";
import { usePathAccess } from "@/hooks/use-path-access";
import { AnalyticsEvent, track } from "@/services/analytics/analytics-service";
import { playFeedback } from "@/services/feedback/feedback-service";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/theme/ThemeProvider";

const routes: Record<LearningActivity["activity_type"], (target: string | null) => string | null> = {
  VOCABULARY: (target) => target ? `/(tabs)/vocabulary?band=${encodeURIComponent(target)}` : null,
  GRAMMAR: () => "/grammar",
  LISTENING: () => "/speaking/tones",
  SPEAKING: () => "/speaking/shadowing",
  READING: () => "/reader",
  HANZI: () => "/writing",
  QUIZ: () => "/review",
};

export default function LessonScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const db = useSQLiteContext();
  const pathAccess = usePathAccess();
  const [lesson, setLesson] = useState<LearningLesson | null>(null);
  const [activities, setActivities] = useState<LearningActivity[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [lessonFinished, setLessonFinished] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hapticEnabled = useAppStore((state) => state.settings?.hapticEnabled);
  const soundEnabled = useAppStore((state) => state.settings?.soundEnabled);
  const completed = activities.filter((activity) => visited.includes(activity.id)).length;
  const progress = activities.length ? completed / activities.length : 0;

  useFocusEffect(useCallback(() => {
    let active = true;
    void listCompletedLessonActivityIds(db, lessonId)
      .then((ids) => { if (active) setVisited(ids); })
      .catch(() => { if (active) setErrorMessage("Chưa tải được tiến độ hoạt động. Hãy thử mở lại bài học."); });
    return () => { active = false; };
  }, [db, lessonId, setErrorMessage]));

  useEffect(() => {
    if (!pathAccess.ready) return;
    let active = true;
    void getLessonCourseId(db, lessonId).then(async (courseId) => {
      if (!courseId) throw new Error("Không tìm thấy bài học.");
      return Promise.all([listLearningLessons(db, courseId), listLessonActivities(db, lessonId)]);
    }).then(async ([lessons, rows]) => {
      const index = lessons.findIndex((item) => item.id === lessonId);
      if (!active) return;
      setErrorMessage(null);
      if (index < 0 || (!pathAccess.allOpen && index > 0 && lessons[index - 1]?.status !== "COMPLETED")) {
        setLesson(null);
        setActivities([]);
        setErrorMessage("Bài học này chưa được mở. Hãy hoàn thành bài đứng trước trong lộ trình rồi quay lại.");
        return;
      }
      if (!active) return;
      setLesson(lessons[index] ?? null);
      setActivities(rows);
      await startLesson(db, lessonId);
      track(AnalyticsEvent.LESSON_STARTED, { activity: "learning" });
    }).catch((error) => { if (active) setErrorMessage(error instanceof Error ? error.message : "Không thể mở bài học. Hãy thử lại."); });
    return () => { active = false; };
  }, [db, lessonId, pathAccess.ready, pathAccess.allOpen]);

  return <Screen title={lesson?.title ?? "Bài học"} hideTitle>
    {errorMessage ? <View accessibilityRole="alert" style={styles.errorCard}><View style={styles.errorSeal}><Ionicons name="alert-circle-outline" size={22} color={theme.error} /></View><Text style={styles.errorTitle}>Chưa thể tiếp tục</Text><Text style={styles.errorCopy}>{errorMessage}</Text><PrimaryButton label="Quay lại lộ trình" onPress={() => router.back()} /></View> : null}
    {lesson ? <View style={styles.lessonHero}><LearningLandscape mood="journey" scene="learn" height={64} /><View style={styles.lessonHeroBody}><Text style={styles.heroKicker}>BÀI HỌC · {lesson.unit_title}</Text><Text style={styles.lessonHeroTitle}>{lesson.title}</Text><View style={styles.lessonFacts}><Text style={styles.lessonFact}>{lesson.estimated_minutes} phút</Text><Text style={styles.factDot}>·</Text><Text style={styles.lessonFact}>{lesson.xp_reward} XP khi hoàn tất</Text></View></View></View> : null}
    <View style={[themedCard(theme), styles.progressCard]} accessible accessibilityLabel={`Đã hoàn thành ${completed} trên ${activities.length} hoạt động`}>
      <View style={styles.progressHead}>
        <View><Text style={styles.eyebrow}>TIẾN ĐỘ BÀI HỌC</Text><Text style={styles.progressTitle}>{completed}/{activities.length || "–"} hoạt động</Text></View>
        <View style={[styles.progressBadge, completed === activities.length && activities.length > 0 && styles.progressBadgeComplete]}>
          <Ionicons name={completed === activities.length && activities.length > 0 ? "checkmark" : "flash-outline"} size={18} color={completed === activities.length && activities.length > 0 ? theme.success : theme.primaryText} />
        </View>
      </View>
      <AnimatedProgressBar progress={progress} color={completed === activities.length && activities.length > 0 ? theme.success : theme.primary} trackColor={theme.border} accessibilityLabel="Tiến độ bài học" />
      <Text style={styles.progressHint}>{completed === activities.length && activities.length > 0 ? "Sẵn sàng đánh dấu hoàn thành." : "Các mục có dấu tích sẽ được lưu tự động khi bạn học."}</Text>
    </View>
    <View style={styles.activitySection}><View style={styles.activitySectionHead}><Text style={styles.activityKicker}>CÁC BƯỚC TRONG BÀI</Text><Text style={styles.activityCount}>{completed}/{activities.length}</Text></View><Text style={styles.activityIntro}>Hoàn thành các hoạt động theo thứ tự để ghi nhận bài này.</Text></View>
    <View style={styles.list}>
      {activities.map((activity, index) => {
        const route = routes[activity.activity_type](activity.target);
        const done = visited.includes(activity.id);
        const current = !done && index === completed;
        return <MotionPressable key={activity.id} haptic={Boolean(route)} disabled={!route}
          accessibilityLabel={`${index + 1}. ${activity.title}. ${done ? "Đã hoàn thành" : route ? "Chưa hoàn thành" : "Chưa khả dụng"}`}
          onPress={() => {
            if (!route) return;
            const params = { lessonActivityId: activity.id, returnTo: "/path/lesson/" + lessonId };
            if (activity.activity_type === "VOCABULARY" && activity.target) {
              const batch = parseLearningVocabularyTarget(activity.target);
              router.push({ pathname: "/(tabs)/vocabulary", params: {
                ...params,
                band: batch?.band ?? activity.target,
                ...(batch ? { lessonVocabularyTarget: activity.target } : {}),
              } } as Href);
            } else if (activity.activity_type === "GRAMMAR" && activity.target) {
              router.push({ pathname: "/grammar", params: { ...params, grammarId: activity.target } } as Href);
            } else router.push({ pathname: route as Href, params } as Href);
          }} style={[themedCard(theme), styles.activityCard, done && styles.activityDone, current && styles.activityCurrent, !route && styles.activityUnavailable]}>
          <View style={[styles.activityIcon, done && styles.activityIconDone, current && styles.activityIconCurrent]}><Text style={[styles.activityIndex, done && styles.activityIndexDone, current && styles.activityIndexCurrent]}>{done ? "✓" : String(index + 1).padStart(2, '0')}</Text></View>
          <View style={styles.activityCopy}><Text style={styles.activityType}>{activity.activity_type}</Text><Text style={styles.activity}>{activity.title}</Text><Text style={done ? styles.doneText : current ? styles.currentText : styles.todoText}>{done ? "Đã ghi nhận" : route ? current ? "BƯỚC ĐANG MỞ · CHẠM ĐỂ BẮT ĐẦU" : "Chạm để xem hoạt động" : "Chưa khả dụng trong phiên bản này"}</Text></View>
          {route ? <Ionicons name="chevron-forward" size={20} color={theme.textMuted} /> : null}
        </MotionPressable>;
      })}
    </View>
    {lessonFinished ? <View style={styles.finishCard} accessibilityRole="alert">
      <LearningGuide mood="celebrate" size={172} />
      <Text style={styles.finishTitle}>Hoàn thành bài học!</Text>
      <Text style={styles.finishCopy}>Bạn đã hoàn thành {activities.length} hoạt động và nhận {lesson?.xp_reward ?? 0} XP cho chặng này.</Text>
      <PrimaryButton label="Quay lại lộ trình" onPress={() => router.back()} />
    </View> : <PrimaryButton label={completed === activities.length && activities.length > 0 ? "Hoàn thành bài học" : `Hoàn thành ${Math.max(0, activities.length - completed)} hoạt động còn lại`}
      disabled={!lesson || activities.length === 0 || completed < activities.length}
      onPress={() => void completeLesson(db, lessonId).then(() => { void playFeedback('complete', { hapticEnabled, soundEnabled }); track(AnalyticsEvent.LESSON_COMPLETED, { activity: "learning", activities: activities.length }); setLessonFinished(true); }).catch((error) => setErrorMessage(error instanceof Error ? error.message : "Chưa lưu được. Tiến độ cũ vẫn còn."))} />}
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  lessonHero: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }, lessonHeroBody: { padding: spacing.md, gap: spacing.xs }, heroKicker: { color: theme.success, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }, lessonHeroTitle: { color: theme.textPrimary, fontSize: 20, lineHeight: 27, fontWeight: '900' }, lessonFacts: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs }, lessonFact: { color: theme.textSecondary, fontSize: 11, fontWeight: '800' }, factDot: { color: theme.textMuted },
  errorCard: { borderRadius: radius.lg, padding: spacing.lg, backgroundColor: theme.errorSoft, borderWidth: 1, borderColor: theme.error, alignItems: 'flex-start', gap: spacing.sm }, errorSeal: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }, errorTitle: { color: theme.error, fontWeight: '900', fontSize: 18 }, errorCopy: { color: theme.textSecondary, fontSize: 14, lineHeight: 21 },
  progressCard: { gap: spacing.md, backgroundColor: theme.infoSoft },
  progressHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: theme.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 0.9 },
  progressTitle: { color: theme.textPrimary, marginTop: 3, fontSize: 20, fontWeight: "900" },
  progressBadge: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" },
  progressBadgeComplete: { backgroundColor: theme.successSoft },
  progressHint: { color: theme.textMuted, fontSize: 12, lineHeight: 18 },
  activitySection: { gap: 4, paddingTop: spacing.xs }, activitySectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, activityKicker: { color: theme.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }, activityCount: { color: theme.primaryText, fontSize: 12, fontWeight: '900' }, activityIntro: { color: theme.textMuted, fontSize: 12, lineHeight: 18 },
  list: { gap: spacing.sm },
  activityCard: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: spacing.md, borderLeftWidth: 3, borderLeftColor: theme.border },
  activityDone: { backgroundColor: theme.successSoft, borderColor: theme.success, borderLeftColor: theme.success }, activityCurrent: { backgroundColor: theme.surfaceSelected, borderColor: theme.primary, borderLeftColor: theme.primary, borderWidth: 1.5 },
  activityUnavailable: { opacity: 0.58 },
  activityIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  activityIconDone: { backgroundColor: theme.success },
  activityIconCurrent: { backgroundColor: theme.primary },
  activityIndex: { color: theme.textSecondary, fontWeight: "900", fontSize: 12 },
  activityIndexDone: { color: theme.onSuccess },
  activityIndexCurrent: { color: theme.onPrimary },
  activityCopy: { flex: 1, gap: 3 }, activityType: { color: theme.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  activity: { color: theme.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: "900" },
  todoText: { color: theme.primaryText, fontSize: 12, fontWeight: "700" },
  currentText: { color: theme.primaryText, fontSize: 9, fontWeight: '900', letterSpacing: 0.2 },
  doneText: { color: theme.success, fontSize: 12, fontWeight: "800" },
  finishCard: { alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: theme.successSoft, borderWidth: 1, borderColor: theme.success },
  finishTitle: { color: theme.textPrimary, fontSize: 22, fontWeight: "900" },
  finishCopy: { color: theme.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
}); }
