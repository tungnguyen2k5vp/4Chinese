import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, spacing } from "@/constants/design";
import { useAppStore } from "@/stores/app-store";
export default function Result() {
  const p = useLocalSearchParams<Record<string, string>>();
  const learning = p.mode === "learn";
  const lastReviewedWord = useAppStore((state) => state.lastReviewedWord);
  const lastReviewedHanzi = useAppStore((state) => state.lastReviewedHanzi);
  return (
    <Screen>
      <View style={[card, styles.card]}>
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
        <Text style={styles.title}>
          {learning ? "Hoàn thành buổi học!" : "Đã ôn xong!"}
        </Text>
        <Text style={styles.copy}>
          {learning
            ? "Từ mới đã vào Cấp 1 và chỉ xuất hiện trong Ôn tập khi đến hạn (sau 30 phút)."
            : `${p.correct ?? 0}/${p.total ?? 0} lượt trả lời đúng`}
        </Text>
        {learning ? (
          <Text style={styles.copy}>
            Đã biết: {p.known ?? 0} · Bỏ qua: {p.skipped ?? 0}
          </Text>
        ) : null}
        {!learning ? (
          <View style={styles.grid}>
            <Stat label="Tăng cấp" value={p.up} />
            <Stat label="Giữ cấp" value={p.same} />
            <Stat label="Giảm cấp" value={p.down} />
            <Stat label="Trí nhớ sâu" value={p.deep} />
          </View>
        ) : null}
      </View>
      {!learning && lastReviewedWord ? (
        <View style={[card, styles.wordCard]}>
          <Text style={styles.wordHanzi}>{lastReviewedHanzi ?? lastReviewedWord.simplified}</Text>
          <PinyinText value={lastReviewedWord.pinyin} style={styles.wordPinyin} />
          <Text style={styles.wordMeaning}>{lastReviewedWord.primaryMeaningVi}</Text>
        </View>
      ) : null}
      <PrimaryButton
        label="Về trang chủ"
        onPress={() => router.replace("/(tabs)")}
      />
      <PrimaryButton
        variant="secondary"
        label="Xem thống kê"
        onPress={() => router.replace("/(tabs)/stats")}
      />
    </Screen>
  );
}
function Stat({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    marginTop: 60,
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  check: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#E5F6EF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { fontSize: 40, color: colors.success, fontWeight: "900" },
  title: { fontSize: 25, color: colors.text, fontWeight: "900" },
  copy: { color: colors.textMuted, textAlign: "center", lineHeight: 22 },
  wordCard: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.md },
  wordHanzi: { color: colors.text, fontSize: 42, fontWeight: "900" },
  wordPinyin: { fontSize: 22 },
  wordMeaning: { color: colors.text, fontSize: 17, fontWeight: "700" },
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  stat: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "900", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
