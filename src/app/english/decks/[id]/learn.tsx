import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { EnglishAudioButton } from "@/components/EnglishAudioButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { englishCardPage } from "@/db/english/card-editor";
import { ENGLISH_REVIEW_BATCH_SIZES } from "@/db/english/flashcard-settings";
import { startEnglishCard, type EnglishCard } from "@/db/english/learner";
import { englishLearningIds, selectedEnglishNewCards } from "@/db/english/new-word-session";
import { englishDeckMemorySummary } from "@/db/english/personal-vocabulary";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export default function EnglishNewWordSetup() {
  const { id = "", added, resume } = useLocalSearchParams<{ id?: string; added?: string; resume?: string }>();
  const db = useEnglishDatabase();
  const { preferences } = useLearningLanguage();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [name, setName] = useState("");
  const [cards, setCards] = useState<EnglishCard[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [limit, setLimit] = useState(10);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [known, setKnown] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const leaving = useRef(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      setLoading(true);
      try {
        const ids = englishLearningIds(added, 100);
        const [summary, page] = await Promise.all([
          englishDeckMemorySummary(db, id),
          ids.length ? selectedEnglishNewCards(db, ids, id).then(rows => ({ cards: rows, next: null })) : englishCardPage(db, id, null, 100, "", "NEW"),
        ]);
        if (!live) return;
        leaving.current = false;
        setName(summary.name); setCards(page.cards); setCursor(page.next); setSelected([]);
        setIndex(0); setKnown(0); setTotal(ids.length || summary.newCount); setError("");
      } catch (failure) {
        if (live) setError(failure instanceof Error ? failure.message : "Chưa tải được từ mới. Hãy thử lại.");
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [added, db, id, resume, retry]);

  const begin = (ids: string[]) => {
    if (!ids.length || leaving.current) return;
    leaving.current = true;
    router.replace({ pathname: "/english/review", params: { deckId: id, learn: JSON.stringify(ids) } } as Href);
  };
  const loadMore = async (picked: string[]) => {
    if (!cursor) return;
    const page = await englishCardPage(db, id, cursor, 100, "", "NEW");
    setCards(rows => [...rows, ...page.cards]); setCursor(page.next);
    if (!page.cards.length && !page.next && picked.length) begin(picked);
  };
  const decide = async (alreadyKnown: boolean) => {
    const card = cards[index];
    if (!card || lock.current || leaving.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      // Level 1, not the older long-interval known-word exemption.
      if (alreadyKnown) { await startEnglishCard(db, card.id); setKnown(value => value + 1); }
      const picked = alreadyKnown ? selected : [...selected, card.id];
      if (!alreadyKnown) setSelected(picked);
      setIndex(index + 1);
      if (picked.length >= limit || index + 1 === cards.length && !cursor) {
        if (picked.length) begin(picked);
        return;
      }
      if (index + 1 === cards.length && cursor) await loadMore(picked);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa lưu được lựa chọn. Hãy thử lại."); }
    finally { lock.current = false; setBusy(false); }
  };
  const retryMore = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await loadMore(selected); }
    catch { setError("Chưa tải được thẻ tiếp theo. Lựa chọn của bạn vẫn được giữ."); }
    finally { lock.current = false; setBusy(false); }
  };
  const card = cards[index];
  const goal = Math.min(limit, Math.max(selected.length, total - known));

  return <Screen hideHeader compact safeAreaEdges={["top", "bottom"]}>
    <View style={s.heading}>
      <View style={{ flex: 1, gap: 4 }}><Text accessibilityRole="header" style={[s.title, { color: p.textPrimary }]}>Chọn từ muốn học</Text><Text style={{ color: p.textMuted }}>{name || "Bộ từ tiếng Anh"}</Text></View>
      <Ionicons name="albums-outline" size={28} color={p.primary} />
    </View>
    <View style={s.sizes} accessibilityLabel="Số từ muốn học">{ENGLISH_REVIEW_BATCH_SIZES.map(size => <Pressable key={size} accessibilityRole="radio" accessibilityLabel={`${size} từ mỗi lượt`} accessibilityState={{ selected: limit === size, disabled: busy || loading || size < selected.length }} disabled={busy || loading || size < selected.length} onPress={() => { setLimit(size); if (selected.length === size) begin(selected); }} style={[s.size, { backgroundColor: limit === size ? p.primary : p.surface, borderColor: limit === size ? p.primary : p.border, opacity: size < selected.length ? 0.4 : 1 }]}><Text style={{ color: limit === size ? "#fff" : p.textPrimary, fontWeight: "800" }}>{size} từ</Text></Pressable>)}</View>
    <View style={s.counts}><Text testID="english-selection-count" style={{ color: p.primary, fontWeight: "800" }}>Đã chọn {selected.length}/{goal}</Text><Text style={{ color: p.textMuted }}>{card ? `Thẻ ${index + 1}/${total}` : ""}</Text></View>
    {known ? <Text accessibilityLiveRegion="polite" style={{ color: p.textSecondary }}>Đã lưu {known} từ ở cấp 1 · sẽ ôn theo lịch</Text> : null}
    {error ? <View style={[s.alert, { backgroundColor: p.errorLight }]}><Text accessibilityRole="alert" style={{ color: p.error }}>{error}</Text>{!cards.length ? <PrimaryButton variant="secondary" label="Thử lại" onPress={() => setRetry(value => value + 1)} /> : !card && cursor ? <PrimaryButton variant="secondary" label="Tải lại thẻ tiếp theo" onPress={() => void retryMore()} /> : null}</View> : null}
    {loading || busy && !card ? <View style={s.empty}><ActivityIndicator color={p.primary} /><Text style={{ color: p.textMuted }}>Đang chuẩn bị thẻ…</Text></View> : card ? <>
      <View testID="english-selection-flashcard" style={[s.card, { backgroundColor: p.surface, borderColor: p.border }]}>
        <Text testID="english-selection-word" accessibilityRole="header" style={[s.word, { color: p.textPrimary }]}>{card.headword}</Text>
        <Text testID="english-selection-ipa" style={[s.ipa, { color: p.textMuted }]}>{card.ipa || "Chưa có phiên âm"}</Text>
        <Text testID="english-selection-meaning" style={[s.meaning, { color: p.textPrimary }]}>{card.meaning_vi}</Text>
        <EnglishAudioButton text={card.headword} autoPlayKey={card.id} single compact defaultAccent={preferences.englishVariant} />
      </View>
      <View style={s.actions}>
        <PrimaryButton label="Đã biết" variant="secondary" disabled={busy} onPress={() => void decide(true)} style={s.action} />
        <PrimaryButton label="Học từ này" disabled={busy} onPress={() => void decide(false)} style={s.action} />
      </View>
      <Text style={[s.note, { color: p.textMuted }]}>Đã biết: lưu cấp 1. Chọn đủ từ muốn học sẽ tự bắt đầu.</Text>
    </> : !error ? <View style={s.empty}>
      <Ionicons name="checkmark-circle-outline" size={44} color={p.success} />
      <Text style={[s.meaning, { color: p.textPrimary }]}>{known ? "Đã xem hết các từ mới" : "Không còn từ mới trong bộ"}</Text>
      {selected.length ? <PrimaryButton label={`Học ${selected.length} từ đã chọn`} onPress={() => begin(selected)} /> : null}
      <PrimaryButton variant="secondary" label="Mở bộ từ" onPress={() => router.replace({ pathname: "/english/decks/[id]", params: { id } } as Href)} />
      <PrimaryButton variant="ghost" label="Thêm từ mới" onPress={() => router.push({ pathname: "/english/bulk", params: { deck: id } } as Href)} />
    </View> : null}
    {!card && cursor && !busy && !error ? <PrimaryButton label="Xem thẻ tiếp theo" onPress={() => void retryMore()} /> : null}
  </Screen>;
}

const s = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 12 }, title: { fontSize: 24, fontWeight: "800" },
  sizes: { flexDirection: "row", gap: 8 }, size: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: 6 },
  counts: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  card: { borderWidth: 1, borderRadius: 24, padding: 24, paddingVertical: 32, gap: 22, minHeight: 290, justifyContent: "center", alignItems: "center" },
  word: { fontSize: 36, lineHeight: 46, fontWeight: "800", textAlign: "center", alignSelf: "stretch" },
  ipa: { fontSize: 19, lineHeight: 27, textAlign: "center" }, meaning: { fontSize: 24, lineHeight: 33, fontWeight: "700", textAlign: "center" },
  actions: { flexDirection: "row", gap: 10 }, action: { flex: 1, minHeight: 56, paddingHorizontal: 10 },
  empty: { paddingVertical: 30, alignItems: "center", gap: 14 }, alert: { padding: 12, borderRadius: 12, gap: 8 },
  note: { fontSize: 14, lineHeight: 21, textAlign: "center" },
});
