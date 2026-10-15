import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { resolveReviewSelection, reviewSelections, reviewSelectionLabel, reviewSelectionDescription } from "@/components/review/review-selection";
import { radius, spacing, themedCard } from "@/constants/design";
import {
  getDueCount,
  getDueVocabulary,
  getSettings,
  saveSettings,
} from "@/db/repository";
import { exerciseForReviewMode } from "@/services/review/exercise";
import { normalizeReviewSessionSize, REVIEW_SESSION_SIZES } from "@/services/review/session-size";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";
import type { UserSettings, Vocabulary } from "@/types/models";

const sizes = REVIEW_SESSION_SIZES;
export default function ReviewIndex() {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { mode: requestedMode, lessonActivityId, deckId } = useLocalSearchParams<{ mode?: string; lessonActivityId?: string; deckId?: string }>();
  const db = useSQLiteContext();
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [starting, setStarting] = useState(false);
  const startLock = useRef(false);
  const setQueue = useAppStore((s) => s.setReviewQueue);
  const setGlobalSettings = useAppStore((s) => s.setSettings);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    let live = true;
    getSettings(db).then(async (next) => {
      const [dueWords, totalDue] = await Promise.all([
        getDueVocabulary(db, normalizeReviewSessionSize(next.reviewSessionSize), undefined, deckId),
        getDueCount(db, undefined, deckId),
      ]);
      if (!live) return;
      setSettings(next);
      setWords(dueWords);
      setDueCount(totalDue);
      setGlobalSettings(next);
    }).catch(() => { if (live) setError("Chưa tải được từ đến hạn. Hãy thử mở lại màn hình ôn."); });
    return () => {
      live = false;
    };
  }, [db, deckId, setGlobalSettings]));
  const selected = normalizeReviewSessionSize(settings?.reviewSessionSize);
  const count = dueCount;
  const [mode, setMode] = useState(() => resolveReviewSelection(requestedMode));
  const isListening = mode !== "mixed" && exerciseForReviewMode(mode).playsAudio;
  const choose = async (size: (typeof sizes)[number]) => {
    if (!settings) return;
    const next = { ...settings, reviewSessionSize: size };
    setSettings(next);
    setGlobalSettings(next);
    try { await saveSettings(db, next); setError(null); }
    catch { setError("Chưa lưu được số từ cho lần sau. Bạn vẫn có thể bắt đầu với số từ vừa chọn."); }
  };
  const start = async () => {
    if (startLock.current) return;
    startLock.current = true;
    setStarting(true);
    try {
      const [currentWords, totalDue] = await Promise.all([getDueVocabulary(db, selected, undefined, deckId), getDueCount(db, undefined, deckId)]);
      setWords(currentWords); setDueCount(totalDue);
      if (!currentWords.length) return;
      setQueue(currentWords, selected);
      router.push({ pathname: "/review/session", params: { mode, lessonActivityId: lessonActivityId ?? "" } } as Href);
    } catch { setError("Chưa bắt đầu được phiên ôn. Hãy thử lại."); }
    finally { startLock.current = false; setStarting(false); }
  };
  return (
    <Screen
      title={isListening ? "Luyện nghe" : "Ôn tập theo cấp nhớ"}
      hideTitle
      subtitle={isListening ? "Nghe từ tiếng Trung rồi chọn nghĩa đúng trong lịch ôn hiện có." : "Lịch ôn rõ ràng từ Cấp 1 đến Trí nhớ sâu, dựa trên kết quả thật của bạn."}
    >
      <View style={[themedCard(theme), styles.hero]}>
        <View style={styles.heroTop}>
          <Text style={styles.icon}>复</Text>
          <View style={styles.countCopy}>
            <View style={styles.countRow}>
              <Text style={styles.count}>{count}</Text>
              <Text style={styles.label}>từ đến hạn</Text>
            </View>
            <Text style={styles.copy}>
              Từ khó và quá hạn được ưu tiên · trả lời sai có thể gặp lại một lần.
            </Text>
          </View>
        </View>
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
              {reviewSelections.map((candidateMode) => {
                const selectedMode = candidateMode === mode;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedMode }}
                    accessibilityLabel={reviewSelectionLabel(candidateMode)}
                    disabled={starting}
                    key={candidateMode}
                    onPress={() => setMode(candidateMode)}
                    style={[styles.modeChoice, selectedMode && styles.modeChoiceActive]}
                  >
                    <Text style={[styles.modeChoiceText, selectedMode && styles.modeChoiceTextActive]}>
                      {reviewSelectionLabel(candidateMode)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text accessibilityLiveRegion="polite" style={styles.modeDescription}>{reviewSelectionDescription(mode)}</Text>
            <Text style={styles.section}>Số từ mỗi phiên</Text>
            <Text style={styles.note}>{deckId ? "Ôn các từ đến hạn trong bộ này." : "Ôn các từ đến hạn ở tất cả bộ và cấp HSK."}</Text>
            <View style={styles.sizes}>
              {sizes.map((size) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${size} từ trong phiên`}
                  accessibilityState={{ selected: selected === size }}
                  disabled={starting || !settings}
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
          </View>
          <PrimaryButton
            label={`Bắt đầu ôn ${Math.min(selected, count)} từ`}
            loading={starting}
            disabled={!words.length}
            onPress={() => void start()}
          />
        </>
      )}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.note}>{error}</Text> : null}
    </Screen>
  );
}
function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    hero: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, backgroundColor: theme.infoSoft },
    heroTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    icon: { fontSize: 32, color: theme.primaryText, fontWeight: "800" },
    countCopy: { flex: 1, minWidth: 0, gap: 2 },
    countRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
    count: { fontSize: 34, lineHeight: 40, color: theme.textPrimary, fontWeight: "900" },
    label: { color: theme.primaryText, fontWeight: "800" },
    copy: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    section: {
      fontSize: 17,
      color: theme.textPrimary,
      fontWeight: "800",
      marginBottom: spacing.md,
    },
    modeOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
    modeChoice: { borderColor: theme.border, borderRadius: radius.md, borderWidth: 1, minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, maxWidth: "100%", backgroundColor: theme.surface },
    modeChoiceActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    modeChoiceText: { color: theme.textSecondary, fontSize: 13, fontWeight: "800", flexShrink: 1 },
    modeChoiceTextActive: { color: theme.onPrimary },
    modeDescription: { color: theme.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: spacing.lg },
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
