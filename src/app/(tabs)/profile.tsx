import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import { getSettings, saveSettings } from "@/db/repository";
import { useAppStore } from "@/stores/app-store";
import type { UserSettings } from "@/types/models";

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const global = useAppStore((s) => s.settings);
  const setGlobal = useAppStore((s) => s.setSettings);
  const [settings, setSettings] = useState<UserSettings | null>(global);
  useEffect(() => {
    if (!settings)
      getSettings(db).then((value) => {
        setSettings(value);
        setGlobal(value);
      });
  }, [db, setGlobal, settings]);
  const update = async (patch: Partial<UserSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setGlobal(next);
    await saveSettings(db, next);
  };
  if (!settings) return <Screen title="Cài đặt" />;
  return (
    <Screen
      title="Tài khoản & Cài đặt"
      subtitle="Dữ liệu học đang được lưu cục bộ trên thiết bị."
    >
      <View style={[card, styles.profile]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>学</Text>
        </View>
        <View>
        <Text style={styles.name}>Người học 4Chinese</Text>
          <Text style={styles.offline}>
            ● Offline-first · Không cần đăng nhập
          </Text>
        </View>
      </View>
      <View style={card}>
        <Text style={styles.section}>Mục tiêu hằng ngày</Text>
        <Text style={styles.label}>Từ mới mỗi ngày</Text>
        <View style={styles.choiceRow}>
          {[5, 10, 15, 20, 30].map((value) => (
            <Pressable
              key={value}
              onPress={() => void update({ dailyNewWordGoal: value })}
              style={[
                styles.choice,
                settings.dailyNewWordGoal === value && styles.choiceActive,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  settings.dailyNewWordGoal === value &&
                    styles.choiceTextActive,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Thời lượng học mỗi ngày</Text>
        <View style={styles.choiceRow}>
          {[15, 30, 45, 60].map((value) => (
            <Pressable
              key={value}
              onPress={() => void update({ dailyStudyMinutes: value })}
              style={[
                styles.choice,
                settings.dailyStudyMinutes === value && styles.choiceActive,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  settings.dailyStudyMinutes === value && styles.choiceTextActive,
                ]}
              >
                {value} phút
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Cách tự đánh giá khi ôn</Text>
        <View style={styles.choiceRow}>
          <Pressable
            onPress={() => void update({ reviewStyle: "automatic" })}
            style={[
              styles.choice,
              settings.reviewStyle === "automatic" && styles.choiceActive,
            ]}
          >
            <Text
              style={[
                styles.choiceText,
                settings.reviewStyle === "automatic" && styles.choiceTextActive,
              ]}
            >
              Tự động · 2 nút
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void update({ reviewStyle: "self-rating" })}
            style={[
              styles.choice,
              settings.reviewStyle === "self-rating" && styles.choiceActive,
            ]}
          >
            <Text
              style={[
                styles.choiceText,
                settings.reviewStyle === "self-rating" && styles.choiceTextActive,
              ]}
            >
              Tự chấm · 4 mức
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={card}>
        <Text style={styles.section}>Trải nghiệm học</Text>
        <Setting
          label="Hiện Pinyin"
          value={settings.pinyinVisibility}
          onChange={(value) => void update({ pinyinVisibility: value })}
        />
        <Setting
          label="Màu thanh điệu"
          value={settings.toneColorEnabled}
          onChange={(value) => void update({ toneColorEnabled: value })}
        />
        <Setting
          label="Âm thanh"
          value={settings.soundEnabled}
          onChange={(value) => void update({ soundEnabled: value })}
        />
        <Setting
          label="Tự phát âm khi ôn"
          value={settings.autoPlayAudio}
          onChange={(value) => void update({ autoPlayAudio: value })}
        />
        <Setting
          label="Rung phản hồi"
          value={settings.hapticEnabled}
          onChange={(value) => void update({ hapticEnabled: value })}
        />
        <Setting
          label="Luyện viết sớm (trước Cấp 4)"
          value={settings.practiceWritingEarly}
          onChange={(value) => void update({ practiceWritingEarly: value })}
        />
      </View>
      <View style={card}>
        <Text style={styles.section}>Dữ liệu & nguồn</Text>
        <Text style={styles.copy}>
          SQLite lưu từ vựng, lịch cấp nhớ, ghi chú và thống kê. App không gửi
          dữ liệu học tập lên máy chủ.
        </Text>
        <Text style={styles.version}>4Chinese · MVP 0.1.0</Text>
      </View>
    </Screen>
  );
}
function Setting({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.setting}>
      <Text style={styles.settingText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primarySoft }}
        thumbColor={value ? colors.primary : undefined}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 30, fontWeight: "800" },
  name: { color: colors.text, fontSize: 17, fontWeight: "800" },
  offline: { color: colors.success, fontSize: 11, marginTop: 5 },
  section: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginVertical: spacing.sm,
  },
  choiceRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  choice: {
    minWidth: 50,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: { color: colors.textMuted, fontWeight: "700" },
  choiceTextActive: { color: "#fff" },
  setting: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingText: { color: colors.text, fontSize: 15 },
  copy: { color: colors.textMuted, lineHeight: 21 },
  version: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
    marginTop: spacing.md,
  },
});
