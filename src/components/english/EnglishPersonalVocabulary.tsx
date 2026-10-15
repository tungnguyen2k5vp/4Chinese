import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EnglishAudioButton } from "@/components/EnglishAudioButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { EnglishCard } from "@/db/english/learner";
import {
  englishMemoryLevel,
  type EnglishMemorySummary,
} from "@/db/english/personal-vocabulary";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export const ENGLISH_LEVEL_COLORS = [
  "#E5484D",
  "#EA7800",
  "#B88700",
  "#5E9D23",
  "#099B72",
  "#5146D8",
];
export function EnglishMemoryChart({
  summary,
}: {
  summary: EnglishMemorySummary;
}) {
  const p = getEnglishPalette(useTheme().mode === "dark");
  const maximum = Math.max(1, ...summary.levels);
  return (
    <View
      testID="english-memory-chart"
      style={[s.panel, { backgroundColor: p.surface, borderColor: p.border }]}
    >
      <Text style={[s.heading, { color: p.textPrimary }]}>
        Thống kê từ vựng của bạn
      </Text>
      <Text style={{ color: p.textSecondary }}>Đã bắt đầu học</Text>
      <Text style={[s.total, { color: p.textPrimary }]}>
        {summary.studied}
        <Text style={{ fontSize: 20, color: p.textMuted }}>
          /{summary.total - summary.suspended} từ
        </Text>
      </Text>
      <View style={s.bars}>
        {summary.levels.map((count, index) => (
          <View
            key={index}
            accessibilityLabel={`${index === 5 ? "Nhớ sâu" : `LV${index + 1}`}: ${count} từ`}
            style={s.column}
          >
            <Text style={{ color: p.textSecondary, fontWeight: "700" }}>
              {count}
            </Text>
            <View
              style={[
                s.bar,
                {
                  height: Math.max(4, (count / maximum) * 110),
                  backgroundColor: ENGLISH_LEVEL_COLORS[index],
                },
              ]}
            />
            <Text
              style={{
                color: p.textSecondary,
                fontSize: 11,
                textAlign: "center",
              }}
            >
              {index === 5 ? "Nhớ sâu" : `LV${index + 1}`}
            </Text>
          </View>
        ))}
      </View>
      <Text style={{ color: p.textSecondary }}>
        {summary.newCount} từ chưa học · {summary.knownCount} đã biết · {summary.due} từ đến hạn ôn
      </Text>
      <Text style={{ color: p.textMuted, lineHeight: 20 }}>
        Mỗi lần ôn giúp cập nhật mức độ ghi nhớ dựa trên kết quả của bạn.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem các từ tiếng Anh đã bỏ qua"
        onPress={() => router.push("/english/suspended" as Href)}
        style={s.touch}
      >
        <Text style={{ color: p.primary }}>
          Các từ đã bỏ qua ({summary.suspended}) ›
        </Text>
      </Pressable>
      <PrimaryButton
        label={
          summary.due
            ? `Ôn tập ngay · ${summary.due} từ`
            : "Chưa có từ đến hạn ôn"
        }
        disabled={!summary.due}
        onPress={() => router.push("/english/review" as Href)}
      />
    </View>
  );
}
export function EnglishPersonalWordCard({
  card,
  busy,
  onStart,
  onSuspend,
  compact = false,
  showStartAction = true,
}: {
  card: EnglishCard;
  busy: boolean;
  onStart: () => void;
  onSuspend: () => void;
  compact?: boolean;
  showStartAction?: boolean;
}) {
  const p = getEnglishPalette(useTheme().mode === "dark");
  const level = englishMemoryLevel(card);
  const isKnown = card.status !== "NEW" && JSON.parse(card.progress_json).isKnown === true;
  const label = card.suspended
    ? "Đã bỏ qua"
    : isKnown
      ? "Đã biết"
    : level === 0
      ? "Chưa học"
      : level === 6
        ? "Nhớ tốt"
        : "Đang học";
  const color = level ? ENGLISH_LEVEL_COLORS[level - 1] : p.textMuted;
  if (compact) {
    const learnerLabel = card.suspended
      ? "Đã bỏ qua"
      : isKnown
        ? "Đã biết"
      : level === 0
        ? "Chưa học"
        : level === 6
          ? "Nhớ tốt"
          : "Đang học";
    return (
      <View
        testID={`english-personal-card-${card.id}`}
        style={[s.compactPanel, { backgroundColor: p.surface, borderColor: p.border }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xem chi tiết từ ${card.headword}`}
          onPress={() => router.push(`/english/word?cardId=${encodeURIComponent(card.id)}` as Href)}
          style={s.compactMain}
        >
          <View style={s.row}>
            <Text numberOfLines={1} style={[s.compactWord, { color: p.primary }]}>{card.headword}</Text>
            <Text style={[s.compactLevel, { color, borderColor: color }]}>{learnerLabel}</Text>
          </View>
          <Text numberOfLines={2} style={{ color: p.textPrimary, lineHeight: 21 }}>{card.meaning_vi}</Text>
          <Text numberOfLines={1} style={{ color: p.textMuted, fontSize: 13 }}>
            {[card.pos, card.ipa].filter(Boolean).join(" · ") || "Chạm để xem phát âm và chi tiết"}
          </Text>
        </Pressable>
        <View style={s.compactActions}>
          {showStartAction && card.status === "NEW" && !card.suspended ? (
            <PrimaryButton label="Bắt đầu học" disabled={busy} onPress={onStart} />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem chi tiết từ ${card.headword}`}
            onPress={() => router.push(`/english/word?cardId=${encodeURIComponent(card.id)}` as Href)}
            style={s.iconAction}
          >
            <Ionicons name="book-outline" size={19} color={p.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${card.suspended ? "Khôi phục" : "Bỏ qua"} từ ${card.headword}`}
            disabled={busy}
            onPress={onSuspend}
            style={s.iconAction}
          >
            <Ionicons name={card.suspended ? "refresh-outline" : "ellipsis-horizontal"} size={19} color={p.textSecondary} />
          </Pressable>
        </View>
        {card.next_review_at && !card.suspended ? (
          <Text style={{ color: p.textMuted, fontSize: 12 }}>Ôn tiếp {new Date(card.next_review_at).toLocaleDateString("vi-VN")}</Text>
        ) : null}
      </View>
    );
  }
  return (
    <View
      testID={`english-personal-card-${card.id}`}
      style={[s.panel, { backgroundColor: p.surface, borderColor: p.border }]}
    >
      <View style={s.row}>
        <Text style={[s.word, { color: p.primary }]}>{card.headword}</Text>
        <Text style={[s.level, { color, borderColor: color }]}>{label}</Text>
      </View>
      {card.pos ? (
        <Text style={{ color: p.textSecondary }}>{card.pos}</Text>
      ) : null}
      {card.ipa ? (
        <Text style={{ color: p.textSecondary }}>IPA: {card.ipa}</Text>
      ) : null}
      <EnglishAudioButton text={card.headword} />
      <Text style={[s.meaning, { color: p.textPrimary }]}>
        {card.meaning_vi}
      </Text>
      {card.notes ? (
        <Text style={{ color: p.textSecondary, lineHeight: 22 }}>
          {card.notes}
        </Text>
      ) : null}
      {card.next_review_at && !card.suspended ? (
        <Text style={{ color: p.textMuted }}>
          Ôn tiếp: {new Date(card.next_review_at).toLocaleString("vi-VN")}
        </Text>
      ) : null}
      {showStartAction && card.status === "NEW" && !card.suspended ? (
        <PrimaryButton
          label="Bắt đầu học"
          disabled={busy}
          onPress={onStart}
        />
      ) : null}
      <View style={s.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sửa từ ${card.headword}`}
          disabled={busy}
          onPress={() =>
            router.push(
              `/english/card-edit?id=${encodeURIComponent(card.id)}` as Href,
            )
          }
          style={s.touch}
        >
          <Text style={{ color: p.primary }}>Sửa từ</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${card.suspended ? "Khôi phục" : "Bỏ qua"} từ ${card.headword}`}
          disabled={busy}
          onPress={onSuspend}
          style={s.touch}
        >
          <Text style={{ color: p.primary }}>
            {card.suspended ? "Khôi phục lịch học" : "Bỏ qua từ này"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  compactPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 7,
    marginBottom: 8,
  },
  compactMain: { gap: 4 },
  compactWord: { flex: 1, minWidth: 0, fontSize: 19, fontWeight: "800" },
  compactLevel: { flexShrink: 0, fontSize: 12, fontWeight: "700", borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  compactActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  iconAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "#D8E0EE" },
  panel: {
    padding: 18,
    borderWidth: 1,
    borderRadius: 22,
    gap: 12,
    marginBottom: 16,
  },
  heading: { fontSize: 20, fontWeight: "800" },
  total: { fontSize: 42, fontWeight: "800" },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    minHeight: 156,
  },
  column: { flex: 1, minWidth: 0, gap: 7, alignItems: "center" },
  bar: { width: "100%", borderRadius: 8 },
  touch: { minHeight: 44, justifyContent: "center", paddingVertical: 10 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  word: { fontSize: 27, fontWeight: "800", flexShrink: 1 },
  level: {
    fontSize: 13,
    fontWeight: "700",
    borderWidth: 1,
    borderRadius: 12,
    padding: 7,
  },
  meaning: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
});
