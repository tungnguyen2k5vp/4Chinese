import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

interface EnglishSkillTileProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  badge?: string;
  onPress: () => void;
  disabled?: boolean;
}

export function EnglishSkillTile({
  title,
  description,
  icon,
  accentColor,
  badge,
  onPress,
  disabled = false,
}: EnglishSkillTileProps) {
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${description}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: isDark ? "#172338" : "#FFFFFF",
          borderColor: isDark ? "#25334D" : "#E2E8F0",
          opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: `${accentColor}16`,
            borderColor: `${accentColor}30`,
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={accentColor} />
      </View>

      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            {title}
          </Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: `${accentColor}18` }]}>
              <Text style={[styles.badgeText, { color: accentColor }]}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.description, { color: palette.textMuted }]}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={palette.textMuted}
        style={styles.chevron}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  chevron: {
    marginLeft: 6,
  },
});
