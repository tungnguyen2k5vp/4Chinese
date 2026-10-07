import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, typography } from "@/constants/design";
import { useTheme } from "@/theme/ThemeProvider";

export function DueReviewCard({ count, onPress }: { count: number; onPress: () => void }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return <View style={styles.card}><View style={styles.copy}>
    <Text style={styles.eyebrow}>{count > 0 ? "ĐÃ ĐẾN LÚC ÔN TẬP" : "HOÀN THÀNH HÔM NAY"}</Text>
    {count > 0 ? <><Text style={styles.count}>{count} từ</Text><Text style={styles.caption}>Một lượt ngắn để giữ trí nhớ bền lâu.</Text></> : <Text style={styles.complete}>Tuyệt vời! Bạn đã hoàn thành toàn bộ lượt ôn hôm nay.</Text>}
  </View>{count > 0 ? <PrimaryButton label="Ôn tập ngay" onPress={onPress} style={styles.button} /> : null}</View>;
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { backgroundColor: theme.surface, borderColor: theme.border, borderLeftWidth: 4, borderLeftColor: theme.accent, borderRadius: 22, borderWidth: 1, gap: spacing.lg, padding: spacing.lg },
    copy: { gap: 5 },
    eyebrow: { color: theme.warning, fontWeight: "800", fontSize: 11, letterSpacing: 0.8 },
    count: { color: theme.textPrimary, fontWeight: "900", fontSize: typography.title },
    caption: { color: theme.textMuted, lineHeight: 20 },
    complete: { color: theme.success, fontSize: 15, lineHeight: 22, fontWeight: "600" },
    button: { alignSelf: "stretch" },
  });
}