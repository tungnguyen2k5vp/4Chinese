import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BilingualMeaningList } from "@/components/BilingualMeaningList";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { KeyboardTrackingInput } from "@/components/KeyboardTrackingInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { radius, spacing, themedCard } from "@/constants/design";
import { copyVocabularyBatchToDeck, listPersonalDecks } from "@/db/repository";
import { parseBulkVocabularyInput, removeBulkVocabularyResult, resolveBulkVocabulary, type BulkResolvedWord } from "@/services/vocabulary/bulk-import";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";

export default function BulkAddWords() {
  const { deckId = "" } = useLocalSearchParams<{ deckId?: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [deckName, setDeckName] = useState("Bộ từ riêng");
  const [input, setInput] = useState("");
  const [results, setResults] = useState<BulkResolvedWord[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisSeconds, setAnalysisSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const [viewportRevision, setViewportRevision] = useState(0);
  const terms = useMemo(() => parseBulkVocabularyInput(input), [input]);
  const resolved = results.filter((item) => item.word);

  useEffect(() => {
    if (!analyzing) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setAnalysisSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [analyzing]);

  useEffect(() => {
    let live = true;
    void listPersonalDecks(db).then((decks) => {
      if (live) setDeckName(decks.find((deck) => deck.id === deckId)?.name ?? "Bộ từ riêng");
    }).catch(() => { if (live) setDeckName("Bộ từ riêng"); });
    return () => { live = false; };
  }, [db, deckId]);

  const analyze = async () => {
    if (!terms.length || analyzing) return;
    Keyboard.dismiss();
    setAnalysisSeconds(0);
    setAnalyzing(true);
    try {
      setResults(await resolveBulkVocabulary(db, input));
      setHasAnalyzed(true);
    } catch {
      Alert.alert("Chưa thể nhận diện", "Hãy thử lại hoặc thêm riêng từ chưa tìm thấy.");
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!deckId || !resolved.length || saving) return;
    setSaving(true);
    try {
      const outcome = await copyVocabularyBatchToDeck(db, deckId, resolved.flatMap((item) => item.word ? [item.word] : []));
      Alert.alert(
        "Đã thêm từ",
        `${outcome.saved} từ đã được tạo đầy đủ trong “${deckName}”${outcome.skipped ? `; ${outcome.skipped} từ trùng được bỏ qua` : ""}.`,
        [{ text: "Xong", onPress: () => router.back() }],
      );
    } catch {
      Alert.alert("Chưa lưu được danh sách", "Danh sách đã chọn vẫn còn. Hãy thử thêm lại; các từ đã lưu sẽ không được tạo trùng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Thêm từ hàng loạt" hideTitle subtitle="Mỗi dòng một mục · tối đa 100" avoidKeyboard scrollRef={scrollRef}
      onViewportLayout={() => setViewportRevision(revision => revision + 1)}
      onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={styles.label}>THÊM VÀO BỘ</Text>
        <Text style={styles.deckName}>{deckName}</Text>
      </View>
      <View style={[styles.card, styles.form]}>
        <View style={styles.headingRow}>
          <Text style={styles.title}>Danh sách từ</Text>
          <Text style={styles.counter}>{terms.length}/100</Text>
        </View>
        <Text style={styles.help}>Nhận Hanzi, pinyin hoặc nghĩa từ kho offline.</Text>
        <KeyboardTrackingInput scrollRef={scrollRef} scrollOffset={scrollOffset} viewportRevision={viewportRevision}
          value={input}
          onChangeText={(value) => { setInput(value); setResults([]); setHasAnalyzed(false); }}
          placeholder={"Ví dụ:\nhọc tập\nLý\n谢谢"}
          accessibilityLabel="Danh sách từ cần thêm"
          accessibilityHint="Nhập mỗi từ hoặc nghĩa trên một dòng, tối đa 100 mục."
          placeholderTextColor={theme.textMuted}
          multiline
          textAlignVertical="top"
          autoCorrect={false}
          editable={!analyzing && !saving}
          style={styles.input}
        />
        {analyzing ? (
          <Text accessibilityLiveRegion="polite" style={styles.analyzingText}>
            Đang tra kho offline… {analysisSeconds}s
          </Text>
        ) : null}
        <PrimaryButton label={`Nhận diện ${terms.length || ""} từ`.trim()} disabled={!terms.length} loading={analyzing} onPress={() => void analyze()} />
      </View>

      {hasAnalyzed ? (
        <View style={[styles.card, styles.results]}>
          <Text style={styles.title}>{results.length ? `Kiểm tra · ${resolved.length}/${results.length} từ khớp` : "Danh sách trống"}</Text>
          <Text style={styles.help}>Đổi nghĩa nếu cần hoặc nhấn × để bỏ mục không phù hợp trước khi thêm.</Text>
          {!results.length ? <Text style={styles.emptyResults}>Không còn mục nào được chọn; chưa có từ nào được lưu.</Text> : null}
          {results.map((result, resultIndex) => (
            <View key={result.input} style={styles.resultRow}>
              <View style={styles.queryRow}>
                <Text style={styles.query}>{result.input}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Bỏ ${result.word?.simplified ?? result.input} khỏi danh sách thêm`}
                  accessibilityHint="Mục này sẽ không được lưu khi thêm danh sách."
                  disabled={saving}
                  hitSlop={6}
                  style={styles.removeButton}
                  onPress={() => setResults((items) => removeBulkVocabularyResult(items, result.input))}
                >
                  <Ionicons name="close-circle" size={22} color={theme.error} />
                </Pressable>
              </View>
              {result.word ? (
                <>
                  <Text style={styles.resolvedWord}>{result.word.simplified} · {result.word.pinyin}</Text>
                  <BilingualMeaningList
                    compact
                    meaningsVi={result.word.meaningsVi}
                    meaningsEn={result.word.meaningsEn}
                    primaryMeaningVi={result.word.primaryMeaningVi}
                  />
                  {result.alternatives.length > 1 ? (
                    <View style={styles.alternatives}>
                      {result.alternatives.map((candidate) => {
                        const active = candidate.id === result.word?.id;
                        return (
                          <Pressable
                            key={candidate.id}
                            accessibilityRole="button"
                            accessibilityLabel={candidate.simplified + ", " + candidate.pinyin + (active ? ", đã chọn" : ", chọn nghĩa này")}
                            accessibilityState={{ selected: active }}
                            onPress={() => setResults((items) => items.map((item, index) => index === resultIndex ? { ...item, word: candidate } : item))}
                            style={[styles.alternative, active && styles.alternativeActive]}
                          >
                            <Text style={active ? styles.alternativeTextActive : styles.alternativeText}>{candidate.simplified} {candidate.pinyin}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </>
              ) : <Text style={styles.unresolved}>Chưa tìm thấy — hãy thêm riêng để nhập thủ công.</Text>}
            </View>
          ))}
          <PrimaryButton label={resolved.length ? `Thêm ${resolved.length} từ` : "Không có từ để thêm"} disabled={!resolved.length} loading={saving} onPress={() => void save()} />
        </View>
      ) : null}

      <PrimaryButton variant="secondary" label="Thêm/sửa thủ công" onPress={() => router.push({ pathname: "/decks/word", params: { deckId } } as Href)} />
    </Screen>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    card: { ...themedCard(theme), borderWidth: 1, borderColor: theme.border },
    deckCard: { gap: spacing.xs }, label: { color: theme.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }, deckName: { color: theme.textPrimary, fontSize: 22, fontWeight: "900" },
    form: { gap: spacing.md }, headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { color: theme.textPrimary, fontSize: 18, fontWeight: "900" }, counter: { color: theme.primaryText, fontWeight: "900" }, help: { color: theme.textMuted, fontSize: 12, lineHeight: 17 },
    input: { minHeight: 200, borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.md, backgroundColor: theme.backgroundSecondary, padding: spacing.md, color: theme.textPrimary, fontSize: 17, lineHeight: 25 },
    results: { gap: spacing.sm }, analyzingText: { color: theme.primaryText, fontSize: 12, fontWeight: "800", textAlign: "center" }, resultRow: { borderTopWidth: 1, borderTopColor: theme.divider, paddingTop: spacing.sm, gap: 3 }, queryRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }, query: { flex: 1, color: theme.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" }, removeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: theme.backgroundSecondary }, emptyResults: { color: theme.textMuted, fontSize: 13, textAlign: "center", paddingVertical: spacing.md }, resolvedWord: { color: theme.primaryText, fontSize: 20, fontWeight: "900" }, unresolved: { color: theme.error, fontSize: 13 },
    alternatives: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs }, alternative: { minHeight: 44, justifyContent: "center", paddingHorizontal: 9, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }, alternativeActive: { backgroundColor: theme.primary, borderColor: theme.primary }, alternativeText: { color: theme.textSecondary, fontSize: 11, fontWeight: "700" }, alternativeTextActive: { color: theme.onPrimary, fontSize: 11, fontWeight: "800" },
  });
}
