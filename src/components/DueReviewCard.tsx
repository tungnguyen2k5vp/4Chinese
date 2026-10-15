import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, typography } from "@/constants/design";
import { useTheme } from "@/theme/ThemeProvider";

export function DueReviewCard({ count, onPress }: { count: number; onPress: () => void }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return <View style={styles.card}><View style={styles.copy}>
    <Text style={styles.eyebrow}>{count > 0 ? "ĐÃ ĐẾN LÚC ÔN TẬP" : "CHƯA CÓ TỪ ĐẾN HẠN"}</Text>
    {count > 0 ? <><Text style={styles.count}>{count} từ đến hạn</Text><Text style={styles.caption}>Tổng tất cả cấp HSK và bộ từ đang dùng · mỗi lượt tối đa 10 từ.</Text></> : <Text style={styles.complete}>Hiện không có từ đến hạn trong các cấp HSK và bộ từ đang dùng.</Text>}
  </View>{count > 0 ? <PrimaryButton label={`Ôn ${Math.min(10, count)} từ ngay`} onPress={onPress} style={styles.button} /> : null}</View>;
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
