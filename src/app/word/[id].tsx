import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { HskBadge, MasteryBadge } from "@/components/Badges";
import { BilingualMeaningList } from "@/components/BilingualMeaningList";
import { EmptyState } from "@/components/EmptyState";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { StrokeWriter } from "@/components/StrokeWriter";
import { card, colors, radius, spacing } from "@/constants/design";
import {
  getNotes,
  getVocabulary,
  saveNotes,
  toggleFavorite,
} from "@/db/repository";
import { primaryEnglishMeaning } from "@/services/vocabulary/bilingual-meanings";
import { analyzeVocabulary, buildMnemonicNote } from "@/services/vocabulary/character-analysis";
import { useAppStore } from "@/stores/app-store";
import type { Vocabulary } from "@/types/models";

type Tab = "overview" | "writing" | "examples" | "notes";
export default function WordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [word, setWord] = useState<Vocabulary | null>();
  const [tab, setTab] = useState<Tab>("overview");
  const [character, setCharacter] = useState("");
  const [notes, setNotes] = useState("");
  const setLearnQueue = useAppStore((state) => state.setLearnQueue);
  useEffect(() => {
    if (!id) return;
    Promise.all([getVocabulary(db, id), getNotes(db, id)]).then(
      ([value, note]) => {
        setWord(value);
        setCharacter(value?.simplified[0] ?? "");
        setNotes(note);
      },
    );
  }, [db, id]);
  if (word === undefined)
    return (
      <Screen>
        <Text style={styles.loading}>Đang tải từ vựng…</Text>
      </Screen>
    );
  if (!word)
    return (
      <Screen>
        <EmptyState
          title="Không tìm thấy từ"
          message="Từ này có thể chưa có trong dữ liệu offline."
        />
      </Screen>
    );
  const learn = async () => {
    if (word.status === "LEARNING") {
      router.push("/review");
      return;
    }
    if (word.status === "KNOWN" || word.status === "SKIPPED") return;
    // Never mark a word learned from the detail screen. Route through the
    // normal NEW-word encoding screen so the answer is shown and the learner
    // must copy it once before Level 1 is persisted.
    setLearnQueue([word]);
    router.push("/learn/session");
  };
  const favorite = async () => {
    const next = await toggleFavorite(db, word.id);
    setWord({ ...word, isFavorite: next });
  };
  const analyses = analyzeVocabulary(word);
  const generatedMnemonic = buildMnemonicNote(analyses);
  const insertMnemonic = () => {
    if (notes.includes(generatedMnemonic)) return;
    setNotes(notes.trim() ? `${notes.trim()}\n\n${generatedMnemonic}` : generatedMnemonic);
  };
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.wordBlock}>
            <Text style={styles.hanzi}>{word.simplified}</Text>
            <PinyinText value={word.pinyin} style={styles.pinyin} />
            <Text style={styles.traditional}>Phồn thể: {word.traditional}</Text>
          </View>
          <View style={styles.heroActions}>
            <AudioButton text={word.simplified} size={25} />
            <Pressable
              accessibilityLabel="Chỉnh sửa nghĩa"
              onPress={() =>
                router.push({
                  pathname: "/decks/word",
                  params: { id: word.id, deckId: word.deckId ?? "" },
                } as unknown as Href)
              }
              style={styles.round}
            >
              <Ionicons name="pencil" size={21} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => void favorite()} style={styles.round}>
              <Ionicons
                name={word.isFavorite ? "bookmark" : "bookmark-outline"}
                size={24}
                color={word.isFavorite ? colors.accent : colors.primary}
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.heroMeanings}>
          <Text style={styles.meaning}>{word.primaryMeaningVi}</Text>
          <Text style={[styles.meaning, styles.meaningEn]}>{primaryEnglishMeaning(word.meaningsEn)}</Text>
        </View>
        <View style={styles.badges}>
          <HskBadge band={word.hskBand} />
          <MasteryBadge level={word.masteryLevel} status={word.status} />
          {word.pos.map((item) => (
            <Text key={item} style={styles.pos}>
              {item}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.tabs}>
        {(
          [
            ["overview", "Tổng quan"],
            ["writing", "Cách viết"],
            ["examples", "Ví dụ"],
            ["notes", "Ghi chú"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "overview" ? (
        <>
          {word.imageUri ? (
            <Image
              source={word.imageUri}
              style={styles.wordImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.illustration}>
              <View style={styles.sun} />
              <Text style={styles.illustrationHanzi}>{word.simplified}</Text>
              <Text style={styles.illustrationLabel}>Minh hoạ từ vựng</Text>
            </View>
          )}
          <View style={card}>
            <Text style={styles.section}>Nghĩa Việt–Anh tương ứng</Text>
            <BilingualMeaningList
              meaningsVi={word.meaningsVi}
              meaningsEn={word.meaningsEn}
              primaryMeaningVi={word.primaryMeaningVi}
            />
            <Text style={styles.source}>
              Nguồn: {word.source} · {word.translationStatus}
            </Text>
          </View>
          {word.examples[0] ? <Example item={word.examples[0]} /> : null}
          <PrimaryButton
            label={word.status === "LEARNING" ? "Mở ôn tập" : word.status === "KNOWN" ? "Đã biết" : "Học từ này"}
            onPress={() => void learn()}
          />
        </>
      ) : null}
      {tab === "writing" ? (
        <View style={[card, styles.writing]}>
          <View style={styles.characters}>
            {[...word.simplified].map((char) => (
              <Pressable
                key={char}
                onPress={() => setCharacter(char)}
                style={[
                  styles.character,
                  character === char && styles.characterActive,
                ]}
              >
                <Text
                  style={[
                    styles.characterText,
                    character === char && styles.characterTextActive,
                  ]}
                >
                  {char}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.meta}>
            Bộ thủ: {word.radical ?? "—"} · {word.strokeCount ?? "—"} nét (tổng
            từ)
          </Text>
          <StrokeWriter character={character} />
          <PrimaryButton
            label="Luyện viết bằng tay"
            onPress={() => router.push(`/writing/${character}`)}
          />
        </View>
      ) : null}
      {tab === "examples" ? (
        <View style={styles.exampleList}>
          {word.examples.length ? (
            word.examples.map((item) => <Example key={item.id} item={item} />)
          ) : (
            <EmptyState
              title="Chưa có ví dụ"
              message="Pipeline dữ liệu hỗ trợ thêm câu ví dụ đã kiểm chứng."
            />
          )}
        </View>
      ) : null}
      {tab === "notes" ? (
        <>
          <View style={[card, styles.analysisCard]}>
            <View style={styles.analysisHeader}>
              <View style={styles.analysisCopy}>
                <Text style={styles.section}>Phân tích bộ thủ & mẹo nhớ</Text>
                <Text style={styles.analysisHint}>Phân tích tự động cho từng Hán tự.</Text>
              </View>
              <Text style={styles.analysisIcon}>忆</Text>
            </View>
            {analyses.map((analysis) => (
              <View key={analysis.character} style={styles.analysisRow}>
                <View style={styles.analysisCharacter}>
                  <Text style={styles.analysisHanzi}>{analysis.character}</Text>
                  <Text style={styles.analysisRadical}>{analysis.radical ?? "·"}</Text>
                </View>
                <View style={styles.analysisBody}>
                  <Text style={styles.analysisLabel}>Bộ thủ / thành phần</Text>
                  <Text style={styles.analysisText}>{analysis.radicalName} · {analysis.radicalMeaning}</Text>
                  <Text style={styles.analysisLabel}>Phân rã</Text>
                  <Text style={styles.analysisText}>{analysis.decomposition}</Text>
                  <Text style={styles.analysisLabel}>Mnemonic</Text>
                  <Text style={styles.mnemonic}>{analysis.mnemonic}</Text>
                </View>
              </View>
            ))}
            <PrimaryButton variant="secondary" label="Chèn mẹo nhớ vào ghi chú" onPress={insertMnemonic} />
          </View>
          <View style={card}>
          <Text style={styles.section}>Ghi chú cá nhân</Text>
          <TextInput
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Mẹo nhớ, ngữ cảnh sử dụng..."
            placeholderTextColor={colors.textMuted}
            style={styles.notes}
          />
          <PrimaryButton
            label="Lưu ghi chú"
            onPress={() => void saveNotes(db, word.id, notes)}
          />
          </View>
        </>
      ) : null}
    </Screen>
  );
}
function Example({ item }: { item: Vocabulary["examples"][number] }) {
  return (
    <View style={[card, styles.example]}>
      <View style={styles.exampleHead}>
        <Text style={styles.chinese}>{item.chinese}</Text>
        <AudioButton text={item.chinese} />
      </View>
      <PinyinText value={item.pinyin} />
      <Text style={styles.exampleVi}>{item.vietnamese}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  loading: { marginTop: 60, textAlign: "center", color: colors.textMuted },
  hero: { marginTop: spacing.lg, gap: spacing.md },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  wordBlock: { flex: 1, gap: 3 },
  hanzi: { color: colors.text, fontSize: 52, fontWeight: "800" },
  pinyin: { fontSize: 21 },
  traditional: { color: colors.textMuted, fontSize: 12 },
  heroActions: { flexDirection: "row", gap: spacing.xs },
  round: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  meaning: { flex: 1, color: colors.text, fontSize: 20, fontWeight: "700" },
  heroMeanings: { flexDirection: "row", gap: spacing.md },
  meaningEn: { flex: 1, color: colors.textMuted },
  badges: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    flexWrap: "wrap",
  },
  pos: { color: colors.textMuted, fontSize: 12 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: colors.primary },
  wordImage: { height: 210, width: "100%", borderRadius: radius.lg },
  illustration: {
    height: 170,
    borderRadius: radius.lg,
    backgroundColor: "#FFF1E3",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sun: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFD89A",
    right: -25,
    top: -30,
  },
  illustrationHanzi: { color: colors.warning, fontSize: 64, fontWeight: "800" },
  illustrationLabel: { color: colors.warning, fontSize: 11, fontWeight: "800" },
  section: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  bullet: { color: colors.text, fontSize: 15, lineHeight: 24 },
  source: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md },
  example: { gap: spacing.sm },
  exampleHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chinese: { color: colors.text, fontSize: 22, fontWeight: "700", flex: 1 },
  exampleVi: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  writing: { alignItems: "center", gap: spacing.md },
  characters: { flexDirection: "row", gap: spacing.sm },
  character: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  characterActive: { backgroundColor: colors.primary },
  characterText: { color: colors.text, fontSize: 27, fontWeight: "700" },
  characterTextActive: { color: "#fff" },
  meta: { color: colors.textMuted, fontSize: 12 },
  exampleList: { gap: spacing.md },
  analysisCard: { gap: spacing.md, backgroundColor: colors.primarySoft },
  analysisHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  analysisCopy: { flex: 1 },
  analysisHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  analysisIcon: { color: colors.primary, fontSize: 34, fontWeight: "900" },
  analysisRow: { flexDirection: "row", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  analysisCharacter: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, justifyContent: "center", minHeight: 78, width: 72 },
  analysisHanzi: { color: colors.text, fontSize: 37, fontWeight: "900" },
  analysisRadical: { color: colors.primary, fontSize: 12, fontWeight: "900", marginTop: 2 },
  analysisBody: { flex: 1, gap: 2 },
  analysisLabel: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.5, marginTop: 3 },
  analysisText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  mnemonic: { color: colors.text, fontSize: 13, fontStyle: "italic", lineHeight: 19 },
  notes: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
});
