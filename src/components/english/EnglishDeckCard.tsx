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

interface EnglishDeckCardProps {
  id: string;
  name: string;
  wordCount?: number;
  dueCount?: number;
  isSelected?: boolean;
  onSelect: () => void;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EnglishDeckCard({
  id,
  name,
  wordCount = 0,
  dueCount = 0,
  isSelected = false,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
}: EnglishDeckCardProps) {
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  return (
    <View
      testID={`english-deck-${id}`}
      style={[
        styles.card,
        {
          backgroundColor: isSelected
            ? isDark ? "#1E2C4A" : "#EFF6FF"
            : isDark ? "#172338" : "#FFFFFF",
          borderColor: isSelected
            ? palette.primary
            : isDark ? "#25334D" : "#E2E8F0",
          borderWidth: isSelected ? 2 : 1.2,
        },
      ]}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={`Bộ từ: ${name}, ${wordCount} thẻ, ${dueCount} thẻ đến hạn`}
        accessibilityState={{ selected: isSelected }}
        onPress={onSelect}
        style={({ pressed }) => [styles.selectArea, { transform: [{ scale: pressed ? 0.99 : 1 }] }]}
      >
        <View style={styles.topRow}>
        <View style={styles.deckInfo}>
          <View
            style={[
              styles.deckIcon,
              {
                backgroundColor: isSelected
                  ? palette.primary
                  : isDark ? "#1E293B" : "#F1F5F9",
              },
            ]}
          >
            <Ionicons
              name="albums"
              size={18}
              color={isSelected ? "#FFFFFF" : palette.primary}
            />
          </View>
          <View style={styles.nameWrapper}>
            <Text
              style={[
                styles.deckName,
                {
                  color: isSelected ? palette.primary : palette.textPrimary,
                  fontWeight: isSelected ? "800" : "700",
                },
              ]}
            >
              {name}
            </Text>
            <Text style={[styles.cardCount, { color: palette.textMuted }]}>
              {wordCount} thẻ từ vựng
            </Text>
          </View>
        </View>

        {dueCount > 0 ? (
          <View style={[styles.dueBadge, { backgroundColor: palette.reviewLight }]}>
            <Text style={[styles.dueBadgeText, { color: palette.review }]}>
              {dueCount} đến hạn
            </Text>
          </View>
        ) : (
          <View style={[styles.readyBadge, { backgroundColor: palette.successLight }]}>
            <Text style={[styles.readyBadgeText, { color: palette.success }]}>
              Đã cập nhật
            </Text>
          </View>
        )}
        </View>
      </Pressable>

      {/* Action footer */}
      <View style={styles.footerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSelected ? `Đang chọn bộ từ ${name}` : `Chọn bộ từ ${name}`}
          onPress={onSelect}
          style={styles.tagPill}
        >
          <Ionicons
            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
            size={14}
            color={isSelected ? palette.primary : palette.textMuted}
          />
          <Text
            style={[
              styles.tagText,
              { color: isSelected ? palette.primary : palette.textMuted },
            ]}
          >
            {isSelected ? "Đang chọn" : "Chạm để chọn"}
          </Text>
        </Pressable>

        <View style={styles.actionIcons}>
          {onOpen ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mở chi tiết bộ từ: ${name}`}
              onPress={(e) => {
                e.stopPropagation?.();
                onOpen();
              }}
              style={styles.openButton}
            >
              <Text style={{ color: palette.primary, fontSize: 12, fontWeight: "800" }}>Chi tiết</Text>
              <Ionicons name="chevron-forward" size={16} color={palette.primary} />
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Đổi tên bộ: ${name}`}
              onPress={(e) => {
                e.stopPropagation?.();
                onEdit();
              }}
              style={styles.iconButton}
            >
              <Ionicons name="pencil" size={16} color={palette.textSecondary} />
            </Pressable>
          ) : null}

          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xóa bộ: ${name}`}
              onPress={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}
              style={styles.iconButton}
            >
              <Ionicons name="trash-outline" size={16} color={palette.error} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  selectArea: { borderRadius: 12 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deckInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  deckIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  nameWrapper: {
    flex: 1,
    minWidth: 0,
  },
  deckName: {
    flexShrink: 1,
    fontSize: 16,
    marginBottom: 2,
  },
  cardCount: {
    fontSize: 13,
    fontWeight: "400",
  },
  dueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dueBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  readyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  readyBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  openButton: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8 },
  iconButton: {
    padding: 6,
    borderRadius: 8,
  },
});
