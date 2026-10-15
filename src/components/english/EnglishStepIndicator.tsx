import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

interface Step {
  title: string;
}

interface EnglishStepIndicatorProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export function EnglishStepIndicator({
  steps,
  currentStep,
}: EnglishStepIndicatorProps) {
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <React.Fragment key={step.title}>
            {/* Step node */}
            <View style={styles.stepWrapper}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: isCompleted
                      ? palette.success
                      : isActive
                        ? palette.primary
                        : isDark
                          ? "#1E293B"
                          : "#F1F5F9",
                    borderColor: isCompleted
                      ? palette.success
                      : isActive
                        ? palette.primary
                        : isDark
                          ? "#334155"
                          : "#CBD5E1",
                  },
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.circleText,
                      {
                        color: isActive ? "#FFFFFF" : palette.textMuted,
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>

              <Text
                style={[
                  styles.stepTitle,
                  {
                    color: isActive
                      ? palette.primary
                      : isCompleted
                        ? palette.textPrimary
                        : palette.textMuted,
                    fontWeight: isActive || isCompleted ? "700" : "500",
                  },
                ]}
              >
                {step.title}
              </Text>
            </View>

            {/* Connecting line */}
            {index < steps.length - 1 ? (
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor:
                      index < currentStep
                        ? palette.success
                        : isDark
                          ? "#334155"
                          : "#E2E8F0",
                  },
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  stepWrapper: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  circleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  stepTitle: {
    fontSize: 11,
    textAlign: "center",
    flexShrink: 1,
    maxWidth: 68,
  },
  line: {
    flex: 1,
    minWidth: 4,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 16,
  },
});
