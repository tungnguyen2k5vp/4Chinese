import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { EnglishHeroIllustration } from "./EnglishIllustrations";

import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

interface EnglishHeroCardProps {
  greeting?: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionDisabled?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  illustration?: React.ReactNode;
}

export function EnglishHeroCard({
  greeting = "Chào bạn!",
  title,
  subtitle,
  badgeText = "ENGLISH LEARNING",
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  secondaryActionLabel,
  onSecondaryAction,
  illustration,
}: EnglishHeroCardProps) {
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#172338" : "#FFFFFF",
          borderColor: isDark ? "#2A3C59" : "#DBEAFE",
          shadowColor: palette.primary,
        },
      ]}
    >
      {/* Decorative gradient aura */}
      <View
        style={[
          styles.decorativeAura,
          {
            backgroundColor: palette.primaryLight,
            opacity: isDark ? 0.35 : 0.85,
          },
        ]}
      />

      <View style={styles.contentRow}>
        <View style={styles.textColumn}>
          {/* Badge */}
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark ? "#1E3A8A" : "#EFF6FF",
                borderColor: isDark ? "#3B82F6" : "#BFDBFE",
              },
            ]}
          >
            <View style={[styles.badgeDot, { backgroundColor: palette.primary }]} />
            <Text
              style={[
                styles.badgeText,
                { color: palette.primary },
              ]}
            >
              {badgeText}
            </Text>
          </View>

          {/* Greeting & Title */}
          <Text style={[styles.greeting, { color: palette.textMuted }]}>
            {greeting}
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: palette.textPrimary }]}
          >
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            {subtitle}
          </Text>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationWrapper}>
          {illustration || <EnglishHeroIllustration width={130} height={110} />}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryActionLabel}
          disabled={primaryActionDisabled}
          onPress={onPrimaryAction}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: primaryActionDisabled
                ? isDark ? "#334155" : "#CBD5E1"
                : palette.primary,
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Text
            style={[
              styles.primaryButtonText,
              {
                color: primaryActionDisabled
                  ? isDark ? "#94A3B8" : "#64748B"
                  : "#FFFFFF",
              },
            ]}
          >
            {primaryActionLabel}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={
              primaryActionDisabled
                ? isDark ? "#94A3B8" : "#64748B"
                : "#FFFFFF"
            }
          />
        </Pressable>

        {secondaryActionLabel && onSecondaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryActionLabel}
            onPress={onSecondaryAction}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: palette.border,
                backgroundColor: pressed
                  ? palette.surfaceSubtle
                  : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: palette.textSecondary },
              ]}
            >
              {secondaryActionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    position: "relative",
  },
  decorativeAura: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textColumn: {
    flex: 1,
    paddingRight: 10,
  },
  illustrationWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 6,
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
