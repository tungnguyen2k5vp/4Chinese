import { StyleSheet, Text, View } from "react-native";

import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

/** One continuous count across copying, recalling and the existing scored review. */
export function EnglishLearningProgress({ completed, total }: { completed: number; total: number }) {
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const count = Math.min(total, Math.max(0, completed));
  return <View style={s.container}>
    <AnimatedProgressBar testID="english-learning-progress" progress={total ? count / total : 0} height={10} color={p.primary} trackColor={p.surfaceHighlight} accessibilityLabel="Tiến trình học từ mới" accessibilityValue={{ min: 0, max: total, now: count }} />
    <Text testID="english-learning-progress-caption" style={[s.caption, { color: p.textMuted }]}>{count}/{total}</Text>
  </View>;
}
const s = StyleSheet.create({
  container: { gap: 7, paddingVertical: 6 },
  caption: { fontSize: 13, fontWeight: "700", textAlign: "right" },
});
