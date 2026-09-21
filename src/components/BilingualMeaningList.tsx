import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/constants/design";
import { pairBilingualMeanings } from "@/services/vocabulary/bilingual-meanings";

export function BilingualMeaningList({
  meaningsVi,
  meaningsEn,
  primaryMeaningVi,
  compact = false,
}: {
  meaningsVi: string[];
  meaningsEn: string[];
  primaryMeaningVi?: string;
  compact?: boolean;
}) {
  const pairs = pairBilingualMeanings(meaningsVi, meaningsEn, primaryMeaningVi);
  return (
    <View style={[styles.table, compact && styles.tableCompact]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>TIẾNG VIỆT</Text>
        <Text style={styles.headerText}>ENGLISH</Text>
      </View>
      {pairs.map((pair, index) => (
        <View key={`${pair.vi}-${pair.en}-${index}`} style={[styles.row, index > 0 && styles.rowBorder]}>
          <Text style={[styles.meaning, compact && styles.meaningCompact]}>{pair.vi}</Text>
          <Text style={[styles.meaning, styles.english, compact && styles.meaningCompact]}>{pair.en}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: "hidden" },
  tableCompact: { marginTop: spacing.xs },
  header: { flexDirection: "row", backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm, paddingVertical: 7, gap: spacing.sm },
  headerText: { flex: 1, color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  row: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  meaning: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  meaningCompact: { fontSize: 12, lineHeight: 17 },
  english: { color: colors.textMuted },
});
