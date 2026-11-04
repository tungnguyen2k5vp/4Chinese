import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ScrollView } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EmptyState } from "@/components/EmptyState";
import { spacing, themedCard } from "@/constants/design";
import { getLearnedReviewPage, LEARNED_REVIEW_PAGE_SIZE, type LearnedReviewPage } from "@/db/repository";
import { formatReviewCountdown } from "@/services/review/review-countdown";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";

export default function UpcomingReviewScreen() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const db = useSQLiteContext();
  const [data, setData] = useState<LearnedReviewPage>({ words: [], total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let request = 0;
      const load = async (initial = false) => {
        const currentRequest = ++request;
        if (initial) setLoading(true);
        try {
          const next = await getLearnedReviewPage(db, page);
          if (!active || currentRequest !== request) return;
          setData(next);
          setPage(next.page);
          setClockMs(Date.now());
          setError(null);
        } catch {
          if (active && currentRequest === request) setError("Chưa tải được lịch ôn. Hãy thử lại hoặc quay lại màn hình này.");
        } finally {
          if (active && currentRequest === request) setLoading(false);
        }
      };
      void load(true);
      const timer = setInterval(() => { setClockMs(Date.now()); void load(); }, 60_000);
      return () => { active = false; clearInterval(timer); };
    }, [db, page]),
  );

  const movePage = (nextPage: number) => {
    setPage(nextPage);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const pagination = <View style={styles.pagination}>
    <Pressable accessibilityRole="button" accessibilityLabel="Trang trước" disabled={loading || data.page <= 1} onPress={() => movePage(data.page - 1)} style={[styles.pageButton, (loading || data.page <= 1) && styles.disabled]}><Text style={styles.pageButtonText}>‹ Trước</Text></Pressable>
    <Text style={styles.pageLabel}>Trang {data.page}/{data.totalPages}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Trang sau" disabled={loading || data.page >= data.totalPages} onPress={() => movePage(data.page + 1)} style={[styles.pageButton, (loading || data.page >= data.totalPages) && styles.disabled]}><Text style={styles.pageButtonText}>Sau ›</Text></Pressable>
  </View>;
  const words = data.words;

  return (
    <Screen
      title="Lịch ôn sắp tới"
      hideTitle
      subtitle="Tất cả từ đã học · 50 từ/trang · cập nhật mỗi phút"
      scrollRef={scrollRef}
    >
      <View style={[themedCard(theme), styles.summary]}>
        <Text style={styles.eyebrow}>THEO DÕI LỊCH ÔN</Text>
        <Text style={styles.count}>{data.total}</Text>
        <Text style={styles.countLabel}>từ đã học</Text>
        {data.total > 0 ? <Text style={styles.countLabel}>Đang xem {(data.page - 1) * LEARNED_REVIEW_PAGE_SIZE + 1}–{(data.page - 1) * LEARNED_REVIEW_PAGE_SIZE + words.length} / {data.total} từ</Text> : null}
      </View>

      {loading ? <ActivityIndicator color={theme.primaryText} style={styles.loader} /> : null}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {!loading && !error && !words.length ? (
        <EmptyState
          icon="✓"
          variant="review"
          scene="history"
          title="Chưa có lịch ôn"
          message="Học và đánh giá thêm từ để hệ thống tự xếp lịch ôn cho bạn."
        />
      ) : null}
      {!loading && words.length ? (<>
        {pagination}
        <View style={[themedCard(theme), styles.list]}>
          {words.map((word) => {
            const countdown = word.isSuspended ? "Tạm ngừng ôn" : word.isKnown ? "Đã biết · không cần ôn" : formatReviewCountdown(word.nextReviewAt, clockMs);
            return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${word.simplified}, ${word.pinyin}, ${word.primaryMeaningVi}, ${countdown}`}
              key={word.id}
              onPress={() => router.push(`/word/${word.id}`)}
              style={styles.row}
            >
              <View style={styles.copy}>
                <Text style={styles.hanzi}>{word.simplified}</Text>
                <Text numberOfLines={1} style={styles.meta}>
                  {word.pinyin} · {word.primaryMeaningVi}
                </Text>
                {word.status === "LEARNING" ? <Text style={styles.meta}>Cấp nhớ {word.masteryLevel ?? 0}</Text> : null}
              </View>
              <Text style={styles.time}>
                {countdown}
              </Text>
            </Pressable>
          ); })}
        </View>
        {pagination}
      </>) : null}
    </Screen>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    summary: { alignItems: "center", gap: spacing.xs, backgroundColor: theme.infoSoft },
    eyebrow: { color: theme.info, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
    count: { color: theme.textPrimary, fontSize: 40, fontWeight: "900" },
    countLabel: { color: theme.textMuted, fontSize: 14 },
    loader: { marginTop: spacing.xl },
    list: { gap: 0, paddingVertical: spacing.sm },
    pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
    pageButton: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: spacing.md, justifyContent: "center" },
    pageButtonText: { color: theme.primaryText, fontWeight: "800", fontSize: 14 },
    pageLabel: { color: theme.textPrimary, fontWeight: "700", fontSize: 14 },
    disabled: { opacity: .4 }, error: { color: theme.error, fontSize: 14 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
      paddingVertical: spacing.md,
    },
    copy: { flex: 1, gap: 2 },
    hanzi: { color: theme.textPrimary, fontSize: 24, fontWeight: "900" },
    meta: { color: theme.textMuted, fontSize: 13 },
    time: {
      color: theme.primaryText,
      fontSize: 13,
      fontWeight: "900",
      maxWidth: 135,
      textAlign: "right",
    },
  });
}
