import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { HanziHandwritingPad } from "@/components/HanziHandwritingPad";
import { PinyinHanziComposer } from "@/components/PinyinHanziComposer";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StudySettingsSheet } from "@/components/StudySettingsSheet";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { radius, spacing, themedCard } from "@/constants/design";
import {
  completeInitialLearning,
  getSettings,
  setKnown,
  setSkipped,
  saveSettings,
} from "@/db/repository";
import { useNewWordAudio } from "@/hooks/use-new-word-audio";
import { useStudySession } from "@/hooks/use-study-session";
import { playFeedback } from "@/services/feedback/feedback-service";
import { normalizeQuickSessionMinutes } from "@/services/learning/next-best-action";
import type { PinyinHanziCandidate } from "@/services/pinyin-ime/candidateSearch";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/theme/ThemeProvider";
import type { UserSettings } from "@/types/models";

function hidePinyinHints(value: string): string {
  return value
    .replace(/\s*[\[(][a-züv\s]+[1-5](?:\s+[a-züv]+[1-5])*[\])]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function secondsSince(startedAt: number): number {
  return Math.max(0, Math.min(43_200, Math.round((Date.now() - startedAt) / 1_000)));
}

/**
 * A NEW word is encoded in three passes: one guided copy followed by two
 * meaning-and-pinyin-to-Hanzi recalls. SRS starts only after all three are correct.
 */
export default function LearnSession() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { deckId, quickSessionMinutes: requestedQuickMinutes, quickStartedAt } = useLocalSearchParams<{ deckId?: string; quickSessionMinutes?: string; quickStartedAt?: string }>();
  const quickMinutes = normalizeQuickSessionMinutes(requestedQuickMinutes);
  const queue = useAppStore((state) => state.learnQueue);
  const completeStudySession = useStudySession(db, queue.length ? "learning" : undefined);
  const clear = useAppStore((state) => state.clearSession);
  const setGlobalSettings = useAppStore((state) => state.setSettings);
  const [index, setIndex] = useState(0);
  const [recognizedHanzi, setRecognizedHanzi] = useState("");
  const [pinyinQuery, setPinyinQuery] = useState("");
  const [pass, setPass] = useState<1 | 2 | 3>(1);
  const [mistakes, setMistakes] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [known, setKnownCount] = useState(0);
  const [skipped, setSkippedCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sessionStartedAt = useRef(0);
  useEffect(() => { sessionStartedAt.current = Date.now(); }, []);
  const word = queue[index];

  useEffect(() => {
    void getSettings(db).then((value) => {
      setSettings(value);
      setGlobalSettings(value);
    });
  }, [db, setGlobalSettings]);

  useEffect(() => {
    if (!word && queue.length === 0) router.replace("/learn/setup");
  }, [queue.length, word]);

  useNewWordAudio(
    word ? `learn-session:${deckId ?? "all"}:${index}:${word.id}` : null,
    word?.simplified,
    Boolean(settings?.soundEnabled),
    settings?.speechRate ?? 0.82,
  );

  const resetWord = () => {
    setRecognizedHanzi("");
    setPinyinQuery("");
    setFeedback(null);
    setPass(1);
    setMistakes(0);
  };

  const finish = (
    nextCompleted: number,
    nextKnown: number,
    nextSkipped: number,
  ) => {
    completeStudySession();
    clear();
    if (deckId) {
      router.replace({ pathname: "/decks/[id]", params: { id: deckId } } as Href);
      return;
    }
    router.replace(
      `/review/result?mode=learn&total=${queue.length}&correct=${nextCompleted}&known=${nextKnown}&skipped=${nextSkipped}&elapsedSeconds=${secondsSince(sessionStartedAt.current)}${quickMinutes == null ? "" : `&quickSessionMinutes=${quickMinutes}&quickStartedAt=${encodeURIComponent(quickStartedAt ?? "")}`}`,
    );
  };

  const advance = (kind: "learned" | "known" | "skipped") => {
    const nextCompleted = completed + (kind === "learned" ? 1 : 0);
    const nextKnown = known + (kind === "known" ? 1 : 0);
    const nextSkipped = skipped + (kind === "skipped" ? 1 : 0);
    setCompleted(nextCompleted);
    setKnownCount(nextKnown);
    setSkippedCount(nextSkipped);
    if (index + 1 >= queue.length) {
      finish(nextCompleted, nextKnown, nextSkipped);
      return;
    }
    setIndex((value) => value + 1);
    resetWord();
  };

  const feedbackHaptic = async (success: boolean) => {
    await playFeedback(success ? 'success' : 'error', { hapticEnabled: settings?.hapticEnabled, soundEnabled: settings?.soundEnabled });
  };

  const confirmCopy = async () => {
    if (!word || saving) return;
    const normalized = recognizedHanzi.trim().replace(/\s+/g, "");
    const expected = word.simplified.trim().replace(/\s+/g, "");
    const traditional = word.traditional.trim().replace(/\s+/g, "");
    if (normalized !== expected && normalized !== traditional) {
      setFeedback(
        "Chưa đúng. Tiến độ lượt này đã giảm; hãy xóa nét và thử lại.",
      );
      setMistakes((value) => value + 1);
      await feedbackHaptic(false);
      return;
    }
    if (pass < 3) {
      await feedbackHaptic(true);
      setPass((value) => (value + 1) as 1 | 2 | 3);
      setRecognizedHanzi("");
      setPinyinQuery("");
      setFeedback(
        pass === 1
          ? "Đúng. Lượt 2 sẽ ẩn đáp án."
          : "Đúng. Hãy tự nhớ thêm một lần cuối.",
      );
      return;
    }
    setSaving(true);
    try {
      await completeInitialLearning(db, word.id);
      await feedbackHaptic(true);
      advance("learned");
    } finally {
      setSaving(false);
    }
  };

  const markKnown = async () => {
    if (!word || saving) return;
    setSaving(true);
    try {
      await setKnown(db, word.id, true);
      await feedbackHaptic(true);
      advance("known");
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    if (!word || saving) return;
    setSaving(true);
    try {
      await setSkipped(db, word.id);
      advance("skipped");
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (patch: Partial<UserSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setGlobalSettings(next);
    await saveSettings(db, next);
  };

  const selectPinyinCandidate = (candidate: PinyinHanziCandidate) => {
    const value =
      settings?.simplifiedOrTraditional === "traditional"
        ? candidate.word.traditional
        : candidate.word.simplified;
    setRecognizedHanzi((current) => {
      if (!current || Array.from(value).length > 1) return value;
      return `${current}${value}`;
    });
    setPinyinQuery("");
    setFeedback(null);
  };

  const deleteLastPinyinCharacter = () => {
    setRecognizedHanzi((current) => Array.from(current).slice(0, -1).join(""));
    setFeedback(null);
  };

  const clearPinyinAnswer = () => {
    setRecognizedHanzi("");
    setPinyinQuery("");
    setFeedback(null);
  };

  if (!word) return null;

  const normalized = recognizedHanzi.trim().replace(/\s+/g, "");
  const expected = word.simplified.trim().replace(/\s+/g, "");
  const traditional = word.traditional.trim().replace(/\s+/g, "");
  const recognizedCorrect =
    normalized === expected || normalized === traditional;
  const completedSteps = (completed + known + skipped) * 3 + (pass - 1);
  const progress =
    Math.max(0, completedSteps - mistakes) / Math.max(1, queue.length * 3);
  const example = word.examples[0];

  return (
    <Screen>
      <View style={styles.top}>
        <Text style={styles.counter}>
          {index + 1}/{queue.length}
        </Text>
        <AnimatedProgressBar progress={progress} color={theme.primary} trackColor={theme.border}
          accessibilityLabel={"Ti\u1ebfn \u0111\u1ed9 bu\u1ed5i h\u1ecdc"} style={styles.progressTrack} />
        <Pressable accessibilityRole="button"
          accessibilityLabel="Mở cài đặt học"
          onPress={() => setSettingsOpen(true)}
          hitSlop={10}
          style={styles.gear}
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color={theme.textMuted}
          />
        </Pressable>
      </View>
      <Text style={styles.progressLabel}>
        Học từ mới · lượt {pass}/3 · {completed} đã hoàn tất
      </Text>

      <View style={[themedCard(theme), styles.wordCard]}>
        <Text style={styles.encodingBadge}>
          {pass === 1
            ? "LƯỢT 1 · ĐÁP ÁN HIỂN THỊ"
            : `LƯỢT ${pass} · TỰ NHỚ CHỮ HÁN`}
        </Text>
        <Text style={styles.meaning}>
          {hidePinyinHints(word.primaryMeaningVi)}
        </Text>
        {pass === 1 ? (
          <>
            <Text style={styles.hanzi}>{word.simplified}</Text>
          </>
        ) : (
          <Text style={styles.hiddenAnswer}>
            Viết chữ Hán tương ứng với nghĩa trên
          </Text>
        )}
        <AudioButton text={word.simplified} size={27} />
        <PinyinText value={word.pinyin} visible style={styles.pinyin} />
        {pass === 1 ? (
          <Text style={styles.meta}>
            {word.pos.join(" · ")} · HSK {word.hskBand}
          </Text>
        ) : null}
        {word.imageUri ? (
          <Image
            source={word.imageUri}
            style={styles.image}
            contentFit="cover"
          />
        ) : null}
      </View>

      {example ? (
      <View style={[themedCard(theme), styles.example]}>
          <Text style={styles.exampleLabel}>VÍ DỤ NGỮ CẢNH</Text>
          {pass === 1 ? (
            <Text style={styles.exampleChinese}>{example.chinese}</Text>
          ) : null}
          <Text style={styles.exampleVi}>
            {hidePinyinHints(example.vietnamese)}
          </Text>
        </View>
      ) : null}

      <Text style={styles.instruction}>
        {pass === 1
          ? "Quan sát đáp án rồi viết và chọn đúng chữ Hán một lần."
          : `Dựa vào nghĩa tiếng Việt và pinyin, tự viết chữ Hán ở lượt ${pass}/3.`}
      </Text>
      <View style={[themedCard(theme), styles.padCard]}>
        <HanziHandwritingPad
          key={`${word.id}-${pass}`}
          characterCount={
            Array.from(word.simplified.trim().replace(/\s+/g, "")).length
          }
          targetWord={word.simplified}
          onSelect={(value) => {
            setRecognizedHanzi(value.trim().replace(/\s+/g, ""));
            setFeedback(null);
          }}
          onHintUsed={() => {
            setFeedback(
              "Đã mở một nét gợi ý mờ. Hãy quan sát nét đó và tự hoàn thành các nét còn lại.",
            );
          }}
        />
        {recognizedHanzi ? (
          <View style={styles.recognized}>
            <Text style={styles.recognizedLabel}>CHỮ ĐÃ CHỌN</Text>
            <Text style={styles.recognizedText}>{recognizedHanzi}</Text>
            <AudioButton text={word.simplified} size={24} />
            <Text style={recognizedCorrect ? styles.good : styles.bad}>
              {recognizedCorrect
                ? "Đúng chữ. Có thể hoàn tất bước ghi nhớ."
                : "Chưa khớp với từ đang học."}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[themedCard(theme), styles.voiceCard]}>
        <Text style={styles.voiceTitle}>KHÔNG TIỆN VIẾT? NÓI HOẶC NHẬP PINYIN</Text>
        <Text style={styles.voiceDescription}>
          Chạm nút mic, đọc từ tiếng Trung; app sẽ điền pinyin và gợi ý Hán tự để bạn chọn.
        </Text>
        <PinyinHanziComposer
          db={db}
          disabled={saving}
          onClear={clearPinyinAnswer}
          onDeleteLast={deleteLastPinyinCharacter}
          onPinyinChange={(value) => {
            setPinyinQuery(value);
            setFeedback(null);
          }}
          onSelectCandidate={selectPinyinCandidate}
          pinyinQuery={pinyinQuery}
          scriptMode={settings?.simplifiedOrTraditional ?? "simplified"}
          selectedHanzi={recognizedHanzi}
          targetWord={word}
        />
      </View>
      {feedback ? <View accessibilityLiveRegion="polite" style={[styles.feedback, recognizedCorrect ? styles.feedbackGood : styles.feedbackBad]}><Ionicons name={recognizedCorrect ? "checkmark-circle" : "information-circle"} size={18} color={recognizedCorrect ? theme.success : theme.error} /><Text style={[styles.feedbackText, recognizedCorrect ? styles.feedbackTextGood : styles.feedbackTextBad]}>{feedback}</Text></View> : null}
      <PrimaryButton
        label={
          pass < 3
            ? `Xác nhận · sang lượt ${pass + 1}`
            : "Hoàn tất 3 lượt · lưu Cấp 1"
        }
        disabled={!recognizedHanzi || !recognizedCorrect}
        loading={saving}
        onPress={() => void confirmCopy()}
      />
      {pass === 1 ? (
        <>
          <PrimaryButton
            variant="secondary"
            label="Đã biết"
            loading={saving}
            onPress={() => void markKnown()}
          />
          <PrimaryButton
            variant="ghost"
            label="Bỏ qua từ này"
            loading={saving}
            onPress={() => void skip()}
          />
        </>
      ) : null}
      <StudySettingsSheet
        visible={settingsOpen}
        settings={settings}
        mode="learn"
        onClose={() => setSettingsOpen(false)}
        onChange={(patch) => void updateSettings(patch)}
      />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  top: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  counter: {
    minWidth: 42,
    color: theme.textMuted,
    fontWeight: "800",
    fontSize: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 99,
    overflow: "hidden",
    backgroundColor: theme.border,
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: theme.primary,
  },
  gear: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  progressLabel: {
    color: theme.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: -spacing.md,
  },
  wordCard: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  encodingBadge: {
    color: theme.primaryText,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  hanzi: { fontSize: 68, fontWeight: "900", color: theme.textPrimary },
  pronounce: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pinyin: { fontSize: 22, textAlign: "center", color: theme.textPrimary },
  meaning: {
    fontSize: 21,
    color: theme.textPrimary,
    fontWeight: "800",
    textAlign: "center",
  },
  meta: { color: theme.textMuted, fontSize: 12 },
  hiddenAnswer: { color: theme.textMuted, fontSize: 14, fontWeight: "700" },
  image: { height: 150, width: "100%", borderRadius: radius.md },
  example: { gap: spacing.xs },
  exampleLabel: {
    color: theme.primaryText,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  exampleChinese: { color: theme.textPrimary, fontSize: 19, fontWeight: "700" },
  exampleVi: { color: theme.textMuted, lineHeight: 20 },
  instruction: {
    color: theme.textMuted,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
  },
  padCard: { alignItems: "center", gap: spacing.md },
  voiceCard: { gap: spacing.sm },
  voiceTitle: {
    color: theme.primaryText,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  voiceDescription: { color: theme.textMuted, fontSize: 13, lineHeight: 19 },
  recognized: { alignItems: "center", gap: 3 },
  recognizedLabel: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  recognizedText: { color: theme.primaryText, fontSize: 34, fontWeight: "900" },
  good: { color: theme.success, fontSize: 12, fontWeight: "700" },
  bad: { color: theme.error, fontSize: 12, fontWeight: "700" },
  feedback: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
  feedbackGood: { backgroundColor: theme.successSoft },
  feedbackBad: { backgroundColor: theme.errorSoft },
  feedbackText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  feedbackTextGood: { color: theme.success },
  feedbackTextBad: { color: theme.error },}); }
