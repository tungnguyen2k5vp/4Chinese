import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Screen } from "@/components/Screen";
import { EnglishHeroCard } from "@/components/english/EnglishHeroCard";
import { EnglishMetricTile } from "@/components/english/EnglishMetricTile";
import { EnglishQuickDictionary } from "@/components/english/EnglishQuickDictionary";
import { EnglishSkillTile } from "@/components/english/EnglishSkillTile";
import { formatEnglishStudyDuration } from "@/components/english/english-stats-presentation";
import { englishDemoMistakes, englishDemoPlan } from "@/data/english-preview-fixtures";
import {
  englishDailyPlan,
  englishMistakeBook,
  type EnglishMistake,
} from "@/db/english/activity";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export default function EnglishActivity() {
  const db = useEnglishDatabase();
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  const [data, setData] = useState<{
    plan: Awaited<ReturnType<typeof englishDailyPlan>>;
    mistakes: EnglishMistake[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [dictionaryVisible, setDictionaryVisible] = useState(false);
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
      setLoading(true);
      setError("");

      void Promise.all([englishDailyPlan(db), englishMistakeBook(db)])
        .then(([plan, mistakes]) => {
          if (live) setData({ plan, mistakes });
        })
        .catch(() => {
          if (live)
            setError(
              retry
                ? "Vẫn chưa đọc được hoạt động tiếng Anh. Dữ liệu chưa bị thay đổi."
                : "Không đọc được hoạt động tiếng Anh. Dữ liệu chưa bị thay đổi.",
            );
        })
        .finally(() => {
          if (live) setLoading(false);
        });

      return () => {
        live = false;
      };
    }, [db, retry]),
  );

  // Active plan & mistakes (support visual QA demo mode without writing to DB)
  const activePlan = showDemoPreview
    ? englishDemoPlan
    : data?.plan ?? {
        due: 0,
        newCards: 0,
        reviewedToday: 0,
        correctToday: 0,
        responseMsToday: 0,
        suggestedNew: 0,
        historicalMistakes: 0,
      };

  const activeMistakes = showDemoPreview
    ? englishDemoMistakes
    : data?.mistakes ?? [];

  const isNewUser = activePlan.due === 0 && activePlan.newCards === 0 && activePlan.reviewedToday === 0;

  return (
    <Screen hideHeader>
      <View style={styles.brandHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brandName, { color: palette.textPrimary }]}>4Chinese <Text style={{ color: palette.primary }}>English</Text></Text>
          <Text style={{ color: palette.textMuted }}>Tra cứu · học từ · ôn tập</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở hồ sơ tiếng Anh" onPress={() => router.push("/english/profile" as Href)} style={[styles.profileAction, { backgroundColor: palette.primaryLight }]}>
          <Ionicons name="person-outline" size={21} color={palette.primary} />
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Tra từ tiếng Anh hoặc nghĩa tiếng Việt" onPress={() => setDictionaryVisible(true)} style={[styles.dictionaryAction, { backgroundColor: isDark ? palette.surface : "#FFFFFF", borderColor: palette.border }]}>
        <Ionicons name="search" size={20} color={palette.primary} />
        <Text style={[styles.dictionaryPlaceholder, { color: palette.textMuted }]}>Tra từ tiếng Anh hoặc nghĩa tiếng Việt</Text>
        <Ionicons name="book-outline" size={19} color={palette.textMuted} />
      </Pressable>
      <View style={styles.homeLinks}>
        <Pressable accessibilityRole="button" onPress={() => router.navigate("/english-speaking" as Href)} style={[styles.homeLink, { backgroundColor: palette.spellingLight }]}><Ionicons name="mic-outline" size={17} color={palette.spelling} /><Text style={{ color: palette.textPrimary, fontWeight: "800" }}>Luyện nói</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.navigate("/(tabs)/explore" as Href)} style={[styles.homeLink, { backgroundColor: palette.readingLight }]}><Ionicons name="compass-outline" size={17} color={palette.reading} /><Text style={{ color: palette.textPrimary, fontWeight: "800" }}>Khám phá</Text></Pressable>
      </View>
      <View style={styles.homeLinks}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/stats" as Href)} style={[styles.homeLink, { backgroundColor: palette.cefrLight }]}><Ionicons name="stats-chart-outline" size={17} color={palette.cefr} /><Text style={{ color: palette.textPrimary, fontWeight: "800" }}>Thống kê</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/hsk" as Href)} style={[styles.homeLink, { backgroundColor: palette.primaryLight }]}><Ionicons name="ribbon-outline" size={17} color={palette.primary} /><Text style={{ color: palette.textPrimary, fontWeight: "800" }}>Khung CEFR</Text></Pressable>
      </View>
      {dictionaryVisible ? <EnglishQuickDictionary onClose={() => setDictionaryVisible(false)} /> : null}
      {isNewUser ? <Pressable accessibilityRole="button" onPress={() => router.push("/english/onboarding" as Href)} style={[styles.homeLink, { backgroundColor: palette.primaryLight, padding: 14 }]}><Ionicons name="options-outline" size={20} color={palette.primary} /><Text style={{ color: palette.primary, fontWeight: "800" }}>Bắt đầu · chọn mục tiêu học tiếng Anh</Text></Pressable> : null}
      {/* Visual QA Preview Mode Toggle for testing populated states without touching database */}
      {__DEV__ ? (
        <View style={styles.demoBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chuyển chế độ xem thử nghiệm dữ liệu đầy đủ"
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
              {showDemoPreview ? "Đang bật: PREVIEW DATA (18 thẻ)" : "Bật Preview Data để kiểm tra UI"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Loading state */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Đang tải kế hoạch học tiếng Anh…
          </Text>
        </View>
      ) : null}

      {/* Error state */}
      {error ? (
        <View style={[styles.errorCard, { backgroundColor: palette.errorLight, borderColor: palette.error }]}>
          <Ionicons name="alert-circle" size={24} color={palette.error} />
          <Text style={[styles.errorText, { color: palette.error }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => setRetry((n) => n + 1)}
            style={[styles.retryButton, { backgroundColor: palette.error }]}
          >
            <Text style={styles.retryButtonText}>Thử lại ngay</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error ? (
        <>
          {/* Hero Section: Different presentation for New User vs Active Learner */}
          {isNewUser ? (
            <EnglishHeroCard
              greeting="Khởi đầu hành trình"
              title="Tạo bộ từ vựng đầu tiên"
              subtitle="Lưu từ vựng bạn muốn học, ôn tập thông minh theo thuật toán lặp lại ngắt quãng SRS hoàn toàn offline."
              badgeText="BẮT ĐẦU NGAY"
              primaryActionLabel="Tạo bộ từ đầu tiên"
              onPrimaryAction={() => router.navigate("/english" as Href)}
              secondaryActionLabel="Đọc văn bản"
              onSecondaryAction={() => router.push("/english/reader" as Href)}
            />
          ) : (
            <EnglishHeroCard
              greeting="Tiếp tục học tập"
              title={
                activePlan.due > 0
                  ? `Có ${activePlan.due} thẻ đang chờ bạn ôn tập`
                  : "Bạn đã hoàn thành mục tiêu hôm nay!"
              }
              subtitle={
                activePlan.due > 0
                  ? `Ôn tập thẻ đến hạn trước, sau đó học thêm tối đa ${activePlan.suggestedNew} từ mới.`
                  : "Tuyệt vời! Bạn có thể học thêm thẻ mới hoặc đọc thêm văn bản tiếng Anh."
              }
              badgeText={activePlan.due > 0 ? "CẦN ÔN TẬP" : "ĐÃ HOÀN THÀNH"}
              primaryActionLabel={activePlan.due > 0 ? "Ôn tiếng Anh ngay" : "Mở kho từ vựng"}
              primaryActionDisabled={activePlan.due === 0 && activePlan.newCards === 0}
              onPrimaryAction={() => {
                if (activePlan.due > 0) {
                  router.push("/english/review" as Href);
                } else {
                  router.navigate("/english" as Href);
                }
              }}
              secondaryActionLabel="Ôn nhanh 5 thẻ"
              onSecondaryAction={() => router.push("/english/review?quick=1" as Href)}
            />
          )}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
              Học tiếp
            </Text>
          </View>
          <QuickLearningActions due={activePlan.due} isDark={isDark} palette={palette} />

          {/* Today's Progress Metrics Section */}
          {!isNewUser ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                  Tiến độ hôm nay
                </Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>
                  {new Date().toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" })}
                </Text>
              </View>

              <View style={styles.metricsGrid}>
                <EnglishMetricTile
                  label="Thẻ đến hạn"
                  value={activePlan.due}
                  icon="time-outline"
                  accentColor={activePlan.due > 0 ? palette.review : palette.success}
                  badge={activePlan.due > 0 ? "Cần ôn" : "Tốt"}
                />
                <EnglishMetricTile
                  label="Lượt ôn hôm nay"
                  value={activePlan.reviewedToday}
                  icon="checkmark-done-circle-outline"
                  accentColor={palette.primary}
                  subValue={activePlan.reviewedToday > 0 ? `${activePlan.correctToday} đúng` : undefined}
                />
                <EnglishMetricTile
                  label="Từ chưa học"
                  value={activePlan.newCards}
                  icon="bulb-outline"
                  accentColor={palette.secondary}
                />
                <EnglishMetricTile
                  label="Thời gian trả lời"
                  value={formatEnglishStudyDuration(activePlan.responseMsToday)}
                  icon="stopwatch-outline"
                  accentColor={palette.reading}
                />
              </View>
            </>
          ) : null}

          {/* Explore Skills Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
              Kỹ năng & Hoạt động
            </Text>
          </View>

          <EnglishSkillTile
            title="Kho từ vựng cá nhân"
            description="Tạo và quản lý các bộ từ riêng, thêm từ hàng loạt và phân loại"
            icon="albums-outline"
            accentColor={palette.vocabulary}
            onPress={() => router.navigate("/english" as Href)}
          />

          <EnglishSkillTile
            title="Ôn tập Flashcard SRS"
            description={
              activePlan.due > 0
                ? `${activePlan.due} thẻ đến hạn đang chờ ôn lại`
                : "Hàng đợi ôn tập trống · Các thẻ đã ghi nhớ tốt"
            }
            icon="repeat-outline"
            accentColor={palette.review}
            badge={activePlan.due > 0 ? `${activePlan.due} đến hạn` : undefined}
            onPress={() => router.push("/english/review" as Href)}
            disabled={activePlan.due === 0}
          />

          <EnglishSkillTile
            title="Trình đọc văn bản tiếng Anh"
            description="Dán văn bản bạn thích, đọc thư thái và chạm để tra từ cá nhân"
            icon="reader-outline"
            accentColor={palette.reading}
            onPress={() => router.push("/english/reader" as Href)}
          />

          <EnglishSkillTile
            title="Khung cấp độ CEFR (A1–C2)"
            description="Khám phá thang đo 6 bậc năng lực tiếng Anh theo chuẩn châu Âu"
            icon="ribbon-outline"
            accentColor={palette.cefr}
            onPress={() => router.navigate("/(tabs)/hsk" as Href)}
          />

          {/* Sổ lỗi tiếng Anh (Mistake Book) */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="alert-circle-outline" size={20} color={palette.error} />
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                Sổ lỗi tiếng Anh
              </Text>
            </View>
            {activePlan.historicalMistakes > 0 ? (
              <View style={[styles.mistakeCountBadge, { backgroundColor: palette.errorLight }]}>
                <Text style={[styles.mistakeCountText, { color: palette.error }]}>
                  {activePlan.historicalMistakes} từ từng sai
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.mistakeHelperText, { color: palette.textMuted }]}>
            Lịch sử tự đánh giá cục bộ trên thiết bị. Xem lại nghĩa tại đây không đổi lịch SRS hay trừ XP.
          </Text>

          {activeMistakes.length === 0 ? (
            <View
              style={[
                styles.emptyMistakeCard,
                {
                  backgroundColor: isDark ? "#172338" : "#FFFFFF",
                  borderColor: isDark ? "#25334D" : "#E2E8F0",
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={32} color={palette.success} />
              <Text style={[styles.emptyMistakeTitle, { color: palette.textPrimary }]}>
                Chưa có câu trả lời sai
              </Text>
              <Text style={[styles.emptyMistakeSub, { color: palette.textMuted }]}>
                Khi bạn ôn thẻ và chọn &quot;Chưa nhớ&quot;, các từ cần chú ý sẽ được lưu tự động tại đây để bạn ôn lại.
              </Text>
            </View>
          ) : (
            activeMistakes.map((card) => (
              <View
                key={card.id}
                style={[
                  styles.mistakeCard,
                  {
                    backgroundColor: isDark ? "#172338" : "#FFFFFF",
                    borderColor: isDark ? "#25334D" : "#E2E8F0",
                  },
                ]}
              >
                <View style={styles.mistakeTopRow}>
                  <View style={styles.mistakeWordWrap}>
                    <Text style={[styles.mistakeHeadword, { color: palette.textPrimary }]}>
                      {card.headword}
                    </Text>
                    <Text style={[styles.mistakeMeaning, { color: palette.textSecondary }]}>
                      {card.meaning_vi}
                    </Text>
                  </View>
                  <View style={[styles.wrongCountBadge, { backgroundColor: palette.errorLight }]}>
                    <Text style={[styles.wrongCountText, { color: palette.error }]}>
                      Sai {card.wrong_count} lần
                    </Text>
                  </View>
                </View>

                <View style={styles.mistakeMetaRow}>
                  <Text style={[styles.mistakeMetaText, { color: palette.textMuted }]}>
                    Bộ: {card.deck_name}
                  </Text>
                  <Text
                    style={[
                      styles.mistakeStatusText,
                      { color: card.latest_correct ? palette.success : palette.error },
                    ]}
                  >
                    {card.latest_correct ? "● Lần gần nhất đúng" : "● Lần gần nhất sai"}
                  </Text>
                </View>
              </View>
            ))
          )}

          <View style={{ height: 32 }} />
        </>
      ) : null}
    </Screen>
  );
}

function QuickLearningActions({
  due,
  isDark,
  palette,
}: {
  due: number;
  isDark: boolean;
  palette: ReturnType<typeof getEnglishPalette>;
}) {
  return (
    <View style={styles.quickChipsRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ôn nhanh 5 thẻ tiếng Anh"
        disabled={due === 0}
        onPress={() => router.push("/english/review?quick=1" as Href)}
        style={({ pressed }) => [
          styles.quickChip,
          {
            backgroundColor: isDark ? "#172338" : "#FFFFFF",
            borderColor: due > 0 ? palette.review : palette.border,
            opacity: due === 0 ? 0.5 : pressed ? 0.9 : 1,
          },
        ]}
      >
        <Ionicons name="flash" size={16} color={palette.review} />
        <Text style={[styles.quickChipTitle, { color: palette.textPrimary }]}>
          Ôn nhanh
        </Text>
        <Text style={[styles.quickChipTime, { color: palette.review }]}>
          5 thẻ
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Luyện viết chính tả tiếng Anh"
        disabled={due === 0}
        onPress={() => router.push("/english/review?mode=SPELLING" as Href)}
        style={({ pressed }) => [
          styles.quickChip,
          {
            backgroundColor: isDark ? "#172338" : "#FFFFFF",
            borderColor: due > 0 ? palette.spelling : palette.border,
            opacity: due === 0 ? 0.5 : pressed ? 0.9 : 1,
          },
        ]}
      >
        <Ionicons name="create-outline" size={16} color={palette.spelling} />
        <Text style={[styles.quickChipTitle, { color: palette.textPrimary }]}>
          Chính tả
        </Text>
        <Text style={[styles.quickChipTime, { color: palette.spelling }]}>
          3 phút
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đọc văn bản tiếng Anh cá nhân"
        onPress={() => router.push("/english/reader" as Href)}
        style={({ pressed }) => [
          styles.quickChip,
          {
            backgroundColor: isDark ? "#172338" : "#FFFFFF",
            borderColor: palette.reading,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Ionicons name="book-outline" size={16} color={palette.reading} />
        <Text style={[styles.quickChipTitle, { color: palette.textPrimary }]}>
          Đọc sách
        </Text>
        <Text style={[styles.quickChipTime, { color: palette.reading }]}>
          5 phút
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  brandHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  brandName: { fontSize: 21, fontWeight: "900" },
  profileAction: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dictionaryAction: { minHeight: 56, borderWidth: 1, borderRadius: 17, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  dictionaryPlaceholder: { flex: 1, fontSize: 15 },
  homeLinks: { flexDirection: "row", gap: 10, marginBottom: 10 },
  homeLink: { flex: 1, minHeight: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
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
  errorCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
    marginVertical: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  quickChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  quickChip: {
    flex: 1,
    flexBasis: "29%",
    minWidth: 84,
    minHeight: 82,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: "center",
    gap: 4,
  },
  quickChipTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  quickChipTime: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  mistakeCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mistakeCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  mistakeHelperText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  emptyMistakeCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  emptyMistakeTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  emptyMistakeSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  mistakeCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    marginBottom: 10,
  },
  mistakeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  mistakeWordWrap: {
    flex: 1,
    paddingRight: 8,
  },
  mistakeHeadword: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  mistakeMeaning: {
    fontSize: 14,
    lineHeight: 20,
  },
  wrongCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  wrongCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  mistakeMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 8,
  },
  mistakeMetaText: {
    fontSize: 12,
  },
  mistakeStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
