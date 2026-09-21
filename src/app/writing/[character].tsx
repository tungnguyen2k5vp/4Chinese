import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { StrokeWriter } from "@/components/StrokeWriter";
import { WritingCanvas } from "@/components/WritingCanvas";
import { card, colors, radius, spacing } from "@/constants/design";
import { findCommonRadical } from "@/data/common-radicals";

export default function WritingScreen() {
  const { character: rawCharacter = "学" } = useLocalSearchParams<{ character: string }>();
  const character = Array.from(rawCharacter)[0] ?? "学";
  const radical = findCommonRadical(character);

  return (
    <Screen
      subtitle={
        radical
          ? `Bộ ${radical.name} · ${radical.meaningVi}`
          : "Quan sát thứ tự nét rồi tự viết trong ô 田字格."
      }
      title={`Luyện viết ${character}`}
    >
      {radical ? (
        <View style={[card, styles.lesson]}>
          <View style={styles.lessonTop}>
            <View style={styles.radicalBadge}><Text style={styles.radical}>{radical.character}</Text></View>
            <View style={styles.lessonCopy}>
              <Text style={styles.eyebrow}>BỘ THỦ</Text>
              <Text style={styles.lessonTitle}>{radical.name}</Text>
              <Text style={styles.lessonMeaning}>{radical.meaningVi}</Text>
            </View>
          </View>
          <View style={styles.usageBox}>
            <Ionicons color={colors.primary} name="bulb-outline" size={19} />
            <Text style={styles.usage}>{radical.usage}</Text>
          </View>
          <Text style={styles.examplesLabel}>TỪ GỢI Ý LIÊN QUAN</Text>
          <View style={styles.examples}>
            {radical.examples.map((example) => (
              <View key={example} style={styles.exampleChip}>
                <Text style={styles.exampleText}>{example}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[card, styles.sectionCard]}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionIcon}><Ionicons color={colors.primary} name="play" size={17} /></View>
          <View><Text style={styles.section}>Thứ tự nét</Text><Text style={styles.sectionHint}>Xem từng nét, sau đó phát lại để quan sát nhịp viết.</Text></View>
        </View>
        <StrokeWriter character={character} key={character} />
      </View>

      <View style={[card, styles.sectionCard]}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionIcon}><Ionicons color={colors.primary} name="brush" size={18} /></View>
          <View><Text style={styles.section}>Tự luyện trong ô 田字格</Text><Text style={styles.sectionHint}>Bật gợi ý khi quên hình, xóa từng nét để sửa chính xác.</Text></View>
        </View>
        <WritingCanvas character={character} key={character} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lesson: { gap: spacing.md, backgroundColor: "#F5F8FF" },
  lessonTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  radicalBadge: { width: 76, height: 76, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: "#FFFFFF" },
  radical: { color: colors.text, fontSize: 46, fontWeight: "900" },
  lessonCopy: { flex: 1, gap: 2 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  lessonTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
  lessonMeaning: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
  usageBox: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, borderRadius: radius.md, backgroundColor: "#FFFFFF", padding: spacing.md },
  usage: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  examplesLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  exampleChip: { minWidth: 52, alignItems: "center", borderRadius: radius.pill, backgroundColor: "#FFFFFF", paddingHorizontal: spacing.md, paddingVertical: 8 },
  exampleText: { color: colors.primary, fontSize: 18, fontWeight: "900" },
  sectionCard: { gap: spacing.md },
  sectionHeading: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  sectionIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primarySoft },
  section: { color: colors.text, fontSize: 17, fontWeight: "900" },
  sectionHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2 },
});
