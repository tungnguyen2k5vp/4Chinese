import { StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "@/constants/design";
import { pairBilingualMeanings } from "@/services/vocabulary/bilingual-meanings";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";

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
  const styles = useThemeStyles(createStyles);
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

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  table: { borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, overflow: "hidden" },
  tableCompact: { marginTop: spacing.xs },
  header: { flexDirection: "row", backgroundColor: theme.primarySoft, paddingHorizontal: spacing.sm, paddingVertical: 7, gap: spacing.sm },
  headerText: { flex: 1, color: theme.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  row: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, backgroundColor: theme.surface },
  rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
  meaning: { flex: 1, color: theme.textPrimary, fontSize: 14, lineHeight: 20 },
  meaningCompact: { fontSize: 12, lineHeight: 17 },
  english: { color: theme.textMuted },
}); }
