import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { listTrashedEnglishDecks, setEnglishDeckTrashed } from "@/db/english/decks";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export default function EnglishDeckTrash() {
  const db = useEnglishDatabase();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [decks, setDecks] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const load = useCallback(async (forceRetry = false) => {
    if (forceRetry) setError("");
    setLoading(true);
    try {
      setDecks(await listTrashedEnglishDecks(db));
      setError("");
    } catch {
      setError("Chưa tải được thùng rác. Bộ từ đã xóa vẫn được giữ nguyên.");
    } finally {
      setLoading(false);
    }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(retry > 0); }, [load, retry]));

  const restore = async (deck: { id: string; name: string }) => {
    if (restoringId) return;
    setRestoringId(deck.id);
    try {
      await setEnglishDeckTrashed(db, deck.id, false);
      setDecks((current) => current.filter((item) => item.id !== deck.id));
      setError("");
    } catch {
      setError(`Chưa khôi phục được “${deck.name}”. Hãy thử lại.`);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Screen title="Thùng rác" subtitle="Khôi phục bộ từ sẽ giữ lại các từ và lịch ôn của bạn.">
      {error ? (
        <View style={[s.alert, { backgroundColor: p.errorLight }]}>
          <Text accessibilityRole="alert" style={{ color: p.error }}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)} style={s.action}>
            <Text style={{ color: p.primary, fontWeight: "800" }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}
      {loading ? (
        <View style={s.loading}><ActivityIndicator color={p.primary} /><Text style={{ color: p.textSecondary }}>Đang tải…</Text></View>
      ) : decks.length ? decks.map((deck) => (
        <View key={deck.id} style={[s.card, { backgroundColor: p.surface, borderColor: p.border }]}>
          <View style={[s.icon, { backgroundColor: p.primaryLight }]}><Ionicons name="albums-outline" size={22} color={p.primary} /></View>
          <View style={s.copy}>
            <Text style={[s.name, { color: p.textPrimary }]}>{deck.name}</Text>
            <Text style={{ color: p.textMuted }}>Đang tạm ẩn khỏi lịch học</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Khôi phục bộ từ ${deck.name}`}
            disabled={restoringId !== null}
            onPress={() => void restore(deck)}
            style={[s.restore, { backgroundColor: p.primaryLight }]}
          >
            {restoringId === deck.id ? <ActivityIndicator size="small" color={p.primary} /> : <Text style={{ color: p.primary, fontWeight: "900" }}>Khôi phục</Text>}
          </Pressable>
        </View>
      )) : !error ? (
        <View style={[s.empty, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Ionicons name="checkmark-circle-outline" size={32} color={p.success} />
          <Text style={[s.name, { color: p.textPrimary }]}>Thùng rác đang trống</Text>
          <Text style={{ color: p.textSecondary, textAlign: "center" }}>Các bộ từ bạn chuyển vào đây có thể khôi phục ở màn hình này.</Text>
        </View>
      ) : null}
      <PrimaryButton variant="secondary" label="Quay lại bộ từ riêng" onPress={() => router.back()} />
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  copy: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: "900" },
  restore: { minHeight: 44, minWidth: 82, borderRadius: 12, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  empty: { minHeight: 180, borderWidth: 1, borderRadius: 22, padding: 22, alignItems: "center", justifyContent: "center", gap: 12 },
  loading: { minHeight: 100, alignItems: "center", justifyContent: "center", gap: 10 },
  alert: { padding: 14, borderRadius: 14, gap: 6 },
  action: { minHeight: 44, justifyContent: "center" },
});
