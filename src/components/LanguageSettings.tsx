import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import type { LanguagePreferences } from "@/services/languages/controller";
import { getEnglishPalette } from "@/theme/english-tokens";
import { useTheme } from "@/theme/ThemeProvider";

export function LanguageSettings() {
  const { preferences, controller } = useLearningLanguage();
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);

  const update = async (
    patch: Partial<
      Pick<LanguagePreferences, "learningLanguage" | "englishVariant">
    >,
  ) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await controller.update(patch);
      setMessage(
        result.status === "BLOCKED"
          ? "Chưa đổi ngôn ngữ: hãy lưu bản nháp, dừng ghi âm hoặc kết thúc buổi học trước."
          : "Đã lưu lựa chọn ngôn ngữ trên thiết bị.",
      );
    } catch {
      setMessage(
        "Không lưu được lựa chọn. Ngôn ngữ đang học chưa bị thay đổi.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const isEn = preferences.learningLanguage === "en";

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
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="language" size={22} color={palette.primary} />
          <Text
            accessibilityRole="header"
            style={[styles.headerTitle, { color: palette.textPrimary }]}
          >
            Ngôn ngữ học tập
          </Text>
        </View>
        <View style={[styles.activePill, { backgroundColor: palette.primaryLight }]}>
          <Text style={[styles.activePillText, { color: palette.primary }]}>
            {isEn ? "Đang học: Tiếng Anh" : "Đang học: Tiếng Trung"}
          </Text>
        </View>
      </View>

      <Text style={[styles.subText, { color: palette.textMuted }]}>
        Giao diện vẫn dùng tiếng Việt. Hai ngôn ngữ lưu trữ bộ từ, lịch ôn và tiến độ XP độc lập.
      </Text>

      {/* Language Switcher Cards (Tiếng Trung vs Tiếng Anh) */}
      <View style={styles.selectorRow}>
        {/* Chinese Option Card */}
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel="Chọn học Tiếng Trung"
          accessibilityState={{ selected: !isEn }}
          disabled={busy}
          onPress={() => void update({ learningLanguage: "zh" })}
          style={({ pressed }) => [
            styles.langCard,
            {
              backgroundColor: !isEn
                ? (isDark ? "#2A1810" : "#FFF7ED")
                : (isDark ? "#0B0F19" : "#F8FAFC"),
              borderColor: !isEn ? "#EA580C" : palette.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={styles.langCardTop}>
            <View
              style={[
                styles.flagCircle,
                { backgroundColor: !isEn ? "#EA580C" : palette.surfaceSubtle },
              ]}
            >
              <Text style={{ color: !isEn ? "#FFFFFF" : palette.textMuted, fontWeight: "800", fontSize: 13 }}>
                中
              </Text>
            </View>
            <Ionicons
              name={!isEn ? "checkmark-circle" : "ellipse-outline"}
              size={18}
              color={!isEn ? "#EA580C" : palette.textMuted}
            />
          </View>
          <Text style={[styles.langTitle, { color: palette.textPrimary }]}>
            Tiếng Trung
          </Text>
          <Text style={[styles.langDesc, { color: palette.textMuted }]}>
            HSK 1–6, HSK 3.0, Pinyin, Chữ Hán
          </Text>
        </Pressable>

        {/* English Option Card */}
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel="Chọn học Tiếng Anh"
          accessibilityState={{ selected: isEn }}
          disabled={busy}
          onPress={() => void update({ learningLanguage: "en" })}
          style={({ pressed }) => [
            styles.langCard,
            {
              backgroundColor: isEn
                ? (isDark ? "#1E2C4A" : "#EFF6FF")
                : (isDark ? "#0B0F19" : "#F8FAFC"),
              borderColor: isEn ? palette.primary : palette.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={styles.langCardTop}>
            <View
              style={[
                styles.flagCircle,
                { backgroundColor: isEn ? palette.primary : palette.surfaceSubtle },
              ]}
            >
              <Text style={{ color: isEn ? "#FFFFFF" : palette.textMuted, fontWeight: "800", fontSize: 13 }}>
                EN
              </Text>
            </View>
            <Ionicons
              name={isEn ? "checkmark-circle" : "ellipse-outline"}
              size={18}
              color={isEn ? palette.primary : palette.textMuted}
            />
          </View>
          <Text style={[styles.langTitle, { color: palette.textPrimary }]}>
            Tiếng Anh
          </Text>
          <Text style={[styles.langDesc, { color: palette.textMuted }]}>
            Bộ từ cá nhân, Flashcard, Reader, CEFR
          </Text>
        </Pressable>
      </View>

      {/* English Voice Selector (when in English mode or configuring English) */}
      <View
        style={[
          styles.voiceSection,
          {
            backgroundColor: isDark ? "#0B0F19" : "#F8FAFC",
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.voiceHeader}>
          <Ionicons name="volume-medium-outline" size={18} color={palette.primary} />
          <Text style={[styles.voiceLabel, { color: palette.textPrimary }]}>
            Giọng tiếng Anh mặc định:
          </Text>
        </View>

        <View style={styles.voiceChipsRow}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: preferences.englishVariant === "en-US" }}
            disabled={busy}
            onPress={() => void update({ englishVariant: "en-US" })}
            style={[
              styles.voiceChip,
              {
                backgroundColor: preferences.englishVariant === "en-US"
                  ? palette.primary
                  : (isDark ? "#172338" : "#FFFFFF"),
                borderColor: preferences.englishVariant === "en-US" ? palette.primary : palette.border,
              },
            ]}
          >
            <Text
              style={[
                styles.voiceChipText,
                {
                  color: preferences.englishVariant === "en-US" ? "#FFFFFF" : palette.textPrimary,
                  fontWeight: preferences.englishVariant === "en-US" ? "700" : "500",
                },
              ]}
            >
              Anh – Mỹ (en-US)
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: preferences.englishVariant === "en-GB" }}
            disabled={busy}
            onPress={() => void update({ englishVariant: "en-GB" })}
            style={[
              styles.voiceChip,
              {
                backgroundColor: preferences.englishVariant === "en-GB"
                  ? palette.primary
                  : (isDark ? "#172338" : "#FFFFFF"),
                borderColor: preferences.englishVariant === "en-GB" ? palette.primary : palette.border,
              },
            ]}
          >
            <Text
              style={[
                styles.voiceChipText,
                {
                  color: preferences.englishVariant === "en-GB" ? "#FFFFFF" : palette.textPrimary,
                  fontWeight: preferences.englishVariant === "en-GB" ? "700" : "500",
                },
              ]}
            >
              Anh – Anh (en-GB)
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Message feedback */}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.messageText, { color: palette.primary }]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.2,
    marginVertical: 10,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  subText: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectorRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  langCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  langCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flagCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  langTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  langDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  voiceSection: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    gap: 8,
  },
  voiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  voiceLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  voiceChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  voiceChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceChipText: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
});
