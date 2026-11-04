import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { EnglishWritingAIEntry } from "@/components/ChineseAIEntry";
import { Screen } from "@/components/Screen";
import { EnglishDeckCard } from "@/components/english/EnglishDeckCard";
import { EnglishEmptyState } from "@/components/english/EnglishEmptyState";
import { EmptyDecksIllustration } from "@/components/english/EnglishIllustrations";
import {
  EnglishMemoryChart,
  EnglishPersonalWordCard,
} from "@/components/english/EnglishPersonalVocabulary";
import { EnglishQuickDictionary } from "@/components/english/EnglishQuickDictionary";
import {
  englishDemoCards,
  englishDemoDecks,
  englishDemoStats,
} from "@/data/english-preview-fixtures";
import { englishCardPage } from "@/db/english/card-editor";
import { setEnglishCardSuspended } from "@/db/english/decks";
import {
  addEnglishCards,
  englishStatistics,
  readEnglishDraft,
  saveEnglishDraft,
  type EnglishCard,
} from "@/db/english/learner";
import {
  englishMemorySummary,
  listEnglishDeckSummaries,
  type EnglishMemorySummary,
} from "@/db/english/personal-vocabulary";
import { useModalAnimationType } from "@/hooks/use-reduced-motion";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { englishLocalId } from "@/services/languages/ids";
import { useLanguageProtection } from "@/services/languages/use-language-protection";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export default function EnglishWorkspace() {
  const modalAnimation = useModalAnimationType();
  const params = useLocalSearchParams<{ deck?: string }>();
  const db = useEnglishDatabase();
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  const [decks, setDecks] = useState<
    { id: string; name: string; wordCount: number; dueCount: number }[]
  >([]);
  const [selected, setSelected] = useState<string | null>(params.deck ?? null);
  const [memory, setMemory] = useState<EnglishMemorySummary | null>(null);
  const [cards, setCards] = useState<EnglishCard[]>([]);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [cardFilter, setCardFilter] = useState<"all" | "NEW" | "LEARNING" | "SUSPENDED">("all");
  const [showStats, setShowStats] = useState(false);
  const [dictionaryVisible, setDictionaryVisible] = useState(false);
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (live && params.deck) {
        setSelected(params.deck);
        setCursors([null]);
      }
    });
    return () => {
      live = false;
    };
  }, [params.deck]);
  useEffect(() => {
    if (searchDraft === search) return;
    const timer = setTimeout(() => {
      setSearch(searchDraft.trim().slice(0, 200));
      setCursors([null]);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchDraft, search]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof englishStatistics>
  > | null>(null);

  const [draft, setDraft] = useState({ headword: "", meaning: "" });
  const [deckMenuVisible, setDeckMenuVisible] = useState(false);
  const [showAddWord, setShowAddWord] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const hydrated = useRef(false);
  const [draftReady, setDraftReady] = useState(false);
  const draftGeneration = useRef(0);
  const loadGeneration = useRef(0);
  const [draftStatus, setDraftStatus] = useState("");
  const [showDemoPreview, setShowDemoPreview] = useState(
    () =>
      __DEV__ &&
      typeof window !== "undefined" &&
      typeof window.location !== "undefined" &&
      typeof window.location.search === "string" &&
      window.location.search.includes("preview=true"),
  );
  const exposeDeveloperPreview =
    __DEV__ && process.env.EXPO_PUBLIC_SHOW_ENGLISH_PREVIEW === "true";

  useLanguageProtection(
    "DRAFT",
    busy ||
      (!!draftStatus && draftStatus !== "Đã lưu bản nháp"),
  );

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    try {
      const all = await listEnglishDeckSummaries(db);
      const deck = all.some((row) => row.id === selected)
        ? selected
        : (all[0]?.id ?? null);
      const page = deck
        ? await englishCardPage(
            db,
            deck,
            deck === selected ? cursors[cursors.length - 1] : null,
            25,
            search,
            cardFilter,
          )
        : { cards: [], next: null };
      const summary = await englishStatistics(db);
      const memorySummary = await englishMemorySummary(db);
      const savedDraft = !hydrated.current ? await readEnglishDraft(db) : null;
      if (generation !== loadGeneration.current) return;
      setDecks(all);
      if (deck !== selected && cursors.length > 1) setCursors([null]);
      setSelected(deck);
      setCards(page.cards);
      setNextCursor(page.next);
      setStats(summary);
      setMemory(memorySummary);
      if (savedDraft !== null) {
        setDraft(savedDraft);
        hydrated.current = true;
        setDraftReady(true);
      }
      setError("");
    } catch (failure) {
      if (generation !== loadGeneration.current) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "Không đọc được dữ liệu tiếng Anh.",
      );
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [db, selected, cursors, search, cardFilter]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        loadGeneration.current++;
      };
    }, [load]),
  );

  const action = async (task: () => Promise<void>) => {
    if (lock.current || loading) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không lưu được. Hãy thử lại.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const editDraft = (patch: Partial<typeof draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    const generation = ++draftGeneration.current;
    setDraftStatus("Đang lưu bản nháp…");
    void saveEnglishDraft(db, next)
      .then(() => {
        if (generation === draftGeneration.current)
          setDraftStatus("Đã lưu bản nháp");
      })
      .catch(() => {
        if (generation === draftGeneration.current) {
          setDraftStatus("Chưa lưu được bản nháp");
          setError("Chưa lưu được bản nháp. Vui lòng giữ màn hình và thử lại.");
        }
      });
  };

  // Preview toggle support for visual QA without modifying SQLite
  const activeStats = showDemoPreview
    ? englishDemoStats
    : (stats ?? {
        total: 0,
        studied: 0,
        due: 0,
        reviewed: 0,
        correct: 0,
        xp: 0,
        studyMs: 0,
      });

  const activeDecks = showDemoPreview ? englishDemoDecks : decks;

  const activeCards = showDemoPreview ? englishDemoCards : cards;
  const displayedCards = activeCards.filter((card) => {
    const matchesSearch = !search ||
      `${card.headword} ${card.meaning_vi}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"));
    const matchesFilter = cardFilter === "all" ||
      (cardFilter === "SUSPENDED" ? !!card.suspended : !card.suspended && card.status === cardFilter);
    return matchesSearch && matchesFilter;
  });

  const openNextNewCard = async () => {
    if (showDemoPreview) {
      const preview = activeCards.find((card) => card.status === "NEW" && !card.suspended);
      if (preview) router.push(`/english/word?cardId=${encodeURIComponent(preview.id)}` as Href);
      else setNotice("Bộ xem trước không có từ mới ở trang này.");
      return;
    }
    if (!selected) {
      setNotice("Hãy tạo hoặc chọn một bộ từ trước.");
      return;
    }
    router.push(`/english/decks/${encodeURIComponent(selected)}/learn` as Href);
  };

  return (
    <Screen
      title="Kho từ tiếng Anh"
      subtitle="Bộ từ cá nhân · tiến độ học tập"
      hideTitle
      compact
      avoidKeyboard
    >
      <EnglishWritingAIEntry />
      <Pressable accessibilityRole="button" accessibilityLabel="Tra từ tiếng Anh hoặc nghĩa tiếng Việt" onPress={() => setDictionaryVisible(true)} style={[styles.searchInput, { backgroundColor: palette.surface, borderColor: palette.border, flexDirection: "row", alignItems: "center", gap: 10 }]}>
        <Ionicons name="search" size={19} color={palette.primary} />
        <Text style={{ color: palette.textMuted, flex: 1 }}>Tra từ tiếng Anh hoặc nghĩa tiếng Việt</Text>
        <Ionicons name="book-outline" size={18} color={palette.textMuted} />
      </Pressable>
      {dictionaryVisible ? <EnglishQuickDictionary onClose={() => setDictionaryVisible(false)} /> : null}
      {/* Isolated visual-QA fixture controls require explicit local opt-in. */}
      {exposeDeveloperPreview ? (
        <View style={styles.demoBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bật chế độ thử nghiệm dữ liệu đầy đủ"
            onPress={() => setShowDemoPreview((v) => !v)}
            style={[
              styles.demoButton,
              {
                backgroundColor: showDemoPreview
                  ? palette.primary
                  : palette.surfaceSubtle,
                borderColor: palette.primary,
              },
            ]}
          >
            <Ionicons
              name={showDemoPreview ? "eye" : "eye-outline"}
              size={14}
              color={showDemoPreview ? "#FFFFFF" : palette.primary}
            />
            <Text
              style={[
                styles.demoButtonText,
                { color: showDemoPreview ? "#FFFFFF" : palette.primary },
              ]}
            >
              {showDemoPreview
                ? "Đang bật: PREVIEW DATA (120 từ · 4 bộ)"
                : "Bật Preview Data để kiểm tra Hub"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Loading state */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Đang tải dữ liệu bộ từ…
          </Text>
        </View>
      ) : null}

      {/* Error / Notice */}
      {error ? (
        <View
          style={[
            styles.alertCard,
            { backgroundColor: palette.errorLight, borderColor: palette.error },
          ]}
        >
          <Ionicons name="alert-circle" size={20} color={palette.error} />
          <Text style={[styles.alertText, { color: palette.error }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => void load()}
            style={[styles.smallButton, { backgroundColor: palette.error }]}
          >
            <Text style={styles.smallButtonText}>Tải lại</Text>
          </Pressable>
        </View>
      ) : null}

      {notice ? (
        <View
          style={[
            styles.alertCard,
            {
              backgroundColor: palette.successLight,
              borderColor: palette.success,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color={palette.success} />
          <Text style={[styles.alertText, { color: palette.success }]}>
            {notice}
          </Text>
        </View>
      ) : null}

      {!loading ? (
        <>
          {memory ? (
            <View testID="english-vocabulary-overview" style={[styles.overviewCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.overviewHeading}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.overviewTitle, { color: palette.textPrimary }]}>Tiến độ từ vựng</Text>
                  <Text style={{ color: palette.textSecondary }}>{memory.studied} / {Math.max(0, memory.total - memory.suspended)} từ đã bắt đầu học</Text>
                </View>
                <Ionicons name="sparkles-outline" size={22} color={palette.primary} />
              </View>
              <View style={[styles.progressTrack, { backgroundColor: palette.surfaceSubtle }]}>
                <View style={[styles.progressFill, { backgroundColor: palette.primary, width: `${Math.min(100, Math.round((memory.studied / Math.max(1, memory.total - memory.suspended)) * 100))}%` }]} />
              </View>
              <View style={styles.overviewNumbers}>
                <Text style={{ color: palette.textSecondary }}>Chưa học <Text style={{ color: palette.textPrimary, fontWeight: "800" }}>{memory.newCount}</Text></Text>
                <Text style={{ color: palette.textSecondary }}>Đến hạn <Text style={{ color: palette.textPrimary, fontWeight: "800" }}>{activeStats.due}</Text></Text>
                <Text style={{ color: palette.textSecondary }}>Đã bỏ qua <Text style={{ color: palette.textPrimary, fontWeight: "800" }}>{memory.suspended}</Text></Text>
              </View>
              <View style={styles.overviewActions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Mở từ mới để bắt đầu học" disabled={!selected || memory.newCount === 0} onPress={() => void openNextNewCard()} style={[styles.overviewButton, { backgroundColor: palette.primary, opacity: !selected || memory.newCount === 0 ? 0.55 : 1 }]}>
                  <Ionicons name="book-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.overviewButtonText}>Học từ mới</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Ôn tập ${activeStats.due} từ đến hạn`} disabled={!activeStats.due} onPress={() => router.push("/english/review" as Href)} style={[styles.overviewButtonSecondary, { borderColor: palette.primary, opacity: activeStats.due ? 1 : 0.55 }]}>
                  <Ionicons name="time-outline" size={18} color={palette.primary} />
                  <Text style={[styles.overviewButtonTextSecondary, { color: palette.primary }]}>Ôn đến hạn · {activeStats.due}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {/* Collapsible Form: Thêm một nghĩa đơn */}
          {showAddWord ? (
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: isDark ? "#172338" : "#FFFFFF",
                  borderColor: palette.secondary,
                },
              ]}
            >
              <View style={styles.formHeader}>
                <Text
                  style={[styles.formTitle, { color: palette.textPrimary }]}
                >
                  Thêm một từ vào bộ đang chọn
                </Text>
                <Pressable onPress={() => setShowAddWord(false)}>
                  <Ionicons name="close" size={20} color={palette.textMuted} />
                </Pressable>
              </View>

              <Text
                style={[styles.inputLabel, { color: palette.textSecondary }]}
              >
                Từ hoặc cụm tiếng Anh:
              </Text>
              <TextInput
                accessibilityLabel="Từ hoặc cụm tiếng Anh"
                placeholder="Ví dụ: break the ice"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.textInput,
                  {
                    color: palette.textPrimary,
                    backgroundColor: isDark ? "#0B0F19" : "#F8FAFC",
                    borderColor: palette.border,
                  },
                ]}
                autoCapitalize="none"
                value={draft.headword}
                onChangeText={(headword) => editDraft({ headword })}
                maxLength={300}
                editable={!busy && draftReady}
              />

              <Text
                style={[styles.inputLabel, { color: palette.textSecondary }]}
              >
                Nghĩa tiếng Việt do bạn chọn:
              </Text>
              <TextInput
                accessibilityLabel="Nghĩa tiếng Việt do bạn chọn"
                placeholder="Ví dụ: bắt đầu trò chuyện để phá vỡ sự ngượng ngùng"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.textInput,
                  {
                    color: palette.textPrimary,
                    backgroundColor: isDark ? "#0B0F19" : "#F8FAFC",
                    borderColor: palette.border,
                    minHeight: 64,
                  },
                ]}
                multiline
                value={draft.meaning}
                onChangeText={(meaning) => editDraft({ meaning })}
                maxLength={2000}
                editable={!busy && draftReady}
              />

              {draftStatus ? (
                <Text
                  style={[styles.draftStatusText, { color: palette.textMuted }]}
                >
                  {draftStatus}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lưu và học ngay từ vừa nhập"
                disabled={
                  busy ||
                  loading ||
                  !selected ||
                  !draft.headword.trim() ||
                  !draft.meaning.trim()
                }
                onPress={() =>
                  void action(async () => {
                    if (!selected) return;
                    const cardId = englishLocalId("card");
                    await addEnglishCards(
                      db,
                      [
                        {
                          id: cardId,
                          deck_id: selected,
                          headword: draft.headword,
                          meaning_vi: draft.meaning,
                          pos: "",
                          ipa: "",
                          sense_id: null,
                          source_id: "USER",
                        },
                      ],
                      true,
                    );
                    const emptyDraft = { headword: "", meaning: "" };
                    draftGeneration.current++;
                    setDraftStatus("");
                    setDraft(emptyDraft);
                    setShowAddWord(false);
                    router.push({ pathname: "/english/review", params: { deckId: selected, learn: JSON.stringify([cardId]) } } as Href);
                  })
                }
                style={[
                  styles.formSubmitButton,
                  {
                    backgroundColor:
                      !selected ||
                      !draft.headword.trim() ||
                      !draft.meaning.trim()
                        ? palette.surfaceSubtle
                        : palette.secondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.formSubmitText,
                    {
                      color:
                        !selected ||
                        !draft.headword.trim() ||
                        !draft.meaning.trim()
                          ? palette.textMuted
                          : "#FFFFFF",
                    },
                  ]}
                >
                  Lưu & học ngay
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Personal decks stay a simple list; creation choices live in a small sheet. */}
          <View style={styles.deckSectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
              Bộ từ của bạn
            </Text>
            <View style={styles.deckHeaderActions}>
              {activeDecks.length > 0 ? (
                <Pressable accessibilityRole="button" onPress={() => router.push("/english/decks" as Href)} style={styles.deckHeaderAction}>
                <Text style={[styles.sectionLink, { color: palette.primary }]}>
                    Quản lý
                </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thêm mới bộ từ tiếng Anh"
                onPress={() => setDeckMenuVisible(true)}
                style={styles.deckHeaderAction}
              >
                <Text style={[styles.sectionLink, styles.addDeckText, { color: palette.primary }]}>Thêm mới  +</Text>
              </Pressable>
            </View>
          </View>

          {activeDecks.length === 0 ? (
            <EnglishEmptyState
              illustration={<EmptyDecksIllustration width={150} height={120} />}
              title="Bạn chưa lưu từ nào"
              description="Hãy lưu từ mới để ôn tập hoặc tải bộ từ biên tập sẵn ở đây."
              primaryActionLabel="Bộ từ vựng"
              onPrimaryAction={() => router.push("/english/library" as Href)}
              secondaryActionLabel="Dán văn bản đọc"
              onSecondaryAction={() => router.push("/english/reader" as Href)}
            />
          ) : (
            activeDecks.map((deck) => (
              <EnglishDeckCard
                key={deck.id}
                id={deck.id}
                name={deck.name}
                wordCount={deck.wordCount}
                dueCount={deck.dueCount}
                isSelected={deck.id === selected}
                onSelect={() => {
                  setCursors([null]);
                  setSelected(deck.id);
                }}
                onOpen={() => router.push(`/english/decks/${encodeURIComponent(deck.id)}` as Href)}
              />
            ))
          )}

          {/* Section: Words in Selected Deck */}
          {selected ? (
            <>
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, { color: palette.textPrimary }]}
                >
                  Từ trong bộ đang chọn
                </Text>
              </View>

              <TextInput
                testID="english-vocabulary-search"
                accessibilityLabel="Tìm từ trong bộ đang chọn"
                value={searchDraft}
                onChangeText={setSearchDraft}
                placeholder="Tìm từ hoặc nghĩa tiếng Việt"
                placeholderTextColor={palette.textMuted}
                style={[styles.searchInput, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surface }]}
                returnKeyType="search"
              />
              <View style={styles.filterChips}>
                {([
                  ["all", "Tất cả"],
                  ["NEW", "Chưa học"],
                  ["LEARNING", "Đang học"],
                  ["SUSPENDED", "Đã bỏ qua"],
                ] as const).map(([filter, label]) => (
                  <Pressable
                    key={filter}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: cardFilter === filter }}
                    onPress={() => { setCardFilter(filter); setCursors([null]); }}
                    style={[styles.filterChip, { backgroundColor: cardFilter === filter ? palette.primary : palette.surfaceSubtle, borderColor: palette.border }]}
                  >
                    <Text style={{ color: cardFilter === filter ? "#FFFFFF" : palette.textPrimary }}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              {displayedCards.map((card) => (
                <EnglishPersonalWordCard
                  key={card.id}
                  card={card}
                  compact
                  busy={busy || showDemoPreview}
                  onStart={() => router.push({ pathname: "/english/review", params: { deckId: card.deck_id, learn: JSON.stringify([card.id]) } } as Href)}
                  onSuspend={() =>
                    void action(() =>
                      setEnglishCardSuspended(db, card.id, !card.suspended),
                    )
                  }
                />
              ))}

              {displayedCards.length === 0 ? (
                <View style={[styles.emptySearch, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Text style={{ color: palette.textSecondary }}>{search || cardFilter !== "all" ? "Không tìm thấy từ phù hợp với bộ lọc này." : "Bộ từ này chưa có thẻ nào."}</Text>
                </View>
              ) : null}

              {nextCursor ? (
                <Pressable
                  onPress={() => {
                    setCursors((prev) => [...prev, nextCursor]);
                  }}
                  style={[
                    styles.loadMoreButton,
                    { borderColor: palette.border },
                  ]}
                >
                  <Text
                    style={[styles.loadMoreText, { color: palette.primary }]}
                  >
                    Tải thêm thẻ…
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {/* Secondary tools follow the owned decks so creation and the library stay primary. */}
          <View style={styles.quickNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thêm một từ thủ công"
              onPress={() => setShowAddWord((v) => !v)}
              style={[
                styles.quickNavTile,
                {
                  backgroundColor: isDark ? "#172338" : "#FFFFFF",
                  borderColor: isDark ? "#25334D" : "#E2E8F0",
                },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={palette.vocabulary}
              />
              <Text
                style={[styles.quickNavText, { color: palette.textPrimary }]}
              >
                Thêm từ đơn
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mở màn hình ôn tập"
              disabled={activeStats.due === 0}
              onPress={() => router.push("/english/review" as Href)}
              style={[
                styles.quickNavTile,
                {
                  backgroundColor: isDark ? "#172338" : "#FFFFFF",
                  borderColor: isDark ? "#25334D" : "#E2E8F0",
                  opacity: activeStats.due === 0 ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons
                name="repeat-outline"
                size={18}
                color={palette.review}
              />
              <Text
                style={[styles.quickNavText, { color: palette.textPrimary }]}
              >
                Ôn thẻ đến hạn
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quản lý và khôi phục bộ từ trong thùng rác"
              onPress={() => router.push("/english/decks" as Href)}
              style={[
                styles.quickNavTile,
                {
                  backgroundColor: isDark ? "#172338" : "#FFFFFF",
                  borderColor: isDark ? "#25334D" : "#E2E8F0",
                },
              ]}
            >
              <Ionicons
                name="folder-open-outline"
                size={18}
                color={palette.secondary}
              />
              <Text
                style={[styles.quickNavText, { color: palette.textPrimary }]}
              >
                Quản lý & Rác
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showStats }}
            onPress={() => setShowStats((value) => !value)}
            style={[styles.statsToggle, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.textPrimary, fontWeight: "800" }}>Thống kê chi tiết</Text>
              <Text style={{ color: palette.textMuted, fontSize: 12 }}>Biểu đồ tiến độ và cấp độ ghi nhớ</Text>
            </View>
            <Ionicons name={showStats ? "chevron-up" : "chevron-down"} size={20} color={palette.primary} />
          </Pressable>
          {showStats && memory ? <EnglishMemoryChart summary={memory} /> : null}

          {/* Honest, low-priority dictionary availability note */}
          <View
            style={[
              styles.infoNotice,
              {
                backgroundColor: isDark ? "#172338" : "#EFF6FF",
                borderColor: isDark ? "#25334D" : "#BFDBFE",
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={palette.primary}
            />
            <Text
              style={[styles.infoNoticeText, { color: palette.textSecondary }]}
            >
              Nhập danh sách từ để tra nghĩa từ từ điển Skypedia, kiểm tra từng
              mục rồi lưu vào bộ cá nhân. Từ điển tải riêng một lần và được lưu
              để tra offline.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </>
      ) : null}

      <Modal
        visible={deckMenuVisible}
        transparent
        animationType={modalAnimation}
        onRequestClose={() => setDeckMenuVisible(false)}
      >
        <View style={[styles.deckMenuOverlay, { backgroundColor: theme.overlay }]}>
          <Pressable
            accessibilityLabel="Đóng mục thêm bộ từ"
            onPress={() => setDeckMenuVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.deckMenuSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.deckMenuHandle, { backgroundColor: palette.border }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tạo bộ từ cá nhân"
              onPress={() => { setDeckMenuVisible(false); router.push("/english/bulk" as Href); }}
              style={styles.deckMenuAction}
            >
              <Text style={[styles.deckMenuText, { color: palette.textPrimary }]}>Tạo bộ từ cá nhân</Text>
              <Ionicons name="chevron-forward" size={22} color={palette.textSecondary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thêm bộ từ của bạn bè"
              onPress={() => { setDeckMenuVisible(false); router.push("/english/decks" as Href); }}
              style={styles.deckMenuAction}
            >
              <Text style={[styles.deckMenuText, { color: palette.textPrimary }]}>Thêm bộ từ của bạn bè</Text>
              <Ionicons name="chevron-forward" size={22} color={palette.textSecondary} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  overviewCard: { padding: 14, borderWidth: 1, borderRadius: 18, gap: 10 },
  overviewHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  overviewTitle: { fontSize: 18, fontWeight: "800" },
  overviewNumbers: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  progressTrack: { height: 8, borderRadius: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 6 },
  overviewActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  overviewButton: { minHeight: 46, flex: 1, flexBasis: 150, borderRadius: 12, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  overviewButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", textAlign: "center" },
  overviewButtonSecondary: { minHeight: 46, flex: 1, flexBasis: 150, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  overviewButtonTextSecondary: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  searchInput: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  filterChip: { minHeight: 40, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  emptySearch: { minHeight: 90, borderWidth: 1, borderRadius: 14, padding: 16, justifyContent: "center" },
  statsToggle: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, borderRadius: 14 },
  demoBar: {
    marginBottom: 10,
  },
  demoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  demoButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  smallButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 8,
  },
  primaryActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 12,
  },
  actionBigButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 6,
  },
  actionBigButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  actionBigButtonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  actionBigButtonSecondaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  quickNavRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  quickNavTile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.2,
    gap: 4,
  },
  quickNavText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  formCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 8,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  textInput: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  draftStatusText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  formSubmitButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  formSubmitText: {
    fontSize: 14,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  deckSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 8,
  },
  deckHeaderActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  deckHeaderAction: { minHeight: 44, justifyContent: "center" },
  addDeckText: { fontSize: 16, fontWeight: "700" },
  deckMenuOverlay: { flex: 1, justifyContent: "flex-end" },
  deckMenuSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30 },
  deckMenuHandle: { alignSelf: "center", width: 48, height: 5, borderRadius: 3, marginBottom: 14 },
  deckMenuAction: { minHeight: 68, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#D8DEE9" },
  deckMenuText: { fontSize: 18, fontWeight: "600" },
  cardItem: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    marginBottom: 8,
  },
  cardItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardHeadword: {
    fontSize: 18,
    fontWeight: "800",
  },
  cardIpa: {
    fontSize: 14,
    fontStyle: "italic",
  },
  cardMeaning: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardNotes: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },
  loadMoreButton: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
