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
  const [saving, setSaving] = useState(false);
  const terms = useMemo(() => parseBulkVocabularyInput(input), [input]);
  const resolved = results.filter((item) => item.word);

  useEffect(() => {
    void listPersonalDecks(db).then((decks) => {
      setDeckName(decks.find((deck) => deck.id === deckId)?.name ?? "Bộ từ riêng");
    });
  }, [db, deckId]);

  const analyze = async () => {
    if (!terms.length || analyzing) return;
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
    <Screen title="Thêm từ hàng loạt" subtitle="Mỗi dòng một từ, tối đa 100 dòng. Có thể nhập chữ Hán, pinyin hoặc nghĩa tiếng Việt.">
      <View style={[card, styles.deckCard]}>
        <Text style={styles.label}>BỘ TỪ ĐANG THÊM</Text>
        <Text style={styles.deckName}>{deckName}</Text>
      </View>
      <View style={[card, styles.form]}>
        <View style={styles.headingRow}>
          <Text style={styles.title}>Danh sách từ</Text>
          <Text style={styles.counter}>{terms.length}/100</Text>
        </View>
        <Text style={styles.help}>App tự nhận dạng từng dòng và lấy chữ Hán, phồn thể, pinyin, cặp nghĩa Việt–Anh tương ứng, từ loại, HSK và một ví dụ phù hợp từ kho ngoại tuyến.</Text>
        <TextInput
          value={input}
          onChangeText={(value) => { setInput(value); setResults([]); }}
          placeholder={"Ví dụ:\nhọc tập\nLý\nQuân\n谢谢"}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          autoCorrect={false}
          style={styles.input}
        />
        <PrimaryButton label={`Nhận diện ${terms.length || ""} từ`.trim()} disabled={!terms.length} loading={analyzing} onPress={() => void analyze()} />
      </View>

      {results.length ? (
        <View style={[card, styles.results]}>
          <Text style={styles.title}>Kiểm tra trước khi tạo</Text>
          <Text style={styles.help}>{resolved.length}/{results.length} từ đã nhận diện. Chạm lựa chọn khác nếu từ có nhiều nghĩa.</Text>
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
          <PrimaryButton label={`Tạo ${resolved.length} từ trong bộ`} disabled={!resolved.length} loading={saving} onPress={() => void save()} />
        </View>
      ) : null}

      <PrimaryButton variant="secondary" label="Thêm hoặc sửa từng từ" onPress={() => router.push({ pathname: "/decks/word", params: { deckId } } as Href)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  deckCard: { gap: spacing.xs }, label: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }, deckName: { color: colors.text, fontSize: 22, fontWeight: "900" },
  form: { gap: spacing.md }, headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { color: colors.text, fontSize: 18, fontWeight: "900" }, counter: { color: colors.primary, fontWeight: "900" }, help: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  input: { minHeight: 250, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, padding: spacing.md, color: colors.text, fontSize: 17, lineHeight: 27 },
  results: { gap: spacing.md }, resultRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: 3 }, query: { color: colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" }, resolvedWord: { color: colors.primary, fontSize: 20, fontWeight: "900" }, unresolved: { color: colors.danger, fontSize: 13 },
  alternatives: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs }, alternative: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }, alternativeActive: { backgroundColor: colors.primary, borderColor: colors.primary }, alternativeText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" }, alternativeTextActive: { color: "#fff", fontSize: 11, fontWeight: "800" },
});
