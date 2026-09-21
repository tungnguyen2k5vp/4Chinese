import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/constants/design";

const levelColors = ["#F6A134", "#F7D34A", "#9FD66D", "#35BE79", "#3BC0D9", "#3475EB"];

export function MasteryChart({
  values,
  selectedLevel,
  onLevelPress,
}: {
  values: number[];
  selectedLevel?: number | null;
  onLevelPress?: (level: number) => void;
}) {
  const relevant = values.slice(1, 7);
  const max = Math.max(1, ...relevant);
  const total = relevant.reduce((sum, value) => sum + value, 0);
  return (
    <View style={styles.wrapper}>
      <View style={styles.chart}>
        {relevant.map((value, index) => {
          const level = index + 1;
          const selected = selectedLevel === level;
          return (
            <Pressable
              key={level}
              disabled={!onLevelPress}
              accessibilityRole={onLevelPress ? "button" : undefined}
              accessibilityLabel={`Cấp ${level}, ${value} từ`}
              onPress={() => onLevelPress?.(level)}
              style={({ pressed }) => [
                styles.column,
                selected && styles.selected,
                pressed && onLevelPress && styles.pressed,
              ]}
            >
              <Text style={[styles.value, selected && styles.valueSelected]}>{value}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: 10 + value / max * 70, backgroundColor: levelColors[index] }]} />
              </View>
              <Text style={[styles.label, selected && styles.selectedLabel]}>{level === 6 ? "Nhớ sâu" : level}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendRule} />
        <Text style={styles.legend}>
          {onLevelPress
            ? selectedLevel ? `Đang lọc cấp ${selectedLevel === 6 ? "Nhớ sâu" : selectedLevel}` : "Chạm cột để lọc danh sách"
            : `${total} từ đã phân cấp`}
        </Text>
        <View style={styles.legendRule} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  chart: { height: 132, flexDirection: "row", gap: spacing.xs, alignItems: "flex-end", paddingTop: spacing.xs },
  column: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 5, borderRadius: radius.md, paddingHorizontal: 3, paddingVertical: 5 },
  selected: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: "#CFDAFF" },
  pressed: { opacity: 0.7 },
  value: { fontSize: 10, color: colors.textMuted, fontWeight: "800" },
  valueSelected: { color: colors.primary },
  barTrack: { width: "72%", height: 80, justifyContent: "flex-end", borderRadius: radius.sm, backgroundColor: "#F3F5F9", overflow: "hidden" },
  bar: { width: "100%", minHeight: 10, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
  label: { minHeight: 15, fontSize: 10, color: colors.textMuted, fontWeight: "800", textAlign: "center" },
  selectedLabel: { color: colors.primary, fontWeight: "900" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  legendRule: { flex: 1, height: 1, backgroundColor: colors.border },
  legend: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textAlign: "center" },
});
