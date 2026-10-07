import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { VocabularyCard } from "@/components/VocabularyCard";
import { designColors, radius, spacing, themedCard } from "@/constants/design";
import { deletePersonalDeck, getDeckVocabulary, getDueVocabulary, getSettings, listPersonalDecks, removeVocabularyFromDeck, renamePersonalDeck } from "@/db/repository";
import { createSharedDeckPayload } from "@/services/decks/share-code";
import { publishShortDeck, ShortDeckShareError } from "@/services/decks/short-share";
import { normalizePinyinInput } from "@/services/pinyin/pinyin";
import { searchHanziCandidates, type PinyinHanziCandidate } from "@/services/pinyin-ime/candidateSearch";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { Vocabulary } from "@/types/models";

const levelColors = [
  "#F6A134",
  "#F7D34A",
  "#9FD66D",
  "#35BE79",
  "#3BC0D9",
  "#3475EB",
] as const;

export default function DeckDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const colors = designColors(theme);
  const card = themedCard(theme);
  const styles = useThemeStyles(createStyles);
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [dueWords, setDueWords] = useState<Vocabulary[]>([]);
  const [name, setName] = useState("Bộ từ riêng");
  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [learningLoading, setLearningLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pinyinSearchInput, setPinyinSearchInput] = useState("");
  const [hanziCandidates, setHanziCandidates] = useState<PinyinHanziCandidate[]>([]);
  const [selectedSearchHanzi, setSelectedSearchHanzi] = useState("");
  const [appliedSearch, setAppliedSearch] = useState<{ pinyin: string; hanzi: string } | null>(null);
  const setReviewQueue = useAppStore((s) => s.setReviewQueue);
  const load = useCallback(() => {
    if (!id) return;
    Promise.all([
      getDeckVocabulary(db, id),
      listPersonalDecks(db),
      getDueVocabulary(db, 100, undefined, id),
    ]).then(([items, decks, due]) => {
        setWords(items);
        setDueWords(due);
        const deckName = decks.find((d) => d.id === id)?.name ?? "Bộ từ riêng";
        setName(deckName);
        setNameDraft(deckName);
      });
  }, [db, id]);
  useFocusEffect(load);
  useEffect(() => {
    const query = pinyinSearchInput.trim();
    if (!query) {
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchHanziCandidates(db, query, { limit: 8 })
        .then((candidates) => {
          if (!cancelled) setHanziCandidates(candidates);
        })
        .catch(() => {
          if (!cancelled) setHanziCandidates([]);
        });
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [db, pinyinSearchInput]);
  const unlearnedCount = words.filter(
    (word) => (word.status ?? "NEW") === "NEW",
  ).length;
  const learnedCount = words.filter(
    (word) => word.status === "LEARNING" && word.studied,
  ).length;
  const knownCount = words.filter((word) => word.status === "KNOWN").length;
  const skippedCount = words.filter((word) => word.status === "SKIPPED").length;
  const levelCounts = [1, 2, 3, 4, 5, 6].map(
    (level) =>
      words.filter(
        (word) =>
          word.status === "LEARNING" &&
          word.studied &&
          (word.masteryLevel ?? 0) === level,
      ).length,
  );
  const levelWords = selectedLevel
    ? words.filter((word) => word.status === "LEARNING" && word.studied && (word.masteryLevel ?? 0) === selectedLevel)
    : words;
  const visibleWords = !appliedSearch
    ? levelWords
    : levelWords.filter((word) => {
      if (appliedSearch.hanzi) {
        return word.simplified.includes(appliedSearch.hanzi) || word.traditional.includes(appliedSearch.hanzi);
      }
      const query = normalizePinyinInput(appliedSearch.pinyin);
      return Boolean(query) && normalizePinyinInput(word.pinyinNumeric || word.pinyin).includes(query);
    });
  const applyWordSearch = () => {
    const pinyin = pinyinSearchInput.trim();
    if (!pinyin && !selectedSearchHanzi) return;
    setAppliedSearch({ pinyin, hanzi: selectedSearchHanzi });
  };
  const clearWordSearch = () => {
    setPinyinSearchInput("");
    setSelectedSearchHanzi("");
    setHanziCandidates([]);
    setAppliedSearch(null);
  };
  const startReview = async () => {
    if (!dueWords.length || reviewLoading) return;
    setReviewLoading(true);
    try {
      const settings = await getSettings(db);
      setReviewQueue(dueWords.slice(0, settings.reviewSessionSize));
      router.push("/review/session");
    } finally {
      setReviewLoading(false);
    }
  };
  const startLearning = async () => {
    if (!id || !unlearnedCount || learningLoading) return;
    setLearningLoading(true);
    try {
      router.push({ pathname: "/learn/setup", params: { deckId: id } } as Href);
    } finally {
      setLearningLoading(false);
    }
  };
  const saveName = async () => {
    const nextName = nameDraft.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!id || !nextName || renaming) return;
    setRenaming(true);
    try {
      await renamePersonalDeck(db, id, nextName);
      setName(nextName);
      setNameDraft(nextName);
      setEditingName(false);
    } catch {
      Alert.alert("Chưa thể đổi tên", "Tên bộ từ không hợp lệ hoặc bộ từ không còn tồn tại.");
    } finally {
      setRenaming(false);
    }
  };
  const archive = async () => {
    if (!id || deleting) return;
    setDeleting(true);
    try {
      await deletePersonalDeck(db, id);
      router.replace("/decks");
    } catch {
      Alert.alert("Chưa thể xóa bộ từ", "Vui lòng thử lại sau.");
    } finally {
      setDeleting(false);
    }
  };
  const confirmArchive = () => {
    if (!id || deleting) return;
    Alert.alert(
      "Đưa bộ từ vào thùng rác?",
      "Các từ, nghĩa đã chỉnh sửa và lịch ôn sẽ được giữ nguyên để bạn có thể khôi phục.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đưa vào thùng rác",
          style: "destructive",
          onPress: () => void archive(),
        },
      ],
    );
  };
  const shareDeck = async () => {
    if (!id || !words.length) {
      Alert.alert("Chưa có từ để chia sẻ", "Hãy thêm ít nhất một từ vào bộ trước.");
      return;
    }
    if (sharing) return;
    setSharing(true);
    try {
      const code = await publishShortDeck(createSharedDeckPayload({ name }, words));
      await Share.share({
        title: `Bộ từ ${name}`,
        message: `Mời bạn nhập mã bộ từ này trong 4Chinese:\n${code}`,
      });
    } catch (error) {
      const message = error instanceof ShortDeckShareError
        ? error.message
        : "Không thể tạo mã bộ từ. Hãy kiểm tra kết nối mạng rồi thử lại.";
      Alert.alert("Chưa thể tạo mã 8 ký tự", message);
    } finally {
      setSharing(false);
    }
  };
  const confirmRemoveWord = (word: Vocabulary) => {
    if (!id) return;
    Alert.alert(
      "Xóa từ này?",
      `Bạn có chắc chắn muốn xóa “${word.simplified}” khỏi bộ từ không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "OK",
          style: "destructive",
          onPress: () => {
            void removeVocabularyFromDeck(db, id, word.id).then((removed) => {
              if (!removed) return;
              setWords((current) => current.filter((item) => item.id !== word.id));
              setDueWords((current) => current.filter((item) => item.id !== word.id));
            });
          },
        },
      ],
    );
  };
  return (
    <Screen
      title={name}
      subtitle={`${words.length} từ do bạn tự chọn`}
      right={(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đổi tên bộ từ"
          onPress={() => setEditingName(true)}
          style={styles.renameTrigger}
        >
          <Text style={styles.renameTriggerIcon}>✎</Text>
          <Text style={styles.badge}>ĐỔI TÊN</Text>
        </Pressable>
      )}
    >
      {editingName ? (
        <View style={[card, styles.renameCard]}>
          <Text style={styles.renameLabel}>TÊN BỘ TỪ</Text>
          <TextInput
            autoFocus
            maxLength={60}
            value={nameDraft}
            onChangeText={setNameDraft}
            onSubmitEditing={() => void saveName()}
            placeholder="Nhập tên bộ từ"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.renameInput}
          />
          <View style={styles.renameActions}>
            <PrimaryButton
              variant="secondary"
              label="Hủy"
              onPress={() => { setNameDraft(name); setEditingName(false); }}
              style={styles.renameButton}
            />
            <PrimaryButton
              label="Lưu tên"
              disabled={!nameDraft.trim() || nameDraft.trim() === name}
              loading={renaming}
              onPress={() => void saveName()}
              style={styles.renameButton}
            />
          </View>
        </View>
      ) : null}
      <PrimaryButton
        icon="＋"
        label="Thêm từ"
        style={styles.addWordButton}
        onPress={() =>
          router.push({
            pathname: "/decks/bulk-add",
            params: { deckId: id },
          } as unknown as Href)
        }
      />
      <View style={styles.actionGrid}>
        <PrimaryButton
          variant="secondary"
          icon="↗"
          label="Chia sẻ"
          loading={sharing}
          style={styles.compactAction}
          onPress={() => void shareDeck()}
        />
        <PrimaryButton
          variant="secondary"
          icon="🎧"
          label="Luyện nghe"
          disabled={words.length < 2}
          style={styles.compactAction}
          onPress={() => router.push({ pathname: "/decks/listening", params: { deckId: id } } as Href)}
        />
        <PrimaryButton
          variant="secondary"
          icon="✎"
          label="Quiz"
          disabled={words.length < 2}
          style={styles.compactAction}
          onPress={() => router.push({ pathname: "/decks/quiz", params: { deckId: id } } as Href)}
        />
        <PrimaryButton
          variant="secondary"
          icon="🎙"
          label="Phát âm AI"
          disabled={!words.length}
          style={styles.compactAction}
          onPress={() => router.push({ pathname: "/decks/pronunciation", params: { deckId: id } } as Href)}
        />
      </View>
      <View style={[card, styles.searchCard]}>
        <Text style={styles.searchTitle}>TÌM TRONG BỘ</Text>
        <Text style={styles.searchHint}>Tìm theo pinyin hoặc Hán tự.</Text>
        <View style={styles.searchInputRow}>
          <TextInput
            accessibilityLabel="Nhập pinyin để tìm trong bộ từ"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              setPinyinSearchInput(value);
              setSelectedSearchHanzi("");
              setAppliedSearch(null);
            }}
            onSubmitEditing={applyWordSearch}
            placeholder="Ví dụ: xue, xué, xue2"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={styles.searchInput}
            value={pinyinSearchInput}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!pinyinSearchInput.trim() && !selectedSearchHanzi}
            onPress={applyWordSearch}
            style={({ pressed }) => [styles.searchButton, (!pinyinSearchInput.trim() && !selectedSearchHanzi) && styles.searchButtonDisabled, pressed && styles.searchButtonPressed]}
          >
            <Text style={styles.searchButtonText}>Tìm</Text>
          </Pressable>
        </View>
        {pinyinSearchInput.trim() && hanziCandidates.length ? (
          <View style={styles.candidateArea}>
            <Text style={styles.candidateLabel}>GỢI Ý</Text>
            <View style={styles.candidateList}>
              {hanziCandidates.map((candidate) => {
                const hanzi = candidate.word.simplified;
                const selected = selectedSearchHanzi === hanzi;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={candidate.word.id}
                    onPress={() => setSelectedSearchHanzi(hanzi)}
                    style={[styles.candidateChip, selected && styles.candidateChipSelected]}
                  >
                    <Text style={[styles.candidateHanzi, selected && styles.candidateHanziSelected]}>{hanzi}</Text>
                    <Text style={[styles.candidatePinyin, selected && styles.candidatePinyinSelected]}>{candidate.word.pinyin}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        {appliedSearch ? (
          <View style={styles.searchResultRow}>
            <Text style={styles.searchResultText}>
                {appliedSearch.hanzi
                 ? `${appliedSearch.hanzi} · ${visibleWords.length} kết quả`
                 : `${appliedSearch.pinyin} · ${visibleWords.length} kết quả`}
            </Text>
            <Pressable accessibilityRole="button" onPress={clearWordSearch}>
              <Text style={styles.clearSearch}>Xóa</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={[card, styles.progressCard]}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressEyebrow}>TIẾN ĐỘ</Text>
            <Text style={styles.progressTitle}>
              Đã học {learnedCount}/{words.length}
            </Text>
          </View>
          <Text style={styles.progressPercent}>
            {words.length ? Math.round((learnedCount / words.length) * 100) : 0}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${words.length ? (learnedCount / words.length) * 100 : 0}%` },
            ]}
          />
        </View>
        <Text style={styles.progressMeta}>
          {knownCount} đã biết · {skippedCount} bỏ qua · {dueWords.length} đến hạn
        </Text>
        <Text style={styles.chartTitle}>Mức nhớ</Text>
        <View style={styles.levelChart}>
          {levelCounts.map((count, index) => (
            <Pressable key={index + 1} onPress={() => setSelectedLevel((level) => level === index + 1 ? null : index + 1)} style={[styles.levelColumn, selectedLevel === index + 1 && styles.levelColumnActive]}>
              <View style={styles.levelBarTrack}>
                <View
                  style={[
                    styles.levelBar,
                    {
                      backgroundColor: levelColors[index],
                      height: `${Math.max(
                        count ? 12 : 0,
                        words.length ? (count / words.length) * 100 : 0,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.levelLabel}>{index + 1 === 6 ? "Sâu" : index + 1}</Text>
              <Text style={styles.levelCount}>{count}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.chartHint}>{selectedLevel ? `Đang lọc: ${selectedLevel === 6 ? "Nhớ sâu" : `Cấp ${selectedLevel}`}` : "Chạm mức để lọc"}</Text>
      </View>
      <View style={[card, styles.learnCard]}>
        <Text style={styles.learnEyebrow}>HỌC NGAY</Text>
        <Text style={styles.learnTitle}>
          {unlearnedCount
            ? `${unlearnedCount} từ mới sẵn sàng`
            : "Đã học hết từ mới trong bộ"}
        </Text>
        <Text style={styles.learnHint}>Chọn tối đa 10 từ mới cho lượt này.</Text>
        <PrimaryButton
          label={unlearnedCount ? `Chọn từ để học (0/${Math.min(10, unlearnedCount)})` : "Chưa có từ mới"}
          disabled={!unlearnedCount}
          loading={learningLoading}
          onPress={() => void startLearning()}
        />
      </View>
      <View style={[card, styles.reviewCard]}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewCopy}>
            <Text style={styles.reviewTitle}>Ôn tập</Text>
            <Text style={styles.reviewSubtitle}>
              {dueWords.length
                ? `${dueWords.length} từ đến hạn`
                : "Chưa có từ đến hạn"}
            </Text>
          </View>
          <Text style={styles.reviewIcon}>复</Text>
        </View>
        {dueWords.length ? (
          <>
            <View style={styles.reviewLevels}>
              {[1, 2, 3, 4, 5, 6].map((level) => {
                const count = dueWords.filter(
                  (word) => (word.masteryLevel ?? 0) === level,
                ).length;
                if (!count) return null;
                return (
                  <View key={level} style={styles.reviewLevel}>
                    <Text style={styles.reviewLevelLabel}>
                      {level === 6 ? "Nhớ sâu" : `Cấp ${level}`}
                    </Text>
                    <Text style={styles.reviewLevelCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.reviewHint}>Ôn theo lịch SRS của từng từ.</Text>
            <PrimaryButton
              label={`Ôn tập ngay (${dueWords.length})`}
              loading={reviewLoading}
              onPress={() => void startReview()}
            />
          </>
        ) : (
          <Text style={styles.reviewEmptyText}>
            Chưa có từ đến hạn.
          </Text>
        )}
      </View>
      <PrimaryButton
        variant="danger"
        icon="🗑"
        label="Đưa bộ từ vào thùng rác"
        loading={deleting}
        onPress={confirmArchive}
      />
      {visibleWords.length ? (
        <View style={styles.list}>
          {visibleWords.map((word) => (
            <VocabularyCard
              key={word.id}
              word={word}
              onPress={() => router.push(`/word/${word.id}`)}
              onLongPress={() => confirmRemoveWord(word)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="词"
          variant="vocabulary"
          scene="deck"
          title="Bộ từ đang trống"
          message="Thêm Hanzi bằng cách viết tay hoặc nhập bàn phím; app sẽ gợi ý Pinyin và nghĩa sẵn có."
        />
      )}
    </Screen>
  );
}
function createStyles(theme: ReturnType<typeof useTheme>) { const colors = designColors(theme); return StyleSheet.create({
  renameTrigger: { flexDirection: "row", alignItems: "center", gap: 4 },
  renameTriggerIcon: { color: colors.primaryText, fontSize: 17, fontWeight: "900" },
  renameCard: { gap: spacing.sm },
  renameLabel: { color: colors.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  renameInput: { minHeight: 50, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.background, fontSize: 17, fontWeight: "700" },
  renameActions: { flexDirection: "row", gap: spacing.sm },
  renameButton: { flex: 1 },
  addWordButton: { minHeight: 52 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  compactAction: { width: "48%", minHeight: 44, paddingHorizontal: spacing.sm },
  searchCard: { gap: spacing.sm },
  searchTitle: { color: colors.primaryText, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  searchHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  searchInputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchInput: { flex: 1, minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, color: colors.text, fontSize: 16, paddingHorizontal: spacing.md },
  searchButton: { minWidth: 72, minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primary },
  searchButtonDisabled: { opacity: 0.42 },
  searchButtonPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  searchButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  candidateArea: { gap: spacing.xs },
  candidateLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  candidateList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  candidateChip: { minWidth: 64, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  candidateChipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  candidateHanzi: { color: colors.text, fontSize: 22, fontWeight: "900" },
  candidateHanziSelected: { color: colors.primaryText },
  candidatePinyin: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  candidatePinyinSelected: { color: colors.primaryText },
  searchResultRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  searchResultText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  clearSearch: { color: colors.primaryText, fontSize: 12, fontWeight: "900" },
  progressCard: { gap: spacing.sm },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressEyebrow: { color: colors.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  progressTitle: { color: colors.text, fontSize: 21, fontWeight: "900", marginTop: 3 },
  progressPercent: { color: colors.primaryText, fontSize: 25, fontWeight: "900" },
  progressTrack: { height: 8, borderRadius: 99, overflow: "hidden", backgroundColor: colors.border },
  progressFill: { height: "100%", borderRadius: 99, backgroundColor: colors.primary },
  progressMeta: { color: colors.textMuted, fontSize: 12 },
  chartTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: spacing.xs },
  levelChart: { height: 76, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", gap: spacing.sm, paddingTop: spacing.xs },
  levelColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 2 },
  levelColumnActive: { backgroundColor: colors.primarySoft, borderRadius: radius.sm },
  levelBarTrack: { width: "100%", height: 48, justifyContent: "flex-end", backgroundColor: `${colors.primarySoft}66`, borderRadius: 7, overflow: "hidden" },
  levelBar: { width: "100%", backgroundColor: colors.primary, borderRadius: 7, minHeight: 0 },
  levelLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  levelCount: { color: colors.text, fontSize: 10, fontWeight: "800" },
  chartHint: { color: colors.textMuted, fontSize: 11, textAlign: "center" },
  learnCard: { gap: spacing.sm },
  learnEyebrow: { color: colors.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  learnTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
  learnHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  countChoices: { flexDirection: "row", gap: spacing.sm },
  countChoice: { minWidth: 72, paddingVertical: 10, borderRadius: radius.md, overflow: "hidden", textAlign: "center", color: colors.textMuted, fontWeight: "800", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  countChoiceActive: { color: "#fff", backgroundColor: colors.primary, borderColor: colors.primary },
  reviewCard: { gap: spacing.md, backgroundColor: colors.primarySoft },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  reviewCopy: { flex: 1, gap: 3 },
  reviewTitle: { fontSize: 18, fontWeight: "900", color: colors.text },
  reviewSubtitle: { fontSize: 13, color: colors.textMuted },
  reviewIcon: { fontSize: 42, color: colors.primaryText, fontWeight: "900" },
  reviewLevels: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  reviewLevel: {
    minWidth: 74,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: 2,
  },
  reviewLevelLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "800" },
  reviewLevelCount: { fontSize: 19, color: colors.primaryText, fontWeight: "900" },
  reviewHint: { fontSize: 12, lineHeight: 18, color: colors.textMuted },
  reviewEmptyText: { fontSize: 13, lineHeight: 20, color: colors.textMuted },
  badge: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.primaryText,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
  },
  list: { gap: spacing.md },
}); }
