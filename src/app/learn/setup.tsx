import { Image } from "expo-image";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type DimensionValue } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { EmptyState } from "@/components/EmptyState";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import { getDashboardStats, getSettings, getUnlearnedVocabulary, setKnown, setSkipped } from "@/db/repository";
import { speakChinese, stopChineseSpeech } from "@/services/audio/chinese-speech";
import { getLearnSessionLimit } from "@/services/learning/session-limit";
import {
  groupVocabularyByTopic,
  vocabularyTopics,
  type VocabularyTopicId,
} from "@/services/learning/vocabulary-topics";
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
  const [selectedTopic, setSelectedTopic] = useState<VocabularyTopicId | null>(null);
  const [remainingToday, setRemainingToday] = useState(0);
  const [audioSettings, setAudioSettings] = useState<Pick<import("@/types/models").UserSettings, "speechRate" | "soundEnabled" | "autoPlayAudio"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const topicGroups = useMemo(() => groupVocabularyByTopic(available), [available]);
  const topicOptions = useMemo(
    () => vocabularyTopics
      .map((topic) => ({ ...topic, count: topicGroups.get(topic.id)?.length ?? 0 }))
      .filter((topic) => topic.count > 0),
    [topicGroups],
  );
  const activeWords = deckId
    ? available
    : selectedTopic
      ? topicGroups.get(selectedTopic) ?? []
      : [];
  const currentGoal = Math.min(goal, activeWords.length);
  const word = activeWords[index];
  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);

  useEffect(() => {
    let live = true;
    void getSettings(db)
      .then(async (settings) => {
        const [words, stats] = await Promise.all([
          getUnlearnedVocabulary(db, settings.selectedHskBands, deckId ? 100 : 500, deckId),
          getDashboardStats(db, settings.selectedHskBands),
        ]);
        if (!live) return;
        setAudioSettings(settings);
        setAvailable(words);
        const plan = getLearnSessionLimit({
          dailyGoal: settings.dailyNewWordGoal,
          learnedToday: stats.newToday,
          sessionLimit: settings.learnSessionSize,
          available: words.length,
        });
        setGoal(plan.wordCount);
        setRemainingToday(plan.remainingToday);
      })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [db, deckId]);

  useEffect(() => {
    if (!word || !audioSettings?.soundEnabled || !audioSettings.autoPlayAudio) return;
    void speakChinese(word.simplified, { rate: audioSettings.speechRate });
    return () => {
      void stopChineseSpeech();
    };
  }, [audioSettings, word]);

  const begin = (queue: Vocabulary[]) => {
    if (!queue.length) return;
    setQueue(queue);
    router.push(
      deckId
        ? ({ pathname: "/learn/session", params: { deckId } } as Href)
        : "/learn/session",
    );
  };

  const advance = (queue = selected) => {
    if (queue.length >= goal) {
      begin(queue);
      return;
    }
    if (index + 1 >= activeWords.length) {
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

  if (goal === 0) {
    return <Screen title="Mục tiêu hôm nay đã hoàn thành" subtitle="Ngày mai bạn sẽ có thêm lượt từ mới theo mục tiêu đã chọn.">
      <EmptyState title="Đã đủ từ mới hôm nay" message="Bạn vẫn có thể ôn các từ đến hạn để củng cố trí nhớ." />
      <PrimaryButton label="Ôn tập ngay" onPress={() => router.push("/review")} />
    </Screen>;
  }

  if (!deckId && !selectedTopic) {
    return (
      <Screen title="Chọn chủ đề để học" subtitle={"Các từ HSK chưa học · phiên này tối đa " + goal + " từ"}>
        {topicOptions.length ? (
          <View style={styles.topicGrid}>
            {topicOptions.map((topic) => (
              <Pressable
                key={topic.id}
                accessibilityRole="button"
                accessibilityLabel={topic.title + ", " + topic.count + " từ"}
                onPress={() => {
                  setSelectedTopic(topic.id);
                  setSelected([]);
                  setIndex(0);
                }}
                style={({ pressed }) => [card, styles.topicCard, pressed && styles.topicPressed]}
              >
                <View style={styles.topicCopy}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <Text style={styles.topicDescription}>{topic.description}</Text>
                </View>
                <View style={styles.topicCount}>
                  <Text style={styles.topicCountText}>{topic.count}</Text>
                  <Text style={styles.topicCountLabel}>từ</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState title="Không còn từ mới" message="Các từ HSK trong phạm vi đã chọn đều đã được xử lý." />
        )}
      </Screen>
    );
  }

  if (!word) {
    return (
      <Screen title={deckId ? "Chọn từ trong bộ" : "Chọn từ để học"}>
        <EmptyState title="Không còn từ mới" message="Các từ chưa học trong phạm vi này đã được xử lý." />
        {selected.length ? <PrimaryButton label={"Bắt đầu với " + selected.length + " từ"} onPress={() => begin(selected)} /> : null}
      </Screen>
    );
  }

  const example = word?.examples[0];
  const topicTitle = vocabularyTopics.find((topic) => topic.id === selectedTopic)?.title;
  return (
    <Screen
      title={"Chọn từ để bắt đầu học (" + selected.length + "/" + currentGoal + ")"}
      subtitle={deckId
        ? "Từ trong bộ này · còn " + remainingToday + " từ theo mục tiêu hôm nay"
        : topicTitle + " · còn " + remainingToday + " từ theo mục tiêu hôm nay"}
    >
      {!deckId ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSelectedTopic(null);
            setSelected([]);
            setIndex(0);
          }}
          style={styles.changeTopic}
        >
          <Text style={styles.changeTopicText}>Đổi chủ đề</Text>
        </Pressable>
      ) : null}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: ((currentGoal ? selected.length / currentGoal * 100 : 0) + "%") as DimensionValue }]} />
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
  topicGrid: { gap: spacing.md },
  topicCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 94 },
  topicPressed: { opacity: 0.72 },
  topicCopy: { flex: 1, gap: spacing.xs },
  topicTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
  topicDescription: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  topicCount: { minWidth: 54, height: 54, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  topicCountText: { color: colors.primary, fontSize: 18, fontWeight: "900" },
  topicCountLabel: { color: colors.primary, fontSize: 10, fontWeight: "800" },
  changeTopic: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  changeTopicText: { color: colors.primary, fontWeight: "900" },
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
