import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BilingualMeaningList } from "@/components/BilingualMeaningList";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import { copyVocabularyBatchToDeck, listPersonalDecks } from "@/db/repository";
import { parseBulkVocabularyInput, resolveBulkVocabulary, type BulkResolvedWord } from "@/services/vocabulary/bulk-import";

export default function BulkAddWords() {
  const { deckId = "" } = useLocalSearchParams<{ deckId?: string }>();
  const db = useSQLiteContext();
  const [deckName, setDeckName] = useState("Bộ từ riêng");
  const [input, setInput] = useState("");
  const [results, setResults] = useState<BulkResolvedWord[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisSeconds, setAnalysisSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
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
    void listPersonalDecks(db).then((decks) => {
      setDeckName(decks.find((deck) => deck.id === deckId)?.name ?? "Bộ từ riêng");
    });
  }, [db, deckId]);

  const analyze = async () => {
    if (!terms.length || analyzing) return;
    setAnalysisSeconds(0);
    setAnalyzing(true);
    try {
      setResults(await resolveBulkVocabulary(db, input));
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Thêm từ hàng loạt" subtitle="Mỗi dòng một mục · tối đa 100">
      <View style={[card, styles.deckCard]}>
        <Text style={styles.label}>BỘ TỪ ĐANG THÊM</Text>
        <Text style={styles.deckName}>{deckName}</Text>
      </View>
      <View style={[card, styles.form]}>
        <View style={styles.headingRow}>
          <Text style={styles.title}>Danh sách từ</Text>
          <Text style={styles.counter}>{terms.length}/100</Text>
        </View>
        <Text style={styles.help}>Nhận Hanzi, pinyin hoặc nghĩa từ kho offline.</Text>
        <TextInput
          value={input}
          onChangeText={(value) => { setInput(value); setResults([]); }}
          placeholder={"Ví dụ:\nhọc tập\nLý\n谢谢"}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          autoCorrect={false}
          style={styles.input}
        />
        {analyzing ? (
          <Text style={styles.analyzingText}>
            Đang tra kho offline… {analysisSeconds}s
          </Text>
        ) : null}
        <PrimaryButton label={`Nhận diện ${terms.length || ""} từ`.trim()} disabled={!terms.length} loading={analyzing} onPress={() => void analyze()} />
      </View>

      {results.length ? (
        <View style={[card, styles.results]}>
          <Text style={styles.title}>Kiểm tra · {resolved.length}/{results.length}</Text>
          <Text style={styles.help}>Chạm lựa chọn khác nếu cần đổi nghĩa.</Text>
          {results.map((result, resultIndex) => (
            <View key={`${result.input}-${resultIndex}`} style={styles.resultRow}>
              <Text style={styles.query}>{result.input}</Text>
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
          <PrimaryButton label={`Thêm ${resolved.length} từ`} disabled={!resolved.length} loading={saving} onPress={() => void save()} />
        </View>
      ) : null}

      <PrimaryButton variant="secondary" label="Thêm/sửa thủ công" onPress={() => router.push({ pathname: "/decks/word", params: { deckId } } as Href)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  deckCard: { gap: spacing.xs }, label: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }, deckName: { color: colors.text, fontSize: 22, fontWeight: "900" },
  form: { gap: spacing.md }, headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { color: colors.text, fontSize: 18, fontWeight: "900" }, counter: { color: colors.primary, fontWeight: "900" }, help: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  input: { minHeight: 200, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, padding: spacing.md, color: colors.text, fontSize: 17, lineHeight: 25 },
  results: { gap: spacing.sm }, analyzingText: { color: colors.primary, fontSize: 12, fontWeight: "800", textAlign: "center" }, resultRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 3 }, query: { color: colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" }, resolvedWord: { color: colors.primary, fontSize: 20, fontWeight: "900" }, unresolved: { color: colors.danger, fontSize: 13 },
  alternatives: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs }, alternative: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }, alternativeActive: { backgroundColor: colors.primary, borderColor: colors.primary }, alternativeText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" }, alternativeTextActive: { color: "#fff", fontSize: 11, fontWeight: "800" },
});
