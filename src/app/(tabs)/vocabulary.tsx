import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EnglishWorkspace from "@/app/english/index";
import { EmptyState } from "@/components/EmptyState";
import { HskBandSelect } from "@/components/HskBandSelect";
import { MasteryChart } from "@/components/MasteryChart";
import { SearchBar } from "@/components/SearchBar";
import { VocabularyCard } from "@/components/VocabularyCard";
import { designColors, radius, spacing, themedCard } from "@/constants/design";
import { parseLearningVocabularyTarget } from "@/db/learning-path";
import { getDashboardStats, listVocabulary, restoreSkipped, setKnown, toggleFavorite } from "@/db/repository";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { EnglishAvailability } from "@/services/languages/LanguageRuntime";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { DashboardStats, HskBand, Vocabulary } from "@/types/models";

const filters = ["all", "unlearned", "learned", "due", "favorite", "mastered", "known", "skipped"] as const;
const labels = { all: "Tất cả", unlearned: "Chưa học", learned: "Đã học", due: "Đến hạn", favorite: "Đã lưu", mastered: "Nhớ sâu", known: "Đã biết", skipped: "Bỏ qua" };

export default function VocabularyScreen() {
  const { preferences } = useLearningLanguage();
  return preferences.learningLanguage === "en" ? <EnglishAvailability><EnglishWorkspace /></EnglishAvailability> : <ChineseVocabularyScreen />;
}

function ChineseVocabularyScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const params = useLocalSearchParams<{ band?: string; filter?: string; returnTo?: string; lessonActivityId?: string; lessonVocabularyTarget?: string }>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>((filters.includes(params.filter as never) ? params.filter : "all") as (typeof filters)[number]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [masteryExpanded, setMasteryExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestGeneration = useRef(0);
  const dataGeneration = useRef(0);
  const pageLock = useRef(false);
  const pageOffset = useRef(0);
  const lessonBatch = parseLearningVocabularyTarget(params.lessonVocabularyTarget);
  const isLessonBatch = lessonBatch !== null;
  const lessonBatchOffset = lessonBatch?.offset;
  const lessonBatchLimit = lessonBatch?.limit;
  const routeBand = (lessonBatch?.band ? (lessonBatch.band === "7-9" ? "7-9" : Number(lessonBatch.band))
    : params.band ? (params.band === "7-9" ? "7-9" : Number(params.band)) : "all") as HskBand | "all";
  const band = [1, 2, 3, 4, 5, 6, "7-9"].includes(routeBand) ? routeBand : "all";
  const returnTo = params.returnTo?.startsWith("/path/lesson/") ? params.returnTo : null;
  const lessonActivityId = params.lessonActivityId?.trim() || null;

  useFocusEffect(useCallback(() => {
    let live = true;
    void getDashboardStats(db, band === "all" ? undefined : [band]).then((value) => live && setStats(value));
    return () => { live = false; };
  }, [band, db]));

  useEffect(() => {
    const generation = ++requestGeneration.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setLoadError(false);
      setLoadingMore(false);
      pageLock.current = false;
      void listVocabulary(db, {
        search: isLessonBatch ? "" : query,
        band,
        filter: isLessonBatch ? "all" : filter,
        memoryLevel: isLessonBatch ? undefined : selectedLevel ?? undefined,
        limit: lessonBatchLimit ?? 100,
        bandSlice: lessonBatchOffset !== undefined && lessonBatchLimit !== undefined
          ? { offset: lessonBatchOffset, limit: lessonBatchLimit }
          : undefined,
      })
        .then((items) => {
          if (generation !== requestGeneration.current) return;
          dataGeneration.current = generation;
          setWords(items); pageOffset.current = items.length;
          setHasMore(!isLessonBatch && items.length === 100);
        })
        .catch(() => { if (generation === requestGeneration.current) { setWords([]); setLoadError(true); setHasMore(false); } })
        .finally(() => { if (generation === requestGeneration.current) setLoading(false); });
    }, 180);
    return () => { clearTimeout(timer); requestGeneration.current = generation + 1; };
  }, [band, db, filter, query, selectedLevel, lessonBatchLimit, lessonBatchOffset, isLessonBatch, retry]);

  const loadMore = async () => {
    if (loading || !hasMore || pageLock.current || isLessonBatch || dataGeneration.current !== requestGeneration.current) return;
    const generation = requestGeneration.current;
    pageLock.current = true; setLoadingMore(true);
    try {
      const items = await listVocabulary(db, { band, search: query, filter, memoryLevel: selectedLevel ?? undefined, limit: 100, offset: pageOffset.current });
      if (generation !== requestGeneration.current) return;
      pageOffset.current += items.length;
      setWords(current => [...new Map([...current, ...items].map(word => [word.id, word])).values()]);
      setHasMore(items.length === 100);
      setLoadError(false);
    } catch { if (generation === requestGeneration.current) setLoadError(true); }
    finally { if (generation === requestGeneration.current) { pageLock.current = false; setLoadingMore(false); } }
  };

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
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Kho từ vựng{band !== "all" ? ` · HSK ${band}` : ""}</Text>
          </View>
          <Ionicons name="library-outline" size={23} color={theme.primaryText} />
        </View>
        <Text style={styles.subtitle}>
          {lessonBatch
            ? `Lộ trình học · từ ${lessonBatch.offset + 1}–${lessonBatch.offset + lessonBatch.limit} · HSK ${lessonBatch.band}`
            : "Học theo lịch SRS"}
        </Text>
        {!lessonBatch ? <SearchBar value={query} onChangeText={setQuery} /> : null}
        {!lessonBatch ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/hsk/syllabus', params: { band: band === 'all' ? '1' : String(band) } } as Href)} style={styles.syllabusLink}>
          <Text style={styles.returnText}>Tra cứu cấp HSK 3.0 · 11/2025</Text>
        </Pressable> : null}
        {!lessonBatch ? <HskBandSelect value={band} onChange={(value) => { setSelectedLevel(null); router.setParams({ band: value === "all" ? "" : String(value) }); }} /> : null}
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
      {!lessonBatch ? <View style={styles.filterSection}>
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
      </View> : null}
      <FlatList
        style={styles.wordList}
        data={words}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <VocabularyCard word={item} onPress={() => router.push({ pathname: "/word/[id]", params: { id: item.id, returnTo: returnTo ?? "", lessonActivityId: lessonActivityId ?? "" } } as Href)} onFavorite={() => void favorite(item)} onRestore={filter === "skipped" || filter === "known" ? () => void restore(item) : undefined} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={6}
        onEndReached={() => { if (!loadError) void loadMore(); }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.primary} /> : loadError ? <Pressable accessibilityRole="button" onPress={() => words.length ? void loadMore() : setRetry(value => value + 1)} style={styles.clearButton}><Text style={styles.clear}>Chưa tải được từ · Chạm để thử lại</Text></Pressable> : null}
        ListHeaderComponent={(
          <>
            {!lessonBatch ? <View style={[themedCard(theme), styles.summary]}>
              <View style={styles.summaryHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: masteryExpanded || !!selectedLevel }}
                  accessibilityLabel={`Mức nhớ, ${stats?.learned ?? 0} từ đã học, ${stats?.due ?? 0} từ đến hạn`}
                  onPress={() => setMasteryExpanded((expanded) => !expanded)}
                  style={styles.summaryHeading}
                >
                  <View style={styles.summaryIcon}>
                    <Ionicons name="stats-chart" size={17} color={theme.primary} />
                  </View>
                  <View style={styles.summaryCopy}>
                    <Text style={styles.summaryTitle}>Mức nhớ</Text>
                    <Text style={styles.summaryMeta}>{stats?.learned ?? 0} từ đã học · {stats?.due ?? 0} đến hạn</Text>
                  </View>
                  <Ionicons name={masteryExpanded || selectedLevel ? "chevron-up" : "chevron-down"} size={20} color={theme.textMuted} />
                </Pressable>
                {selectedLevel ? (
                  <Pressable accessibilityRole="button" onPress={() => setSelectedLevel(null)} style={styles.clearButton}>
                    <Text style={styles.clear}>Xem tất cả</Text>
                  </Pressable>
                ) : null}
              </View>
              {masteryExpanded || selectedLevel ? (
                <MasteryChart values={stats?.mastery ?? [0, 0, 0, 0, 0, 0, 0]} selectedLevel={selectedLevel} onLevelPress={(level) => { setFilter("learned"); setSelectedLevel((current) => current === level ? null : level); setMasteryExpanded(true); }} />
              ) : (
                <Text style={styles.summaryHint}>Chạm để xem số từ ở từng cấp nhớ</Text>
              )}
            </View> : null}
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.resultEyebrow}>DANH SÁCH TỪ</Text>
                <Text style={styles.resultTitle}>
                  {lessonBatch
                    ? "Từ trong chặng"
                    : selectedLevel
                    ? selectedLevel === 6 ? "Nhớ sâu" : `Cấp độ ${selectedLevel}`
                    : labels[filter]}
                </Text>
              </View>
              <View style={styles.resultCountBadge}>
                <Text style={styles.resultCount}>{loading ? "…" : words.length}</Text>
                <Text style={styles.resultCountLabel}>{hasMore ? "đã tải" : "từ"}</Text>
              </View>
            </View>
          </>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator style={styles.loader} color={theme.primary} /> : <EmptyState title="Chưa tìm thấy từ" message={lessonBatch ? "Lô từ này hiện không có mục nào trong kho offline." : "Thử Hanzi, pinyin không dấu, nghĩa tiếng Việt hoặc chọn cấp độ khác."} />}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  const colors = designColors(theme);
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.background, paddingTop: 8, paddingHorizontal: spacing.lg, paddingBottom: 8, gap: spacing.xs },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, minHeight: 38 },
  headerCopy: { flex: 1, gap: 3 },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 13, marginBottom: 0 },
  syllabusLink: { alignSelf: "flex-start", justifyContent: "center", minHeight: 32, paddingHorizontal: spacing.sm },
  returnButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.16)" },
  returnText: { color: colors.primaryText, fontSize: 13, fontWeight: "800" },
  filterSection: { minHeight: 58, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  filters: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, alignItems: "center" },
  chip: { minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipPressed: { opacity: 0.72 },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: "#fff" },
  wordList: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 32 },
  summary: { marginBottom: spacing.md, gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.md },
  summaryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  summaryHeading: { flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.sm, minHeight: 44 },
  summaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  summaryMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  summaryHint: { color: colors.textMuted, fontSize: 11, marginLeft: 44 },
  clearButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: spacing.sm },
  clear: { color: colors.primaryText, fontSize: 12, fontWeight: "900" },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  resultEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  resultTitle: { color: colors.text, fontSize: 19, fontWeight: "900", marginTop: 2 },
  resultCountBadge: { minWidth: 52, height: 38, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 3, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  resultCount: { color: colors.primaryText, fontSize: 16, fontWeight: "900" },
  resultCountLabel: { color: colors.primaryText, fontSize: 10, fontWeight: "800" },
  loader: { marginTop: 40 },
}); }
