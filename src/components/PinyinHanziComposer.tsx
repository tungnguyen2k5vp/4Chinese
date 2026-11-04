import { Ionicons } from "@expo/vector-icons";
import type { SQLiteDatabase } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { SpeechPinyinButton } from "@/components/SpeechPinyinButton";
import { radius, spacing } from "@/constants/design";
import { searchHanziCandidates, type PinyinHanziCandidate } from "@/services/pinyin-ime/candidateSearch";
import { buildChineseSpeechContext, type SpeechVocabularyHint } from "@/services/speech/chinese-speech-input";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";
import type { Vocabulary } from "@/types/models";

export interface PinyinHanziComposerProps {
  db: SQLiteDatabase;
  targetWord: Vocabulary;
  pinyinQuery: string;
  selectedHanzi: string;
  onPinyinChange: (value: string) => void;
  onSelectCandidate: (candidate: PinyinHanziCandidate) => void;
  onDeleteLast: () => void;
  onClear: () => void;
  disabled?: boolean;
  scriptMode?: "simplified" | "traditional";
  onHint?: () => void;
}

/**
 * Reusable pinyin-to-Hanzi composer.  Candidate lookup is deliberately kept
 * here rather than in the review screen, and selecting a candidate is always
 * an explicit user action (there is no target-word auto-fill).
 */
export function PinyinHanziComposer({
  db,
  targetWord,
  pinyinQuery,
  selectedHanzi,
  onPinyinChange,
  onSelectCandidate,
  onDeleteLast,
  onClear,
  disabled = false,
  scriptMode = "simplified",
  onHint,
}: PinyinHanziComposerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedCandidates, setSelectedCandidates] = useState<PinyinHanziCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultQuery, setResultQuery] = useState("");
  const [lookupError, setLookupError] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [speechHints, setSpeechHints] = useState<SpeechVocabularyHint[]>([]);

  useEffect(() => {
    let cancelled = false;
    void db.getAllAsync<SpeechVocabularyHint>(
      `SELECT simplified, traditional, pinyin FROM vocabulary
       WHERE hsk_band IN ('1', '2')
       ORDER BY COALESCE(frequency_rank, 999999), LENGTH(simplified)
       LIMIT 180`,
    ).then((rows) => {
      if (!cancelled) setSpeechHints(rows);
    }).catch(() => {
      if (!cancelled) setSpeechHints([]);
    });
    return () => { cancelled = true; };
  }, [db]);

  const speechContext = useMemo(
    () => buildChineseSpeechContext(targetWord, speechHints),
    [speechHints, targetWord],
  );

  useEffect(() => {
    let cancelled = false;
    const query = pinyinQuery.trim();
    if (disabled || !query) {
      const clearTimer = setTimeout(() => {
        setSelectedCandidates([]);
        setLoading(false);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(clearTimer);
      };
    }
    const timer = setTimeout(() => {
      setLoading(true);
      void searchHanziCandidates(db, query, {
        targetVocabularyId: targetWord.id,
        hskBand: targetWord.hskBand,
        scriptMode,
        limit: 8,
      }).then((candidates) => {
        if (!cancelled) { setSelectedCandidates(candidates); setResultQuery(query); setLookupError(false); }
      }).catch(() => {
        if (!cancelled) { setSelectedCandidates([]); setResultQuery(query); setLookupError(true); }
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [db, disabled, pinyinQuery, scriptMode, targetWord.hskBand, targetWord.id]);

  const visibleHanzi = (candidate: PinyinHanziCandidate) =>
    scriptMode === "traditional" ? candidate.word.traditional : candidate.word.simplified;

  const query = pinyinQuery.trim();
  const currentCandidates = query === resultQuery && !disabled ? selectedCandidates : [];
  const searching = !!query && !disabled && (loading || query !== resultQuery);
  return (
    <View testID="pinyin-hanzi-composer" style={styles.container}>
      <View style={styles.answerHeader}>
        <View style={styles.answerCopy}>
          <Text style={styles.sectionLabel}>Hán tự đã ghép</Text>
          <Text testID="pinyin-composed-answer" style={selectedHanzi ? styles.answerValue : styles.answerPlaceholder}>{selectedHanzi || "Chọn chữ ở bên dưới"}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Xóa chữ Hán cuối cùng" accessibilityState={{ disabled: disabled || !selectedHanzi }} disabled={disabled || !selectedHanzi} onPress={onDeleteLast} style={styles.iconButton}><Ionicons name="backspace-outline" size={23} color={disabled || !selectedHanzi ? theme.textMuted : theme.primaryText} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Xóa toàn bộ câu trả lời" accessibilityState={{ disabled: disabled || !selectedHanzi }} disabled={disabled || !selectedHanzi} onPress={onClear} style={styles.iconButton}><Ionicons name="close-circle-outline" size={23} color={disabled || !selectedHanzi ? theme.textMuted : theme.primaryText} /></Pressable>
      </View>
      <Text style={styles.sectionLabel}>Nhập pinyin</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="Nhập pinyin"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          keyboardType="default"
          onChangeText={onPinyinChange}
          placeholder="VD: xi huan"
          placeholderTextColor={theme.textMuted}
          returnKeyType="done"
          selectionColor={theme.primary}
          style={styles.input}
          value={pinyinQuery}
        />
        <SpeechPinyinButton
          compact
          onStatusChange={setSpeechStatus}
          contextualStrings={speechContext}
          disabled={disabled}
          onRecognizedPinyin={onPinyinChange}
          targetWord={targetWord}
        />
      </View>
      {speechStatus ? <Text accessibilityLiveRegion="polite" style={styles.empty}>{speechStatus}</Text> : null}
      {query && !disabled ? <ScrollView
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={styles.candidateContent}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        {searching ? <ActivityIndicator accessibilityLabel="Đang tìm chữ Hán phù hợp" color={theme.primary} style={styles.loader} /> : null}
        {!searching && currentCandidates.length === 0 ? (
          <Text accessibilityLiveRegion="polite" style={styles.empty}>{lookupError ? "Chưa tra được chữ. Hãy nhập lại để thử." : "Chưa có kết quả. Thử nhập thêm âm tiết."}</Text>
        ) : null}
        {currentCandidates.map((candidate) => {
          const hanzi = visibleHanzi(candidate);
          const selected = selectedHanzi === hanzi || selectedHanzi.endsWith(hanzi);
          return (
            <Pressable
              accessibilityLabel={`Chọn ${hanzi}`}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              key={`${candidate.word.id}-${candidate.candidateRank}`}
              onPress={() => onSelectCandidate(candidate)}
              style={({ pressed }) => [styles.candidate, candidate.word.simplified.length > 1 && styles.wholeWord, selected && styles.selectedCandidate, pressed && styles.pressed]}
            >
              <Text style={styles.candidateText}>{hanzi}</Text>
            </Pressable>
          );
        })}
      </ScrollView> : <Text style={styles.empty}>Gõ pinyin, rồi chạm chữ Hán để ghép.</Text>}
      {onHint ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Xem gợi ý" accessibilityState={{ disabled }} disabled={disabled} onPress={onHint} style={styles.hintButton}>
          <Ionicons name="bulb-outline" size={18} color={theme.primaryText} /><Text style={styles.hintText}>Gợi ý</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: { gap: spacing.sm },
    sectionLabel: { color: theme.textMuted, fontSize: 12, fontWeight: "700" },
    inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    input: { flex: 1, minWidth: 0, minHeight: 52, borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, backgroundColor: theme.surface, color: theme.textPrimary, fontSize: 17, paddingHorizontal: 12 },
    candidateContent: { gap: spacing.sm, alignItems: "center", minHeight: 54, paddingVertical: 2 },
    loader: { marginHorizontal: spacing.md },
    empty: { color: theme.textMuted, fontSize: 12, lineHeight: 18, paddingVertical: 4 },
    candidate: { minWidth: 48, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
    wholeWord: { minWidth: 66 },
    selectedCandidate: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
    pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
    candidateText: { color: theme.primaryText, fontSize: 24, fontWeight: "700" },
    answerHeader: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 14, backgroundColor: theme.backgroundSecondary, gap: 4 },
    answerCopy: { flex: 1, minWidth: 0, gap: 5 },
    answerValue: { color: theme.textPrimary, fontSize: 29, fontWeight: "700", minHeight: 36 },
    answerPlaceholder: { color: theme.textMuted, fontSize: 15, lineHeight: 22 },
    iconButton: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
    hintButton: { minHeight: 44, alignSelf: "flex-end", paddingHorizontal: 10, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
    hintText: { color: theme.primaryText, fontSize: 14, fontWeight: "700" },
  });
}
