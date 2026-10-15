import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

interface EnglishMetricTileProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  badge?: string;
}

export function EnglishMetricTile({
  label,
  value,
  subValue,
  icon,
  accentColor,
  badge,
}: EnglishMetricTileProps) {
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);
  const color = accentColor || palette.primary;

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: isDark ? "#172338" : "#FFFFFF",
          borderColor: isDark ? "#25334D" : "#E2E8F0",
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: isDark ? "#1E293B" : "#EFF6FF" },
          ]}
        >
          <Ionicons name={icon} size={18} color={color} />
        </View>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
            <Text style={[styles.badgeText, { color }]}>{badge}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.value, { color: palette.textPrimary }]}>
        {value}
      </Text>

      <Text style={[styles.label, { color: palette.textMuted }]}>
        {label}
      </Text>

      {subValue ? (
        <Text style={[styles.subValue, { color: color }]}>
          {subValue}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 100,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    marginHorizontal: 4,
    marginBottom: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
  subValue: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
});
