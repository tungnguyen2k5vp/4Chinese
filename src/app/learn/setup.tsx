import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { EmptyState } from "@/components/EmptyState";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import { getSettings, getUnlearnedVocabulary, setKnown, setSkipped } from "@/db/repository";
import { useAppStore } from "@/stores/app-store";
import type { Vocabulary } from "@/types/models";

export default function LearnSetup() {
  const { deckId } = useLocalSearchParams<{ deckId?: string }>();
  const db = useSQLiteContext();
  const setQueue = useAppStore((state) => state.setLearnQueue);
  const [available, setAvailable] = useState<Vocabulary[]>([]);
  const [selected, setSelected] = useState<Vocabulary[]>([]);
  const [index, setIndex] = useState(0);
  const [goal, setGoal] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const word = available[index];
  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);

  useEffect(() => {
    let live = true;
    void getSettings(db)
      .then(async (settings) => {
        const words = await getUnlearnedVocabulary(db, settings.selectedHskBands, 100, deckId);
        if (!live) return;
        setAvailable(words);
        setGoal(Math.min(Math.max(1, Math.min(10, settings.dailyNewWordGoal)), words.length));
      })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [db, deckId]);

  const begin = (queue: Vocabulary[]) => {
    if (!queue.length) return;
    setQueue(queue);
    router.push("/learn/session");
  };

  const advance = (queue = selected) => {
    if (queue.length >= goal) {
      begin(queue);
      return;
    }
    if (index + 1 >= available.length) {
      if (queue.length) begin(queue);
      else setIndex((value) => value + 1);
      return;
    }
    setIndex((value) => value + 1);
  };

  const choose = () => {
    if (!word || selectedIds.has(word.id)) return;
    const next = [...selected, word];
    setSelected(next);
    advance(next);
  };

  const markKnown = async () => {
    if (!word || saving) return;
    setSaving(true);
    try {
      await setKnown(db, word.id, true);
      advance();
    } finally { setSaving(false); }
  };

  const skip = async () => {
    if (!word || saving) return;
    setSaving(true);
    try {
      await setSkipped(db, word.id);
      advance();
    } finally { setSaving(false); }
  };

  if (loading) {
    return <Screen title="Đang chuẩn bị từ trong bộ"><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  }

  if (!word) {
    return (
      <Screen title={deckId ? "Chọn từ trong bộ" : "Chọn từ để học"}>
        <EmptyState title="Không còn từ mới" message="Các từ chưa học trong phạm vi này đã được xử lý." />
        {selected.length ? <PrimaryButton label={`Bắt đầu với ${selected.length} từ`} onPress={() => begin(selected)} /> : null}
      </Screen>
    );
  }

  const example = word?.examples[0];
  return (
    <Screen title={`Chọn từ để bắt đầu học (${selected.length}/${goal || 0})`} subtitle={deckId ? "Từ trong bộ này" : "Từ mới hôm nay"}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${goal ? selected.length / goal * 100 : 0}%` }]} />
      </View>
      {word ? (
        <View style={[card, styles.wordCard]}>
          <Text style={styles.hanzi}>{word.simplified}</Text>
          <View style={styles.audioRow}>
            <PinyinText value={word.pinyin} style={styles.pinyin} />
            <AudioButton text={word.simplified} size={26} />
          </View>
          <Text style={styles.meaning}>{word.primaryMeaningVi}</Text>
          <Text style={styles.meta}>{word.pos.join(" · ")} · HSK {word.hskBand}</Text>
          {word.imageUri ? <Image source={word.imageUri} style={styles.image} contentFit="cover" /> : null}
          {example ? (
            <View style={styles.example}>
              <Text style={styles.exampleChinese}>{example.chinese}</Text>
              <Text style={styles.exampleVi}>{example.vietnamese}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.skipRow}>
        <Pressable disabled={saving} onPress={() => void skip()} style={styles.skipButton}>
          <Text style={styles.skipText}>Bỏ qua</Text>
        </Pressable>
      </View>
      <View style={styles.actionButtons}>
        <PrimaryButton variant="secondary" label="Đã biết" loading={saving} onPress={() => void markKnown()} style={styles.actionButton} />
        <PrimaryButton label="Học từ này" disabled={!word} onPress={choose} style={styles.actionButton} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 9, borderRadius: 99, backgroundColor: colors.border, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99, backgroundColor: colors.primary },
  wordCard: { gap: spacing.sm, alignItems: "flex-start", paddingVertical: spacing.lg },
  hanzi: { color: colors.primary, fontSize: 50, fontWeight: "900" },
  audioRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  pinyin: { fontSize: 22 }, meaning: { color: colors.text, fontSize: 22, fontWeight: "800" },
  meta: { color: colors.textMuted, fontSize: 13 }, image: { width: "100%", height: 160, borderRadius: radius.md },
  example: { marginTop: spacing.xs, gap: spacing.xs }, exampleChinese: { color: colors.text, fontSize: 17, fontWeight: "700" }, exampleVi: { color: colors.textMuted, lineHeight: 20 },
  skipRow: { alignItems: "flex-end" }, skipButton: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, skipText: { color: colors.text, fontWeight: "800" },
  actionButtons: { flexDirection: "row", gap: spacing.sm }, actionButton: { flex: 1, minHeight: 46, paddingHorizontal: spacing.sm },
});
