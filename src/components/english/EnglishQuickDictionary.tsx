import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
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
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EnglishAudioButton } from "@/components/EnglishAudioButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EnglishSensePickerModal } from "@/components/english/EnglishSensePickerModal";
import { addEnglishDictionaryCard, listEnglishDecks } from "@/db/english/learner";
import {
  lookupSkypedia,
  type SkypediaMeaning,
} from "@/db/english/skypedia";
import { searchEnglishDictionary, type IntelligentSearchResult } from "@/services/english/dictionary-intelligence";
import { notesWithEnglishContext, type EnglishReadingContext } from "@/services/english/reading-context";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { englishLocalId } from "@/services/languages/ids";
import { getSkypediaDictionary } from "@/services/languages/skypedia-runtime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

type Props = {
  initialQuery?: string;
  readingContext?: EnglishReadingContext;
  onViewPersonal?: (word: string) => void;
  onClose: () => void;
};

export function EnglishQuickDictionary({ initialQuery = "", readingContext, onViewPersonal, onClose }: Props) {
  const db = useEnglishDatabase();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<IntelligentSearchResult[]>([]);
  const [candidates, setCandidates] = useState<SkypediaMeaning[]>([]);
  const [selected, setSelected] = useState<SkypediaMeaning | null>(null);
  const [meaning, setMeaning] = useState("");
  const [decks, setDecks] = useState<{ id: string; name: string }[]>([]);
  const [deckId, setDeckId] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [picker, setPicker] = useState(false);
  const [saveSurface, setSaveSurface] = useState(false);
  const [isRelatedForm, setIsRelatedForm] = useState(false);
  const [contextConsent, setContextConsent] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const saveLock = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    let live = true;
    void listEnglishDecks(db).then((rows) => {
      if (live) {
        setDecks(rows);
        setDeckId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id ?? "");
      }
    }).catch(() => {
      if (live) setError("Chưa tải được bộ từ. Dữ liệu học hiện tại vẫn được giữ nguyên.");
    });
    return () => { live = false; };
  }, [db]);

  useEffect(() => () => { generation.current += 1; }, []);

  useEffect(() => {
    if (query.trim().length < 2 || candidates.length > 0) return;
    const current = ++generation.current;
    const timer = setTimeout(() => {
      setBusy(true);
      setError("");
      void getSkypediaDictionary()
        .then((source) => searchEnglishDictionary(source, query, 10))
        .then((rows) => {
          if (current === generation.current) setResults(rows);
        })
        .catch((failure) => {
          if (current === generation.current) {
            setError(failure instanceof Error ? failure.message : "Chưa tra được từ điển.");
            setResults([]);
          }
        })
        .finally(() => { if (current === generation.current) setBusy(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, candidates.length]);

  const changeQuery = (value: string) => {
    generation.current += 1;
    setQuery(value);
    setResults([]);
    setBusy(false);
    setCandidates([]);
    setSelected(null);
    setMeaning("");
    setSaveSurface(false);
    setIsRelatedForm(false);
    setContextConsent(false);
    setNotice("");
    setError("");
  };

  const choose = useCallback(async (row: IntelligentSearchResult) => {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const source = await getSkypediaDictionary();
      const found = await lookupSkypedia(source, row.headword);
      if (current !== generation.current) return;
      setCandidates(found);
      setIsRelatedForm(row.match === 'lemma' || row.match === 'form');
      setSaveSurface(false);
      const choice = found.length === 1 ? found[0]! : null;
      setSelected(choice);
      setMeaning(choice?.shortMeaning ?? "");
      setResults([]);
      Keyboard.dismiss();
    } catch (failure) {
      if (current === generation.current)
        setError(failure instanceof Error ? failure.message : "Chưa mở được mục từ.");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }, []);

  const save = async () => {
    if (!selected || !deckId || !meaning.trim() || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const sourceMeaning = meaning.trim() === (selected.shortMeaning || selected.meaning).trim();
      const headword = saveSurface && isRelatedForm ? (readingContext && query === initialQuery ? readingContext.surface : query.trim()) : selected.headword;
      const sourceNotes = sourceMeaning && selected.example ? `Ví dụ từ nguồn: ${selected.example}` : "";
      const formNotes = headword !== selected.headword ? `${sourceNotes}\nDạng đã chọn: ${headword}; nghĩa nguồn thuộc ${selected.headword}.` : sourceNotes;
      await addEnglishDictionaryCard(db, {
        id: englishLocalId("card"),
        deck_id: deckId,
        headword,
        meaning_vi: meaning.trim(),
        pos: sourceMeaning ? selected.pos : "",
        ipa: sourceMeaning && !saveSurface ? selected.ipa : "",
        sense_id: sourceMeaning ? selected.senseId : null,
        source_id: sourceMeaning ? selected.source : "USER",
        notes: readingContext && sourceMeaning && query === initialQuery ? notesWithEnglishContext(formNotes, readingContext, selected.senseId, contextConsent) : formNotes,
      });
      setNotice(`Đã lưu “${headword}” vào bộ “${decks.find((row) => row.id === deckId)?.name ?? ""}”.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Chưa lưu được từ. Thẻ hiện có vẫn được giữ nguyên.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const pronunciation = selected?.pronunciations ?? [];
  return (
    <Modal visible transparent animationType={reducedMotion ? "none" : "slide"} onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={[s.overlay, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable accessibilityLabel="Đóng tra từ" onPress={onClose} style={s.scrim} />
        <View style={[s.sheet, { backgroundColor: p.background, borderColor: p.border, paddingBottom: Math.max(24, insets.bottom) }]}>
          <View style={s.handleRow}><View style={[s.handle, { backgroundColor: p.borderSubtle }]} /></View>
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: p.textPrimary }]}>Tra từ nhanh</Text>
              <Text style={[s.caption, { color: p.textMuted }]}>Từ điển Anh–Việt trên thiết bị</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={s.close}><Ionicons name="close" size={24} color={p.textPrimary} /></Pressable>
          </View>
          <View style={[s.search, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Ionicons name="search" size={20} color={p.textMuted} />
            <TextInput
              accessibilityLabel="Tra từ tiếng Anh hoặc nghĩa tiếng Việt"
              autoFocus={!initialQuery}
              value={query}
              onChangeText={changeQuery}
              placeholder="Tra từ tiếng Anh hoặc nghĩa tiếng Việt"
              placeholderTextColor={p.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => results[0] && void choose(results[0])}
              style={[s.input, { color: p.textPrimary }]}
            />
            {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Xóa nội dung" onPress={() => changeQuery("")} style={s.clear}><Ionicons name="close-circle" size={19} color={p.textMuted} /></Pressable>}
          </View>
          <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={s.content}>
            {busy ? <ActivityIndicator color={p.primary} accessibilityLabel="Đang tra từ" /> : null}
            {error ? <Text accessibilityRole="alert" style={[s.notice, { color: p.error }]}>{error}</Text> : null}
            {notice ? <Text accessibilityLiveRegion="polite" style={[s.notice, { color: p.success }]}>{notice}</Text> : null}
            {results.map((row) => (
              <Pressable key={row.headword} accessibilityRole="button" onPress={() => void choose(row)} style={[s.result, { backgroundColor: p.surface, borderColor: p.border }]}>
                <View style={{ flex: 1 }}><Text style={[s.resultWord, { color: p.textPrimary }]}>{row.headword}</Text><Text style={{ color: p.textMuted }}>{row.explanation ?? (row.match === "exact" ? "Mục từ" : row.match === "meaning" ? "Nghĩa tiếng Việt" : "Gợi ý")} · {row.senseCount} nghĩa</Text></View>
                <Ionicons name="chevron-forward" size={18} color={p.textMuted} />
              </Pressable>
            ))}
            {!busy && query.trim().length >= 2 && !results.length && !candidates.length && !error ? <View style={{ gap: 8 }}><Text style={{ color: p.textSecondary }}>Không tìm thấy mục từ phù hợp. Không có nghĩa nào được tự tạo.</Text><Pressable accessibilityRole="button" onPress={() => { onClose(); router.push('/english/bulk' as Href); }} style={s.link}><Text style={{ color: p.primary }}>Nhập từ và nghĩa của bạn</Text></Pressable></View> : null}
            {candidates.length > 1 && !selected ? (
              <View style={[s.detail, { backgroundColor: p.surface, borderColor: p.border }]}>
                <Text style={[s.word, { color: p.textPrimary }]}>{candidates[0]?.headword ?? query}</Text>
                {isRelatedForm ? <Text style={{ color: p.textSecondary }}>{query} → {candidates[0]?.headword} · dạng liên quan</Text> : null}
                <Text style={{ color: p.textSecondary }}>Bạn muốn tra nghĩa nào?</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn nghĩa phù hợp trong ${candidates.length} nghĩa`}
                  onPress={() => setPicker(true)}
                  style={s.link}
                >
                  <Text style={{ color: p.primary, fontWeight: "800" }}>Chọn nghĩa phù hợp</Text>
                </Pressable>
              </View>
            ) : null}
            {selected ? (
              <View style={[s.detail, { backgroundColor: p.surface, borderColor: p.border }]}>
                <Text style={[s.word, { color: p.textPrimary }]}>{selected.headword}</Text>
                {isRelatedForm ? <Text style={{ color: p.textSecondary }}>{query} → {selected.headword} · dạng liên quan</Text> : null}
                {!!selected.pos && <Text style={[s.pos, { color: p.primary }]}>{selected.pos}</Text>}
                {pronunciation.map((item, index) => <Text key={`${item.ipa}-${index}`} style={{ color: p.textSecondary }}>{item.region ? `${item.region} · ` : "IPA mục từ · "}{item.ipa}</Text>)}
                <EnglishAudioButton text={selected.headword} />
                <View style={[s.section, { borderColor: p.border }]}>
                  <Text style={[s.label, { color: p.primary }]}>VI · NGHĨA TIẾNG VIỆT</Text>
                  <Text style={[s.meaning, { color: p.textPrimary }]}>{selected.shortMeaning || selected.meaning}</Text>
                  {selected.example ? <Text style={{ color: p.textSecondary }}>Ví dụ từ nguồn: {selected.example}</Text> : null}
                  {candidates.length > 1 && <Pressable accessibilityRole="button" onPress={() => setPicker(true)} style={s.link}><Text style={{ color: p.primary }}>Chọn nghĩa khác ({candidates.length})</Text></Pressable>}
                  <Text style={[s.label, { color: p.textSecondary }]}>LƯU VÀO BỘ TỪ</Text>
                  {isRelatedForm ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: saveSurface }} onPress={() => setSaveSurface(value => !value)} style={s.link}><Text style={{ color: p.primary }}>{saveSurface ? "☑" : "□"} Lưu dạng “{query}” thay vì “{selected.headword}”</Text></Pressable> : null}
                  {readingContext?.sentence && query === initialQuery ? <View style={{ gap: 8 }}><Text style={{ color: p.textSecondary }}>{readingContext.sentence}</Text><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: contextConsent }} onPress={() => setContextConsent(value => !value)} style={s.link}><Text style={{ color: p.primary }}>{contextConsent ? "☑" : "□"} Lưu câu này riêng trên thiết bị cùng nghĩa đã chọn</Text></Pressable></View> : null}
                  {decks.length ? <View style={s.deckList}>{decks.map((deck) => <Pressable key={deck.id} accessibilityRole="radio" accessibilityState={{ selected: deckId === deck.id }} onPress={() => setDeckId(deck.id)} style={[s.deckChip, { backgroundColor: deckId === deck.id ? p.primary : p.surfaceSubtle }]}><Text style={{ color: deckId === deck.id ? "white" : p.textPrimary }}>{deck.name}</Text></Pressable>)}</View> : <Text style={{ color: p.textSecondary }}>Chưa có bộ từ. Hãy tạo bộ trước rồi quay lại lưu.</Text>}
                  <PrimaryButton label={saving ? "Đang lưu…" : "Lưu nghĩa này"} disabled={saving || !decks.length || !deckId} onPress={() => void save()} />
                  {!decks.length && <Pressable accessibilityRole="button" onPress={() => { onClose(); router.push("/english/decks" as Href); }} style={s.link}><Text style={{ color: p.primary }}>Tạo bộ từ</Text></Pressable>}
                </View>
                <Pressable accessibilityRole="button" onPress={() => { onClose(); router.push(`/english/word?word=${encodeURIComponent(selected.headword)}` as Href); }} style={s.link}><Text style={{ color: p.primary }}>Xem chi tiết từ điển</Text></Pressable>
              </View>
            ) : null}
            {onViewPersonal ? <Pressable accessibilityRole="button" onPress={() => { onClose(); onViewPersonal(saveSurface ? query : selected?.headword ?? query); }} style={s.link}><Text style={{ color: p.primary }}>Xem thẻ bạn đã lưu</Text></Pressable> : null}
            <Pressable accessibilityRole="button" onPress={() => setShowSource(value => !value)} style={s.link}><Text style={{ color: p.textMuted }}>Thông tin nguồn {showSource ? "−" : "+"}</Text></Pressable>
            {showSource ? <Text style={[s.sourceNote, { color: p.textMuted }]}>Skypedia Anh–Việt · cục bộ, readonly. IPA thuộc mục từ, không phải từng nghĩa. Nguồn chưa có định nghĩa EN hoặc tần suất được xác minh. Dạng từ là gợi ý ngữ pháp, không tự chọn nghĩa.</Text> : null}
          </ScrollView>
          {picker ? <EnglishSensePickerModal visible={picker} headword={candidates[0]?.headword ?? query} meanings={candidates} selected={selected} initialMeaning={meaning} onClose={() => setPicker(false)} onConfirm={(choice, selectedMeaning) => { setSelected(choice); setMeaning(selectedMeaning); setPicker(false); setNotice(""); }} /> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.38)" },
  scrim: { ...StyleSheet.absoluteFill },
  sheet: { maxHeight: "90%", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, paddingHorizontal: 18, paddingBottom: 24 },
  handleRow: { alignItems: "center", paddingVertical: 10 }, handle: { width: 44, height: 5, borderRadius: 5 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }, title: { fontSize: 22, fontWeight: "800" }, caption: { fontSize: 13, marginTop: 2 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  search: { minHeight: 54, borderWidth: 1, borderRadius: 16, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 }, input: { flex: 1, minHeight: 50, fontSize: 16 }, clear: { padding: 8 },
  content: { paddingTop: 12, paddingBottom: 24, gap: 10 }, result: { minHeight: 60, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, resultWord: { fontSize: 17, fontWeight: "800" },
  detail: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 }, word: { fontSize: 31, fontWeight: "900" }, pos: { fontWeight: "800", textTransform: "capitalize" }, section: { borderTopWidth: 1, paddingTop: 12, marginTop: 6, gap: 10 }, label: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 }, meaning: { fontSize: 19, lineHeight: 27, fontWeight: "700" }, deckList: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, deckChip: { minHeight: 42, justifyContent: "center", paddingHorizontal: 12, borderRadius: 12 }, link: { minHeight: 44, justifyContent: "center" }, notice: { padding: 12, borderRadius: 12, fontSize: 14 }, sourceNote: { fontSize: 12, lineHeight: 17, paddingVertical: 8 },
});
