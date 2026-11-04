import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { VocabularyCard } from "@/components/VocabularyCard";
import { radius, spacing, themedCard } from "@/constants/design";
import { getSettings, getWeakVocabulary, type WeakVocabulary } from "@/db/repository";
import { normalizeReviewSessionSize } from "@/services/review/session-size";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";

export default function WeakWordsScreen() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const db = useSQLiteContext();
  const setReviewQueue = useAppStore((state) => state.setReviewQueue);
  const setSettings = useAppStore((state) => state.setSettings);
  const size = useAppStore((state) => normalizeReviewSessionSize(state.settings?.reviewSessionSize));
  const [items, setItems] = useState<WeakVocabulary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    void Promise.all([getWeakVocabulary(db), getSettings(db)])
      .then(([nextItems, settings]) => {
        if (!active) return;
        setItems(nextItems);
        setSettings(settings);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [db, setSettings]);

  useFocusEffect(load);

  const dueItems = useMemo(() => items.filter((item) => item.isDue), [items]);
  const startDueReview = () => {
    if (!dueItems.length) return;
    setReviewQueue(dueItems.slice(0, size).map((item) => item.word));
    router.push("/review/session");
  };

  return (
    <Screen
      title="Từ cần củng cố"
      subtitle="Dựa trên lỗi, lần quên lại và số gợi ý bạn đã dùng. Danh sách này không thay đổi lịch SRS."
    >
      <View style={[themedCard(theme), styles.hero]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.eyebrow}>SỔ LỖI CÁ NHÂN</Text>
            <Text style={styles.title}>{items.length} từ cần chú ý</Text>
          </View>
          <View style={styles.countBubble}>
            <Text style={styles.count}>{dueItems.length}</Text>
            <Text style={styles.countLabel}>đến hạn</Text>
          </View>
        </View>
        <Text style={styles.copy}>
          Chỉ những từ vừa cần củng cố vừa đến hạn mới có thể vào phiên ôn, để giữ đúng lịch nhắc lại của từng từ.
        </Text>
        <PrimaryButton
          label={dueItems.length ? `Ôn ${Math.min(dueItems.length, size)} từ yếu đến hạn` : "Chưa có từ yếu đến hạn"}
          disabled={!dueItems.length}
          onPress={startDueReview}
        />
      </View>

      {loading ? <ActivityIndicator color={theme.primaryText} style={styles.loader} /> : null}
      {!loading && !items.length ? (
        <EmptyState
          icon="✓"
          variant="review"
          scene="mistakes"
          title="Chưa có từ cần củng cố"
          message="Khi một từ bị sai, quên lại hoặc cần nhiều gợi ý, nó sẽ xuất hiện ở đây để bạn theo dõi."
        />
      ) : null}
      {items.map((item) => {
        const reason = item.reasons.join(" · ") || "Có tín hiệu cần ôn thêm";
        return <VocabularyCard
          key={item.word.id}
          word={item.word}
          onPress={() => router.push(`/word/${item.word.id}`)}
          footerAccessibilityLabel={`Cần củng cố: ${reason}`}
          footer={<View style={styles.reasonRow}>
            <Text style={styles.reasonLabel}>Cần củng cố</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>}
        />;
      })}
    </Screen>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    hero: { gap: spacing.md, backgroundColor: theme.infoSoft },
    heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
    eyebrow: { color: theme.info, fontWeight: "900", fontSize: 10, letterSpacing: 0.9 },
    title: { color: theme.textPrimary, fontWeight: "900", fontSize: 22, marginTop: 3 },
    countBubble: { minWidth: 68, alignItems: "center", borderRadius: radius.md, backgroundColor: theme.warningSoft, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
    count: { color: theme.warning, fontWeight: "900", fontSize: 22 },
    countLabel: { color: theme.textSecondary, fontSize: 10, fontWeight: "800" },
    copy: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
    loader: { marginTop: spacing.xl },
    reasonRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    reasonLabel: { color: theme.warning, fontSize: 11, fontWeight: "900" },
    reasonText: { flex: 1, color: theme.textSecondary, fontSize: 11, lineHeight: 17 },
  });
}
