import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useIsFocused, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import EnglishActivity from "@/app/english/activity";
import { AudioButton } from "@/components/AudioButton";
import { ChineseAIEntry } from "@/components/ChineseAIEntry";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import type { DailyQuestItem } from "@/components/DailyQuestCard";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { LearningGuide } from '@/components/visual/LearningGuide';
import { LearningLandscape } from "@/components/visual/LearningLandscape";
import { radius, spacing, typography } from "@/constants/design";
import {
  getGamificationSummary,
  type GamificationSummary,
} from "@/db/gamification";
import { listLearningCourses, type LearningCourse } from "@/db/learning-path";
import {
  getDashboardStats,
  getDueCount,
  getDailyVocabulary,
  getSettings,
  getUnlearnedVocabulary,
} from "@/db/repository";
import { featureFlags } from "@/services/feature-flags/feature-flags";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { EnglishAvailability } from "@/services/languages/LanguageRuntime";
import {
  getComebackPlan,
  getHomeNextAction,
} from "@/services/learning/next-best-action";
import { normalizeReviewSessionSize } from "@/services/review/session-size";
import { toLocalDateKey } from "@/services/stats/calendar";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/theme/ThemeProvider";
import type { DashboardStats, Vocabulary } from "@/types/models";

const primaryQuick = [
  ["Bộ từ riêng", "albums", "/decks", "hanzi"],
  ["Học từ mới", "add-circle", "/learn/setup", "reading"],
  ["HSK", "layers", "/(tabs)/hsk", "listening"],
  ["Lộ trình", "map-outline", "/path", "review"],
] as const;

const toolHubs = [
  [
    'Củng cố trí nhớ',
    'bulb-outline',
    '/memory',
    'Nhớ rồi viết · phân biệt chữ · ôn chữ cũ',
    'hanzi',
  ],
  [
    "Luyện tập",
    "fitness-outline",
    "/practice",
    "Ôn từ · nghe nói · viết · ngữ pháp",
    "listening",
  ],
  [
    "Thư viện",
    "library-outline",
    "/library",
    "Truyện · văn bản cá nhân · tra cứu",
    "reading",
  ],
] as const;

export default function Home() {
  const { preferences } = useLearningLanguage();
  return preferences.learningLanguage === "en" ? <EnglishAvailability><EnglishActivity /></EnglishAvailability> : <ChineseHome />;
}

function ChineseHome() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const focused = useIsFocused();
  const styles = createStyles(theme);
  const setSettings = useAppStore((state) => state.setSettings);
  const settings = useAppStore((state) => state.settings);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [daily, setDaily] = useState<Vocabulary | null>(null);
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  const [gamification, setGamification] = useState<GamificationSummary | null>(
    null,
  );
  const [hasUnlearnedWords, setHasUnlearnedWords] = useState(false);
  const [todayKey, setTodayKey] = useState(() => toLocalDateKey(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      const nextKey = toLocalDateKey(new Date());
      setTodayKey((currentKey) =>
        currentKey === nextKey ? currentKey : nextKey,
      );
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      const refreshDateKey = todayKey;
      const refresh = async () => {
        const currentSettings = await getSettings(db);
        const [nextStats, dailyWord, nextCourses, nextGamification, unlearned, totalDue] =
          await Promise.all([
            getDashboardStats(db, currentSettings.selectedHskBands),
            getDailyVocabulary(
              db,
              currentSettings.selectedHskBands,
              refreshDateKey,
            ),
            listLearningCourses(db),
            getGamificationSummary(db, currentSettings.dailyStudyMinutes),
            getUnlearnedVocabulary(db, currentSettings.selectedHskBands, 1),
            getDueCount(db),
          ]);
        if (live && refreshDateKey === toLocalDateKey(new Date())) {
          setStats({ ...nextStats, due: totalDue });
          setDaily(dailyWord);
          setCourses(nextCourses);
          setGamification(nextGamification);
          setHasUnlearnedWords(unlearned.length > 0);
          setSettings(currentSettings);
        }
      };
      void refresh();
      const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 30_000);
      return () => {
        live = false;
        clearInterval(timer);
      };
    }, [db, setSettings, todayKey]),
  );

  const newGoal = settings?.dailyNewWordGoal ?? 10;
  const reviewSessionSize = normalizeReviewSessionSize(settings?.reviewSessionSize);
  const studyGoalMinutes = settings?.dailyStudyMinutes ?? 30;
  const studyMinutes = Math.floor((stats?.studySeconds ?? 0) / 60);
  const activeCourse =
    courses.find(
      (course) =>
        course.completed_lessons > 0 &&
        course.completed_lessons < course.total_lessons,
    ) ??
    courses.find((course) => course.completed_lessons < course.total_lessons) ??
    null;
  const courseProgress =
    activeCourse && activeCourse.total_lessons > 0
      ? activeCourse.completed_lessons / activeCourse.total_lessons
      : 0;
  const nextAction = getHomeNextAction({
    dueCount: stats?.due ?? 0,
    activeCourse: activeCourse
      ? { id: activeCourse.id, title: activeCourse.title }
      : null,
    remainingNewWords: Math.max(0, newGoal - (stats?.newToday ?? 0)),
    hasUnlearnedWords,
    studiedMinutes: studyMinutes,
    studyGoalMinutes,
  });
  const comeback = getComebackPlan(
    stats?.lastStudyDate,
    todayKey,
    stats?.due ?? 0,
  );
  const heroTitle = nextAction.title;
  const heroSubtitle =
    nextAction.kind === "course" && activeCourse
      ? `Bài ${Math.min(activeCourse.completed_lessons + 1, activeCourse.total_lessons)} · khoảng 15 phút · ${activeCourse.earned_xp} XP đã nhận`
      : nextAction.subtitle;
  const heroProgress =
    nextAction.kind === "course"
      ? courseProgress
      : nextAction.kind === "review"
        ? Math.min(
            1,
            (stats?.reviewedToday ?? 0) /
              Math.max(1, (stats?.reviewedToday ?? 0) + (stats?.due ?? 0)),
          )
        : nextAction.kind === "new-words"
          ? Math.min(1, (stats?.newToday ?? 0) / Math.max(1, newGoal))
          : Math.min(1, studyMinutes / Math.max(1, studyGoalMinutes));
  const heroProgressLabel =
    nextAction.kind === "course" && activeCourse
      ? `${activeCourse.completed_lessons}/${activeCourse.total_lessons} bài`
      : nextAction.kind === "review"
        ? `${stats?.reviewedToday ?? 0} đã ôn hôm nay`
        : nextAction.kind === "new-words"
          ? `${stats?.newToday ?? 0}/${newGoal} từ mới`
          : `${studyMinutes}/${studyGoalMinutes} phút học`;
  const heroAction = () => router.push(nextAction.href as Href);
  const quests: DailyQuestItem[] = [
    {
      id: "review",
      label: "Ôn theo lịch SRS",
      detail:
        (stats?.due ?? 0) > 0
          ? `${stats?.due ?? 0} từ đang chờ ôn`
          : "Không còn từ đến hạn",
      complete: (stats?.due ?? 0) === 0,
      icon: "repeat",
      onPress: () => router.push("/review"),
    },
    {
      id: "new-words",
      label: "Học từ mới",
      detail: `${stats?.newToday ?? 0}/${newGoal} từ hôm nay`,
      complete: (stats?.newToday ?? 0) >= newGoal,
      icon: "add-circle",
      onPress: () => router.push("/daily" as Href),
    },
    {
      id: "study-time",
      label: "Giữ nhịp học",
      detail: `${studyMinutes}/${studyGoalMinutes} phút tập trung`,
      complete: studyMinutes >= studyGoalMinutes,
      icon: "time",
      onPress: () =>
        router.push(
          activeCourse
            ? (`/path/${activeCourse.id}` as Href)
            : ("/daily" as Href),
        ),
    },
  ];
  const visibleQuests = quests.filter(
    (quest) => !(nextAction.kind === "review" && quest.id === "review"),
  );

  return (
    <Screen safeAreaEdges={["top"]}>
      <View style={styles.top}>
        <View style={styles.topLine}>
          <Text style={styles.hello}>Xin chào</Text>
          <View style={styles.rewardRow}>
            <View style={styles.streak}>
              <Text style={styles.streakText}>
                🔥 {stats?.streak ?? 0} ngày
              </Text>
            </View>
            <View style={styles.xp}>
              <Text style={styles.xpText}>
                +{gamification?.todayXp ?? 0} XP
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.welcome}>
          <View style={styles.welcomeCopy}>
            <Text style={styles.welcomeLabel}>你好 · CHÀO BẠN</Text>
            <Text style={styles.question}>Học vui, nhớ lâu.</Text>
            <Text style={styles.welcomeHint}>Cùng khám phá tiếng Trung nhé!</Text>
          </View>
          <LearningGuide mood="welcome" size={128} active={focused} interactive />
        </View>
      </View>

      <ChineseAIEntry />
      <View style={styles.hero}>
        <View style={styles.heroScene}>
          <LearningLandscape mood="journey" height={82} />
          <View style={styles.sceneCaption}>
            <Text style={styles.sceneCaptionChinese}>学</Text>
            <Text style={styles.sceneCaptionText}>MỖI NGÀY MỘT BƯỚC</Text>
          </View>
        </View>
        <View style={styles.heroContent}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>GỢI Ý CHO HÔM NAY</Text>
              <Text style={styles.heroTitle}>{heroTitle}</Text>
              <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
            </View>
          </View>
          <AnimatedProgressBar
            progress={heroProgress}
            color={theme.success}
            trackColor={theme.backgroundSecondary}
            accessibilityLabel="Tiến độ phiên học gợi ý"
          />
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>{heroProgressLabel}</Text>
            <Text style={styles.heroMetaText}>
              {studyMinutes}/{studyGoalMinutes} phút
            </Text>
          </View>
          <PrimaryButton
            label={nextAction.kind === "stats" ? "Xem thống kê" : nextAction.kind === "review" ? `Ôn ${Math.min(reviewSessionSize, stats?.due ?? 0)} từ ngay` : "Tiếp tục học"}
            onPress={heroAction}
          />
        </View>
      </View>

      {daily ? (
        <View>
          <Text style={styles.section}>Từ hôm nay</Text>
          <MotionPressable
            haptic
            accessibilityLabel={`Mở từ hôm nay: ${daily.simplified}`}
            onPress={() => router.push(`/word/${daily.id}`)}
            style={styles.daily}
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
          </MotionPressable>
        </View>
      ) : null}

      {featureFlags.enabled("quickSessions") ? (
        <View style={styles.quickSession}>
          <View>
            <Text style={styles.quickSessionTitle}>Phiên học nhanh</Text>
            <Text style={styles.quickSessionCopy}>
              3, 5 hoặc 10 phút có đếm ngược · ưu tiên từ đến hạn
            </Text>
          </View>
          <View style={styles.quickSessionOptions}>
            {([3, 5, 10] as const).map((minutes, index) => (
              <MotionPressable
                key={minutes}
                haptic
                accessibilityLabel={`Lập phiên học nhanh ${minutes} phút`}
                onPress={() =>
                  router.push({
                    pathname: "/daily",
                    params: { minutes: String(minutes) },
                  } as Href)
                }
                style={[styles.quickSessionOption, { backgroundColor: theme.skillSurfaces[(['reading', 'speaking', 'listening'] as const)[index]!] }]}
              >
                <Text style={[styles.quickSessionValue, { color: theme.skillColors[(['reading', 'speaking', 'listening'] as const)[index]!] }]}>{minutes}</Text>
                <Text style={styles.quickSessionUnit}>phút</Text>
              </MotionPressable>
            ))}
          </View>
        </View>
      ) : null}

      {featureFlags.enabled("comebackPrompt") && comeback ? (
        <MotionPressable
          haptic
          accessibilityLabel={`${comeback.title}. ${comeback.message} Bắt đầu phiên ${comeback.minutes} phút.`}
          onPress={() =>
            router.push({
              pathname: "/daily",
              params: { minutes: String(comeback.minutes) },
            } as Href)
          }
          style={styles.comeback}
        >
          <View style={styles.comebackCopy}>
            <Text style={styles.comebackTitle}>
              {comeback.title} · {comeback.daysAway} ngày
            </Text>
            <Text style={styles.comebackMessage}>
              {comeback.message.trim()}
            </Text>
          </View>
          <View style={styles.comebackAction}>
            <Text style={styles.comebackActionText}>
              {comeback.minutes} phút
            </Text>
          </View>
        </MotionPressable>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.section}>Hôm nay</Text>
        {visibleQuests.map(quest => <MotionPressable key={quest.id} haptic accessibilityLabel={`${quest.label}: ${quest.detail}`} onPress={() => quest.onPress?.()} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingVertical: 8, borderBottomWidth: 1, borderColor: theme.border }}><Ionicons name={quest.complete ? "checkmark-circle" : "ellipse-outline"} size={22} color={quest.complete ? theme.success : theme.textMuted} /><View style={{ flex: 1 }}><Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "700" }}>{quest.label}</Text><Text style={{ color: theme.textMuted, fontSize: 13 }}>{quest.detail}</Text></View><Ionicons name="chevron-forward" size={18} color={theme.textMuted} /></MotionPressable>)}
      </View>

      <View>
        <Text style={styles.section}>Bắt đầu nhanh</Text>
        <View style={styles.quickGrid}>
          {primaryQuick.map(([label, icon, href, skill]) => (
            <MotionPressable
              key={label}
              haptic
              accessibilityLabel={label}
              onPress={() => router.push(href as Href)}
              style={[styles.quick, { backgroundColor: theme.skillSurfaces[skill] }]}
            >
              <View style={styles.quickIcon}>
                <Ionicons name={icon} size={26} color={theme.skillColors[skill]} />
              </View>
              <Text style={[styles.quickText, { color: theme.skillColors[skill] }]}>{label}</Text>
            </MotionPressable>
          ))}
        </View>
        <Text style={[styles.section, { marginTop: spacing.lg }]}>
          Khám phá theo nhu cầu
        </Text>
        <View style={styles.toolGrid}>
          {toolHubs.map(([label, icon, href, detail, skill]) => (
            <MotionPressable
              key={label}
              haptic
              accessibilityLabel={`${label}. ${detail}`}
              onPress={() => router.push(href as unknown as Href)}
              style={styles.hub}
            >
              <View style={[styles.hubIcon, { backgroundColor: theme.skillSurfaces[skill] }]}>
                <Ionicons name={icon} size={25} color={theme.skillColors[skill]} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.hubTitle}>{label}</Text>
                <Text style={styles.hubDetail}>{detail}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.textMuted}
              />
            </MotionPressable>
          ))}
        </View>
      </View>

    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    top: { paddingTop: spacing.md, gap: spacing.sm },
    topLine: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    hello: { color: theme.textMuted, fontSize: 15, fontWeight: "700" },
    rewardRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
    streak: {
      backgroundColor: theme.warningSoft,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    streakText: { color: theme.warning, fontSize: 12, fontWeight: "900" },
    xp: {
      backgroundColor: theme.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    xpText: { color: theme.primaryText, fontSize: 12, fontWeight: "900" },
    question: {
      color: theme.textPrimary,
      fontSize: 25,
      fontWeight: "900",
      letterSpacing: -0.4,
    },
    welcome: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    welcomeCopy: { flex: 1, gap: 6 },
    welcomeLabel: { color: theme.primaryText, fontSize: 10, letterSpacing: 1, fontWeight: "800" },
    welcomeHint: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
    hero: { backgroundColor: theme.skillSurfaces.reading, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
    heroScene: { position: "relative" },
    sceneCaption: { position: "absolute", left: spacing.md, bottom: spacing.md, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.86)" },
    sceneCaptionChinese: { color: "#A94D45", fontSize: 16, fontWeight: "900" },
    sceneCaptionText: { color: "#334239", fontSize: 10, letterSpacing: 0.8, fontWeight: "900" },
    heroContent: { gap: spacing.md, padding: spacing.lg },
    heroTop: {
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between",
    },
    heroCopy: { flex: 1, gap: spacing.xs },
    eyebrow: {
      color: theme.success,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },
    heroTitle: {
      color: theme.textPrimary,
      fontSize: 21,
      fontWeight: "900",
      lineHeight: 27,
    },
    heroSubtitle: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
    heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
    heroMetaText: { color: theme.textSecondary, fontSize: 12, fontWeight: "800" },
    quickSession: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    quickSessionTitle: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "900",
    },
    quickSessionCopy: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    quickSessionOptions: { flexDirection: "row", gap: spacing.sm },
    quickSessionOption: {
      alignItems: "center",
      backgroundColor: theme.primarySoft,
      borderRadius: radius.md,
      flex: 1,
      justifyContent: "center",
      minHeight: 52,
    },
    quickSessionValue: {
      color: theme.primaryText,
      fontSize: 17,
      fontWeight: "900",
    },
    quickSessionUnit: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: "700",
    },
    comeback: {
      alignItems: "center",
      backgroundColor: theme.infoSoft,
      borderColor: theme.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      padding: spacing.lg,
    },
    comebackCopy: { flex: 1, gap: spacing.xs },
    comebackTitle: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: "900",
    },
    comebackMessage: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    comebackAction: {
      backgroundColor: theme.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    comebackActionText: {
      color: theme.primaryText,
      fontSize: 12,
      fontWeight: "900",
    },
    section: {
      color: theme.textPrimary,
      fontSize: typography.subtitle,
      fontWeight: "800",
      marginBottom: spacing.md,
    },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    quick: {
      alignItems: "center",
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: radius.md,
      borderWidth: 1,
      flexGrow: 1,
      gap: spacing.sm,
      justifyContent: "center",
      minHeight: 112,
      padding: spacing.md,
      width: "45%",
    },
    quickIcon: {
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: 14,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    quickText: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "center",
    },
    toolGrid: { gap: spacing.sm },
    hubIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    hub: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
      minHeight: 80,
      padding: spacing.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.md,
    },
    hubTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: "800" },
    hubDetail: { color: theme.textMuted, fontSize: 13, lineHeight: 19 },
    daily: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
      backgroundColor: theme.skillSurfaces.vocabulary,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    dailyIcon: {
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      height: 76,
      justifyContent: "center",
      width: 60,
    },
    dailyMark: { color: theme.warning, fontSize: 32, fontWeight: "700" },
    dailyCopy: { flex: 1, gap: 2 },
    dailyHanzi: { color: theme.textPrimary, fontSize: 29, fontWeight: "800" },
    muted: { color: theme.textMuted, fontSize: 14 },
  });
}
