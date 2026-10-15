import { router, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { LanguageSettings } from "@/components/LanguageSettings";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { designColors, radius, spacing, themedCard } from "@/constants/design";
import { exportLocalBackup, importLocalBackup } from "@/db/backup-repository";
import { getSettings, saveSettings } from "@/db/repository";
import { AnalyticsEvent, track } from "@/services/analytics/analytics-service";
import { getAppVersion, getAppVersionLabel } from '@/services/app/app-version';
import { createDeviceBackupArchive, hasArchiveRestorePoint, materializeArchiveImages, pickBackup, readRestorePointArchive,
  shareBackupArchive, validateLegacyImageUris, writeBackupArchiveFile, writeRestorePointArchive,
  type PickedBackup } from "@/services/backup/device-archive";
import { hasRestorePoint, readRestorePointText } from "@/services/backup/file";
import { parseLocalBackup } from "@/services/backup/format";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { getDailyStudyReminderPermission, syncDailyStudyReminder, type ReminderPermissionState } from "@/services/notifications/daily-study-reminder";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { UserSettings } from "@/types/models";

export default function ProfileScreen() {
  const { preferences } = useLearningLanguage();
  const isEnglish = preferences.learningLanguage === "en";
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const global = useAppStore((s) => s.settings);
  const setGlobal = useAppStore((s) => s.setSettings);
  const [settings, setSettings] = useState<UserSettings | null>(global);
  const [backupAction, setBackupAction] = useState<"export" | "import" | null>(null);
  const [reminderPermission, setReminderPermission] = useState<ReminderPermissionState>("checking");
  const [restorePointAvailable, setRestorePointAvailable] = useState(() => Platform.OS !== 'web' && (hasArchiveRestorePoint() || hasRestorePoint()));
  useEffect(() => {
    if (!settings)
      getSettings(db).then((value) => {
        setSettings(value);
        setGlobal(value);
      });
  }, [db, setGlobal, settings]);
  useEffect(() => {
    let live = true;
    void getDailyStudyReminderPermission().then((permission) => { if (live) setReminderPermission(permission); });
    return () => { live = false; };
  }, []);
  const update = async (patch: Partial<UserSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setGlobal(next);
    await saveSettings(db, next);
  };
  const updateReminder = async (
    patch: Partial<Pick<UserSettings, "dailyReminderEnabled" | "dailyReminderHour" | "dailyReminderMinute">>,
    requestPermission = false,
  ) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setGlobal(next);
    try {
      await saveSettings(db, next);
      const result = await syncDailyStudyReminder(next, { requestPermission });
      if (result.status === "scheduled") {
        setReminderPermission("granted");
        if (patch.dailyReminderEnabled === true) track(AnalyticsEvent.DAILY_REMINDER_ENABLED);
        return;
      }
      if (result.status === "disabled") {
        if (patch.dailyReminderEnabled === false) track(AnalyticsEvent.DAILY_REMINDER_DISABLED);
        setReminderPermission(await getDailyStudyReminderPermission());
        return;
      }
      if (requestPermission) {
        const disabled = { ...next, dailyReminderEnabled: false };
        setSettings(disabled);
        setGlobal(disabled);
        await saveSettings(db, disabled);
      }
      setReminderPermission(result.status === "permission-required" ? "denied" : "unavailable");
      const message = result.status === "permission-required"
        ? "Bạn chưa cấp quyền thông báo. Hãy cho phép 4Chinese trong Cài đặt hệ thống rồi bật lại nhắc học."
        : result.status === "unsupported"
          ? "Nhắc học cục bộ hiện chỉ hỗ trợ trên Android và iOS."
          : "Chưa thể lên lịch nhắc học. Hãy thử lại sau.";
      Alert.alert("Chưa bật được nhắc học", message);
    } catch {
      if (requestPermission) {
        const disabled = { ...next, dailyReminderEnabled: false };
        setSettings(disabled);
        setGlobal(disabled);
        await saveSettings(db, disabled).catch(() => undefined);
      }
      setReminderPermission("unavailable");
      Alert.alert("Chưa bật được nhắc học", "Đã có lỗi khi cập nhật lịch thông báo. Bạn có thể tiếp tục học bình thường.");
    }
  };
  const exportBackup = async () => {
    setBackupAction("export");
    try {
      const backup = await exportLocalBackup(db, getAppVersion());
      const bytes = await createDeviceBackupArchive(backup);
      const file = writeBackupArchiveFile(bytes);
      await shareBackupArchive(file);
    } catch (error) {
      Alert.alert("Chưa thể sao lưu", error instanceof Error ? error.message : "Đã có lỗi khi tạo tệp sao lưu.");
    } finally {
      setBackupAction(null);
    }
  };
  const restoreBackup = async (picked: PickedBackup) => {
    setBackupAction("import");
    try {
      const currentState = await exportLocalBackup(db, getAppVersion());
      const pointBytes = await createDeviceBackupArchive(currentState);
      await writeRestorePointArchive(pointBytes);
      setRestorePointAvailable(true);
      const backup = picked.kind === 'archive' ? await materializeArchiveImages(picked.value) : picked.value;
      if (picked.kind === 'legacy') validateLegacyImageUris(backup);
      await importLocalBackup(db, backup);
      const restoredSettings = await getSettings(db);
      setSettings(restoredSettings);
      setGlobal(restoredSettings);
      Alert.alert("Đã khôi phục", "Dữ liệu học đã được khôi phục toàn vẹn từ bản sao lưu.");
    } catch (error) {
      Alert.alert("Không thể khôi phục", error instanceof Error ? error.message : "Tệp sao lưu không hợp lệ.");
    } finally {
      setBackupAction(null);
    }
  };
  const chooseBackup = async () => {
    try {
      const picked = await pickBackup();
      if (!picked) return;
      const backup = picked.kind === 'archive' ? picked.value.backup : picked.value;
      Alert.alert(
        "Khôi phục bản sao lưu?",
        `Bản sao lưu tạo lúc ${new Date(backup.createdAt).toLocaleString("vi-VN")}. Dữ liệu học cục bộ hiện tại sẽ được thay thế.`,
        [
          { text: "Hủy", style: "cancel" },
          { text: "Khôi phục", style: "destructive", onPress: () => void restoreBackup(picked) },
        ],
      );
    } catch (error) {
      Alert.alert("Không thể mở tệp", error instanceof Error ? error.message : "Tệp sao lưu không hợp lệ.");
    }
  };
  const undoLastRestore = async () => {
    try {
      const archived = await readRestorePointArchive();
      const legacyText = archived ? null : await readRestorePointText();
      const picked: PickedBackup | null = archived ? { kind: 'archive', value: archived } :
        legacyText ? { kind: 'legacy', value: parseLocalBackup(legacyText) } : null;
      if (!picked) throw new Error('Không tìm thấy điểm khôi phục.');
      Alert.alert('Hoàn tác lần khôi phục?', 'Dữ liệu hiện tại sẽ được lưu lại thành điểm khôi phục trước khi hoàn tác.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Hoàn tác', onPress: () => void restoreBackup(picked) },
      ]);
    } catch (error) {
      Alert.alert('Không thể hoàn tác', error instanceof Error ? error.message : 'Điểm khôi phục không hợp lệ.');
    }
  };
  if (!settings) return <Screen title="Cài đặt" />;
  return (
    <Screen
      title="Tài khoản & Cài đặt"
      subtitle="Dữ liệu học đang được lưu cục bộ trên thiết bị."
      safeAreaEdges={isEnglish ? ["top"] : ["bottom"]}
      compact={!isEnglish}
    >
      <View style={[themedCard(theme), styles.profile]}>
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
      <LanguageSettings />
      {!isEnglish ? <View style={themedCard(theme)}>
        {__DEV__ ? <PrimaryButton label="Kiểm thử bộ từ tiếng Anh · V7" variant="secondary" onPress={() => router.push('/english' as Href)} /> : null}
        <Text style={styles.section}>Mục tiêu tiếng Trung mỗi ngày</Text>
        <Text style={styles.label}>Từ mới mỗi ngày</Text>
        <View style={styles.choiceRow}>
          {[5, 10, 15, 20, 30, 50, 75, 100].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              aria-checked={settings.dailyNewWordGoal === value}
              accessibilityState={{ checked: settings.dailyNewWordGoal === value }}
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
        <Text style={styles.label}>Từ tối đa mỗi buổi học</Text>
        <View style={styles.choiceRow}>
          {([5, 10, 15, 20, 30, 50, 75, 100] as const).map((value) => (
            <Pressable key={value} accessibilityRole="radio" aria-checked={settings.learnSessionSize === value} accessibilityState={{ checked: settings.learnSessionSize === value }} onPress={() => void update({ learnSessionSize: value })} style={[styles.choice, settings.learnSessionSize === value && styles.choiceActive]}>
              <Text style={[styles.choiceText, settings.learnSessionSize === value && styles.choiceTextActive]}>{value}</Text>
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
      </View> : null}
      <View style={themedCard(theme)}>
        <Text style={styles.section}>Nhắc học hằng ngày</Text>
        <Setting
          label="Nhắc tôi học mỗi ngày"
          value={settings.dailyReminderEnabled}
          onChange={(value) => void updateReminder({ dailyReminderEnabled: value }, value)}
        />
        <Text style={styles.copy}>
          {reminderPermission === "denied"
            ? "Quyền thông báo đang tắt trong cài đặt hệ thống."
            : "Thông báo được lên lịch ngay trên thiết bị; không gửi giờ học hay dữ liệu từ vựng lên máy chủ."}
        </Text>
        {settings.dailyReminderEnabled ? <>
          <Text style={styles.label}>Giờ nhắc mỗi ngày</Text>
          <View style={styles.choiceRow} accessibilityRole="radiogroup" accessibilityLabel="Chọn giờ nhắc học">
            {[18, 19, 20, 21].map((hour) => {
              const selected = settings.dailyReminderHour === hour && settings.dailyReminderMinute === 0;
              return <Pressable
                key={hour}
                accessibilityRole="radio"
                accessibilityLabel={`Nhắc lúc ${String(hour).padStart(2, "0")}:00`}
                accessibilityState={{ selected }}
                onPress={() => void updateReminder({ dailyReminderHour: hour, dailyReminderMinute: 0 })}
                style={[styles.choice, selected && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{String(hour).padStart(2, "0")}:00</Text>
              </Pressable>;
            })}
          </View>
          <Text style={styles.copy}>Android có thể giao thông báo trễ khi bật chế độ tiết kiệm pin.</Text>
        </> : null}
      </View>
      <View style={themedCard(theme)}>
        <Text style={styles.section}>{isEnglish ? "Trải nghiệm chung" : "Trải nghiệm học tiếng Trung"}</Text>
        {!isEnglish ? (
          <>
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
          </>
        ) : null}
        {!isEnglish ? (
          <>
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
            <Text style={styles.copy}>Khi học từ mới, mỗi từ phát âm một lần lúc xuất hiện nếu Âm thanh đang bật. Chạm loa để nghe lại.</Text>
            <Text style={styles.label}>Tốc độ phát âm</Text>
            <View style={styles.choiceRow}>
              {[0.6, 0.8, 1, 1.2].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => void update({ speechRate: value })}
                  style={[styles.choice, settings.speechRate === value && styles.choiceActive]}
                >
                  <Text style={[styles.choiceText, settings.speechRate === value && styles.choiceTextActive]}>
                    {value.toFixed(1)}×
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <Setting
          label="Rung phản hồi"
          value={settings.hapticEnabled}
          onChange={(value) => void update({ hapticEnabled: value })}
        />
        <Text style={styles.label}>Giao diện</Text>
        <View style={styles.choiceRow} accessibilityRole="radiogroup">
          {([
            ["system", "Theo hệ thống"],
            ["light", "Sáng"],
            ["dark", "Tối"],
          ] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: settings.themeMode === value }}
            onPress={() => void update({ themeMode: value })} style={[styles.choice, settings.themeMode === value && styles.choiceActive]}>
            <Text style={[styles.choiceText, settings.themeMode === value && styles.choiceTextActive]}>{label}</Text>
          </Pressable>)}
        </View>
        <Text style={styles.label}>Hiệu ứng động</Text>
        <View style={styles.choiceRow} accessibilityRole="radiogroup">
          {([
            ["full", "Đầy đủ"],
            ["reduced", "Giảm"],
            ["off", "Tắt"],
          ] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: settings.motionMode === value }}
            onPress={() => void update({ motionMode: value })} style={[styles.choice, settings.motionMode === value && styles.choiceActive]}>
            <Text style={[styles.choiceText, settings.motionMode === value && styles.choiceTextActive]}>{label}</Text>
          </Pressable>)}
        </View>
      </View>
      <View style={themedCard(theme)}>
        <Text style={styles.section}>{isEnglish ? "Dữ liệu tiếng Trung & ứng dụng" : "Dữ liệu & nguồn"}</Text>
        <Text style={styles.copy}>
          SQLite lưu từ vựng, lịch cấp nhớ, ghi chú và thống kê. Chỉ tải bản sao
          lưu lên máy chủ khi bạn chủ động chọn.
        </Text>
        <Text style={styles.version}>{getAppVersionLabel()}</Text>
      </View>
      <View style={[themedCard(theme), styles.backupCard]}>
        <Text style={styles.section}>{isEnglish ? "Sao lưu dữ liệu tiếng Trung" : "Sao lưu dữ liệu"}</Text>
        <Text style={styles.copy}>
          Xuất bộ từ riêng, ảnh, tiến độ, lịch ôn, ghi chú và thống kê vào một tệp ZIP.
        </Text>
        {isEnglish ? <Text style={styles.copy}>Dữ liệu tiếng Anh được sao lưu riêng trong Bộ từ tiếng Anh; hiện chưa có tệp gộp hai ngôn ngữ.</Text> : null}
        <View style={styles.backupActions}>
          <Pressable
            accessibilityRole="button"
            disabled={backupAction !== null}
            onPress={() => void exportBackup()}
            style={[styles.backupButton, backupAction !== null && styles.backupButtonDisabled]}
          >
            <Text style={styles.backupButtonText}>{backupAction === "export" ? "Đang tạo…" : "Xuất sao lưu"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={backupAction !== null}
            onPress={() => void chooseBackup()}
            style={[styles.restoreButton, backupAction !== null && styles.backupButtonDisabled]}
          >
            <Text style={styles.restoreButtonText}>{backupAction === "import" ? "Đang khôi phục…" : "Khôi phục"}</Text>
          </Pressable>
        </View>
        {restorePointAvailable ? <Pressable accessibilityRole="button" disabled={backupAction !== null}
          onPress={() => void undoLastRestore()} style={[styles.restoreButton, backupAction !== null && styles.backupButtonDisabled]}>
          <Text style={styles.restoreButtonText}>Hoàn tác lần khôi phục gần nhất</Text>
        </Pressable> : null}
        <Pressable accessibilityRole="button" onPress={() => router.push('/cloud' as Href)}
          style={styles.restoreButton}>
          <Text style={styles.restoreButtonText}>Sao lưu đám mây (tự chọn)</Text>
        </Pressable>
        <Text style={styles.backupHint}>App lưu điểm khôi phục ZIP trước khi nhập. Nếu nhập lỗi, dữ liệu cũ được giữ nguyên.</Text>
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
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.setting}>
      <Text style={styles.settingText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        trackColor={{ true: theme.primarySoft }}
        thumbColor={value ? theme.primary : undefined}
      />
    </View>
  );
}
function createStyles(theme: ReturnType<typeof useTheme>) {
  const colors = designColors(theme);
  return StyleSheet.create({
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
    color: colors.primaryText,
    fontWeight: "700",
    fontSize: 12,
    marginTop: spacing.md,
  },
  backupCard: { gap: spacing.sm },
  backupActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  backupButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  backupButtonDisabled: { opacity: 0.55 },
  backupButtonText: { color: "#fff", fontWeight: "800" },
  restoreButtonText: { color: colors.primaryText, fontWeight: "800" },
  backupHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
}); }
