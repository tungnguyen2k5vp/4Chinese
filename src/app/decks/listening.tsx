import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { radius, spacing, themedCard } from "@/constants/design";
import { getDueVocabulary, getSettings, getUnlearnedVocabulary, getDeckVocabulary, listPersonalDecks, listVocabulary } from "@/db/repository";
import { useStudySession } from "@/hooks/use-study-session";
import { speakChinese, stopChineseSpeech } from "@/services/audio/chinese-speech";
import { buildListeningMatchRounds, type ListeningMatchRound } from "@/services/listening/deck-listening";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";
import type { UserSettings, Vocabulary } from "@/types/models";

const MATCHES_PER_ROUND = 4;
const POOL_LIMIT = 32;

type Mismatch = { audioId: string; meaningId: string };

export default function DeckListeningScreen() {
  const { deckId = "" } = useLocalSearchParams<{ deckId?: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  useStudySession(db);
  const [deckName, setDeckName] = useState("Từ đang học");
  const [rounds, setRounds] = useState<ListeningMatchRound[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(() => new Set());
  const [mismatch, setMismatch] = useState<Mismatch | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [correctPairs, setCorrectPairs] = useState(0);
  const [roundComplete, setRoundComplete] = useState(false);
  const [finished, setFinished] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mismatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    void (async () => {
      const userSettings = await getSettings(db);
      let pool: Vocabulary[] = [];
      let nextDeckName = "Từ đã học · ưu tiên từ đến hạn";

      if (deckId) {
        const [deckWords, decks] = await Promise.all([getDeckVocabulary(db, deckId), listPersonalDecks(db)]);
        pool = deckWords;
        nextDeckName = decks.find((deck) => deck.id === deckId)?.name ?? "Bộ từ riêng";
      } else {
        const due = await getDueVocabulary(db, POOL_LIMIT, userSettings.selectedHskBands);
        pool = uniqueWords(due);
        if (pool.length < MATCHES_PER_ROUND * 2) {
          const learnedByBand = await Promise.all(userSettings.selectedHskBands.map((band) =>
            listVocabulary(db, { filter: "learned", band, limit: POOL_LIMIT }),
          ));
          pool = uniqueWords([...pool, ...learnedByBand.flat()]).slice(0, POOL_LIMIT);
        }
        if (pool.length < 2) {
          pool = uniqueWords([...pool, ...await getUnlearnedVocabulary(db, userSettings.selectedHskBands, POOL_LIMIT)]).slice(0, POOL_LIMIT);
          nextDeckName = "Từ HSK trong lộ trình đã chọn";
        }
      }

      if (!active) return;
      setSettings(userSettings);
      setDeckName(nextDeckName);
      setRounds(buildListeningMatchRounds(pool, MATCHES_PER_ROUND));
      setRoundIndex(0);
      setSelectedAudioId(null);
      setMatchedIds(new Set());
      setMismatch(null);
      setMistakes(0);
      setCorrectPairs(0);
      setRoundComplete(false);
      setFinished(false);
      setNotice(null);
    })()
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
      if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
      void stopChineseSpeech();
    };
  }, [db, deckId]);

  useFocusEffect(load);

  const round = rounds[roundIndex];
  const wordsById = useMemo(() => new Map((round?.pairs ?? []).map((word) => [word.id, word])), [round]);
  const totalPairs = useMemo(() => rounds.reduce((sum, item) => sum + item.pairs.length, 0), [rounds]);

  const reset = () => {
    if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
    setRoundIndex(0);
    setSelectedAudioId(null);
    setMatchedIds(new Set());
    setMismatch(null);
    setMistakes(0);
    setCorrectPairs(0);
    setRoundComplete(false);
    setFinished(false);
    setNotice(null);
  };

  const playAudio = async (id: string) => {
    const word = wordsById.get(id);
    if (!word) return;
    setSelectedAudioId(id);
    setNotice(null);
    const result = await speakChinese(word.simplified, { rate: settings?.speechRate ?? 0.82 });
    if (!result.ok && result.reason === "missing-mandarin-voice") {
      setNotice("Thiết bị chưa có giọng Mandarin. Bạn có thể cài giọng tiếng Trung trong cài đặt hệ thống.");
    } else if (!result.ok && result.reason !== "cancelled") {
      setNotice("Chưa phát được âm thanh. Hãy thử chạm loa lần nữa.");
    }
  };

  const chooseMeaning = (meaningId: string) => {
    if (!round || roundComplete || matchedIds.has(meaningId)) return;
    if (!selectedAudioId) {
      setNotice("Hãy chạm một biểu tượng loa để nghe từ trước.");
      return;
    }

    if (selectedAudioId === meaningId) {
      const nextMatched = new Set(matchedIds);
      nextMatched.add(meaningId);
      setMatchedIds(nextMatched);
      setSelectedAudioId(null);
      setMismatch(null);
      setCorrectPairs((value) => value + 1);
      setNotice("Ghép đúng. Tiếp tục với cặp còn lại.");
      if (nextMatched.size === round.pairs.length) {
        setRoundComplete(true);
        setNotice("Đã ghép đủ các cặp trong lượt này.");
      }
      return;
    }

    if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
    setMismatch({ audioId: selectedAudioId, meaningId });
    setMistakes((value) => value + 1);
    setNotice("Chưa khớp. Hãy giữ lựa chọn loa và thử nghĩa khác.");
    mismatchTimer.current = setTimeout(() => setMismatch(null), 700);
  };

  const nextRound = () => {
    if (!roundComplete) return;
    if (roundIndex >= rounds.length - 1) {
      setFinished(true);
      void stopChineseSpeech();
      return;
    }
    setRoundIndex((value) => value + 1);
    setSelectedAudioId(null);
    setMatchedIds(new Set());
    setMismatch(null);
    setRoundComplete(false);
    setNotice(null);
  };

  if (loading) {
    return <Screen title="Luyện nghe"><ActivityIndicator accessibilityLabel="Đang tải từ luyện nghe" color={theme.primary} size="large" /></Screen>;
  }

  if (loadError) {
    return <Screen title="Luyện nghe"><EmptyState icon="!" title="Chưa tải được danh sách từ" message="Dữ liệu học vẫn được giữ nguyên. Hãy thử tải lại." /><PrimaryButton label="Tải lại" onPress={() => router.replace(deckId ? { pathname: "/decks/listening", params: { deckId } } : "/decks/listening")} /><PrimaryButton label="Quay lại" variant="secondary" onPress={() => router.back()} /></Screen>;
  }

  if (!rounds.length) {
    return (
      <Screen title="Luyện nghe" subtitle={deckName}>
        <EmptyState icon="♫" variant="listening" scene="recordings" title="Cần ít nhất 2 từ" message={deckId ? "Hãy thêm ít nhất hai từ vào bộ này để bắt đầu bài ghép âm thanh với nghĩa." : "Chưa có từ trong lộ trình đã chọn. Hãy học vài từ HSK hoặc mở một bộ từ riêng có ít nhất hai từ."} />
        <PrimaryButton label={deckId ? "Quay lại bộ từ" : "Mở kho từ"} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (finished) {
    const accuracy = correctPairs + mistakes > 0 ? Math.round((correctPairs / (correctPairs + mistakes)) * 100) : 100;
    return (
      <Screen title="Hoàn thành luyện nghe" subtitle={deckName}>
        <View style={[styles.card, styles.resultCard]}>
          <Text style={styles.eyebrow}>KẾT QUẢ GHÉP CẶP</Text>
          <Text style={styles.resultNumber}>{correctPairs}/{totalPairs}</Text>
          <Text style={styles.resultCopy}>{accuracy}% chính xác · {mistakes} lần ghép chưa khớp.</Text>
          <Text style={styles.resultHint}>Bài luyện này không thay đổi cấp nhớ hay lịch ôn SRS.</Text>
        </View>
        <PrimaryButton label="Luyện lại" onPress={reset} />
        <PrimaryButton label={deckId ? "Quay lại bộ từ" : "Về trang trước"} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!round) return <Screen title="Luyện nghe"><ActivityIndicator color={theme.primary} size="large" /></Screen>;
  const matchedTotal = rounds.slice(0, roundIndex).reduce((sum, item) => sum + item.pairs.length, 0) + matchedIds.size;
  const progress = Math.round((matchedTotal / Math.max(1, totalPairs)) * 100);

  return (
    <Screen title="Luyện nghe" subtitle={`${deckName} · Lượt ${roundIndex + 1}/${rounds.length}`}>
      <View style={[styles.card, styles.introCard]}>
        <View style={styles.progressHeader}>
          <Text style={styles.eyebrow}>NGHE VÀ GHÉP NGHĨA</Text>
          <Text style={styles.progressText}>{matchedTotal}/{totalPairs} cặp</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }} style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.prompt}>Chạm loa để nghe từ tiếng Trung, rồi chạm nghĩa tiếng Việt tương ứng.</Text>
      </View>

      <View style={styles.columnLabels}>
        <Text style={styles.columnLabel}>NGHE TỪ</Text>
        <Text style={styles.columnLabel}>CHỌN NGHĨA</Text>
      </View>
      <View style={styles.matchColumns}>
        <View style={styles.column}>
          {round.audioOrder.map((id, index) => {
            const word = wordsById.get(id);
            if (!word) return null;
            const matched = matchedIds.has(id);
            const selected = selectedAudioId === id;
            const wrong = mismatch?.audioId === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`Phát âm thanh ${index + 1}`}
                accessibilityHint="Nghe từ tiếng Trung rồi chọn nghĩa tương ứng ở cột bên phải."
                accessibilityState={{ disabled: matched, selected }}
                disabled={matched}
                onPress={() => void playAudio(id)}
                style={({ pressed }) => [styles.audioTile, selected && styles.tileSelected, matched && styles.tileMatched, wrong && styles.tileWrong, pressed && !matched && styles.pressed]}
              >
                <Ionicons color={matched ? theme.success : wrong ? theme.error : theme.primaryText} name={matched ? "checkmark-circle" : "volume-high"} size={29} />
                <Text style={[styles.tileCaption, matched && styles.matchedText]}>Âm thanh {index + 1}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.column}>
          {round.meaningOrder.map((id, index) => {
            const word = wordsById.get(id);
            if (!word) return null;
            const matched = matchedIds.has(id);
            const selected = selectedAudioId === id;
            const wrong = mismatch?.meaningId === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`Nghĩa ${index + 1}: ${word.primaryMeaningVi}`}
                accessibilityState={{ disabled: matched, selected }}
                disabled={matched}
                onPress={() => chooseMeaning(id)}
                style={({ pressed }) => [styles.meaningTile, selected && styles.tileSelected, matched && styles.tileMatched, wrong && styles.tileWrong, pressed && !matched && styles.pressed]}
              >
                <Text numberOfLines={4} style={[styles.meaningText, matched && styles.matchedText]}>{word.primaryMeaningVi}</Text>
                {matched ? <Ionicons color={theme.success} name="checkmark-circle" size={19} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      {notice ? <Text accessibilityLiveRegion="polite" style={[styles.notice, mismatch && styles.noticeWrong]}>{notice}</Text> : null}
      <PrimaryButton disabled={!roundComplete} label={roundIndex === rounds.length - 1 ? "Xem kết quả" : "Lượt tiếp theo"} onPress={nextRound} />
      <Text style={styles.sessionHint}>Bài ghép cặp chỉ luyện nghe, không ghi nhận điểm SRS.</Text>
    </Screen>
  );
}

function uniqueWords(words: Vocabulary[]): Vocabulary[] {
  const ids = new Set<string>();
  const hanzi = new Set<string>();
  return words.filter((word) => {
    if (ids.has(word.id) || hanzi.has(word.simplified)) return false;
    ids.add(word.id);
    hanzi.add(word.simplified);
    return true;
  });
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    card: { ...themedCard(theme), borderWidth: 1, borderColor: theme.border },
    introCard: { gap: spacing.sm },
    progressHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
    eyebrow: { color: theme.primaryText, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
    progressText: { color: theme.textPrimary, fontSize: 13, fontWeight: "800" },
    progressTrack: { backgroundColor: theme.backgroundSecondary, borderRadius: radius.pill, height: 8, overflow: "hidden" },
    progressFill: { backgroundColor: theme.accent, borderRadius: radius.pill, height: "100%" },
    prompt: { color: theme.textMuted, fontSize: 14, lineHeight: 21 },
    columnLabels: { flexDirection: "row", gap: spacing.sm },
    columnLabel: { color: theme.textMuted, flex: 1, fontSize: 11, fontWeight: "900", letterSpacing: 0.6, textAlign: "center" },
    matchColumns: { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
    column: { flex: 1, gap: spacing.sm },
    audioTile: { alignItems: "center", backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.md, borderWidth: 1.5, justifyContent: "center", minHeight: 96, padding: spacing.sm },
    meaningTile: { alignItems: "center", backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.md, borderWidth: 1.5, flex: 1, flexDirection: "row", gap: spacing.xs, justifyContent: "center", minHeight: 96, paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
    tileSelected: { backgroundColor: theme.primarySoft, borderColor: theme.primary, borderWidth: 2 },
    tileMatched: { backgroundColor: theme.successSoft, borderColor: theme.success },
    tileWrong: { backgroundColor: theme.errorSoft, borderColor: theme.error },
    tileCaption: { color: theme.textSecondary, fontSize: 12, fontWeight: "700", marginTop: spacing.xs, textAlign: "center" },
    meaningText: { color: theme.textPrimary, flex: 1, fontSize: 14, fontWeight: "700", textAlign: "center" },
    matchedText: { color: theme.success },
    pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
    notice: { color: theme.primaryText, fontSize: 13, fontWeight: "700", textAlign: "center" },
    noticeWrong: { color: theme.error },
    sessionHint: { color: theme.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
    resultCard: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
    resultNumber: { color: theme.primaryText, fontSize: 54, fontWeight: "900" },
    resultCopy: { color: theme.textPrimary, fontSize: 17, fontWeight: "800", textAlign: "center" },
    resultHint: { color: theme.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  });
}
