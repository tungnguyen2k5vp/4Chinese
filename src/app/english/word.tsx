import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { EnglishAudioButton } from "@/components/EnglishAudioButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { EnglishSensePickerModal } from "@/components/english/EnglishSensePickerModal";
import { readEnglishCard } from "@/db/english/card-editor";
import { addEnglishDictionaryCard, listEnglishDecks, startEnglishCard, type EnglishCard } from "@/db/english/learner";
import { englishMemoryLevel } from "@/db/english/personal-vocabulary";
import {
  lookupSkypedia,
  rankEnglishDictionaryCandidates,
  type SkypediaMeaning,
} from "@/db/english/skypedia";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { englishLocalId } from "@/services/languages/ids";
import { getSkypediaDictionary } from "@/services/languages/skypedia-runtime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

function regionLabel(region: string) {
  const value = region.trim().toLowerCase();
  if (/^(uk|br|bre|british|gb)$/u.test(value)) return "Anh Anh";
  if (/^(us|ame|american)$/u.test(value)) return "Anh Mỹ";
  return region.trim() || "Nguồn không ghi vùng giọng";
}

export default function EnglishWordDetail() {
  const params = useLocalSearchParams<{ word?: string; cardId?: string }>();
  const db = useEnglishDatabase();
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stackMeaningHeader = width < 600 || fontScale >= 1.2;
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
  const [notice, setNotice] = useState("");
  const [showFullSource, setShowFullSource] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [availableDecks, savedCard] = await Promise.all([
        listEnglishDecks(db),
        params.cardId ? readEnglishCard(db, params.cardId) : Promise.resolve(null),
      ]);
      const currentWord = savedCard?.headword ?? params.word ?? "";
      setCard(savedCard);
      setWord(currentWord);
      setDecks(availableDecks);
      setDeckId((current) => availableDecks.some((deck) => deck.id === current) ? current : savedCard?.deck_id ?? availableDecks[0]?.id ?? "");
      if (!currentWord.trim()) throw new Error("Chưa có từ để tra.");
      const source = await getSkypediaDictionary();
      const found = await lookupSkypedia(source, currentWord);
      const ranked = rankEnglishDictionaryCandidates(found, {
        preferredSenseId: savedCard?.sense_id,
        preferredPos: savedCard?.pos,
      });
      const initialSelection = savedCard?.sense_id
        ? ranked.find((candidate) => candidate.senseId === savedCard.sense_id) ?? null
        : savedCard
          ? null
          : ranked.length === 1
            ? ranked[0]!
            : null;
      setCandidates(ranked);
      setSelected(initialSelection);
      setMeaning(savedCard?.meaning_vi ?? initialSelection?.shortMeaning ?? "");
      setShowFullSource(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Chưa tải được dữ liệu từ điển.");
    } finally {
      setLoading(false);
    }
  }, [db, params.cardId, params.word]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const pronunciation = useMemo(() => {
    const list = selected?.pronunciations ?? candidates[0]?.pronunciations ?? [];
    return list.filter((item, index) => list.findIndex((other) => other.ipa === item.ipa && other.region === item.region) === index);
  }, [candidates, selected]);
  const save = async () => {
    if (!selected || !deckId || !meaning.trim() || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const fromSource = meaning.trim() === (selected.shortMeaning || selected.meaning).trim();
      await addEnglishDictionaryCard(db, {
        id: englishLocalId("card"),
        deck_id: deckId,
        headword: selected.headword,
        meaning_vi: meaning.trim(),
        pos: fromSource ? selected.pos : "",
        ipa: fromSource ? selected.ipa : "",
        sense_id: fromSource ? selected.senseId : null,
        source_id: fromSource ? selected.source : "USER",
        notes: fromSource ? [
          selected.meaning !== selected.shortMeaning ? `Nghĩa đầy đủ từ nguồn: ${selected.meaning}` : "",
          selected.usageNote ? `Ghi chú nguồn: ${selected.usageNote}` : "",
          selected.example ? `Ví dụ: ${selected.example}` : "",
        ].filter(Boolean).join("\n") : "",
      });
      setNotice(`Đã lưu “${selected.headword}” vào bộ từ.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Chưa lưu được từ. Thẻ hiện có không bị thay đổi.");
    } finally {
      setBusy(false);
    }
  };
  const start = async () => {
    if (!card || busy) return;
    setBusy(true);
    setError("");
    try {
      await startEnglishCard(db, card.id);
      setNotice("Đã bắt đầu học. Lịch ôn vẫn dùng bộ lập lịch hiện tại.");
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Chưa bắt đầu được thẻ.");
    } finally {
      setBusy(false);
    }
  };
  const box = { backgroundColor: p.surface, borderColor: p.border };

  return (
    <Screen hideTitle title="Chi tiết từ" subtitle="Chọn nghĩa phù hợp để lưu vào bộ của bạn." avoidKeyboard>
      {loading ? <ActivityIndicator accessibilityLabel="Đang tra từ" color={p.primary} /> : null}
      {error ? <View style={[s.alert, { backgroundColor: p.errorLight }]}><Text accessibilityRole="alert" style={{ color: p.error }}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={s.touch}><Text style={{ color: p.primary }}>Thử lại</Text></Pressable></View> : null}
      {notice ? <View style={[s.alert, { backgroundColor: p.successLight }]}><Text accessibilityLiveRegion="polite" style={{ color: p.success }}>{notice}</Text></View> : null}
      {!loading && word ? (
        <>
          <View testID="english-word-detail-header" style={[s.card, box]}>
            <Text style={[s.headword, { color: p.textPrimary }]}>{word}</Text>
            {selected?.pos ? <Text style={[s.pos, { color: p.primary }]}>{selected.pos}</Text> : null}
            {pronunciation.length ? pronunciation.map((item, index) => (
              <Text key={`${item.ipa}-${item.region}-${index}`} style={[s.ipa, { color: p.textSecondary }]}>
                IPA mục từ{item.region ? ` · ${regionLabel(item.region)}` : " · vùng giọng chưa ghi"} · {item.ipa}
              </Text>
            )) : <Text style={{ color: p.textMuted }}>Từ điển chưa có IPA cho mục này.</Text>}
            <View style={s.audioRow}>
              <EnglishAudioButton text={word} />
              <Text style={[s.metaNote, { color: p.textMuted }]}>TTS trên thiết bị · không phải bản ghi âm từ điển</Text>
            </View>
          </View>

          {card ? (
            <View style={[s.card, box]}>
              <Text style={[s.section, { color: p.textPrimary }]}>Thẻ cá nhân</Text>
              <Text style={[s.personalMeaning, { color: p.textPrimary }]}>{card.meaning_vi}</Text>
              <Text style={{ color: p.textSecondary }}>{card.status === "NEW" ? "Chưa học" : JSON.parse(card.progress_json).isKnown === true ? "Đã biết" : `Đang học · bậc ${englishMemoryLevel(card)}`}{card.suspended ? " · Đã bỏ qua" : ""}</Text>
              {card.next_review_at && !card.suspended ? <Text style={{ color: p.textMuted }}>Ôn tiếp: {new Date(card.next_review_at).toLocaleString("vi-VN")}</Text> : null}
              <View style={s.actionRow}>
                {card.status === "NEW" && !card.suspended ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void start()} style={[s.secondaryButton, { borderColor: p.primary }]}><Text style={{ color: p.primary }}>Bắt đầu học</Text></Pressable> : null}
                <Pressable accessibilityRole="button" onPress={() => router.push(`/english/card-edit?id=${encodeURIComponent(card.id)}` as Href)} style={[s.secondaryButton, { borderColor: p.border }]}><Text style={{ color: p.textPrimary }}>Sửa thẻ</Text></Pressable>
              </View>
            </View>
          ) : null}

          <View testID="english-word-detail-meaning" style={[s.card, box]}>
            <View testID="english-word-detail-meaning-heading" style={[s.sectionRow, stackMeaningHeader && s.sectionRowStacked]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.section, { color: p.textPrimary }]}>{selected ? "Nghĩa đang học" : "Chọn nghĩa muốn học"}</Text>
                <Text style={{ color: p.textSecondary }}>{selected ? selected.pos : candidates.length ? `${candidates.length} nghĩa · chưa có tần suất nghĩa được xác minh` : "Không tìm thấy mục từ chính xác"}</Text>
              </View>
              {candidates.length ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={selected ? `Xem và đổi nghĩa, còn ${Math.max(0, candidates.length - 1)} nghĩa khác` : `Chọn một trong ${candidates.length} nghĩa`}
                  onPress={() => setPickerVisible(true)}
                  style={[s.secondaryButton, { borderColor: p.primary }]}
                >
                  <Text style={{ color: p.primary }}>{selected ? `Xem ${Math.max(0, candidates.length - 1)} nghĩa khác` : `Chọn trong ${candidates.length} nghĩa`}</Text>
                </Pressable>
              ) : null}
            </View>
            {selected ? (
              <>
                <Text style={[s.selectedMeaning, { color: p.textPrimary }]}>{meaning || selected.shortMeaning || selected.meaning}</Text>
                {selected.usageNote ? <Text style={{ color: p.textSecondary }}>Ghi chú nguồn · {selected.usageNote}</Text> : null}
                {selected.example ? <View style={s.exampleBlock}><Text style={[s.label, { color: p.textMuted }]}>Ví dụ từ nguồn</Text><Text style={[s.exampleLarge, { color: p.textPrimary }]}>{selected.example}</Text></View> : null}
                {selected.meaning !== selected.shortMeaning ? (
                  <>
                    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showFullSource }} onPress={() => setShowFullSource((value) => !value)} style={s.touch}>
                      <Text style={{ color: p.primary }}>{showFullSource ? "Ẩn nghĩa đầy đủ từ nguồn" : "Xem nghĩa đầy đủ từ nguồn"}</Text>
                    </Pressable>
                    {showFullSource ? <Text style={[s.fullMeaning, { color: p.textSecondary }]}>{selected.meaning}</Text> : null}
                  </>
                ) : null}
                <Text style={[s.label, { color: p.textSecondary }]}>Nghĩa sẽ lưu (có thể chỉnh sửa)</Text>
                <TextInput accessibilityLabel="Chỉnh nghĩa tiếng Việt trước khi lưu" value={meaning} onChangeText={setMeaning} multiline maxLength={2000} style={[s.meaningInput, { color: p.textPrimary, borderColor: p.border }]} />
                <Text style={[s.metaNote, { color: p.textMuted }]}>{selected.rankingExplanation} Nguồn không cung cấp định nghĩa Anh–Anh hoặc ảnh đã xác minh.</Text>
                <Text style={[s.label, { color: p.textSecondary }]}>Bộ muốn lưu từ</Text>
                {decks.length ? <View style={s.deckWrap}>{decks.map((deck) => <Pressable key={deck.id} accessibilityRole="radio" accessibilityState={{ selected: deck.id === deckId }} onPress={() => setDeckId(deck.id)} style={[s.deckChip, { backgroundColor: deck.id === deckId ? p.primary : p.surfaceSubtle }]}><Text style={{ color: deck.id === deckId ? "white" : p.textPrimary }}>{deck.name}</Text></Pressable>)}</View> : <Text style={{ color: p.textSecondary }}>Tạo bộ từ trước hoặc dùng nhập danh sách hàng loạt.</Text>}
                <Text style={{ color: p.textMuted }}>Mỗi thẻ lưu một nghĩa; lưu nghĩa khác sẽ tạo thẻ riêng, không sửa thẻ đang học.</Text>
                <PrimaryButton label={busy ? "Đang lưu…" : card ? "Lưu nghĩa này thành thẻ riêng" : "Lưu nghĩa này vào bộ"} disabled={busy || !decks.length || !deckId || !meaning.trim()} onPress={() => void save()} />
              </>
            ) : (
              <Text style={{ color: p.textSecondary }}>
                {candidates.length ? "Từ này có nhiều nghĩa. Chọn theo ngữ cảnh bạn muốn học; ứng dụng không tự đoán nghĩa phổ biến nhất." : "Bạn vẫn có thể nhập nghĩa riêng từ màn thêm từ hàng loạt."}
              </Text>
            )}
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push("/english/dictionary-source" as Href)} style={s.sourceLink}>
            <Text style={{ color: p.primary }}>Nguồn từ điển & thông tin giấy phép</Text>
          </Pressable>
          {pickerVisible ? <EnglishSensePickerModal
            visible={pickerVisible}
            headword={word}
            meanings={candidates}
            selected={selected}
            initialMeaning={meaning}
            onClose={() => setPickerVisible(false)}
            onConfirm={(choice, selectedMeaning) => {
              setSelected(choice);
              setMeaning(selectedMeaning);
              setShowFullSource(false);
              setPickerVisible(false);
              setError("");
              setNotice("");
            }}
          /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  headword: { fontSize: 34, fontWeight: "800", lineHeight: 42 },
  ipa: { fontSize: 16, lineHeight: 24 },
  audioRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  metaNote: { fontSize: 12, lineHeight: 17 },
  section: { fontSize: 20, fontWeight: "800" },
  sectionRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  sectionRowStacked: { flexDirection: "column", alignItems: "stretch" },
  selectedMeaning: { fontSize: 24, lineHeight: 32, fontWeight: "800" },
  personalMeaning: { fontSize: 20, lineHeight: 28 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderRadius: 12 },
  pos: { fontSize: 13, lineHeight: 22, fontWeight: "800", textTransform: "capitalize" },
  meaningInput: { minHeight: 72, maxHeight: 220, borderWidth: 1, borderRadius: 12, padding: 12, textAlignVertical: "top", fontSize: 18, lineHeight: 26 },
  fullMeaning: { lineHeight: 24 },
  exampleBlock: { borderLeftWidth: 3, borderLeftColor: "#4779EA", paddingLeft: 12, gap: 5 },
  exampleLarge: { fontSize: 17, lineHeight: 25 },
  label: { fontSize: 13, fontWeight: "700" },
  deckWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  deckChip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 12 },
  sourceLink: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  touch: { minHeight: 44, justifyContent: "center", paddingVertical: 8 },
  alert: { padding: 14, borderRadius: 14, gap: 6 },
});
