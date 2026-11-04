import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { HskBadge, MasteryBadge } from "@/components/Badges";
import { PinyinText } from "@/components/PinyinText";
import { radius, spacing } from "@/constants/design";
import { formatDueInterval } from "@/services/srs/scheduler";
import { primaryEnglishMeaning } from "@/services/vocabulary/bilingual-meanings";
import { useTheme } from "@/theme/ThemeProvider";
import type { Vocabulary } from "@/types/models";

const masteryColors = ["#D9DEE9", "#F6A134", "#F7D34A", "#9FD66D", "#35BE79", "#3BC0D9", "#3475EB"];

export const VocabularyCard = memo(function VocabularyCard({ word, onPress, onLongPress, onFavorite, onRestore, footer, footerAccessibilityLabel }: { word: Vocabulary; onPress: () => void; onLongPress?: () => void; onFavorite?: () => void; onRestore?: () => void; footer?: ReactNode; footerAccessibilityLabel?: string }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const dueLabel = word.status === "LEARNING" && word.nextReviewAt ? formatDueInterval(word.nextReviewAt) : null;
  return <Pressable accessibilityRole="button" accessibilityLabel={[word.simplified, word.pinyin, word.primaryMeaningVi, footerAccessibilityLabel].filter(Boolean).join(", ")} onPress={onPress} onLongPress={onLongPress} delayLongPress={550} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={[styles.levelAccent, { backgroundColor: masteryColors[word.masteryLevel ?? 0] ?? masteryColors[0] }]} />
    <View style={styles.main}>
      <View style={styles.hanziTile}>
        {word.imageUri ? <Image source={word.imageUri} style={styles.hanziImage} contentFit="cover" transition={120} /> : <Text adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1} style={styles.hanzi}>{word.simplified}</Text>}
      </View>
      <View style={styles.wordCopy}>
        <PinyinText value={word.pinyin} style={styles.pinyin} />
        <Text style={styles.meaning} numberOfLines={2}>{word.primaryMeaningVi}</Text>
        <Text style={styles.englishMeaning} numberOfLines={1}>EN · {primaryEnglishMeaning(word.meaningsEn)}</Text>
        <View style={styles.meta}>
          <HskBadge band={word.hskBand} />
          <MasteryBadge level={word.masteryLevel} status={word.status} />
          {word.pos[0] ? <Text style={styles.pos}>{word.pos[0]}</Text> : null}
        </View>
        {dueLabel ? <Text style={styles.due}>{dueLabel === "Đến hạn ôn" ? dueLabel : `Ôn lại sau ${dueLabel}`}</Text> : null}
      </View>
      <View style={styles.actions}>
        <AudioButton text={word.simplified} />
        {onFavorite ? <Pressable accessibilityRole="button" accessibilityLabel="Yêu thích" onPress={(event) => { event.stopPropagation(); onFavorite(); }} hitSlop={8} style={styles.favorite}>
          <Ionicons name={word.isFavorite ? "bookmark" : "bookmark-outline"} size={22} color={word.isFavorite ? theme.accent : theme.textMuted} />
        </Pressable> : null}
        {onRestore ? <Pressable accessibilityRole="button" accessibilityLabel="Khôi phục từ" onPress={(event) => { event.stopPropagation(); onRestore(); }} hitSlop={8} style={styles.favorite}>
          <Ionicons name="refresh" size={22} color={theme.primaryText} />
        </Pressable> : null}
      </View>
    </View>
    {footer ? <View style={styles.footer}>{footer}</View> : null}
  </Pressable>;
});

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: radius.lg, borderCurve: "continuous", padding: spacing.md, overflow: "hidden" },
    levelAccent: { position: "absolute", left: 0, top: 16, bottom: 16, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    pressed: { opacity: 0.74, transform: [{ scale: 0.992 }] },
    main: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
    hanziTile: { width: 66, minHeight: 72, borderRadius: radius.md, alignItems: "center", justifyContent: "center", padding: spacing.xs, backgroundColor: theme.primarySoft },
    hanziImage: { width: 58, height: 64, borderRadius: radius.sm },
    hanzi: { color: theme.textPrimary, fontSize: 32, lineHeight: 40, fontWeight: "800", textAlign: "center" },
    wordCopy: { flex: 1, minWidth: 0, paddingVertical: 2, gap: 5 },
    pinyin: { fontSize: 17, lineHeight: 21, fontWeight: "800" },
    actions: { alignItems: "center", gap: 1 },
    favorite: { width: 42, height: 38, justifyContent: "center", alignItems: "center" },
    meaning: { color: theme.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: "600" },
    englishMeaning: { color: theme.textMuted, fontSize: 11, lineHeight: 16, fontStyle: "italic" },
    meta: { flexDirection: "row", gap: spacing.xs, alignItems: "center", flexWrap: "wrap", marginTop: 3 },
    pos: { color: theme.textMuted, fontSize: 12, flexShrink: 1 },
    due: { color: theme.primaryText, fontSize: 11, fontWeight: "800", marginTop: 1 },
    footer: { borderTopWidth: 1, borderColor: theme.border, marginTop: spacing.sm, paddingTop: spacing.sm },
  });
}
