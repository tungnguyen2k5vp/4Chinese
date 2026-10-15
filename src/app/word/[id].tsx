import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { HskBadge, MasteryBadge } from "@/components/Badges";
import { BilingualMeaningList } from "@/components/BilingualMeaningList";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EmptyState } from "@/components/EmptyState";
import { LexicalKnowledgeCard } from '@/components/LexicalKnowledgeCard';
import { PersonalContextCard } from '@/components/PersonalContextCard';
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StrokeWriter } from "@/components/StrokeWriter";
import { designColors, radius, spacing, themedCard } from "@/constants/design";
import { getHsk30WordLevels } from "@/db/hsk30";
import { recordLessonActivityEvidence } from "@/db/learning-path";
import {
  copyVocabularyBatchToDeck,
  getNotes,
  getRelatedVocabulary,
  getVocabulary,
  listPersonalDecks,
  saveNotes,
  toggleFavorite,
} from "@/db/repository";
import { useModalAnimationType } from '@/hooks/use-reduced-motion';
import { primaryEnglishMeaning } from "@/services/vocabulary/bilingual-meanings";
import { analyzeVocabulary, buildMnemonicNote } from "@/services/vocabulary/character-analysis";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { PersonalDeck, Vocabulary } from "@/types/models";

type Tab = "overview" | "writing" | "examples" | "notes";
export default function WordDetail() {
  const { id, lessonActivityId, hskSourceId } = useLocalSearchParams<{ id: string; lessonActivityId?: string; hskSourceId?: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const colors = designColors(theme);
  const card = themedCard(theme);
  const styles = useThemeStyles(createStyles);
  const modalAnimation = useModalAnimationType();
  const [word, setWord] = useState<Vocabulary | null>();
  const [hsk30Levels, setHsk30Levels] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [character, setCharacter] = useState("");
  const [notes, setNotes] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [related, setRelated] = useState<Vocabulary[]>([]);
  const [decks, setDecks] = useState<PersonalDeck[]>([]);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [deckPickerLoading, setDeckPickerLoading] = useState(false);
  const [addingToDeckId, setAddingToDeckId] = useState<string | null>(null);
  const [deckPickerMessage, setDeckPickerMessage] = useState("");
  const setLearnQueue = useAppStore((state) => state.setLearnQueue);
  useEffect(() => {
    let live = true;
    // Clear the previous word before an asynchronous ID-scoped load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWord(undefined); setLoadFailed(false); setRelated([]); setSaveMessage("");
    if (!id) { setWord(null); return; }
    void Promise.all([getVocabulary(db, id), getNotes(db, id), getHsk30WordLevels(db, id, hskSourceId)]).then(
      ([value, note, levels]) => {
        if (!live) return;
        setWord(value);
        setHsk30Levels(levels);
        setCharacter(value?.simplified[0] ?? "");
        setNotes(note);
        if (value) {
          void getRelatedVocabulary(db, value).then(rows => { if (live) setRelated(rows); }).catch(() => { if (live) setRelated([]); });
          if (lessonActivityId) void recordLessonActivityEvidence(db, lessonActivityId, "VOCABULARY_DETAIL_VIEWED", value.id).catch(() => undefined);
        }
      },
    ).catch(() => { if (live) setLoadFailed(true); });
    return () => { live = false; };
  }, [db, id, lessonActivityId, hskSourceId, reload]);
  if (loadFailed) return <Screen><Text style={styles.loading}>Chưa tải được từ vựng. Dữ liệu của bạn vẫn được giữ nguyên.</Text><PrimaryButton label="Thử tải lại" onPress={() => setReload(value => value + 1)} /></Screen>;
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
    router.push(
      word.deckId
        ? ({ pathname: "/learn/session", params: { deckId: word.deckId } } as Href)
        : "/learn/session",
    );
  };
  const addToDeck = () => { void openDeckPicker(); };
  async function openDeckPicker() {
    setDeckPickerOpen(true);
    setDeckPickerLoading(true);
    setDeckPickerMessage("");
    try {
      setDecks(await listPersonalDecks(db));
    } catch {
      setDeckPickerMessage("Không tải được danh sách bộ từ. Hãy thử lại.");
    } finally {
      setDeckPickerLoading(false);
    }
  }
  const addSelectedWordToDeck = async (deck: PersonalDeck) => {
    if (addingToDeckId || word.deckId === deck.id) return;
    setAddingToDeckId(deck.id);
    setDeckPickerMessage("");
    try {
      const outcome = await copyVocabularyBatchToDeck(db, deck.id, [word]);
      setDeckPickerMessage(outcome.saved
        ? "\u0110\u00e3 th\u00eam " + word.simplified + " v\u00e0o \u201c" + deck.name + "\u201d."
        : "T\u1eeb n\u00e0y \u0111\u00e3 c\u00f3 trong \u201c" + deck.name + "\u201d.");
    } catch {
      setDeckPickerMessage("Ch\u01b0a th\u1ec3 th\u00eam t\u1eeb. H\u00e3y th\u1eed l\u1ea1i.");
    } finally {
      setAddingToDeckId(null);
    }
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
    <>
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.wordBlock}>
            <Text style={styles.hanzi}>{word.simplified}</Text>
            <PinyinText value={word.pinyin} style={styles.pinyin} />
            <Text style={styles.traditional}>Phồn thể: {word.traditional}</Text>
          </View>
          <View style={styles.heroActions}>
            {!word.deckId ? <Pressable accessibilityLabel="Thêm vào bộ từ" accessibilityRole="button" onPress={() => void addToDeck()} style={styles.round}><Ionicons name="add" size={25} color={theme.primaryText} /></Pressable> : null}
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
              <Ionicons name="pencil" size={21} color={theme.primaryText} />
            </Pressable>
            <Pressable onPress={() => void favorite()} style={styles.round}>
              <Ionicons
                name={word.isFavorite ? "bookmark" : "bookmark-outline"}
                size={24}
                color={word.isFavorite ? colors.accent : theme.primaryText}
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.heroMeanings}>
          <Text style={styles.meaning}>{word.primaryMeaningVi}</Text>
          <Text style={[styles.meaning, styles.meaningEn]}>{primaryEnglishMeaning(word.meaningsEn)}</Text>
        </View>
        <View style={styles.badges}>
          {hsk30Levels.length ? <Text style={styles.pos}>HSK 3.0 · 11/2025: {hsk30Levels.map(level => 'HSK ' + level).join(', ')} · Cấp trong bộ từ gốc:</Text> : null}
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
              Nghĩa và cách dùng có thể thay đổi theo ngữ cảnh; hãy xem ví dụ trước khi ghi nhớ.
            </Text>
          </View>
          <LexicalKnowledgeCard vocabularyId={word.id} />
          {word.examples[0] ? <Example item={word.examples[0]} /> : null}
          {related.length ? <View style={[card, styles.related]}>
            <Text style={styles.section}>Từ liên quan</Text>
            <Text style={styles.relatedHint}>Cùng Hán tự, ưu tiên cấp HSK phù hợp và từ bạn đang học.</Text>
            <View style={styles.relatedList}>{related.map((item) => <Pressable key={item.id} onPress={() => router.push(`/word/${item.id}` as Href)} style={styles.relatedItem}>
              <Text style={styles.relatedHanzi}>{item.simplified}</Text><View style={styles.relatedCopy}><PinyinText value={item.pinyin} /><Text numberOfLines={1} style={styles.relatedMeaning}>{item.primaryMeaningVi}</Text></View>
            </Pressable>)}</View>
          </View> : null}
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
          <PersonalContextCard key={word.id} vocabularyId={word.id} answers={[word.simplified,word.traditional]} reveal editable />
          {word.examples.length ? (
            word.examples.map((item) => <Example key={item.id} item={item} />)
          ) : (
            <EmptyState
              variant="vocabulary"
              title="Chưa có ví dụ"
              message="Chưa có câu song ngữ phù hợp đã kiểm tra cho từ này."
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
            disabled={savingNotes}
            onPress={() => {
              setSavingNotes(true); setSaveMessage("");
              void saveNotes(db, word.id, notes).then(() => setSaveMessage("Đã lưu ghi chú."))
                .catch(() => setSaveMessage("Chưa lưu được. Ghi chú đang nhập vẫn còn; hãy thử lại."))
                .finally(() => setSavingNotes(false));
            }}
          />
          {saveMessage ? <Text accessibilityLiveRegion="polite" style={{ color: theme.textMuted }}>{saveMessage}</Text> : null}
          </View>
        </>
      ) : null}
    </Screen>
      <Modal visible={deckPickerOpen} transparent animationType={modalAnimation} onRequestClose={() => setDeckPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.deckPicker}>
            <Text style={styles.deckPickerTitle}>{"Th\u00eam v\u00e0o b\u1ed9 t\u1eeb"}</Text>
            <Text style={styles.deckPickerHint}>{"Ch\u1ecdn b\u1ea5t k\u1ef3 b\u1ed9 t\u1eeb ri\u00eang n\u00e0o \u0111\u1ec3 sao ch\u00e9p t\u1eeb n\u00e0y."}</Text>
            {deckPickerLoading ? <View style={styles.deckPickerLoading}><ActivityIndicator color={colors.primary} /><Text style={styles.deckPickerStatus}>{"\u0110ang t\u1ea3i b\u1ed9 t\u1eeb..."}</Text></View> : null}
            {!deckPickerLoading && decks.length ? <ScrollView style={styles.deckList} contentContainerStyle={styles.deckListContent} showsVerticalScrollIndicator>
              {decks.map((deck) => {
                const isCurrentDeck = word.deckId === deck.id;
                const isAdding = addingToDeckId === deck.id;
                return <Pressable
                  key={deck.id}
                  accessibilityRole="button"
                  accessibilityLabel={deck.name + ", " + (isCurrentDeck ? "\u0111ang \u1edf b\u1ed9 n\u00e0y" : deck.wordCount + " t\u1eeb")}
                  disabled={isCurrentDeck || Boolean(addingToDeckId)}
                  onPress={() => void addSelectedWordToDeck(deck)}
                  style={[styles.deckRow, isCurrentDeck && styles.deckRowDisabled]}
                >
                  <View style={[styles.deckColor, { backgroundColor: deck.color }]} />
                  <View style={styles.deckCopy}>
                    <Text numberOfLines={1} style={styles.deckName}>{deck.name}</Text>
                    <Text style={styles.deckMeta}>{isCurrentDeck ? "\u0110ang \u1edf b\u1ed9 n\u00e0y" : deck.wordCount + " t\u1eeb"}</Text>
                  </View>
                  {isAdding ? <ActivityIndicator color={colors.primary} /> : <Ionicons name={isCurrentDeck ? "checkmark-circle" : "add-circle-outline"} size={24} color={isCurrentDeck ? colors.textMuted : colors.primary} />}
                </Pressable>;
              })}
            </ScrollView> : null}
            {!deckPickerLoading && !decks.length ? <View style={styles.deckPickerEmpty}>
              <Text style={styles.deckPickerStatus}>{"Ch\u01b0a c\u00f3 b\u1ed9 t\u1eeb ri\u00eang n\u00e0o."}</Text>
              <PrimaryButton label={"T\u1ea1o b\u1ed9 t\u1eeb"} onPress={() => { setDeckPickerOpen(false); router.push("/decks"); }} />
            </View> : null}
            {deckPickerMessage ? <Text accessibilityLiveRegion="polite" style={styles.deckPickerMessage}>{deckPickerMessage}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="\u0110\u00f3ng" onPress={() => setDeckPickerOpen(false)} style={styles.deckPickerClose}>
              <Text style={styles.deckPickerCloseText}>{"\u0110\u00f3ng"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
function Example({ item }: { item: Vocabulary["examples"][number] }) {
  const theme = useTheme();
  const card = themedCard(theme);
  const styles = useThemeStyles(createStyles);
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
function createStyles(theme: ReturnType<typeof useTheme>) { const colors = designColors(theme); return StyleSheet.create({
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
  tabTextActive: { color: colors.primaryText },
  wordImage: { height: 210, width: "100%", borderRadius: radius.lg },
  illustration: {
    height: 170,
    borderRadius: radius.lg,
    backgroundColor: theme.mode === "dark" ? theme.warningSoft : "#FFF1E3",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sun: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.mode === "dark" ? "#674C24" : "#FFD89A",
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
  related: { gap: spacing.sm },
  relatedHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: -spacing.sm },
  relatedList: { gap: spacing.xs },
  relatedItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  relatedHanzi: { minWidth: 48, color: colors.primaryText, fontSize: 25, fontWeight: "900" },
  relatedCopy: { flex: 1, gap: 2 },
  relatedMeaning: { color: colors.textMuted, fontSize: 12 },
  analysisCard: { gap: spacing.md, backgroundColor: colors.primarySoft },
  analysisHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  analysisCopy: { flex: 1 },
  analysisHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  analysisIcon: { color: colors.primaryText, fontSize: 34, fontWeight: "900" },
  analysisRow: { flexDirection: "row", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  analysisCharacter: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, justifyContent: "center", minHeight: 78, width: 72 },
  analysisHanzi: { color: colors.text, fontSize: 37, fontWeight: "900" },
  analysisRadical: { color: colors.primaryText, fontSize: 12, fontWeight: "900", marginTop: 2 },
  analysisBody: { flex: 1, gap: 2 },
  analysisLabel: { color: colors.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 0.5, marginTop: 3 },
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
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.overlay, padding: spacing.lg },
  deckPicker: { width: "100%", maxWidth: 460, maxHeight: "82%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  deckPickerTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  deckPickerHint: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  deckPickerLoading: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  deckList: { maxHeight: 360, marginTop: spacing.xs },
  deckListContent: { gap: spacing.xs, paddingVertical: spacing.xs },
  deckRow: { alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  deckRowDisabled: { backgroundColor: colors.background, opacity: 0.72 },
  deckColor: { width: 12, height: 36, borderRadius: 6 },
  deckCopy: { flex: 1, gap: 2 },
  deckName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  deckMeta: { color: colors.textMuted, fontSize: 12 },
  deckPickerEmpty: { gap: spacing.md, paddingVertical: spacing.md },
  deckPickerStatus: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  deckPickerMessage: { color: colors.primaryText, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: spacing.xs },
  deckPickerClose: { alignItems: "center", minHeight: 44, justifyContent: "center", marginTop: spacing.xs },
  deckPickerCloseText: { color: colors.primaryText, fontSize: 16, fontWeight: "800" },
}); }
