import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import {
  getDueCount,
  getDueVocabulary,
  getSettings,
  saveSettings,
} from "@/db/repository";
import { useAppStore } from "@/stores/app-store";
import type { UserSettings, Vocabulary } from "@/types/models";

const sizes = [10, 20, 30, 50] as const;
export default function ReviewIndex() {
  const db = useSQLiteContext();
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const setQueue = useAppStore((s) => s.setReviewQueue);
  useEffect(() => {
    let live = true;
    getSettings(db).then(async (next) => {
      const [dueWords, totalDue] = await Promise.all([
        getDueVocabulary(db, 50, next.selectedHskBands),
        getDueCount(db, next.selectedHskBands),
      ]);
      if (!live) return;
      setSettings(next);
      setWords(dueWords);
      setDueCount(totalDue);
    });
    return () => {
      live = false;
    };
  }, [db]);
  const selected = settings?.reviewSessionSize ?? 20;
  const count = dueCount;
  const choose = async (size: (typeof sizes)[number]) => {
    if (!settings) return;
    const next = { ...settings, reviewSessionSize: size };
    setSettings(next);
    await saveSettings(db, next);
  };
  const start = () => {
    setQueue(words.slice(0, selected));
    router.push("/review/session");
  };
  return (
    <Screen
      title="Ôn tập theo cấp nhớ"
      subtitle="Lịch ôn rõ ràng từ Cấp 1 đến Trí nhớ sâu, dựa trên kết quả thật của bạn."
    >
      <View style={[card, styles.hero]}>
        <Text style={styles.icon}>复</Text>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.label}>từ đến hạn</Text>
        <Text style={styles.copy}>
          Từ khó và quá hạn được ưu tiên. Trả lời sai sẽ xuất hiện lại tối đa
          một lần trong phiên.
        </Text>
      </View>
      {count === 0 ? (
        <EmptyState
          icon="✓"
          title="Đã hoàn thành!"
          message="Không có từ đến hạn trong các cấp HSK đang chọn."
        />
      ) : (
        <>
          <View style={card}>
            <Text style={styles.section}>Số từ trong phiên</Text>
            <View style={styles.sizes}>
              {sizes.map((size) => (
                <Pressable
                  key={size}
                  onPress={() => void choose(size)}
                  style={[styles.size, selected === size && styles.sizeActive]}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      selected === size && styles.sizeTextActive,
                    ]}
                  >
                    {size}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.note}>
              Phiên này sẽ hiện nghĩa tiếng Việt để bạn viết Hanzi, chọn Pinyin
              và chọn nghĩa đúng trước khi chấm mức nhớ.
            </Text>
          </View>
          <PrimaryButton
            label={`Bắt đầu ôn ${Math.min(selected, count)} từ`}
            onPress={start}
          />
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 4, paddingVertical: spacing.xl },
  icon: { fontSize: 45, color: colors.primary, fontWeight: "800" },
  count: { fontSize: 42, color: colors.text, fontWeight: "900" },
  label: { color: colors.primary, fontWeight: "800" },
  copy: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  section: {
    fontSize: 17,
    color: colors.text,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  sizes: { flexDirection: "row", gap: spacing.sm },
  size: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sizeText: { color: colors.text, fontWeight: "800" },
  sizeTextActive: { color: "#fff" },
  note: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
