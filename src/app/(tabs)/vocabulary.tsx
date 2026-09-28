import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { MasteryChart } from "@/components/MasteryChart";
import { SearchBar } from "@/components/SearchBar";
import { VocabularyCard } from "@/components/VocabularyCard";
import { card, colors, radius, spacing } from "@/constants/design";
import { getDashboardStats, listVocabulary, restoreSkipped, setKnown, toggleFavorite } from "@/db/repository";
import type { DashboardStats, HskBand, Vocabulary } from "@/types/models";

const filters = ["all", "unlearned", "learned", "due", "favorite", "mastered", "known", "skipped"] as const;
const labels = { all: "Tất cả", unlearned: "Chưa học", learned: "Đã học", due: "Đến hạn", favorite: "Đã lưu", mastered: "Nhớ sâu", known: "Đã biết", skipped: "Bỏ qua" };

export default function VocabularyScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ band?: string; filter?: string; returnTo?: string }>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>((filters.includes(params.filter as never) ? params.filter : "all") as (typeof filters)[number]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const band = (params.band ? (params.band === "7-9" ? "7-9" : Number(params.band)) : "all") as HskBand | "all";
  const returnTo = params.returnTo?.startsWith("/path/lesson/") ? params.returnTo : null;

  useFocusEffect(useCallback(() => {
    let live = true;
    void getDashboardStats(db, band === "all" ? undefined : [band]).then((value) => live && setStats(value));
    return () => { live = false; };
  }, [band, db]));

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void listVocabulary(db, { search: query, band, filter, memoryLevel: selectedLevel ?? undefined, limit: 80 })
        .then(setWords)
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(timer);
  }, [band, db, filter, query, selectedLevel]);

  const favorite = async (word: Vocabulary) => {
    await toggleFavorite(db, word.id);
    setWords((items) => items.map((item) => item.id === word.id ? { ...item, isFavorite: !item.isFavorite } : item));
  };
  const restore = async (word: Vocabulary) => {
    if (filter === "skipped") await restoreSkipped(db, word.id);
    else if (filter === "known") await setKnown(db, word.id, false);
    setWords((items) => items.filter((item) => item.id !== word.id));
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>HANZI 3.0</Text>
            <Text style={styles.title}>Kho từ vựng{band !== "all" ? ` · HSK ${band}` : ""}</Text>
          </View>
          <View style={styles.headerMark}>
            <Ionicons name="library" size={24} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.subtitle}>Học theo lịch SRS</Text>
        <SearchBar value={query} onChangeText={setQuery} />
        {returnTo ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(returnTo as Href)}
            style={styles.returnButton}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.returnText}>Quay lại bài học</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => {
            const active = filter === item && !selectedLevel;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => { setFilter(item); setSelectedLevel(null); }}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{labels[item]}</Text>
              </Pressable>
            );
          }}
        />
      </View>
      <FlatList
        style={styles.wordList}
        data={words}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <VocabularyCard word={item} onPress={() => router.push(`/word/${item.id}`)} onFavorite={() => void favorite(item)} onRestore={filter === "skipped" || filter === "known" ? () => void restore(item) : undefined} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={6}
        ListHeaderComponent={(
          <>
            <View style={[card, styles.summary]}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryHeading}>
                  <View style={styles.summaryIcon}>
                    <Ionicons name="stats-chart" size={17} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.summaryTitle}>Cấp độ nhớ</Text>
                    <Text style={styles.summaryMeta}>{stats?.learned ?? 0} từ đang học · {stats?.due ?? 0} đến hạn</Text>
                  </View>
                </View>
                {selectedLevel ? (
                  <Pressable accessibilityRole="button" onPress={() => setSelectedLevel(null)} style={styles.clearButton}>
                    <Text style={styles.clear}>Xem tất cả</Text>
                  </Pressable>
                ) : null}
              </View>
              <MasteryChart values={stats?.mastery ?? [0, 0, 0, 0, 0, 0, 0]} selectedLevel={selectedLevel} onLevelPress={(level) => { setFilter("learned"); setSelectedLevel((current) => current === level ? null : level); }} />
            </View>
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.resultEyebrow}>DANH SÁCH TỪ</Text>
                <Text style={styles.resultTitle}>
                  {selectedLevel
                    ? selectedLevel === 6 ? "Nhớ sâu" : `Cấp độ ${selectedLevel}`
                    : labels[filter]}
                </Text>
              </View>
              <View style={styles.resultCountBadge}>
                <Text style={styles.resultCount}>{loading ? "…" : words.length}</Text>
                <Text style={styles.resultCountLabel}>từ</Text>
              </View>
            </View>
          </>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : <EmptyState title="Chưa tìm thấy từ" message="Thử Hanzi, pinyin không dấu, nghĩa tiếng Việt hoặc chọn cấp độ khác." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: 18, gap: spacing.sm },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  headerCopy: { flex: 1, gap: 3 },
  headerMark: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  brand: { color: "#CFDAFF", fontWeight: "900", fontSize: 11, letterSpacing: 1.5 },
  title: { color: "#fff", fontSize: 28, lineHeight: 34, fontWeight: "900" },
  subtitle: { color: "#DCE4FF", fontSize: 13, marginBottom: spacing.xs },
  returnButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.16)" },
  returnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  filterSection: { height: 66, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  filters: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, alignItems: "center" },
  chip: { minHeight: 38, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipPressed: { opacity: 0.72 },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: "#fff" },
  wordList: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 32 },
  summary: { marginBottom: spacing.xl, gap: spacing.md, paddingTop: spacing.md },
  summaryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  summaryHeading: { flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.sm },
  summaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  summaryTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
  summaryMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  clearButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: spacing.sm },
  clear: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  resultEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  resultTitle: { color: colors.text, fontSize: 19, fontWeight: "900", marginTop: 2 },
  resultCountBadge: { minWidth: 52, height: 38, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 3, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  resultCount: { color: colors.primary, fontSize: 16, fontWeight: "900" },
  resultCountLabel: { color: colors.primary, fontSize: 10, fontWeight: "800" },
  loader: { marginTop: 40 },
});
