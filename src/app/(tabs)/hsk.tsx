import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EnglishLevels } from "@/components/EnglishOverview";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SyllabusOverview } from "@/components/SyllabusOverview";
import { ExamCenterContent } from "@/components/exam/ExamCenterContent";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { LearningLandscape } from "@/components/visual/LearningLandscape";
import { radius, spacing } from "@/constants/design";
import { getHskProgress, getSettings } from "@/db/repository";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { HskBand } from "@/types/models";

const bands: HskBand[] = [1, 2, 3, 4, 5, 6, "7-9"];
export default function HskScreen() {
  const { preferences } = useLearningLanguage();
  return preferences.learningLanguage === "en" ? <EnglishLevels /> : <ChineseHskScreen />;
}

function ChineseHskScreen() {
  const [mode, setMode] = useState<"learn" | "exam" | "syllabus">("learn");
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [reload, setReload] = useState(0);
  const [focusBand, setFocusBand] = useState("1");
  const levelScroll = useRef<ScrollView | null>(null);
  const levelOffsets = useRef(new Map<string, number>());
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const [rows, setRows] = useState<
    { band: string; total: number; learned: number; mastered: number }[]
  >([]);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      setLoadStatus("loading");
      void Promise.all([getHskProgress(db), getSettings(db)])
        .then(([data, settings]) => {
          if (live) {
            setRows(data);
            const selected = settings.selectedHskBands.map(String);
            setFocusBand((current) => current && selected.includes(current) ? current : selected[0] ?? data[0]?.band ?? "1");
            setLoadStatus("ready");
          }
        })
        .catch(() => {
          if (live) setLoadStatus("error");
        });
      return () => {
        live = false;
      };
      // reload deliberately changes the focused effect identity for manual retry.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, reload]),
  );
  useEffect(() => {
    const offset = levelOffsets.current.get(focusBand);
    if (offset === undefined) return;
    requestAnimationFrame(() => {
      levelScroll.current?.scrollTo({ x: Math.max(0, offset - spacing.sm), animated: false });
    });
  }, [focusBand, loadStatus]);
  return (
    <Screen
      title="HSK"
      safeAreaEdges={["top", "bottom"]}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(
          [
            { id: "learn", label: "Học" },
            { id: "exam", label: "Ôn thi" },
            { id: "syllabus", label: "Đề cương" },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === item.id }}
            onPress={() => setMode(item.id)}
            style={[styles.modeTab, mode === item.id && styles.modeTabActive]}
          >
            <Text
              style={{
                color: mode === item.id ? theme.onPrimary : theme.textSecondary,
                fontWeight: "700",
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {mode === "learn" && loadStatus === "loading" ? (
        <View style={styles.list}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.meta}>Đang đọc tiến độ học trên máy…</Text>
        </View>
      ) : null}
      {mode === "learn" && loadStatus === "error" ? (
        <View style={styles.list}>
          <Text style={styles.focusTitle}>Chưa tải được tiến độ</Text>
          <Text style={styles.meta}>
            Dữ liệu học không bị xóa. Bạn có thể thử đọc lại.
          </Text>
          <PrimaryButton
            label="Thử lại"
            onPress={() => setReload((value) => value + 1)}
          />
        </View>
      ) : null}
      {mode === "learn" && loadStatus === "ready" ? (
        <View style={styles.list}>
          <Text style={styles.meta}>Kho đang học · cấp theo bộ từ hiện có. Bộ HSK 3.0 · 11/2025 nằm trong mục Đề cương.</Text>
          <ScrollView ref={levelScroll} horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.levelPicker} accessibilityLabel="Chọn cấp độ HSK">
            {bands.map((band, index) => <Pressable key={String(band)} onLayout={(event) => levelOffsets.current.set(String(band), event.nativeEvent.layout.x)} accessibilityRole="tab" accessibilityState={{ selected: focusBand === String(band) }} onPress={() => setFocusBand(String(band))} style={[styles.levelChip, focusBand === String(band) && { backgroundColor: theme.hsk[index], borderColor: theme.hsk[index] }]}><Text style={[styles.levelChipText, focusBand === String(band) && styles.levelChipTextActive]}>HSK {band}</Text></Pressable>)}
          </ScrollView>
          {(() => {
            const index = bands.findIndex((band) => String(band) === focusBand);
            const band = bands[index >= 0 ? index : 0]!;
            const row = rows.find((item) => item.band === String(band));
            const total = row?.total ?? 0;
            const learned = row?.learned ?? 0;
            const progress = total ? learned / total : 0;
            const levelColor = theme.hsk[index >= 0 ? index : 0] ?? theme.primary;
            return <View style={[styles.focusCard, { borderColor: levelColor }]}>
              <View style={styles.levelArt}><LearningLandscape mood="journey" scene="hsk" height={84} /><View style={[styles.levelBadge, { backgroundColor: levelColor }]}><Text style={styles.levelSmall}>HSK</Text><Text style={styles.levelText}>{band}</Text></View><Text style={styles.levelChinese}>汉字 · 词汇 · 练习</Text></View>
              <View style={styles.focusBody}><Text style={[styles.levelEyebrow, { color: levelColor }]}>CẤP ĐỘ ĐANG CHỌN</Text><View style={styles.focusTitleRow}><Text style={styles.focusTitle}>HSK {band}</Text><Text style={[styles.masteredPill, { color: levelColor }]}>{row?.mastered ?? 0} nhớ tốt</Text></View><Text style={styles.meta}>{total} từ trong cấp độ này.</Text><AnimatedProgressBar progress={progress} color={levelColor} trackColor={theme.border} height={8} accessibilityLabel={`Tiến độ học HSK ${band}`} /><View style={styles.learnedRow}><Text style={styles.learned}>{learned} / {total} đã học</Text><Text style={styles.learned}>{Math.round(progress * 100)}%</Text></View><View style={styles.focusActions}><PrimaryButton label="Mở kho từ" onPress={() => router.push(`/(tabs)/vocabulary?band=${band}`)} /><PrimaryButton label="Lộ trình học" variant="secondary" onPress={() => router.push('/path')} /></View></View>
            </View>;
          })()}
          <Text style={styles.otherLevels}>TIẾN ĐỘ CẤP ĐỘ KHÁC</Text>
          <View style={styles.compactList}>{bands.filter((band) => String(band) !== focusBand).map((band, index) => { const row = rows.find((item) => item.band === String(band)); const total = row?.total ?? 0; const learned = row?.learned ?? 0; const colorIndex = bands.findIndex((item) => item === band); const color = theme.hsk[colorIndex] ?? theme.primary; const progress = total ? learned / total : 0; return <MotionPressable key={String(band)} haptic accessibilityLabel={`Chọn HSK ${band}: ${learned} trên ${total} từ đã học`} onPress={() => setFocusBand(String(band))} style={styles.compactRow}><View style={[styles.compactMark, { borderColor: color }]}><Text style={[styles.compactBand, { color }]}>{band}</Text></View><View style={styles.compactCopy}><Text style={styles.compactTitle}>HSK {band}</Text><Text style={styles.compactMeta}>{learned}/{total} đã học · {row?.mastered ?? 0} nhớ tốt</Text></View><View style={styles.compactTrack}><View style={[styles.compactFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} /></View><Text style={styles.compactPercent}>{Math.round(progress * 100)}%</Text></MotionPressable>; })}</View>
        </View>
      ) : null}
      {mode === "exam" ? <ExamCenterContent initialBand={focusBand === "7-9" ? "7-9" : Number(focusBand) as HskBand} onBandChange={band => setFocusBand(String(band))} /> : null}
      {mode === "syllabus" ? <SyllabusOverview /> : null}
    </Screen>
  );
}
function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    list: { gap: spacing.md },
    modeTab: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 11, borderRadius: radius.pill, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border },
    modeTabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    levelPicker: { flexDirection: 'row', gap: spacing.xs, paddingRight: spacing.md },
    levelChip: { minHeight: 48, paddingHorizontal: 11, borderRadius: radius.pill, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
    levelChipText: { color: theme.textSecondary, fontSize: 14, fontWeight: '800' },
    levelChipTextActive: { color: '#FFFFFF' },
    focusCard: { borderWidth: 1.5, borderRadius: radius.lg, backgroundColor: theme.surface, overflow: 'hidden' },
    levelArt: { position: 'relative' },
    levelBadge: { position: 'absolute', left: spacing.md, top: spacing.sm, minWidth: 48, minHeight: 54, borderRadius: radius.md, padding: spacing.xs, alignItems: 'center', justifyContent: 'center' },
    levelSmall: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
    levelText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
    levelChinese: { position: 'absolute', right: spacing.md, bottom: spacing.md, color: '#FFFFFF', backgroundColor: '#253B31CC', fontSize: 11, fontWeight: '900', borderRadius: radius.pill, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6 },
    focusBody: { padding: spacing.md, gap: spacing.sm },
    levelEyebrow: { fontSize: 10, letterSpacing: 0.9, fontWeight: '900' },
    focusTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    focusTitle: { color: theme.textPrimary, fontSize: 22, fontWeight: '900' },
    masteredPill: { backgroundColor: theme.successSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
    meta: { color: theme.textMuted, fontSize: 12 },
    learnedRow: { flexDirection: 'row', justifyContent: 'space-between' },
    learned: { color: theme.textMuted, fontSize: 11, fontWeight: '800' },
    focusActions: { gap: spacing.sm, paddingTop: spacing.xs },
    otherLevels: { paddingTop: spacing.md, color: theme.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    compactList: { gap: spacing.xs },
    compactRow: { minHeight: 64, borderRadius: radius.md, backgroundColor: theme.backgroundSecondary, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    compactMark: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
    compactBand: { fontSize: 15, fontWeight: '900' },
    compactCopy: { flex: 1, minWidth: 0, gap: 3 }, compactTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: '900' }, compactMeta: { color: theme.textMuted, fontSize: 12 }, compactTrack: { width: 36, height: 5, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden' }, compactFill: { height: '100%', borderRadius: 3 }, compactPercent: { width: 32, color: theme.textMuted, fontSize: 10, fontWeight: '800', textAlign: 'right' },
  });
}
