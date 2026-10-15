import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

interface EnglishEmptyStateProps {
  illustration: React.ReactNode;
  title: string;
  description: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionDisabled?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EnglishEmptyState({
  illustration,
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  secondaryActionLabel,
  onSecondaryAction,
}: EnglishEmptyStateProps) {
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#172338" : "#FFFFFF",
          borderColor: isDark ? "#25334D" : "#E2E8F0",
        },
      ]}
    >
      <View style={styles.illustrationContainer}>
        {illustration}
      </View>

      <Text
        accessibilityRole="header"
        style={[styles.title, { color: palette.textPrimary }]}
      >
        {title}
      </Text>

      <Text style={[styles.description, { color: palette.textSecondary }]}>
        {description}
      </Text>

      {primaryActionLabel && onPrimaryAction ? (
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
              transform: [{ scale: pressed ? 0.985 : 1 }],
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
        </Pressable>
      ) : null}

      {secondaryActionLabel && onSecondaryAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={secondaryActionLabel}
          onPress={onSecondaryAction}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              borderColor: palette.border,
              backgroundColor: pressed ? palette.surfaceSubtle : "transparent",
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
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 22,
    borderWidth: 1.2,
    marginVertical: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  illustrationContainer: {
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 280,
    marginBottom: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 280,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
