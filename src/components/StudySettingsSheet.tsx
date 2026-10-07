import { Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { card, radius, spacing, themedCard } from "@/constants/design";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { UserSettings } from "@/types/models";

export function StudySettingsSheet({
  visible,
  settings,
  mode,
  onClose,
  onChange,
}: {
  visible: boolean;
  settings: UserSettings | null;
  mode: "learn" | "review";
  onClose: () => void;
  onChange: (patch: Partial<UserSettings>) => void;
}) {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  if (!settings) return null;
  const count = mode === "learn" ? settings.learnSessionSize : settings.reviewSessionSize;
  const counts = mode === "learn" ? [5, 10, 15, 20, 30, 50, 75, 100] : [10, 20, 30, 50];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[card, themedCard(theme), styles.sheet]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Cài đặt phiên {mode === "learn" ? "học" : "ôn"}</Text>
              <Text style={styles.subtitle}>Thay đổi được lưu ngay trên thiết bị.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}><Text style={styles.close}>×</Text></Pressable>
          </View>
          <Text style={styles.label}>SỐ TỪ TỐI ĐA MỖI PHIÊN</Text>
          <View style={styles.choices}>
            {counts.map((value) => (
              <Pressable
                key={value}
                onPress={() => onChange(mode === "learn" ? { learnSessionSize: value as UserSettings["learnSessionSize"] } : { reviewSessionSize: value as UserSettings["reviewSessionSize"] })}
                style={[styles.choice, count === value && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, count === value && styles.choiceTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>THỜI LƯỢNG HỌC MỖI NGÀY</Text>
          <View style={styles.choices}>
            {[15, 30, 45, 60].map((value) => (
              <Pressable
                key={value}
                onPress={() => onChange({ dailyStudyMinutes: value })}
                style={[styles.choice, settings.dailyStudyMinutes === value && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, settings.dailyStudyMinutes === value && styles.choiceTextActive]}>
                  {value}p
                </Text>
              </Pressable>
            ))}
          </View>
          <Setting label="Tự phát âm khi ôn" value={settings.autoPlayAudio} onChange={(autoPlayAudio) => onChange({ autoPlayAudio })} theme={theme} styles={styles} />
          <Setting label="Rung khi đúng/sai" value={settings.hapticEnabled} onChange={(hapticEnabled) => onChange({ hapticEnabled })} theme={theme} styles={styles} />
          {mode === "review" ? <Setting label="Tự chấm 4 mức" value={settings.reviewStyle === "self-rating"} onChange={(selfRating) => onChange({ reviewStyle: selfRating ? "self-rating" : "automatic" })} theme={theme} styles={styles} /> : null}
          <Text style={styles.note}>Lần đầu chép một lần để lưu Cấp 1. Mỗi lượt ôn được chấm ngay; trả lời sai sẽ hạ cấp theo quy tắc và nhắc lại sớm hơn.</Text>
          <PrimaryButton label="Xong" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function Setting({ label, value, onChange, theme, styles }: { label: string; value: boolean; onChange: (value: boolean) => void; theme: ReturnType<typeof useTheme>; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.setting}><Text style={styles.settingText}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ true: theme.primarySoft }} thumbColor={value ? theme.primary : undefined} /></View>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: theme.overlay, padding: spacing.md },
  sheet: { gap: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  title: { fontSize: 20, color: theme.textPrimary, fontWeight: "900" },
  subtitle: { marginTop: 3, color: theme.textMuted, fontSize: 12 },
  close: { color: theme.textMuted, fontSize: 32, lineHeight: 32 },
  label: { color: theme.textMuted, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: { minWidth: 54, minHeight: 44, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: theme.border },
  choiceActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  choiceText: { fontWeight: "800", color: theme.textMuted },
  choiceTextActive: { color: theme.onPrimary },
  setting: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48, borderTopWidth: 1, borderTopColor: theme.border },
  settingText: { color: theme.textPrimary, fontSize: 15, flex: 1 },
  note: { color: theme.textMuted, fontSize: 12, lineHeight: 18, backgroundColor: theme.primarySoft, borderRadius: radius.md, padding: spacing.md },
}); }
