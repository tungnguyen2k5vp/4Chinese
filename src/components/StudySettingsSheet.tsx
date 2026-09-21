import { Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { card, colors, radius, spacing } from "@/constants/design";
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
  if (!settings) return null;
  const count = mode === "learn" ? settings.dailyNewWordGoal : settings.reviewSessionSize;
  const counts = mode === "learn" ? [5, 10, 15, 20] : [10, 20, 30, 50];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[card, styles.sheet]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Cài đặt phiên {mode === "learn" ? "học" : "ôn"}</Text>
              <Text style={styles.subtitle}>Thay đổi được lưu ngay trên thiết bị.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}><Text style={styles.close}>×</Text></Pressable>
          </View>
          <Text style={styles.label}>SỐ TỪ TỐI ĐA MỖI LẦN</Text>
          <View style={styles.choices}>
            {counts.map((value) => (
              <Pressable
                key={value}
                onPress={() => onChange(mode === "learn" ? { dailyNewWordGoal: value } : { reviewSessionSize: value as UserSettings["reviewSessionSize"] })}
                style={[styles.choice, count === value && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, count === value && styles.choiceTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Setting label="Tự phát âm từ mới" value={settings.autoPlayAudio} onChange={(autoPlayAudio) => onChange({ autoPlayAudio })} />
          <Setting label="Rung khi đúng/sai" value={settings.hapticEnabled} onChange={(hapticEnabled) => onChange({ hapticEnabled })} />
          {mode === "review" ? <Setting label="Tự chấm 4 mức" value={settings.reviewStyle === "self-rating"} onChange={(selfRating) => onChange({ reviewStyle: selfRating ? "self-rating" : "automatic" })} /> : null}
          <Text style={styles.note}>Lần đầu chép một lần để lưu Cấp 1. Mỗi lượt ôn được chấm ngay; trả lời sai sẽ hạ cấp theo quy tắc và nhắc lại sớm hơn.</Text>
          <PrimaryButton label="Xong" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function Setting({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.setting}><Text style={styles.settingText}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primarySoft }} thumbColor={value ? colors.primary : undefined} /></View>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#17203388", padding: spacing.md },
  sheet: { gap: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  title: { fontSize: 20, color: colors.text, fontWeight: "900" },
  subtitle: { marginTop: 3, color: colors.textMuted, fontSize: 12 },
  close: { color: colors.textMuted, fontSize: 32, lineHeight: 32 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  choices: { flexDirection: "row", gap: spacing.sm },
  choice: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontWeight: "800", color: colors.textMuted },
  choiceTextActive: { color: "#fff" },
  setting: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48, borderTopWidth: 1, borderTopColor: colors.border },
  settingText: { color: colors.text, fontSize: 15, flex: 1 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
});
