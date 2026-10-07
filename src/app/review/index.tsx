import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { radius, spacing, themedCard } from "@/constants/design";
import {
  getDueCount,
  getDueVocabulary,
  getSettings,
  saveSettings,
} from "@/db/repository";
import { exerciseForReviewMode, standardReviewModes } from "@/services/review/exercise";
import { resolveReviewMode } from "@/services/review/review-mode";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";
import type { UserSettings, Vocabulary } from "@/types/models";

const sizes = [10, 20, 30, 50] as const;
export default function ReviewIndex() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { mode: requestedMode, lessonActivityId } = useLocalSearchParams<{ mode?: string; lessonActivityId?: string }>();
  const db = useSQLiteContext();
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const setQueue = useAppStore((s) => s.setReviewQueue);
  useEffect(() => {
    let live = true;
    getSettings(db).then(async (next) => {
      const [dueWords, totalDue] = await Promise.all([
        getDueVocabulary(db, 50, next.selectedHskBands),
        getDueCount(db, next.selectedHskBands),
      ]);
      if (!live) return;
      setSettings(next);
      setWords(dueWords);
      setDueCount(totalDue);
    });
    return () => {
      live = false;
    };
  }, [db]);
  const selected = settings?.reviewSessionSize ?? 20;
  const count = dueCount;
  const [mode, setMode] = useState(() => resolveReviewMode(requestedMode));
  const isListening = exerciseForReviewMode(mode).playsAudio;
  const choose = async (size: (typeof sizes)[number]) => {
    if (!settings) return;
    const next = { ...settings, reviewSessionSize: size };
    setSettings(next);
    await saveSettings(db, next);
  };
  const start = () => {
    setQueue(words.slice(0, selected));
    router.push({ pathname: "/review/session", params: { mode, lessonActivityId: lessonActivityId ?? "" } } as Href);
  };
  return (
    <Screen
      title={isListening ? "Luyện nghe" : "Ôn tập theo cấp nhớ"}
      subtitle={isListening ? "Nghe từ tiếng Trung rồi chọn nghĩa đúng trong lịch ôn hiện có." : "Lịch ôn rõ ràng từ Cấp 1 đến Trí nhớ sâu, dựa trên kết quả thật của bạn."}
    >
      <View style={[themedCard(theme), styles.hero]}>
        <Text style={styles.icon}>复</Text>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.label}>từ đến hạn</Text>
        <Text style={styles.copy}>
          Từ khó và quá hạn được ưu tiên. Trả lời sai sẽ xuất hiện lại tối đa
          một lần trong phiên.
        </Text>
      </View>
      {count === 0 ? (
        <EmptyState
          icon="✓"
          variant="review"
          scene="review"
          title="Hôm nay chưa có từ đến hạn"
          message="Bạn có thể học từ mới hoặc quay lại sau khi lịch ôn tiếp theo đến hạn."
          primaryAction={{ label: "Học từ mới", onPress: () => router.push("/learn/setup" as Href) }}
        />
      ) : (
        <>
          <View style={themedCard(theme)}>
            <Text style={styles.section}>Kiểu bài ôn</Text>
            <View style={styles.modeOptions}>
              {standardReviewModes.map((candidateMode) => {
                const selectedMode = candidateMode === mode;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedMode }}
                    key={candidateMode}
                    onPress={() => setMode(candidateMode)}
                    style={[styles.modeChoice, selectedMode && styles.modeChoiceActive]}
                  >
                    <Text style={[styles.modeChoiceText, selectedMode && styles.modeChoiceTextActive]}>
                      {exerciseForReviewMode(candidateMode).label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.section}>Số từ trong phiên</Text>
            <View style={styles.sizes}>
              {sizes.map((size) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${size} từ trong phiên`}
                  accessibilityState={{ selected: selected === size }}
                  key={size}
                  onPress={() => void choose(size)}
                  style={[styles.size, selected === size && styles.sizeActive]}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      selected === size && styles.sizeTextActive,
                    ]}
                  >
                    {size}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.note}>
              {isListening
                ? "Phiên này phát âm từ tiếng Trung; bạn chọn nghĩa tiếng Việt đúng trước khi chấm mức nhớ."
                : "Phiên này sẽ hiện nghĩa tiếng Việt để bạn viết Hanzi, chọn Pinyin và chọn nghĩa đúng trước khi chấm mức nhớ."}
            </Text>
          </View>
          <PrimaryButton
            label={`Bắt đầu ôn ${Math.min(selected, count)} từ`}
            onPress={start}
          />
        </>
      )}
    </Screen>
  );
}
function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    hero: { alignItems: "center", gap: 4, paddingVertical: spacing.xl, backgroundColor: theme.infoSoft },
    icon: { fontSize: 45, color: theme.primaryText, fontWeight: "800" },
    count: { fontSize: 42, color: theme.textPrimary, fontWeight: "900" },
    label: { color: theme.primaryText, fontWeight: "800" },
    copy: {
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 21,
      marginTop: spacing.sm,
    },
    section: {
      fontSize: 17,
      color: theme.textPrimary,
      fontWeight: "800",
      marginBottom: spacing.md,
    },
    modeOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
    modeChoice: { borderColor: theme.border, borderRadius: radius.md, borderWidth: 1, minHeight: 40, justifyContent: "center", paddingHorizontal: spacing.sm, backgroundColor: theme.surface },
    modeChoiceActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    modeChoiceText: { color: theme.textSecondary, fontSize: 11, fontWeight: "800" },
    modeChoiceTextActive: { color: theme.onPrimary },
    sizes: { flexDirection: "row", gap: spacing.sm },
    size: {
      flex: 1,
      minHeight: 48,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    sizeActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    sizeText: { color: theme.textPrimary, fontWeight: "800" },
    sizeTextActive: { color: theme.onPrimary },
    note: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: spacing.md,
    },
  });
}
