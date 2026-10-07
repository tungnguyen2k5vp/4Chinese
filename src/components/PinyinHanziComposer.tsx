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
        if (!cancelled) setSelectedCandidates(candidates);
      }).catch(() => {
        if (!cancelled) setSelectedCandidates([]);
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

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>NHẬP PINYIN HOẶC CHỌN HÁN TỰ TỪ BÀN PHÍM</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="Nhập pinyin"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          keyboardType="default"
          onChangeText={onPinyinChange}
          placeholder="Ví dụ: xihuan"
          placeholderTextColor={theme.textMuted}
          returnKeyType="done"
          selectionColor={theme.primary}
          style={styles.input}
          value={pinyinQuery}
        />
        <SpeechPinyinButton
          contextualStrings={speechContext}
          disabled={disabled}
          onRecognizedPinyin={onPinyinChange}
          targetWord={targetWord}
        />
      </View>

      <Text style={styles.sectionLabel}>CHỌN TỪ HÁN PHÙ HỢP</Text>
      <ScrollView
        contentContainerStyle={styles.candidateContent}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        {loading ? <ActivityIndicator accessibilityLabel="Đang tìm chữ Hán phù hợp" color={theme.primary} style={styles.loader} /> : null}
        {!loading && pinyinQuery.trim() && selectedCandidates.length === 0 ? (
          <Text accessibilityLiveRegion="polite" style={styles.empty}>Chưa tìm thấy từ phù hợp. Thử bỏ dấu hoặc nhập thêm âm tiết.</Text>
        ) : null}
        {selectedCandidates.map((candidate) => {
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
      </ScrollView>

      <View style={styles.answerHeader}>
        <Text accessibilityRole="header" style={styles.sectionLabel}>CÂU TRẢ LỜI</Text>
        <Text style={styles.answerValue}>{selectedHanzi || "Chưa chọn chữ Hán"}</Text>
      </View>
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Xóa chữ Hán cuối cùng" accessibilityState={{ disabled: disabled || !selectedHanzi }} disabled={disabled || !selectedHanzi} onPress={onDeleteLast} style={styles.controlButton}>
          <Text style={styles.controlText}>Xóa chữ cuối</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Xóa toàn bộ câu trả lời" accessibilityState={{ disabled: disabled || !selectedHanzi }} disabled={disabled || !selectedHanzi} onPress={onClear} style={styles.controlButton}>
          <Text style={styles.controlText}>Xóa hết</Text>
        </Pressable>
      </View>
      {onHint ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Xem gợi ý" accessibilityState={{ disabled }} disabled={disabled} onPress={onHint} style={styles.hintButton}>
          <Text style={styles.hintText}>Gợi ý</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: { gap: spacing.sm },
    sectionLabel: { color: theme.primaryText, fontSize: 11, fontWeight: "900", letterSpacing: 0.7 },
    inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    input: { flex: 1, flexShrink: 1, minHeight: 52, borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.md, backgroundColor: theme.surface, color: theme.textPrimary, fontSize: 18, paddingHorizontal: spacing.md },
    candidateContent: { gap: spacing.sm, alignItems: "center", minHeight: 66, paddingVertical: 2 },
    loader: { marginHorizontal: spacing.md },
    empty: { color: theme.textMuted, fontSize: 12, lineHeight: 18, paddingVertical: spacing.md },
    candidate: { minWidth: 68, minHeight: 60, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
    wholeWord: { minWidth: 88 },
    selectedCandidate: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
    pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
    candidateText: { color: theme.primaryText, fontSize: 27, fontWeight: "900" },
    answerHeader: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: spacing.sm, gap: 2 },
    answerValue: { color: theme.textPrimary, fontSize: 34, fontWeight: "900", minHeight: 42 },
    controls: { flexDirection: "row", gap: spacing.sm },
    controlButton: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" },
    controlText: { color: theme.textSecondary, fontSize: 12, fontWeight: "800" },
    hintButton: { minHeight: 46, borderRadius: radius.md, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" },
    hintText: { color: theme.primaryText, fontSize: 15, fontWeight: "900" },
  });
}
