import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { card, colors, spacing } from "@/constants/design";
import { getSettings, getUpcomingReviewVocabulary } from "@/db/repository";
import { formatReviewCountdown } from "@/services/review/review-countdown";
import type { Vocabulary } from "@/types/models";

export default function UpcomingReviewScreen() {
  const db = useSQLiteContext();
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await getSettings(db);
      const next = await getUpcomingReviewVocabulary(
        db,
        50,
        settings.selectedHskBands,
      );
      setWords(next);
      setClockMs(Date.now());
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => {
        setClockMs(Date.now());
        void load();
      }, 60_000);
      return () => clearInterval(timer);
    }, [load]),
  );

  return (
    <Screen
      title="Lịch ôn sắp tới"
      subtitle="Các từ đã học nhưng chưa đến hạn. Thời gian tự cập nhật mỗi phút."
    >
      <View style={[card, styles.summary]}>
        <Text style={styles.eyebrow}>THEO DÕI LỊCH ÔN</Text>
        <Text style={styles.count}>{words.length}</Text>
        <Text style={styles.countLabel}>từ gần nhất đã xếp lịch</Text>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      {!loading && !words.length ? (
        <EmptyState
          icon="✓"
          title="Chưa có lịch ôn"
          message="Học và đánh giá thêm từ để hệ thống tự xếp lịch ôn cho bạn."
        />
      ) : null}
      {!loading && words.length ? (
        <View style={[card, styles.list]}>
          {words.map((word) => (
            <Pressable
              key={word.id}
              onPress={() => router.push(`/word/${word.id}`)}
              style={styles.row}
            >
              <View style={styles.copy}>
                <Text style={styles.hanzi}>{word.simplified}</Text>
                <Text numberOfLines={1} style={styles.meta}>
                  {word.pinyin} · {word.primaryMeaningVi}
                </Text>
              </View>
              <Text style={styles.time}>
                {formatReviewCountdown(word.nextReviewAt, clockMs)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: "center", gap: spacing.xs, backgroundColor: "#F5F8FF" },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  count: { color: colors.text, fontSize: 40, fontWeight: "900" },
  countLabel: { color: colors.textMuted, fontSize: 14 },
  loader: { marginTop: spacing.xl },
  list: { gap: 0, paddingVertical: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  copy: { flex: 1, gap: 2 },
  hanzi: { color: colors.text, fontSize: 24, fontWeight: "900" },
  meta: { color: colors.textMuted, fontSize: 13 },
  time: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    maxWidth: 135,
    textAlign: "right",
  },
});
