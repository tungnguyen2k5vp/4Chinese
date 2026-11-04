import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { Screen } from "./Screen";
import { EnglishEmptyState } from "./english/EnglishEmptyState";
import {
  CefrJourneyIllustration,
  EmptyStatsIllustration,
} from "./english/EnglishIllustrations";
import { EnglishMetricTile } from "./english/EnglishMetricTile";

import {
  formatEnglishStudyDuration,
  getEnglishAccuracyPresentation,
} from "@/components/english/english-stats-presentation";
import { englishDemoStats } from "@/data/english-preview-fixtures";
import { englishStatistics } from "@/db/english/learner";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

/* =======================================================================
   1. ENGLISH STATISTICS COMPONENT
   ======================================================================= */
export function EnglishStatistics() {
  const db = useEnglishDatabase();
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof englishStatistics>
  > | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [showDemoPreview, setShowDemoPreview] = useState(
    () =>
      __DEV__ &&
      typeof window !== "undefined" &&
      typeof window.location !== "undefined" &&
      typeof window.location.search === "string" &&
      window.location.search.includes("preview=true"),
  );

  useFocusEffect(
    useCallback(() => {
      let live = true;
      if (retry < 0) return;
      setLoading(true);
      setError(false);
      void englishStatistics(db)
        .then((value) => {
          if (live) setStats(value);
        })
        .catch(() => {
          if (live) setError(true);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
      return () => {
        live = false;
      };
    }, [db, retry]),
  );

  const activeStats = showDemoPreview
    ? englishDemoStats
    : stats ?? { total: 0, studied: 0, due: 0, reviewed: 0, correct: 0, xp: 0, studyMs: 0 };

  const hasData = activeStats.total > 0 || activeStats.reviewed > 0;
  const accuracy = getEnglishAccuracyPresentation(
    activeStats.reviewed,
    activeStats.correct,
  );

  return (
    <Screen
      title="Thống kê tiếng Anh"
      subtitle="Theo dõi tiến bộ và kết quả ôn tập"
    >
      {/* Visual QA Preview Toggle */}
      {__DEV__ ? (
        <View style={styles.demoBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bật chế độ thử nghiệm thống kê đầy đủ"
            onPress={() => setShowDemoPreview((v) => !v)}
            style={[
              styles.demoButton,
              {
                backgroundColor: showDemoPreview ? palette.primary : palette.surfaceSubtle,
                borderColor: palette.primary,
              },
            ]}
          >
            <Ionicons
              name={showDemoPreview ? "eye" : "eye-outline"}
              size={14}
              color={showDemoPreview ? "#FFFFFF" : palette.primary}
            />
            <Text
              style={[
                styles.demoButtonText,
                { color: showDemoPreview ? "#FFFFFF" : palette.primary },
              ]}
            >
              {showDemoPreview ? "Đang bật: PREVIEW DATA (120 từ · 245 lượt)" : "Bật Preview Data để kiểm tra Thống kê"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Đang tải dữ liệu thống kê…
          </Text>
        </View>
      ) : error ? (
        <View style={[styles.alertCard, { backgroundColor: palette.errorLight, borderColor: palette.error }]}>
          <Ionicons name="alert-circle" size={24} color={palette.error} />
          <Text style={[styles.alertText, { color: palette.error }]}>
            Chưa đọc được thống kê tiếng Anh từ thiết bị.
          </Text>
          <PrimaryButton
            label="Thử lại thống kê"
            onPress={() => setRetry((n) => n + 1)}
          />
        </View>
      ) : !hasData ? (
        /* Empty State with Seedling Illustration */
        <EnglishEmptyState
          illustration={<EmptyStatsIllustration width={150} height={120} />}
          title="Chưa đủ dữ liệu đánh giá"
          description="Hoàn thành lượt ôn đầu tiên để bắt đầu theo dõi độ chính xác và thời gian phản hồi."
          primaryActionLabel="Bắt đầu học tiếng Anh"
          onPrimaryAction={() => router.navigate("/english" as Href)}
          secondaryActionLabel="Xem kế hoạch ngày"
          onSecondaryAction={() => router.push("/english/activity" as Href)}
        />
      ) : (
        /* Populated Progressive Dashboard */
        <View style={styles.statsDashboard}>
          {/* Main Key Metrics Grid */}
          <View style={styles.metricsGrid}>
            <EnglishMetricTile
              label="Tổng từ cá nhân"
              value={activeStats.total}
              icon="library"
              accentColor={palette.primary}
            />
            <EnglishMetricTile
              label="Từ đang học"
              value={activeStats.studied}
              icon="book"
              accentColor={palette.secondary}
              badge={activeStats.studied > 0
                ? `${Math.round((activeStats.studied / Math.max(activeStats.total, 1)) * 100)}%`
                : undefined}
            />
            <EnglishMetricTile
              label="Lượt ôn tập"
              value={activeStats.reviewed}
              icon="repeat"
              accentColor={palette.review}
              subValue={activeStats.reviewed > 0
                ? `${activeStats.correct} lượt nhớ`
                : undefined}
            />
          </View>

          {accuracy ? (
            <EnglishMetricTile
              label="Độ chính xác"
              value={accuracy.value}
              icon="checkmark-circle"
              accentColor={palette.success}
              badge={accuracy.badge}
            />
          ) : (
            <View
              style={[
                styles.insufficientDataCard,
                {
                  backgroundColor: isDark ? "#172338" : "#FFFFFF",
                  borderColor: isDark ? "#25334D" : "#E2E8F0",
                },
              ]}
            >
              <View
                testID="english-stats-insufficient-data"
                style={[
                  styles.insufficientDataIcon,
                  { backgroundColor: isDark ? "#1E293B" : "#EFF6FF" },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={palette.primary}
                />
              </View>
              <View style={styles.insufficientDataCopy}>
                <Text
                  style={[
                    styles.insufficientDataTitle,
                    { color: palette.textPrimary },
                  ]}
                >
                  Chưa đủ dữ liệu đánh giá
                </Text>
                <Text
                  style={[
                    styles.insufficientDataDescription,
                    { color: palette.textMuted },
                  ]}
                >
                  Tỷ lệ chính xác sẽ hiện sau lượt ôn đầu tiên.
                </Text>
              </View>
            </View>
          )}

          {/* Show earned XP/time only when there is a non-zero value. */}
          {activeStats.xp > 0 || activeStats.studyMs > 0 ? (
            <View
              style={[
                styles.spotlightCard,
                {
                  backgroundColor: isDark ? "#172338" : "#FFFFFF",
                  borderColor: isDark ? "#25334D" : "#E2E8F0",
                },
              ]}
            >
              <View style={styles.spotlightRow}>
                {activeStats.xp > 0 ? (
                  <View style={styles.spotlightItem}>
                    <Ionicons name="flash" size={24} color={palette.warning} />
                    <View style={styles.spotlightCopy}>
                      <Text style={[styles.spotlightValue, { color: palette.textPrimary }]}>
                        {activeStats.xp} XP
                      </Text>
                      <Text style={[styles.spotlightLabel, { color: palette.textMuted }]}>
                        Điểm kinh nghiệm tiếng Anh
                      </Text>
                    </View>
                  </View>
                ) : null}

                {activeStats.xp > 0 && activeStats.studyMs > 0 ? (
                  <View style={styles.spotlightDivider} />
                ) : null}

                {activeStats.studyMs > 0 ? (
                  <View style={styles.spotlightItem}>
                    <Ionicons name="time" size={24} color={palette.reading} />
                    <View style={styles.spotlightCopy}>
                      <Text style={[styles.spotlightValue, { color: palette.textPrimary }]}>
                        {formatEnglishStudyDuration(activeStats.studyMs)}
                      </Text>
                      <Text style={[styles.spotlightLabel, { color: palette.textMuted }]}>
                        Thời gian trả lời câu hỏi
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Action Button */}
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Xem kế hoạch ngày và sổ lỗi"
              onPress={() => router.push("/english/activity" as Href)}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

/* =======================================================================
   2. CEFR LEVELS COMPONENT (A1–C2 LEVEL EXPLORER)
   ======================================================================= */
interface CefrLevelInfo {
  code: string;
  name: string;
  englishName: string;
  description: string;
  color: string;
  status: string;
}

const CEFR_LEVELS: CefrLevelInfo[] = [
  {
    code: "A1",
    name: "Khởi đầu",
    englishName: "Breakthrough / Beginner",
    description: "Giao tiếp câu đơn giản, chào hỏi, giới thiệu bản thân và nhu cầu cụ thể.",
    color: "#10B981", // Emerald
    status: "Lộ trình đang biên soạn",
  },
  {
    code: "A2",
    name: "Sơ cấp",
    englishName: "Waystage / Elementary",
    description: "Mô tả sinh hoạt hàng ngày, gia đình, mua sắm và môi trường xung quanh.",
    color: "#0D9488", // Teal
    status: "Lộ trình đang biên soạn",
  },
  {
    code: "B1",
    name: "Trung cấp",
    englishName: "Threshold / Intermediate",
    description: "Diễn đạt ý kiến, kế hoạch du lịch, làm việc và xử lý tình huống quen thuộc.",
    color: "#2563EB", // Royal Blue
    status: "Lộ trình đang biên soạn",
  },
  {
    code: "B2",
    name: "Trung cao",
    englishName: "Vantage / Upper Intermediate",
    description: "Hiểu văn bản phức tạp, trao đổi trôi chảy tự nhiên với người bản ngữ.",
    color: "#4F46E5", // Indigo
    status: "Lộ trình đang biên soạn",
  },
  {
    code: "C1",
    name: "Cao cấp",
    englishName: "Effective Operational / Advanced",
    description: "Sử dụng linh hoạt trong học thuật và chuyên môn, hiểu ẩn ý sâu sắc.",
    color: "#7C3AED", // Violet
    status: "Lộ trình đang biên soạn",
  },
  {
    code: "C2",
    name: "Thành thạo",
    englishName: "Mastery / Proficient",
    description: "Diễn đạt tinh tế, nắm bắt mọi sắc thái văn hóa và giao tiếp như người bản xứ.",
    color: "#E11D48", // Rose
    status: "Lộ trình đang biên soạn",
  },
];

export function EnglishLevels() {
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);
  const [selectedLevel, setSelectedLevel] = useState<string>("A1");

  const currentLevel: CefrLevelInfo =
    CEFR_LEVELS.find((l) => l.code === selectedLevel) ?? CEFR_LEVELS[0]!;

  return (
    <Screen
      title="Cấp độ tiếng Anh · CEFR"
      subtitle="Khung tham chiếu ngôn ngữ chung châu Âu (A1–C2)"
    >
      {/* Mountain Journey Header Illustration */}
      <View
        style={[
          styles.cefrHeroCard,
          {
            backgroundColor: isDark ? "#172338" : "#FFFFFF",
            borderColor: isDark ? "#25334D" : "#E2E8F0",
          },
        ]}
      >
        <View style={styles.cefrHeroContent}>
          <View style={styles.cefrHeroTextCol}>
            <View style={[styles.cefrTag, { backgroundColor: palette.cefrLight }]}>
              <Text style={[styles.cefrTagText, { color: palette.cefr }]}>
                6 BẬC NĂNG LỰC CHUẨN
              </Text>
            </View>
            <Text style={[styles.cefrHeroTitle, { color: palette.textPrimary }]}>
              Hành trình chinh phục CEFR
            </Text>
            <Text style={[styles.cefrHeroSubtitle, { color: palette.textSecondary }]}>
              Khung tiêu chuẩn quốc tế đánh giá 4 kỹ năng ngôn ngữ từ Căn bản đến Thành thạo.
            </Text>
          </View>
          <CefrJourneyIllustration width={120} height={95} />
        </View>
      </View>

      {/* Honest Status Notice */}
      <View
        style={[
          styles.cefrNoticeCard,
          {
            backgroundColor: isDark ? "#131C2D" : "#F8FAFC",
            borderColor: isDark ? "#1E293B" : "#E2E8F0",
          },
        ]}
        testID="english-cefr-status"
      >
        <Ionicons name="information-circle-outline" size={18} color={palette.cefr} />
        <Text style={[styles.cefrNoticeText, { color: palette.textSecondary }]}>
          Lộ trình bài giảng chuẩn hóa CEFR đang được nghiên cứu biên soạn. Hiện tại, bạn có thể học tập hiệu quả với bộ từ vựng cá nhân và trình đọc văn bản.
        </Text>
      </View>

      {/* Level Selector Tabs (A1, A2, B1, B2, C1, C2) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.levelSelectorRow}
        accessibilityLabel="Chọn cấp độ CEFR"
      >
        {CEFR_LEVELS.map((lvl) => {
          const isSelected = lvl.code === selectedLevel;
          return (
            <Pressable
              key={lvl.code}
              accessibilityRole="tab"
              accessibilityLabel={`Cấp độ ${lvl.code}: ${lvl.name}`}
              onPress={() => setSelectedLevel(lvl.code)}
              style={[
                styles.levelTab,
                {
                  backgroundColor: isSelected
                    ? lvl.color
                    : isDark ? "#172338" : "#FFFFFF",
                  borderColor: isSelected
                    ? lvl.color
                    : isDark ? "#25334D" : "#E2E8F0",
                },
              ]}
            >
              <Text
                style={[
                  styles.levelTabCode,
                  { color: isSelected ? "#FFFFFF" : lvl.color },
                ]}
              >
                {lvl.code}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Selected Level Detail Card */}
      <View
        style={[
          styles.levelDetailCard,
          {
            backgroundColor: isDark ? "#172338" : "#FFFFFF",
            borderColor: currentLevel.color,
          },
        ]}
      >
        <View style={styles.levelDetailHeader}>
          <View style={styles.levelBadgeGroup}>
            <View
              style={[styles.bigLevelBadge, { backgroundColor: currentLevel.color }]}
            >
              <Text style={styles.bigLevelBadgeText}>{currentLevel.code}</Text>
            </View>
            <View style={styles.levelCopy}>
              <Text style={[styles.levelDetailName, { color: palette.textPrimary }]}>
                {currentLevel.name}
              </Text>
              <Text style={[styles.levelDetailEng, { color: palette.textMuted }]}>
                {currentLevel.englishName}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              { backgroundColor: `${currentLevel.color}18` },
            ]}
          >
            <Text
              testID="english-cefr-level-status"
              style={[styles.statusPillText, { color: currentLevel.color }]}
            >
              {currentLevel.status}
            </Text>
          </View>
        </View>

        <Text style={[styles.levelDesc, { color: palette.textSecondary }]}>
          {currentLevel.description}
        </Text>

      </View>

      {/* Useful Action Fallbacks */}
      <View style={styles.actionsContainer}>
        <PrimaryButton
          label="Mở bộ từ tiếng Anh cá nhân"
          onPress={() => router.navigate("/(tabs)/vocabulary" as Href)}
        />
        <View style={{ height: 10 }} />
        <PrimaryButton
          label="Đọc văn bản tiếng Anh"
          variant="secondary"
          onPress={() => router.push("/english/reader" as Href)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  demoBar: {
    marginBottom: 12,
  },
  demoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  demoButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  alertCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
    marginVertical: 16,
  },
  alertText: {
    fontSize: 14,
    textAlign: "center",
  },
  statsDashboard: {
    gap: 12,
  },
  insufficientDataCard: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.2,
  },
  insufficientDataIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  insufficientDataCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  insufficientDataTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  insufficientDataDescription: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  spotlightCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.2,
    marginVertical: 4,
  },
  spotlightRow: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  spotlightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
  },
  spotlightCopy: {
    flex: 1,
    minWidth: 0,
  },
  spotlightLabel: {
    flexShrink: 1,
    flexWrap: "wrap",
    fontSize: 12,
  },
  spotlightValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  spotlightDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  isolationNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  isolationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  cefrHeroCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.2,
    marginBottom: 12,
  },
  cefrHeroContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cefrHeroTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  cefrTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  cefrTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cefrHeroTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  cefrHeroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  cefrNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  cefrNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  levelSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    paddingRight: 2,
  },
  levelTab: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  levelTabCode: {
    fontSize: 15,
    fontWeight: "800",
  },
  levelDetailCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 12,
  },
  levelDetailHeader: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
  },
  levelBadgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    minWidth: 0,
  },
  levelCopy: {
    flex: 1,
    minWidth: 0,
  },
  bigLevelBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bigLevelBadgeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  levelDetailName: {
    fontSize: 17,
    fontWeight: "800",
  },
  levelDetailEng: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusPill: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    flexShrink: 1,
    flexWrap: "wrap",
    lineHeight: 15,
    fontSize: 11,
    fontWeight: "700",
  },
  levelDesc: {
    fontSize: 14,
    lineHeight: 21,
  },
  actionsContainer: {
    marginTop: 8,
  },
});
