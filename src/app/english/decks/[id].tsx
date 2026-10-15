import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { EnglishPersonalWordCard, ENGLISH_LEVEL_COLORS } from "@/components/english/EnglishPersonalVocabulary";
import { englishCardPage } from "@/db/english/card-editor";
import { renameEnglishDeck, setEnglishCardSuspended, setEnglishDeckTrashed } from "@/db/english/decks";
import {
  englishDeckShareSnapshot,
  startEnglishCard,
  type EnglishCard,
} from "@/db/english/learner";
import { englishDeckMemorySummary, englishMemoryLevel, type EnglishDeckMemorySummary } from "@/db/english/personal-vocabulary";
import { createEnglishSharedDeckPayload, EnglishDeckShareError, publishEnglishDeck } from "@/services/english/deck-share";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { useLanguageProtection } from "@/services/languages/use-language-protection";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

const PAGE_SIZE = 30;
type CardFilter = "all" | "NEW" | "LEARNING" | "SUSPENDED";

export default function EnglishDeckDetail() {
  const { id = "" } = useLocalSearchParams<{ id?: string }>();
  const db = useEnglishDatabase();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [summary, setSummary] = useState<EnglishDeckMemorySummary | null>(null);
  const [cards, setCards] = useState<EnglishCard[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [queryDraft, setQueryDraft] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CardFilter>("all");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [busyCard, setBusyCard] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);

  useLanguageProtection("DRAFT", editingName || saving || sharing || !!busyCard);

  const load = useCallback(async (forceRetry = false) => {
    if (!id) {
      setError("Không tìm thấy mã bộ từ.");
      setLoading(false);
      return;
    }
    if (forceRetry) setError("");
    setLoading(true);
    try {
      const [deckSummary, page] = await Promise.all([
        englishDeckMemorySummary(db, id),
        englishCardPage(db, id, null, PAGE_SIZE, query, filter),
      ]);
      setSummary(deckSummary);
      setNameDraft(deckSummary.name);
      setCards(page.cards);
      setNextCursor(page.next);
      setError("");
    } catch {
      setSummary(null);
      setError("Chưa tải được chi tiết bộ từ. Dữ liệu của bạn vẫn được giữ nguyên.");
    } finally {
      setLoading(false);
    }
  }, [db, filter, id, query]);

  useFocusEffect(useCallback(() => { void load(retry > 0); }, [load, retry]));

  const due = summary?.due ?? 0;
  const studied = summary?.studied ?? 0;
  const totalActive = Math.max(0, (summary?.total ?? 0) - (summary?.suspended ?? 0));
  const progress = totalActive ? Math.round((studied / totalActive) * 100) : 0;
  const visibleCards = selectedLevel
    ? cards.filter((card) => !card.suspended && englishMemoryLevel(card) === selectedLevel)
    : cards;

  const saveName = async () => {
    const clean = nameDraft.trim().replace(/\s+/gu, " ").slice(0, 60);
    if (!id || !clean || saving || lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      await renameEnglishDeck(db, id, clean);
      setEditingName(false);
      await load();
    } catch {
      setError("Chưa đổi được tên bộ từ. Hãy kiểm tra tên rồi thử lại.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  const share = async () => {
    if (!id || !summary || sharing) return;
    setSharing(true);
    try {
      const snapshot = await englishDeckShareSnapshot(db, id);
      const payload = createEnglishSharedDeckPayload(snapshot.name, snapshot.words.map((word) => ({
        headword: word.headword,
        meaningVi: word.meaning_vi,
        pos: word.pos,
        ipa: word.ipa,
      })));
      const code = await publishEnglishDeck(payload);
      await Share.share({ title: `Bộ từ tiếng Anh ${snapshot.name}`, message: `Mã thêm bộ từ “${snapshot.name}” trong 4Chinese: ${code}` });
    } catch (failure) {
      const message = failure instanceof EnglishDeckShareError
        ? failure.message
        : failure instanceof Error && failure.message === "ENGLISH_SHARE_EMPTY"
          ? "Hãy thêm ít nhất một từ vào bộ trước khi chia sẻ."
          : failure instanceof Error && failure.message === "ENGLISH_SHARE_LIMIT"
            ? "Mỗi mã chia sẻ hỗ trợ tối đa 500 từ. Hãy chia bộ thành các phần nhỏ hơn."
            : "Không tạo được mã chia sẻ. Hãy kiểm tra mạng rồi thử lại.";
      Alert.alert("Chưa thể chia sẻ", message);
    } finally {
      setSharing(false);
    }
  };

  const archive = () => {
    if (!id || !summary) return;
    Alert.alert("Đưa bộ từ vào thùng rác?", "Các thẻ, ghi chú và lịch ôn được giữ nguyên để bạn có thể khôi phục.", [
      { text: "Hủy", style: "cancel" },
      { text: "Đưa vào thùng rác", style: "destructive", onPress: () => {
        setSaving(true);
        void setEnglishDeckTrashed(db, id, true)
          .then(() => router.replace("/english/decks" as Href))
          .catch(() => setError("Chưa thể chuyển bộ từ vào thùng rác. Hãy thử lại."))
          .finally(() => setSaving(false));
      } },
    ]);
  };

  const cardAction = async (card: EnglishCard, action: "learn" | "skip" | "restore") => {
    if (busyCard) return;
    setBusyCard(card.id);
    try {
      if (action === "learn") await startEnglishCard(db, card.id);
      else await setEnglishCardSuspended(db, card.id, action === "skip");
      await load();
    } catch {
      setError("Chưa lưu được trạng thái từ này. Hãy thử lại.");
    } finally {
      setBusyCard(null);
    }
  };

  const loadMore = async () => {
    if (!id || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await englishCardPage(db, id, nextCursor, PAGE_SIZE, query, filter);
      setCards((current) => [...current, ...page.cards]);
      setNextCursor(page.next);
    } catch {
      setError("Chưa tải thêm được các từ. Những từ đã tải vẫn giữ nguyên.");
    } finally {
      setLoadingMore(false);
    }
  };

  const applySearch = () => {
    setSelectedLevel(null);
    setQuery(queryDraft.trim().slice(0, 200));
  };

  return (
    <Screen hideTitle title="Chi tiết bộ từ" subtitle={summary ? `${summary.total} từ trong bộ · lịch học riêng của bạn` : "Xem tiến độ, thêm từ và bắt đầu học."} avoidKeyboard>
      {loading && !summary ? <View style={s.loading}><ActivityIndicator color={p.primary} /><Text style={{ color: p.textSecondary }}>Đang tải bộ từ…</Text></View> : null}
      {error ? (
        <View style={[s.alert, { backgroundColor: p.errorLight }]}>
          <Text accessibilityRole="alert" style={{ color: p.error }}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)} style={s.touch}><Text style={{ color: p.primary, fontWeight: "900" }}>Thử lại</Text></Pressable>
        </View>
      ) : null}
      {summary ? (
        <>
          <View style={s.heroRow}>
            <View style={s.heroCopy}>
              <Text style={[s.deckName, { color: p.textPrimary }]}>{summary.name}</Text>
              <Text style={[s.deckCount, { color: p.textSecondary }]}>{summary.total} từ do bạn tự chọn</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Đổi tên bộ từ" onPress={() => { setNameDraft(summary.name); setEditingName(true); }} style={[s.renameButton, { backgroundColor: p.primaryLight }]}>
              <Ionicons name="pencil-outline" size={16} color={p.primary} />
              <Text style={{ color: p.primary, fontWeight: "900" }}>ĐỔI TÊN</Text>
            </Pressable>
          </View>

          {editingName ? (
            <View style={[s.panel, { backgroundColor: p.surface, borderColor: p.border }]}>
              <Text style={[s.eyebrow, { color: p.primary }]}>TÊN BỘ TỪ</Text>
              <TextInput accessibilityLabel="Tên mới của bộ từ" autoFocus maxLength={60} value={nameDraft} onChangeText={setNameDraft} onSubmitEditing={() => void saveName()} returnKeyType="done" style={[s.input, { color: p.textPrimary, borderColor: p.border, backgroundColor: p.surfaceSubtle }]} />
              <View style={s.actionRow}>
                <PrimaryButton variant="secondary" label="Hủy" onPress={() => { setNameDraft(summary.name); setEditingName(false); }} style={s.flexButton} />
                <PrimaryButton label="Lưu tên" loading={saving} disabled={!nameDraft.trim() || nameDraft.trim() === summary.name} onPress={() => void saveName()} style={s.flexButton} />
              </View>
            </View>
          ) : null}

          <PrimaryButton icon="＋" label="Thêm từ" onPress={() => router.push({ pathname: "/english/bulk", params: { deck: id } } as Href)} />

          <View style={s.actionGrid}>
            <PrimaryButton variant="secondary" icon="↗" label="Chia sẻ" loading={sharing} onPress={() => void share()} style={s.gridButton} />
            <PrimaryButton variant="secondary" icon="♫" label="Luyện nghe" disabled={!due} onPress={() => router.push({ pathname: "/english/review", params: { deckId: id, mode: "LISTENING" } } as Href)} style={s.gridButton} />
            <PrimaryButton variant="secondary" icon="✎" label="Quiz chính tả" disabled={!due} onPress={() => router.push({ pathname: "/english/review", params: { deckId: id, mode: "SPELLING" } } as Href)} style={s.gridButton} />
            <PrimaryButton variant="secondary" icon="↻" label="Ôn flashcard SRS" disabled={!due} onPress={() => router.push({ pathname: "/english/review", params: { deckId: id, mode: "MEANING" } } as Href)} style={s.gridButton} />
          </View>
          <Text style={{ color: p.textMuted, fontSize: 12, lineHeight: 18 }}>Các chế độ ôn dùng từ đã đến hạn. Từ mới được chọn riêng ở mục “Học ngay” bên dưới.</Text>

          <View style={[s.panel, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Text style={[s.eyebrow, { color: p.primary }]}>TÌM TRONG BỘ</Text>
            <Text style={{ color: p.textSecondary }}>Tìm theo từ tiếng Anh hoặc nghĩa tiếng Việt.</Text>
            <View style={s.searchRow}>
              <TextInput accessibilityLabel="Tìm từ trong bộ tiếng Anh" value={queryDraft} onChangeText={setQueryDraft} onSubmitEditing={applySearch} placeholder="Ví dụ: achieve, đạt được" placeholderTextColor={p.textMuted} returnKeyType="search" style={[s.input, s.searchInput, { color: p.textPrimary, borderColor: p.border, backgroundColor: p.surfaceSubtle }]} />
              <Pressable accessibilityRole="button" disabled={!queryDraft.trim()} onPress={applySearch} style={[s.searchButton, { backgroundColor: queryDraft.trim() ? p.primary : p.surfaceSubtle }]}><Text style={{ color: queryDraft.trim() ? "#fff" : p.textMuted, fontWeight: "900" }}>Tìm</Text></Pressable>
            </View>
            {query ? <Pressable accessibilityRole="button" onPress={() => { setQuery(""); setQueryDraft(""); }} style={s.clearSearch}><Text style={{ color: p.primary, fontWeight: "800" }}>Bỏ lọc “{query}”</Text></Pressable> : null}
          </View>

          <View style={[s.panel, { backgroundColor: p.surface, borderColor: p.border }]}>
            <View style={s.progressHeader}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[s.eyebrow, { color: p.primary }]}>TIẾN ĐỘ</Text>
                <Text style={[s.progressTitle, { color: p.textPrimary }]}>Đã học {studied}/{totalActive}</Text>
              </View>
              <Text style={[s.percent, { color: p.primary }]}>{progress}%</Text>
            </View>
            <View style={[s.progressTrack, { backgroundColor: p.surfaceSubtle }]}><View style={[s.progressFill, { backgroundColor: p.primary, width: `${progress}%` }]} /></View>
            <Text style={{ color: p.textSecondary }}>{summary.knownCount} đã biết · {summary.suspended} bỏ qua · {due} đến hạn · {summary.newCount} chưa học</Text>
            <Text style={[s.chartTitle, { color: p.textPrimary }]}>Mức nhớ</Text>
            <View style={s.levelRow}>
              {summary.levels.map((count, index) => (
                <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected: selectedLevel === index + 1 }} accessibilityLabel={`Lọc cấp ${index === 5 ? "nhớ sâu" : index + 1}: ${count} từ`} onPress={() => setSelectedLevel((value) => value === index + 1 ? null : index + 1)} style={[s.levelColumn, selectedLevel === index + 1 && { backgroundColor: p.primaryLight }]}>
                  <View style={[s.levelTrack, { backgroundColor: p.surfaceSubtle }]}><View style={[s.levelBar, { height: `${count ? Math.max(12, count / Math.max(1, ...summary.levels) * 100) : 0}%`, backgroundColor: ENGLISH_LEVEL_COLORS[index] }]} /></View>
                  <Text style={{ color: p.textSecondary, fontWeight: "800", fontSize: 12 }}>{index === 5 ? "Sâu" : index + 1}</Text>
                  <Text style={{ color: p.textPrimary, fontWeight: "800", fontSize: 12 }}>{count}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: p.textMuted, textAlign: "center", fontSize: 12 }}>{selectedLevel ? `Đang lọc các từ cấp ${selectedLevel}` : "Chạm vào mức nhớ để lọc danh sách từ đã tải"}</Text>
          </View>

          <View style={[s.learnPanel, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Text style={[s.eyebrow, { color: p.primary }]}>HỌC NGAY</Text>
            <Text style={[s.sectionTitle, { color: p.textPrimary }]}>{summary.newCount} từ mới sẵn sàng</Text>
            <Text style={{ color: p.textSecondary, lineHeight: 21 }}>Chọn tối đa 10 từ cho lượt này. Mỗi lựa chọn được lưu ngay để bạn có thể tiếp tục sau.</Text>
            <PrimaryButton label={summary.newCount ? `Chọn từ để học (0/${Math.min(10, summary.newCount)})` : "Chưa có từ mới"} disabled={!summary.newCount} onPress={() => router.push({ pathname: "/english/decks/[id]/learn", params: { id } } as Href)} />
          </View>

          <View style={[s.reviewPanel, { backgroundColor: p.primaryLight }]}>
            <View style={s.reviewHeading}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Ôn tập</Text>
                <Text style={{ color: p.textSecondary }}>{due ? `${due} từ đến hạn` : "Chưa có từ đến hạn"}</Text>
              </View>
              <Ionicons name="repeat" size={32} color={p.primary} />
            </View>
            <Text style={{ color: p.textSecondary }}>Lịch ôn được cập nhật theo kết quả từng từ.</Text>
            <PrimaryButton label={due ? `Ôn tập ngay (${Math.min(100, due)})` : "Chưa có từ đến hạn"} disabled={!due} onPress={() => router.push({ pathname: "/english/review", params: { deckId: id } } as Href)} />
          </View>

          <PrimaryButton variant="danger" icon="🗑" label="Đưa bộ từ vào thùng rác" loading={saving} onPress={archive} />

          <View style={s.listHeading}>
            <Text style={[s.sectionTitle, { color: p.textPrimary }]}>{query || selectedLevel ? "Từ phù hợp" : "Từ trong bộ này"} ({visibleCards.length}{nextCursor ? "+" : ""})</Text>
            {selectedLevel ? <Pressable accessibilityRole="button" onPress={() => setSelectedLevel(null)} style={s.clearSearch}><Text style={{ color: p.primary, fontWeight: "800" }}>Xóa lọc</Text></Pressable> : null}
          </View>
          <View style={s.filterRow}>
            {([ ["all", "Tất cả"], ["NEW", "Chưa học"], ["LEARNING", "Đang học"], ["SUSPENDED", "Đã bỏ qua"] ] as const).map(([value, label]) => (
              <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: filter === value }} onPress={() => { setFilter(value); setSelectedLevel(null); }} style={[s.filter, { backgroundColor: filter === value ? p.primary : p.surface, borderColor: p.border }]}><Text style={{ color: filter === value ? "#fff" : p.textPrimary, fontWeight: "800" }}>{label}</Text></Pressable>
            ))}
          </View>
          {loading ? <ActivityIndicator color={p.primary} /> : visibleCards.length ? visibleCards.map((card) => (
            <EnglishPersonalWordCard key={card.id} card={card} compact showStartAction={false} busy={busyCard === card.id} onStart={() => void cardAction(card, "learn")} onSuspend={() => void cardAction(card, card.suspended ? "restore" : "skip")} />
          )) : <View style={[s.emptyCard, { backgroundColor: p.surface, borderColor: p.border }]}><Text style={{ color: p.textSecondary }}>{selectedLevel ? "Các từ cấp này chưa nằm trong phần đang tải." : "Chưa có từ phù hợp. Hãy thêm từ hoặc đổi bộ lọc."}</Text></View>}
          {nextCursor ? <PrimaryButton variant="secondary" label={loadingMore ? "Đang tải thêm…" : "Tải thêm từ"} loading={loadingMore} onPress={() => void loadMore()} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 90 },
  heroCopy: { flex: 1, gap: 5 },
  deckName: { fontSize: 31, fontWeight: "900" },
  deckCount: { fontSize: 17 },
  renameButton: { minHeight: 48, borderRadius: 30, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 7 },
  panel: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 },
  eyebrow: { fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, fontSize: 16 },
  actionRow: { flexDirection: "row", gap: 8 },
  flexButton: { flex: 1 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridButton: { flexBasis: "48%", flexGrow: 1, minHeight: 48 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, minWidth: 0 },
  searchButton: { minWidth: 76, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 16, paddingHorizontal: 12 },
  clearSearch: { minHeight: 40, justifyContent: "center", alignSelf: "flex-start" },
  progressHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTitle: { fontSize: 24, fontWeight: "900" },
  percent: { fontSize: 30, fontWeight: "900" },
  progressTrack: { height: 9, borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99 },
  chartTitle: { fontSize: 19, fontWeight: "900", marginTop: 2 },
  levelRow: { flexDirection: "row", alignItems: "stretch", gap: 5, minHeight: 100 },
  levelColumn: { flex: 1, minWidth: 0, borderRadius: 12, padding: 4, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  levelTrack: { height: 55, width: "100%", borderRadius: 9, overflow: "hidden", justifyContent: "flex-end" },
  levelBar: { width: "100%", minHeight: 0, borderRadius: 9 },
  learnPanel: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  sectionTitle: { fontSize: 22, fontWeight: "900" },
  reviewPanel: { borderRadius: 22, padding: 18, gap: 13 },
  reviewHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  filter: { minHeight: 40, borderWidth: 1, borderRadius: 22, paddingHorizontal: 12, justifyContent: "center" },
  emptyCard: { borderWidth: 1, borderRadius: 18, minHeight: 100, padding: 16, alignItems: "center", justifyContent: "center" },
  loading: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 12 },
  alert: { padding: 14, borderRadius: 14, gap: 5 },
  touch: { minHeight: 44, justifyContent: "center" },
});
