import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { EnglishWritingAIEntry } from "@/components/ChineseAIEntry";
import { EnglishAudioButton } from "@/components/EnglishAudioButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { EnglishSensePickerModal } from "@/components/english/EnglishSensePickerModal";
import { readEnglishCard } from "@/db/english/card-editor";
import { addEnglishDictionaryCard, listEnglishDecks, type EnglishCard } from "@/db/english/learner";
import { englishMemoryLevel } from "@/db/english/personal-vocabulary";
import { lookupSkypedia, rankEnglishDictionaryCandidates, type SkypediaMeaning } from "@/db/english/skypedia";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { englishLocalId } from "@/services/languages/ids";
import { getSkypediaDictionary } from "@/services/languages/skypedia-runtime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export default function EnglishWordDetail() {
  const params = useLocalSearchParams<{ word?: string; cardId?: string }>();
  const db = useEnglishDatabase();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [card, setCard] = useState<EnglishCard | null>(null);
  const [word, setWord] = useState(params.word ?? "");
  const [candidates, setCandidates] = useState<SkypediaMeaning[]>([]);
  const [selected, setSelected] = useState<SkypediaMeaning | null>(null);
  const [meaning, setMeaning] = useState("");
  const [decks, setDecks] = useState<{ id: string; name: string }[]>([]);
  const [deckId, setDeckId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dictionaryError, setDictionaryError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [editMeaning, setEditMeaning] = useState(false);
  const [addingAnother, setAddingAnother] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const saveLock = useRef(false);
  const loadRequest = useRef(0);

  const load = useCallback(() => {
    const request = ++loadRequest.current;
    const live = () => request === loadRequest.current;
    setLoading(true); setError(""); setDictionaryError("");
    void (async () => {
      try {
        const [available, saved] = await Promise.all([listEnglishDecks(db), params.cardId ? readEnglishCard(db, params.cardId) : Promise.resolve(null)]);
        const currentWord = saved?.headword ?? params.word ?? "";
        if (!live()) return;
        if (!currentWord.trim()) throw new Error("Chưa có từ để xem.");
        setCard(saved); setWord(currentWord); setDecks(available); setDeckId(saved?.deck_id ?? available[0]?.id ?? "");
        setMeaning(saved?.meaning_vi ?? ""); setAddingAnother(false); setExpanded(false); setEditMeaning(false); setSelected(null); setCandidates([]);
        if (saved) setLoading(false);
        try {
          const source = await getSkypediaDictionary();
          const ranked = rankEnglishDictionaryCandidates(await lookupSkypedia(source, currentWord), { preferredSenseId: saved?.sense_id, preferredPos: saved?.pos });
          if (!live()) return;
          const choice = saved?.sense_id ? ranked.find(item => item.senseId === saved.sense_id) ?? null : !saved && ranked.length === 1 ? ranked[0]! : null;
          setCandidates(ranked); setSelected(choice);
          if (!saved) setMeaning(choice?.shortMeaning ?? "");
        } catch {
          if (live()) setDictionaryError(saved ? "Chưa tải được nghĩa bổ sung. Bạn vẫn có thể học và sửa từ đã lưu." : "Chưa mở được từ điển. Hãy tải lại hoặc thêm từ với nghĩa riêng.");
        }
      } catch (failure) { if (live()) setError(failure instanceof Error ? failure.message : "Chưa tải được từ. Hãy thử lại."); }
      finally { if (live()) { setLoading(false); setClock(Date.now()); } }
    })();
  }, [db, params.cardId, params.word]);
  useFocusEffect(useCallback(() => { load(); return () => { loadRequest.current++; }; }, [load]));

  const save = async (learnNow: boolean) => {
    if (!selected || !deckId || !meaning.trim() || saveLock.current) return;
    saveLock.current = true; setBusy(true); setError("");
    try {
      const fromSource = [selected.shortMeaning, selected.meaning].some(value => meaning.trim() === value.trim());
      const newId = englishLocalId("card");
      await addEnglishDictionaryCard(db, {
        id: newId, deck_id: deckId, headword: selected.headword, meaning_vi: meaning.trim(),
        pos: fromSource ? selected.pos : "", ipa: fromSource ? selected.ipa : "", sense_id: fromSource ? selected.senseId : null, source_id: fromSource ? selected.source : "USER",
        notes: fromSource ? [selected.meaning !== selected.shortMeaning ? `Nghĩa đầy đủ từ nguồn: ${selected.meaning}` : "", selected.usageNote ? `Ghi chú nguồn: ${selected.usageNote}` : "", selected.example ? `Ví dụ: ${selected.example}` : ""].filter(Boolean).join("\n") : "",
      });
      if (learnNow) router.replace({ pathname: "/english/review", params: { deckId, learn: JSON.stringify([newId]) } } as Href);
      else router.replace({ pathname: "/english/word", params: { cardId: newId } } as Href);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa lưu được từ. Hãy thử lại."); }
    finally { saveLock.current = false; setBusy(false); }
  };

  const adding = !card || addingAnother;
  const displayMeaning = adding ? meaning || selected?.shortMeaning : card.meaning_vi;
  const ipa = !adding && card?.ipa ? card.ipa : selected?.ipa || candidates[0]?.ipa;
  const pos = !adding && card?.pos ? card.pos : selected?.pos;
  const due = !!card?.next_review_at && new Date(card.next_review_at).getTime() <= clock;
  const canLearn = !!card && card.status === "NEW" && !card.suspended;
  const canReview = !!card && card.status !== "NEW" && !card.suspended && due;
  const box = { backgroundColor: p.surface, borderColor: p.border };
  const goLearn = () => { if (card) router.push({ pathname: "/english/review", params: { deckId: card.deck_id, learn: JSON.stringify([card.id]) } } as Href); };

  return <Screen hideHeader compact avoidKeyboard>
    <EnglishWritingAIEntry />
    {loading ? <View style={s.loading}><ActivityIndicator color={p.primary} /><Text style={{ color: p.textMuted }}>Đang mở từ…</Text></View> : null}
    {error ? <View style={[s.alert, { backgroundColor: p.errorLight }]}><Text accessibilityRole="alert" style={{ color: p.error }}>{error}</Text><PrimaryButton variant="secondary" label="Thử tải lại" onPress={load} /></View> : null}
    {!loading && word ? <>
      <View testID="english-word-detail-header" style={[s.card, box]}>
        <View style={s.titleRow}><Text accessibilityRole="header" style={[s.headword, { color: p.textPrimary }]}>{word}</Text>{card ? <Pressable accessibilityRole="button" accessibilityLabel="Sửa từ đã lưu" onPress={() => router.push({ pathname: "/english/card-edit", params: { id: card.id } } as Href)} style={[s.editButton, { backgroundColor: p.surfaceSubtle }]}><Ionicons name="create-outline" size={21} color={p.primary} /><Text style={{ color: p.primary, fontWeight: "700" }}>Sửa</Text></Pressable> : null}</View>
        {ipa || pos ? <Text style={[s.meta, { color: p.textMuted }]}>{[ipa, pos].filter(Boolean).join(" · ")}</Text> : null}
        <EnglishAudioButton text={word} compact />
        <View testID="english-word-detail-meaning" style={{ gap: 8 }}>
          {displayMeaning ? <Text style={[s.meaning, { color: p.textPrimary }]}>{displayMeaning}</Text> : <Text style={{ color: p.textSecondary }}>Chọn nghĩa bạn muốn học.</Text>}
          {card && !adding ? <View style={s.statusRow}><Ionicons name={card.suspended ? "pause-circle-outline" : card.status === "NEW" ? "sparkles-outline" : "time-outline"} size={18} color={p.primary} /><Text style={{ color: p.textSecondary }}>{card.suspended ? "Đã bỏ qua" : card.status === "NEW" ? "Chưa học" : JSON.parse(card.progress_json).isKnown ? "Đã biết" : `Mức nhớ ${englishMemoryLevel(card)}/6`}</Text></View> : null}
          {card?.next_review_at && !card.suspended && !adding ? <Text style={{ color: due ? p.primary : p.textMuted, lineHeight: 22 }}>{due ? "Đã đến giờ ôn" : `Ôn tiếp: ${new Date(card.next_review_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}`}</Text> : null}
        </View>
        {!adding && card ? <PrimaryButton label={canLearn ? "Học ngay" : canReview ? "Ôn bộ từ" : "Mở bộ từ"} onPress={canLearn ? goLearn : () => router.push({ pathname: canReview ? "/english/review" : "/english/decks/[id]", params: canReview ? { deckId: card.deck_id } : { id: card.deck_id } } as Href)} /> : null}
      </View>

      {candidates.length > 1 || !selected && candidates.length ? <Pressable testID="english-word-detail-meaning-heading" accessibilityRole="button" onPress={() => setPickerVisible(true)} style={[s.actionRow, box]}><Ionicons name="list-outline" size={23} color={p.primary} /><Text style={{ flex: 1, color: p.textPrimary, fontWeight: "700" }}>{card ? "Xem nghĩa khác" : selected ? "Đổi nghĩa" : `Chọn nghĩa (${candidates.length})`}</Text><Ionicons name="chevron-forward" size={20} color={p.textMuted} /></Pressable> : null}

      {adding && selected ? <View style={[s.card, box]}>
        <View style={s.titleRow}><Text style={[s.section, { color: p.textPrimary }]}>Lưu vào bộ từ</Text><Pressable accessibilityRole="button" accessibilityLabel="Chỉnh nghĩa trước khi lưu" accessibilityState={{ expanded: editMeaning }} onPress={() => setEditMeaning(value => !value)} style={s.touch}><Ionicons name="pencil-outline" size={21} color={p.primary} /></Pressable></View>
        {editMeaning ? <TextInput accessibilityLabel="Nghĩa tiếng Việt" value={meaning} onChangeText={setMeaning} multiline maxLength={2000} style={[s.input, { color: p.textPrimary, borderColor: p.border }]} /> : null}
        {decks.length ? <View style={s.deckWrap}>{decks.map(deck => <Pressable key={deck.id} accessibilityRole="radio" accessibilityState={{ selected: deck.id === deckId }} onPress={() => setDeckId(deck.id)} style={[s.deckChip, { backgroundColor: deck.id === deckId ? p.primaryLight : p.surfaceSubtle, borderColor: deck.id === deckId ? p.primary : p.border }]}><Ionicons name="folder-outline" size={17} color={deck.id === deckId ? p.primary : p.textMuted} /><Text style={{ color: deck.id === deckId ? p.primary : p.textPrimary }}>{deck.name}</Text></Pressable>)}</View> : <PrimaryButton variant="secondary" label="Tạo bộ từ" onPress={() => router.push("/english/decks" as Href)} />}
        {card ? <Text style={{ color: p.textMuted, lineHeight: 21 }}>Nghĩa này sẽ được lưu thành từ riêng trong bộ bạn chọn.</Text> : null}
        <PrimaryButton label="Lưu & học ngay" loading={busy} disabled={!deckId || !meaning.trim()} onPress={() => void save(true)} />
        <PrimaryButton variant="secondary" label="Lưu để học sau" disabled={busy || !deckId || !meaning.trim()} onPress={() => void save(false)} />
        {addingAnother ? <PrimaryButton variant="ghost" label="Quay lại từ đã lưu" onPress={() => { setAddingAnother(false); setMeaning(card?.meaning_vi ?? ""); }} /> : null}
      </View> : null}

      {selected?.example ? <View style={[s.example, { borderColor: p.border }]}><Ionicons name="chatbubble-ellipses-outline" size={21} color={p.primary} /><View style={{ flex: 1, gap: 5 }}><Text style={{ color: p.textMuted, fontWeight: "700" }}>Ví dụ</Text><Text style={{ color: p.textPrimary, fontSize: 17, lineHeight: 25 }}>{selected.example}</Text></View></View> : null}
      {dictionaryError ? <Text style={{ color: p.textMuted, lineHeight: 21 }}>{dictionaryError}</Text> : null}
      {!card && !candidates.length ? <PrimaryButton variant="secondary" label="Thêm từ với nghĩa riêng" onPress={() => router.push("/english/bulk" as Href)} /> : null}

      <View style={[s.details, { borderColor: p.border }]}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={s.disclosure}><Ionicons name="information-circle-outline" size={22} color={p.textMuted} /><Text style={{ flex: 1, color: p.textSecondary, fontWeight: "700" }}>Chi tiết & nguồn</Text><Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={p.textMuted} /></Pressable>
        {expanded ? <View style={{ gap: 14, paddingBottom: 16 }}>
          <Text style={{ color: p.textSecondary, lineHeight: 22 }}>Phát âm bằng giọng đọc máy trên thiết bị. Nút US dùng giọng Anh Mỹ, UK dùng giọng Anh Anh.</Text>
          {selected?.meaning ? <Text style={{ color: p.textSecondary, lineHeight: 24 }}>{selected.meaning}</Text> : null}
          {selected?.usageNote ? <Text style={{ color: p.textSecondary }}>{selected.usageNote}</Text> : null}
          {card?.notes ? <Text style={{ color: p.textSecondary, lineHeight: 23 }}>{card.notes.split("\n[4Chinese English context v1]\n")[0]}</Text> : null}
          <Pressable accessibilityRole="button" onPress={() => router.push("/english/dictionary-source" as Href)} style={s.touch}><Text style={{ color: p.primary, fontWeight: "700" }}>Nguồn từ điển và giấy phép</Text></Pressable>
        </View> : null}
      </View>
      {pickerVisible ? <EnglishSensePickerModal visible={pickerVisible} headword={word} meanings={candidates} selected={selected} initialMeaning={meaning} onClose={() => setPickerVisible(false)} onConfirm={(choice, text) => { setSelected(choice); setMeaning(text); setAddingAnother(!!card); setPickerVisible(false); setError(""); }} /> : null}
    </> : null}
  </Screen>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 16 }, titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headword: { flex: 1, minWidth: 0, fontSize: 34, lineHeight: 43, fontWeight: "800" }, meta: { fontSize: 16, lineHeight: 24 }, meaning: { fontSize: 25, lineHeight: 34, fontWeight: "700" },
  section: { flex: 1, fontSize: 19, fontWeight: "800" }, editButton: { minHeight: 44, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 7 }, actionRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, padding: 16, borderWidth: 1, borderRadius: 15 },
  input: { minHeight: 76, borderWidth: 1, borderRadius: 12, padding: 12, textAlignVertical: "top", fontSize: 18, lineHeight: 26 },
  deckWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, deckChip: { minHeight: 44, borderWidth: 1, paddingHorizontal: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  example: { paddingVertical: 14, paddingHorizontal: 4, gap: 12, flexDirection: "row", borderBottomWidth: 1 }, details: { borderTopWidth: 1 }, disclosure: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10 },
  touch: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" }, alert: { padding: 14, borderRadius: 14, gap: 10 }, loading: { padding: 28, gap: 12, alignItems: "center" },
});
