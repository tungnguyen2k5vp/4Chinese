import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/Screen";
import { EnglishEmptyState } from "@/components/english/EnglishEmptyState";
import { EmptyReaderIllustration } from "@/components/english/EnglishIllustrations";
import { EnglishQuickDictionary } from "@/components/english/EnglishQuickDictionary";
import { englishReadingLessons } from "@/data/english-learning-content";
import { englishDemoReader } from "@/data/english-preview-fixtures";
import { readEnglishContentProgress, saveEnglishContentProgress } from "@/db/english/content-progress";
import {
  addEnglishCards,
  listEnglishDecks,
  type EnglishCard,
} from "@/db/english/learner";
import {
  lookupEnglishPersonalWord,
  readEnglishReaderDraft,
  saveEnglishReaderDraft,
  type EnglishReaderDraft,
} from "@/db/english/reader-draft";
import { readerLookupTarget, type EnglishReadingContext } from "@/services/english/reading-context";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { englishLocalId } from "@/services/languages/ids";
import { useLanguageProtection } from "@/services/languages/use-language-protection";
import { englishReadingWindow } from "@/services/reader/english-tokenizer";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

const empty: EnglishReaderDraft = {
  title: "",
  text: "",
  position: 0,
  revision: 0,
};

export default function EnglishReader() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lesson?: string; draft?: string }>();
  const bundledLesson = params.draft === '1' ? englishReadingLessons.find(item => item.id === params.lesson) : undefined;
  const db = useEnglishDatabase();
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  const [draft, setDraft] = useState(empty);
  const [contentPosition, setContentPosition] = useState(0);
  const [contentCompleted, setContentCompleted] = useState(false);
  const [questionMessage, setQuestionMessage] = useState('');
  const [showContentInfo, setShowContentInfo] = useState(false);
  const [saved, setSaved] = useState(empty);
  const [reading, setReading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [decks, setDecks] = useState<{ id: string; name: string }[]>([]);
  const [deck, setDeck] = useState("");
  const [word, setWord] = useState("");
  const [selectedWordStart, setSelectedWordStart] = useState<number | null>(null);
  const [matches, setMatches] = useState<EnglishCard[]>([]);
  const [meaning, setMeaning] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [quickDictionaryVisible, setQuickDictionaryVisible] = useState(false);
  const [quickDictionaryQuery, setQuickDictionaryQuery] = useState("");
  const [readingContext, setReadingContext] = useState<EnglishReadingContext>();
  const [retry, setRetry] = useState(0);

  // New UI states: Modal for adding new text and font size control
  const [showInputModal, setShowInputModal] = useState(false);
  const [fontSize, setFontSize] = useState<"standard" | "large">("standard");
  const [showDemoPreview, setShowDemoPreview] = useState(
    () =>
      __DEV__ &&
      typeof globalThis !== "undefined" &&
      typeof (globalThis as { window?: { location?: { search?: string } } }).window !== "undefined" &&
      typeof (globalThis as { window?: { location?: { search?: string } } }).window?.location !== "undefined" &&
      typeof (globalThis as { window?: { location?: { search?: string } } }).window?.location?.search === "string" &&
      ((globalThis as { window?: { location?: { search?: string } } }).window?.location?.search?.includes("preview=true") ?? false),
  );

  const lock = useRef(false);
  const generation = useRef(0);
  const dirty = draft.title !== saved.title || draft.text !== saved.text;

  useLanguageProtection("DRAFT", dirty || busy || !!meaning.trim());

  useEffect(() => {
    if (!bundledLesson) return;
    let live = true;
    void readEnglishContentProgress(db, bundledLesson.id).then(value => { if (live) { setContentPosition(value.position); setContentCompleted(value.completed); } }).catch(() => { if (live) setError('Chưa đọc được vị trí của bài thử. Dữ liệu vẫn giữ nguyên.'); });
    return () => { live = false; };
  }, [db, bundledLesson]);

  useEffect(() => {
    let live = true;
    const invalidateLookup = () => {
      generation.current++;
    };
    void Promise.all([readEnglishReaderDraft(db), listEnglishDecks(db)])
      .then(([value, all]) => {
        if (!live) return;
        const initial = value ?? empty;
        setDraft(initial);
        setSaved(initial);
        setReading(!!initial.text.trim());
        setDecks(all);
        setDeck(all[0]?.id ?? "");
      })
      .catch(() => {
        if (live)
          setError(
            "Không mở được bản nháp Reader. Không đặt lại dữ liệu; hãy thử lại.",
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      invalidateLookup();
    };
  }, [db, retry]);

  const commit = async (value: EnglishReaderDraft) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (bundledLesson) {
        await saveEnglishContentProgress(db, bundledLesson.id, { position: value.position, completed: contentCompleted });
        setContentPosition(value.position);
        setNotice('Đã lưu vị trí bài đọc tại máy. Văn bản cá nhân không bị thay đổi.');
        return;
      }
      const next = await saveEnglishReaderDraft(db, value);
      setDraft(next);
      setSaved(next);
      setReading(true);
      setWord("");
      setSelectedWordStart(null);
      setMatches([]);
      setMeaning("");
      setShowInputModal(false);
      generation.current++;
      setNotice("Đã lưu văn bản và vị trí đọc trên thiết bị.");
    } catch {
      setError(
        "Chưa lưu được hoặc bản nháp đã thay đổi ở màn khác. Nội dung bạn nhập vẫn giữ nguyên; không ghi đè tự động.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };

  const lookup = async (token: string, sourceStart: number) => {
    if (busy || meaning.trim()) {
      setNotice(
        "Hãy lưu thẻ hoặc xóa phần nghĩa đang nhập trước khi chọn từ khác.",
      );
      return;
    }
    const current = ++generation.current;
    setWord(token);
    setSelectedWordStart(sourceStart);
    setMatches([]);
    setLookupBusy(true);
    setError("");
    try {
      const found = await lookupEnglishPersonalWord(db, token);
      if (current === generation.current) setMatches(found);
    } catch {
      if (current === generation.current)
        setError("Chưa tra được bộ từ cá nhân. Chạm lại từ để thử lại.");
    } finally {
      if (current === generation.current) setLookupBusy(false);
    }
  };

  const add = async () => {
    if (lock.current || !word || !meaning.trim() || !deck || lookupBusy) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await addEnglishCards(db, [
        {
          id: englishLocalId("card"),
          deck_id: deck,
          headword: word,
          meaning_vi: meaning,
          pos: "",
          ipa: "",
          sense_id: null,
          source_id: "USER",
        },
      ]);
      setMeaning("");
      setNotice(
        "Đã thêm thẻ cá nhân vào bộ. Sẽ xuất hiện trong lịch học SRS tiếp theo.",
      );
      try {
        setMatches(await lookupEnglishPersonalWord(db, word));
      } catch {
        setError(
          "Thẻ đã được lưu nhưng chưa tải lại được danh sách nghĩa. Chạm lại từ để thử tra; không cần thêm lại thẻ.",
        );
      }
    } catch {
      setError(
        "Chưa thêm được thẻ. Nghĩa bạn nhập được giữ trên màn này; hãy kiểm tra bộ từ và thử lại.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const closeLookup = () => {
    if (busy || meaning.trim()) {
      setNotice(
        "Hãy lưu thẻ hoặc xóa nghĩa đang nhập trước khi đóng phần tra từ.",
      );
      return;
    }
    generation.current++;
    setLookupBusy(false);
    setWord("");
    setSelectedWordStart(null);
    setMatches([]);
  };

  // Preview toggle support
  const activeDraft = bundledLesson ? { title: bundledLesson.title, text: bundledLesson.text, position: contentPosition, revision: 0 } : showDemoPreview ? englishDemoReader : draft;
  const isReadingActive = !!bundledLesson || showDemoPreview || (reading && !!activeDraft.text.trim());

  const readingWindow = useMemo(() =>
    isReadingActive && activeDraft.text
      ? englishReadingWindow(activeDraft.text, activeDraft.position)
      : null, [isReadingActive, activeDraft.text, activeDraft.position]);

  const readingProgressPercent =
    bundledLesson && contentCompleted ? 100 : activeDraft.text.length > 0
      ? Math.round((activeDraft.position / activeDraft.text.length) * 100)
      : 0;

  return (
    <Screen
      title="Đọc tiếng Anh cá nhân"
      subtitle="Chạm từ để tra và lưu vào bộ của bạn."
      hideTitle
      avoidKeyboard
    >
      {bundledLesson ? <View style={{ gap: 6 }}><Text style={{ color: palette.spelling, fontWeight: '800' }}>BÀI THỬ · CẦN DUYỆT</Text><Pressable accessibilityRole="button" accessibilityState={{ expanded: showContentInfo }} onPress={() => setShowContentInfo(value => !value)} style={{ minHeight: 44 }}><Text style={{ color: palette.textSecondary }}>Thông tin bài đọc {showContentInfo ? '−' : '+'}</Text></Pressable>{showContentInfo ? <Text style={{ color: palette.textSecondary }}>{bundledLesson.explanation}</Text> : null}</View> : null}
      {/* Visual QA Preview Toggle */}
      {__DEV__ && !bundledLesson ? (
        <View style={styles.demoBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bật chế độ thử nghiệm bài đọc có sẵn"
            onPress={() => setShowDemoPreview((v) => !v)}
            style={[
              styles.demoButton,
              {
                backgroundColor: showDemoPreview ? palette.primary : palette.surfaceSubtle,
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
              {showDemoPreview ? "Đang bật: PREVIEW DATA (Bài đọc mẫu)" : "Bật Preview Data để kiểm tra Reader"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Loading state */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Đang mở Reader…
          </Text>
        </View>
      ) : null}

      {/* Alerts */}
      {error && !word ? (
        <View style={[styles.alertCard, { backgroundColor: palette.errorLight, borderColor: palette.error }]}>
          <Ionicons name="alert-circle" size={18} color={palette.error} />
          <Text style={[styles.alertText, { color: palette.error }]}>{error}</Text>
          <Pressable
            onPress={() => setRetry((r) => r + 1)}
            style={[styles.smallNoticeBtn, { backgroundColor: palette.error }]}
          >
            <Text style={styles.smallNoticeBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      {notice && !word ? (
        <View style={[styles.alertCard, { backgroundColor: palette.successLight, borderColor: palette.success }]}>
          <Ionicons name="checkmark-circle" size={18} color={palette.success} />
          <Text style={[styles.alertText, { color: palette.success }]}>{notice}</Text>
        </View>
      ) : null}

      {/* 1. READER LANDING — When no text is loaded */}
      {!loading && !isReadingActive ? (
        <View>
          <EnglishEmptyState
            illustration={<EmptyReaderIllustration width={150} height={120} />}
            title="Trình đọc văn bản tiếng Anh"
            description="Dán bất kỳ bài báo, trích đoạn sách hoặc truyện ngắn tiếng Anh nào bạn yêu thích. Chạm vào bất kỳ từ nào để tra cứu và lưu nhanh vào bộ từ vựng cá nhân."
            primaryActionLabel="Dán & Nhập văn bản mới"
            onPrimaryAction={() => setShowInputModal(true)}
            secondaryActionLabel="Mở kho từ vựng"
            onSecondaryAction={() => router.navigate("/english" as Href)}
          />
        </View>
      ) : null}

      {/* 2. READING MODE — Calm reading surface */}
      {!loading && isReadingActive && readingWindow ? (
        <View style={styles.readingContainer}>
          {/* Header Bar with Title, Progress Bar, and Font Size Controls */}
          <View
            style={[
              styles.readingHeaderCard,
              {
                backgroundColor: isDark ? "#172338" : "#FFFFFF",
                borderColor: isDark ? "#25334D" : "#E2E8F0",
              },
            ]}
          >
            <View style={styles.readingTitleRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  accessibilityRole="header"
                  testID="english-reader-title"
                  style={[styles.readingTitle, { color: palette.textPrimary }]}
                >
                  {activeDraft.title || "Văn bản tiếng Anh cá nhân"}
                </Text>
                <Text style={[styles.progressLabel, { color: palette.textMuted }]}>
                  {bundledLesson && contentCompleted ? 'Đã hoàn thành bài đọc và câu hỏi · 100%' : `Đã đọc ${readingProgressPercent}% (${activeDraft.position} / ${activeDraft.text.length} ký tự)`}
                </Text>
              </View>

              {/* Font Size Toggle & Edit text button */}
              <View style={styles.headerControlButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đổi cỡ chữ"
                  onPress={() => setFontSize((f) => (f === "standard" ? "large" : "standard"))}
                  style={[
                    styles.controlButton,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.controlButtonText, { color: palette.textPrimary }]}>
                    {fontSize === "standard" ? "A+" : "A"}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Chỉnh sửa văn bản"
                  disabled={!!bundledLesson}
                  onPress={() => setShowInputModal(true)}
                  style={[
                    styles.controlButton,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Ionicons name="create-outline" size={16} color={palette.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Reading Progress Line */}
            <View style={[styles.progressBarBg, { backgroundColor: isDark ? "#1E293B" : "#E2E8F0" }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(readingProgressPercent, 100)}%`,
                    backgroundColor: palette.reading,
                  },
                ]}
              />
            </View>
          </View>

          {/* Calm Reading Card */}
          <View
            style={[
              styles.readingSurfaceCard,
              {
                backgroundColor: isDark ? "#121A2B" : "#FFFFFF",
                borderColor: isDark ? "#25334D" : "#E2E8F0",
              },
            ]}
            testID="english-reader-reading-surface"
          >
            <Text
              testID="english-reader-text-content"
              style={[
                styles.readingTextContent,
                {
                  color: palette.textPrimary,
                  fontSize: fontSize === "standard" ? 18 : 22,
                  lineHeight: fontSize === "standard" ? 32 : 38,
                },
              ]}
            >
              {readingWindow.tokens.map((token) =>
                token.word ? (
                  <Text
                    key={token.start}
                    testID={`english-reader-token-${token.start}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Tra từ: ${token.text}`}
                    onPress={() => {
                      if (busy || meaning.trim()) { setNotice('Hãy lưu hoặc xóa nghĩa đang nhập trước khi tra từ khác.'); return; }
                      const target = readerLookupTarget(activeDraft.text, token.start);
                      generation.current++;
                      setWord('');
                      setMatches([]);
                      setSelectedWordStart(token.start);
                      setQuickDictionaryQuery(target.query);
                      setReadingContext({ ...target.context, sourceTitle: activeDraft.title });
                      setQuickDictionaryVisible(true);
                    }}
                    style={[
                      styles.wordToken,
                      selectedWordStart === token.start && styles.selectedWordToken,
                      {
                        color:
                          selectedWordStart === token.start
                            ? palette.primary
                            : palette.textPrimary,
                        backgroundColor:
                          selectedWordStart === token.start
                            ? isDark
                              ? "rgba(59, 130, 246, 0.28)"
                              : "rgba(37, 99, 235, 0.14)"
                            : "transparent",
                      },
                    ]}
                  >
                    {token.text}
                  </Text>
                ) : (
                  <Text key={token.start}>{token.text}</Text>
                ),
              )}
            </Text>
          </View>

          {/* Navigation Controls */}
          <View style={styles.navControlsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Về đầu văn bản"
              disabled={busy || activeDraft.position === 0 || !!meaning.trim()}
              onPress={() => void commit({ ...activeDraft, position: 0 })}
              style={[
                styles.navButtonSecondary,
                {
                  borderColor: palette.border,
                  backgroundColor: isDark ? "#172338" : "#FFFFFF",
                  opacity: activeDraft.position === 0 ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="play-skip-back-outline" size={16} color={palette.textSecondary} />
              <Text style={[styles.navButtonSecondaryText, { color: palette.textSecondary }]}>
                Về đầu
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đọc trang tiếp theo"
              disabled={busy || readingWindow.next === null || !!meaning.trim()}
              onPress={() => {
                if (readingWindow.next !== null)
                  void commit({ ...activeDraft, position: readingWindow.next });
              }}
              style={[
                styles.navButtonPrimary,
                {
                  backgroundColor: palette.reading,
                  opacity: readingWindow.next === null ? 0.5 : 1,
                },
              ]}
            >
              <Text style={styles.navButtonPrimaryText}>Đọc tiếp</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* 3. WORD LOOKUP BOTTOM SHEET MODAL */}
      <Modal
        visible={!!word}
        transparent
        animationType="slide"
        onRequestClose={closeLookup}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View
            style={[
              styles.lookupSheet,
              {
                backgroundColor: isDark ? "#172338" : "#FFFFFF",
                borderColor: isDark ? "#25334D" : "#E2E8F0",
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            <View style={styles.lookupHeader}>
              <View>
                <Text style={[styles.lookupHeadword, { color: palette.textPrimary }]}>
                  {word}
                </Text>
                <Text style={[styles.lookupHint, { color: palette.textMuted }]}>
                  Tra cứu trong bộ từ tiếng Anh cá nhân
                </Text>
              </View>
              <Pressable onPress={closeLookup} style={styles.closeIconBtn}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </Pressable>
            </View>

            {word ? <Pressable accessibilityRole="button" onPress={() => { setQuickDictionaryQuery(word); setQuickDictionaryVisible(true); }} style={[styles.saveWordButton, { backgroundColor: palette.primaryLight }]}><Text style={[styles.saveWordButtonText, { color: palette.primary }]}>Tra từ điển Anh–Việt · chọn nghĩa chính xác</Text></Pressable> : null}

            {lookupBusy ? (
              <ActivityIndicator size="small" color={palette.primary} style={{ marginVertical: 12 }} />
            ) : matches.length > 0 ? (
              <View style={styles.matchesList}>
                <Text style={[styles.matchedLabel, { color: palette.success }]}>
                  ✓ Đã có trong bộ từ của bạn:
                </Text>
                {matches.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.matchItem,
                      {
                        backgroundColor: isDark ? "#0B0F19" : "#F8FAFC",
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Text style={[styles.matchMeaning, { color: palette.textPrimary }]}>
                      {item.meaning_vi}
                    </Text>
                    {item.notes ? (
                      <Text style={[styles.matchNotes, { color: palette.textMuted }]}>
                        {item.notes}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.quickAddSection}>
                <Text style={[styles.quickAddPrompt, { color: palette.textSecondary }]}>
                  Chưa có nghĩa trong kho từ cá nhân hiện tại. Nhập nghĩa bạn chọn để lưu:
                </Text>

                <TextInput
                  accessibilityLabel="Nghĩa tiếng Việt của từ"
                  placeholder="Nhập nghĩa tiếng Việt…"
                  placeholderTextColor={palette.textMuted}
                  value={meaning}
                  onChangeText={setMeaning}
                  style={[
                    styles.meaningInput,
                    {
                      color: palette.textPrimary,
                      backgroundColor: isDark ? "#0B0F19" : "#F8FAFC",
                      borderColor: palette.border,
                    },
                  ]}
                />

                {decks.length > 0 ? (
                  <View style={styles.deckSelectRow}>
                    <Text style={[styles.deckSelectLabel, { color: palette.textMuted }]}>
                      Lưu vào bộ:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {decks.map((d) => (
                        <Pressable
                          key={d.id}
                          onPress={() => setDeck(d.id)}
                          style={[
                            styles.deckPill,
                            {
                              backgroundColor: deck === d.id ? palette.primary : palette.surfaceSubtle,
                              borderColor: deck === d.id ? palette.primary : palette.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.deckPillText,
                              { color: deck === d.id ? "#FFFFFF" : palette.textSecondary },
                            ]}
                          >
                            {d.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Lưu vào bộ từ"
                  disabled={busy || !meaning.trim() || !deck}
                  onPress={() => void add()}
                  style={[
                    styles.saveWordButton,
                    {
                      backgroundColor: !meaning.trim() || !deck ? palette.surfaceSubtle : palette.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.saveWordButtonText,
                      { color: !meaning.trim() || !deck ? palette.textMuted : "#FFFFFF" },
                    ]}
                  >
                    Lưu từ vào bộ
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* 4. ADD / EDIT TEXT MODAL */}
      <Modal
        visible={showInputModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInputModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View
            style={[
              styles.inputModalCard,
              {
                backgroundColor: isDark ? "#172338" : "#FFFFFF",
                borderColor: isDark ? "#25334D" : "#E2E8F0",
              },
            ]}
          >
            <View style={styles.inputModalHeader}>
              <Text style={[styles.inputModalTitle, { color: palette.textPrimary }]}>
                Dán văn bản tiếng Anh
              </Text>
              <Pressable onPress={() => setShowInputModal(false)}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
              Tiêu đề (tùy chọn)
            </Text>
            <TextInput
              accessibilityLabel="Tiêu đề văn bản tiếng Anh"
              placeholder="Ví dụ: Bài đọc báo, truyện ngắn..."
              placeholderTextColor={palette.textMuted}
              value={draft.title}
              maxLength={200}
              editable={!busy}
              style={[
                styles.modalTextInput,
                {
                  color: palette.textPrimary,
                  backgroundColor: isDark ? "#0B0F19" : "#F8FAFC",
                  borderColor: palette.border,
                },
              ]}
              onChangeText={(title) => setDraft((old) => ({ ...old, title }))}
            />

            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
              Nội dung tiếng Anh (tối đa 100.000 ký tự)
            </Text>
            <TextInput
              accessibilityLabel="Văn bản tiếng Anh để đọc"
              placeholder="Dán bài viết hoặc văn bản tiếng Anh tại đây…"
              placeholderTextColor={palette.textMuted}
              value={draft.text}
              multiline
              maxLength={100000}
              editable={!busy}
              style={[
                styles.modalTextArea,
                {
                  color: palette.textPrimary,
                  backgroundColor: isDark ? "#0B0F19" : "#F8FAFC",
                  borderColor: palette.border,
                },
              ]}
              onChangeText={(value) =>
                setDraft((old) => ({ ...old, text: value, position: 0 }))
              }
            />

            <View style={styles.modalButtonsRow}>
              <Pressable
                onPress={() => setShowInputModal(false)}
                style={[styles.modalCancelBtn, { borderColor: palette.border }]}
              >
                <Text style={[styles.modalCancelText, { color: palette.textSecondary }]}>
                  Hủy
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lưu và đọc ngay"
                disabled={busy || !draft.text.trim()}
                onPress={() => void commit(draft)}
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: !draft.text.trim() ? palette.surfaceSubtle : palette.reading,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalSaveText,
                    { color: !draft.text.trim() ? palette.textMuted : "#FFFFFF" },
                  ]}
                >
                  Lưu & Đọc ngay
                </Text>
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      {bundledLesson && readingWindow?.next === null ? <View style={{ gap: 12 }}>{bundledLesson.questions.map(question => <View key={question.prompt} style={{ gap: 8 }}><Text style={{ color: palette.textPrimary, fontWeight: '800' }}>{question.prompt}</Text>{question.options.map((option, index) => <Pressable key={option} accessibilityRole="button" onPress={() => { if (index !== question.answer) { setQuestionMessage('Hãy đọc lại đoạn văn rồi thử lại.'); return; } void saveEnglishContentProgress(db, bundledLesson.id, { position: contentPosition, completed: true }).then(() => { setContentCompleted(true); setQuestionMessage(question.explanation); }).catch(() => setQuestionMessage('Chưa lưu được kết quả. Hãy thử lại.')); }} style={{ minHeight: 48, padding: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 12 }}><Text style={{ color: palette.textPrimary }}>{option}</Text></Pressable>)}</View>)}<Text style={{ color: palette.success }}>{contentCompleted ? 'Đã đọc và trả lời câu hỏi.' : ''} {questionMessage}</Text></View> : null}
      {quickDictionaryVisible ? <EnglishQuickDictionary initialQuery={quickDictionaryQuery} readingContext={readingContext} onViewPersonal={headword => { setQuickDictionaryVisible(false); void lookup(headword, readingContext?.sourceStart ?? 0); }} onClose={() => setQuickDictionaryVisible(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  centerContainer: {
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
    marginBottom: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
  },
  readingContainer: {
    gap: 12,
  },
  readingHeaderCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.2,
    gap: 10,
  },
  readingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readingTitle: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "800",
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  headerControlButtons: {
    flexDirection: "row",
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  readingSurfaceCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.2,
    minHeight: 260,
  },
  readingTextContent: {
    letterSpacing: 0.2,
  },
  wordToken: {
    fontWeight: "400",
  },
  selectedWordToken: {
    borderRadius: 3,
    fontWeight: "700",
  },
  navControlsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  navButtonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    gap: 6,
  },
  navButtonSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  navButtonPrimary: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  navButtonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  lookupSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    padding: 20,
    maxHeight: "75%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#94A3B8",
    alignSelf: "center",
    marginBottom: 12,
  },
  lookupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  lookupHeadword: {
    fontSize: 24,
    fontWeight: "800",
  },
  lookupHint: {
    fontSize: 12,
    marginTop: 2,
  },
  closeIconBtn: {
    padding: 4,
  },
  matchesList: {
    gap: 8,
    marginVertical: 8,
  },
  matchedLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  matchItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  matchMeaning: {
    fontSize: 16,
    fontWeight: "600",
  },
  matchNotes: {
    fontSize: 13,
  },
  quickAddSection: {
    gap: 10,
    marginTop: 6,
  },
  quickAddPrompt: {
    fontSize: 13,
    lineHeight: 18,
  },
  meaningInput: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  deckSelectRow: {
    gap: 6,
  },
  deckSelectLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  deckPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
  },
  deckPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  saveWordButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  saveWordButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  inputModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    padding: 20,
    maxHeight: "85%",
    gap: 10,
  },
  inputModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  inputModalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalTextInput: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  modalTextArea: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 160,
    textAlignVertical: "top",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "700",
  },
  smallNoticeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  smallNoticeBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
