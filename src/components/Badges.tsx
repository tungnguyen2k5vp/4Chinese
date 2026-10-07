import { StyleSheet, Text, View } from "react-native";

import { radius } from "@/constants/design";
import { useTheme } from "@/theme/ThemeProvider";
import type { HskBand, WordStatus } from "@/types/models";

export function HskBadge({ band }: { band: HskBand }) {
  const theme = useTheme();
  const index = band === "7-9" ? 6 : band - 1;
  const color = theme.hsk[index];
  return <View style={[styles.badge, { backgroundColor: `${color}22` }]}><Text style={[styles.label, { color }]}>HSK {band}</Text></View>;
}

export function MasteryBadge({ level = 0, status }: { level?: number; status?: WordStatus }) {
  const theme = useTheme();
  if (status === "KNOWN") return <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}><Text style={[styles.label, { color: theme.primaryText }]}>Đã biết</Text></View>;
  if (status === "SKIPPED") return <View style={[styles.badge, { backgroundColor: theme.errorSoft }]}><Text style={[styles.label, { color: theme.error }]}>Bỏ qua</Text></View>;
  const labels = ["Chưa học", "Mới gặp", "Đang học", "Đang nhớ", "Nhớ tốt", "Rất tốt", "Nhớ sâu"];
  const strong = level >= 5;
  return <View style={[styles.badge, { backgroundColor: strong ? theme.successSoft : theme.surfaceElevated }]}><Text style={[styles.label, { color: strong ? theme.success : theme.textMuted }]}>{labels[level] ?? labels[0]}</Text></View>;
}

const styles = StyleSheet.create({ badge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 9 }, label: { fontSize: 11, fontWeight: "800" } });
