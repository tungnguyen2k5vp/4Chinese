import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { EnglishAudioButton } from "@/components/EnglishAudioButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { englishCardPage } from "@/db/english/card-editor";
import { setEnglishCardSuspended } from "@/db/english/decks";
import { markEnglishCardKnown, startEnglishCard, type EnglishCard } from "@/db/english/learner";
import { englishDeckMemorySummary, type EnglishDeckMemorySummary } from "@/db/english/personal-vocabulary";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { useLanguageProtection } from "@/services/languages/use-language-protection";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

const PAGE_SIZE = 100;
const MAX_SESSION_WORDS = 10;

export default function EnglishNewWordSetup() {
  const { id = "", resume = "" } = useLocalSearchParams<{ id?: string; resume?: string }>();
  const db = useEnglishDatabase();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [deck, setDeck] = useState<EnglishDeckMemorySummary | null>(null);
  const [available, setAvailable] = useState<EnglishCard[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(0);
  const [known, setKnown] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const word = available[index];
  const goal = Math.min(MAX_SESSION_WORDS, available.length);
  const finished = !word || started >= goal;

  useLanguageProtection("SESSION", loading || saving || !!word);

  useEffect(() => {
    let live = true;
    void (async () => {
      setLoading(true);
      setIndex(0);
      setStarted(0);
      setKnown(0);
      setSkipped(0);
      try {
        const [deckSummary, firstPage] = await Promise.all([
          englishDeckMemorySummary(db, id),
          englishCardPage(db, id, null, PAGE_SIZE, "", "NEW"),
        ]);
        let rows = firstPage.cards;
        let cursor = firstPage.next;
        while (cursor && rows.length < 500) {
          const page = await englishCardPage(db, id, cursor, PAGE_SIZE, "", "NEW");
          rows = [...rows, ...page.cards];
          cursor = page.next;
        }
        if (!live) return;
        setDeck(deckSummary);
        setAvailable(rows);
        setHasMore(cursor !== null);
        setError("");
      } catch {
        if (live) setError("Chưa tải được từ mới trong bộ. Dữ liệu vẫn được giữ nguyên.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [db, id, resume]);

  const choose = async (action: "learn" | "known" | "skip") => {
    if (!word || saving || lock.current) return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      if (action === "learn") {
        await startEnglishCard(db, word.id);
        setStarted((value) => value + 1);
      } else if (action === "known") {
        await markEnglishCardKnown(db, word.id);
        setKnown((value) => value + 1);
      } else {
        await setEnglishCardSuspended(db, word.id, true);
        setSkipped((value) => value + 1);
      }
      setIndex((value) => value + 1);
    } catch {
      setError("Chưa lưu được lựa chọn. Từ này chưa bị chuyển sang bước tiếp theo; hãy thử lại.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  if (loading) {
    return <Screen title="Học từ mới" subtitle="Đang tải danh sách từ trong bộ."><View style={s.loading}><ActivityIndicator color={p.primary} /><Text style={{ color: p.textSecondary }}>Đang chuẩn bị…</Text></View></Screen>;
  }

  const remaining = Math.max(0, available.length - index);
  const canContinue = remaining > 0 || hasMore;

  return (
    <Screen title="Học từ mới" subtitle={deck?.name ?? "Bộ từ tiếng Anh"}>
      {error ? <View style={[s.alert, { backgroundColor: p.errorLight }]}><Text accessibilityRole="alert" style={{ color: p.error }}>{error}</Text></View> : null}
      {finished ? (
        <View style={[s.finishedCard, { backgroundColor: p.surface, borderColor: p.border }]}>
          <View style={[s.finishedIcon, { backgroundColor: p.successLight }]}><Ionicons name="checkmark-circle" size={32} color={p.success} /></View>
          <Text style={[s.title, { color: p.textPrimary }]}>{started ? "Đã xong lượt chọn từ mới" : "Không còn từ mới trong bộ"}</Text>
          <Text style={{ color: p.textSecondary, lineHeight: 22, textAlign: "center" }}>
            {started} bắt đầu học · {known} đã biết · {skipped} bỏ qua.
            {started >= goal && canContinue ? " Còn từ mới khác trong bộ." : " Các lựa chọn đã được lưu vào lịch học của bạn."}
          </Text>
          {canContinue ? <PrimaryButton variant="secondary" label="Tiếp tục với các từ còn lại" onPress={() => router.replace({ pathname: "/english/decks/[id]/learn", params: { id, resume: String(Date.now()) } } as Href)} /> : null}
          <PrimaryButton label="Quay lại chi tiết bộ từ" onPress={() => router.replace({ pathname: "/english/decks/[id]", params: { id } } as Href)} />
        </View>
      ) : word ? (
        <>
          <Text style={[s.selectionTitle, { color: p.textPrimary }]}>Chọn từ để bắt đầu học ({started}/{goal})</Text>
          <Text style={[s.helper, { color: p.textSecondary }]}>Còn {remaining} từ mới trong bộ này · chọn tối đa {goal} từ cho lượt này.</Text>
          <View style={[s.progressTrack, { backgroundColor: p.surfaceSubtle }]}><View style={[s.progressFill, { backgroundColor: p.primary, width: `${goal ? started / goal * 100 : 0}%` }]} /></View>

          <View testID="english-new-word-card" style={[s.wordCard, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Text style={[s.headword, { color: p.primary }]}>{word.headword}</Text>
            <View style={s.audioRow}>
              <EnglishAudioButton text={word.headword} />
              {word.ipa ? <Text style={{ color: p.textMuted, fontSize: 18, fontStyle: "italic" }}>{word.ipa}</Text> : <Text style={{ color: p.textMuted }}>Chưa có phiên âm IPA</Text>}
            </View>
            <Text style={[s.meaning, { color: p.textPrimary }]}>{word.meaning_vi}</Text>
            <Text style={{ color: p.textSecondary, fontSize: 15 }}>{word.pos ? word.pos : "Từ cá nhân"}{word.source_id === "SHARED" ? " · Bộ từ bạn bè chia sẻ" : ""}</Text>
            <Text style={{ color: p.textMuted, lineHeight: 20 }}>Nghe phát âm, xem nghĩa rồi chọn trạng thái phù hợp. “Học từ này” sẽ bắt đầu lịch ôn SRS ngay.</Text>
          </View>

          <View style={s.skipRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Bỏ qua ${word.headword}`} disabled={saving} onPress={() => void choose("skip")} style={[s.skipButton, { backgroundColor: p.errorLight }]}>
              {saving ? <ActivityIndicator size="small" color={p.error} /> : <><Ionicons name="remove-circle-outline" size={17} color={p.error} /><Text style={{ color: p.error, fontWeight: "900" }}>Bỏ qua</Text></>}
            </Pressable>
          </View>
          <View style={s.actions}>
            <PrimaryButton variant="secondary" label="Đã biết" disabled={saving} onPress={() => void choose("known")} style={s.flexButton} />
            <PrimaryButton label="Học từ này" loading={saving} onPress={() => void choose("learn")} style={s.flexButton} />
          </View>
          <Text style={{ color: p.textMuted, textAlign: "center", fontSize: 12, lineHeight: 18 }}>Từ “Đã biết” sẽ có lịch xác nhận lại sau. Bạn có thể khôi phục từ đã bỏ qua trong danh sách từ đã bỏ qua.</Text>
        </>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  selectionTitle: { fontSize: 27, lineHeight: 34, fontWeight: "900" },
  helper: { fontSize: 16, lineHeight: 23 },
  progressTrack: { height: 9, borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99 },
  wordCard: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 16, minHeight: 300 },
  headword: { fontSize: 46, lineHeight: 58, fontWeight: "900" },
  audioRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  meaning: { fontSize: 24, lineHeight: 33, fontWeight: "800" },
  skipRow: { alignItems: "flex-end" },
  skipButton: { minHeight: 46, borderRadius: 24, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  actions: { flexDirection: "row", gap: 9 },
  flexButton: { flex: 1, minHeight: 54 },
  finishedCard: { minHeight: 300, borderWidth: 1, borderRadius: 22, padding: 22, alignItems: "center", justifyContent: "center", gap: 14 },
  finishedIcon: { width: 62, height: 62, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, lineHeight: 31, fontWeight: "900", textAlign: "center" },
  loading: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 12 },
  alert: { padding: 14, borderRadius: 14 },
});
