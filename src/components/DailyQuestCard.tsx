import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { radius, spacing } from "@/constants/design";
import { useTheme } from "@/theme/ThemeProvider";

export type DailyQuestItem = {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

export function DailyQuestCard({ items }: { items: DailyQuestItem[] }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const completeCount = items.filter((item) => item.complete).length;
  const progress = items.length ? completeCount / items.length : 0;

  return <View style={styles.card} accessibilityLabel={`Nhiệm vụ hôm nay: ${completeCount} trên ${items.length} nhiệm vụ hoàn thành`}>
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>NHIỆM VỤ HÔM NAY</Text>
        <Text style={styles.title}>{completeCount === items.length ? "Bạn đã hoàn thành hôm nay" : `Còn ${items.length - completeCount} việc nhỏ`}</Text>
      </View>
      <View style={styles.count}><Text style={styles.countText}>{completeCount}/{items.length}</Text></View>
    </View>
    <AnimatedProgressBar progress={progress} color={theme.success} trackColor={theme.surfaceElevated} height={7} accessibilityLabel="Tiến độ nhiệm vụ hôm nay" />
    <View style={styles.list}>
      {items.map((item) => <MotionPressable
        key={item.id}
        haptic={Boolean(item.onPress)}
        disabled={!item.onPress}
        accessibilityLabel={`${item.label}. ${item.detail}. ${item.complete ? "Đã hoàn thành" : "Chưa hoàn thành"}`}
        onPress={() => item.onPress?.()}
        style={[styles.item, item.complete && styles.itemComplete]}
      >
        <View style={[styles.icon, item.complete && styles.iconComplete]}>
          <Ionicons name={item.complete ? "checkmark" : item.icon} size={18} color={item.complete ? theme.onSuccess : theme.primaryText} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, item.complete && styles.labelComplete]}>{item.label}</Text>
          <Text style={styles.detail}>{item.detail}</Text>
        </View>
        {item.onPress && !item.complete ? <Ionicons name="chevron-forward" size={18} color={theme.textMuted} /> : null}
      </MotionPressable>)}
    </View>
  </View>;
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { backgroundColor: theme.successSoft, borderColor: theme.success, borderWidth: 1, borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg },
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
    eyebrow: { color: theme.success, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
    title: { color: theme.textPrimary, fontSize: 17, fontWeight: "900", marginTop: 3 },
    count: { alignItems: "center", backgroundColor: theme.surface, borderRadius: radius.pill, justifyContent: "center", minWidth: 52, minHeight: 34, paddingHorizontal: spacing.sm },
    countText: { color: theme.success, fontSize: 13, fontWeight: "900" },
    list: { gap: spacing.xs },
    item: { alignItems: "center", borderRadius: radius.sm, flexDirection: "row", gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.xs },
    itemComplete: { opacity: 0.78 },
    icon: { alignItems: "center", backgroundColor: theme.surface, borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
    iconComplete: { backgroundColor: theme.success },
    copy: { flex: 1 },
    label: { color: theme.textPrimary, fontSize: 14, fontWeight: "800" },
    labelComplete: { textDecorationLine: "line-through" },
    detail: { color: theme.textMuted, fontSize: 12, marginTop: 1 },
  });
}
