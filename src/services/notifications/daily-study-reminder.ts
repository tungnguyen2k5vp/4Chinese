import * as Notifications from "expo-notifications";
import { AndroidImportance, SchedulableTriggerInputTypes } from "expo-notifications";
import { Platform } from "react-native";

import type { UserSettings } from "@/types/models";

export const DAILY_STUDY_REMINDER_KIND = "daily-study-reminder";
export const DAILY_STUDY_REMINDER_CHANNEL = "daily-study";

export type ReminderPermissionState = "checking" | "granted" | "denied" | "unavailable";
export type ReminderSyncResult =
  | { status: "scheduled" | "disabled" | "permission-required" | "unsupported" }
  | { status: "error"; error: unknown };

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function supportsLocalReminders() {
  return Platform.OS === "android" || Platform.OS === "ios";
}

function isOurReminder(request: Notifications.NotificationRequest) {
  return request.content.data?.kind === DAILY_STUDY_REMINDER_KIND;
}

function isSameReminder(request: Notifications.NotificationRequest, settings: UserSettings) {
  return isOurReminder(request) &&
    request.content.data?.hour === settings.dailyReminderHour &&
    request.content.data?.minute === settings.dailyReminderMinute &&
    request.content.data?.studyMinutes === settings.dailyStudyMinutes;
}

export async function getDailyStudyReminderPermission(): Promise<ReminderPermissionState> {
  if (!supportsLocalReminders()) return "unavailable";
  try {
    const permission = await Notifications.getPermissionsAsync();
    return permission.granted ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

/**
 * Reconcile only notifications owned by 4Chinese. Permission is requested only
 * when the user explicitly turns the reminder on; startup reconciliation is silent.
 */
export async function syncDailyStudyReminder(
  settings: UserSettings,
  options: { requestPermission?: boolean } = {},
): Promise<ReminderSyncResult> {
  if (!supportsLocalReminders()) return { status: "unsupported" };

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = scheduled.filter(isOurReminder);

    if (!settings.dailyReminderEnabled) {
      await Promise.allSettled(existing.map(({ identifier }) =>
        Notifications.cancelScheduledNotificationAsync(identifier),
      ));
      return { status: "disabled" };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(DAILY_STUDY_REMINDER_CHANNEL, {
        name: "Nhắc học hằng ngày",
        description: "Nhắc học cục bộ theo giờ bạn chọn.",
        importance: AndroidImportance.DEFAULT,
        vibrationPattern: [0, 180],
        lightColor: "#2457D6",
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && options.requestPermission) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return { status: "permission-required" };

    const matching = existing.find((request) => isSameReminder(request, settings));
    if (matching && existing.length === 1) return { status: "scheduled" };

    // Create the replacement first so a transient scheduling error cannot
    // silently remove a previously working reminder.
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Đến giờ học hôm nay",
        body: `Dành ${settings.dailyStudyMinutes} phút học tiếng Trung hôm nay nhé.`,
        data: {
          kind: DAILY_STUDY_REMINDER_KIND,
          hour: settings.dailyReminderHour,
          minute: settings.dailyReminderMinute,
          studyMinutes: settings.dailyStudyMinutes,
        },
        sound: false,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: settings.dailyReminderHour,
        minute: settings.dailyReminderMinute,
        ...(Platform.OS === "android" ? { channelId: DAILY_STUDY_REMINDER_CHANNEL } : {}),
      },
    });

    await Promise.allSettled(existing.map(({ identifier: oldIdentifier }) =>
      Notifications.cancelScheduledNotificationAsync(oldIdentifier),
    ));
    return { status: "scheduled" };
  } catch (error) {
    return { status: "error", error };
  }
}
