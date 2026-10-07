import { beforeEach, describe, expect, it, vi } from "vitest";

import { syncDailyStudyReminder } from "./daily-study-reminder";

import { defaultSettings } from "@/db/repository";

const mocks = vi.hoisted(() => ({
  scheduled: [] as { identifier: string; content: { body?: string; data?: Record<string, unknown> }; trigger?: { type?: string; hour?: number; minute?: number } }[],
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
}));

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 4 },
  SchedulableTriggerInputTypes: { DAILY: "daily" },
  getAllScheduledNotificationsAsync: vi.fn(async () => mocks.scheduled),
  getPermissionsAsync: mocks.getPermissionsAsync,
  requestPermissionsAsync: mocks.requestPermissionsAsync,
  setNotificationChannelAsync: mocks.setNotificationChannelAsync,
  scheduleNotificationAsync: mocks.scheduleNotificationAsync,
  cancelScheduledNotificationAsync: mocks.cancelScheduledNotificationAsync,
  setNotificationHandler: mocks.setNotificationHandler,
}));

describe("daily local study reminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scheduled.length = 0;
    mocks.getPermissionsAsync.mockResolvedValue({ granted: false });
    mocks.requestPermissionsAsync.mockResolvedValue({ granted: true });
    mocks.scheduleNotificationAsync.mockImplementation(async (request) => {
      mocks.scheduled.push({
        identifier: "new-reminder",
        content: request.content,
        trigger: request.trigger,
      });
      return "new-reminder";
    });
  });

  it("asks permission only on opt-in, then schedules the selected daily time", async () => {
    mocks.requestPermissionsAsync.mockResolvedValue({ granted: true });
    const result = await syncDailyStudyReminder({ ...defaultSettings, dailyReminderEnabled: true, dailyReminderHour: 20, dailyReminderMinute: 30 }, { requestPermission: true });

    expect(result).toEqual({ status: "scheduled" });
    expect(mocks.requestPermissionsAsync).toHaveBeenCalledOnce();
    expect(mocks.setNotificationChannelAsync).toHaveBeenCalledOnce();
    expect(mocks.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ data: expect.objectContaining({ kind: "daily-study-reminder", hour: 20, minute: 30 }) }),
      trigger: expect.objectContaining({ type: "daily", hour: 20, minute: 30, channelId: "daily-study" }),
    }));
  });

  it("does not schedule when permission is denied", async () => {
    mocks.getPermissionsAsync.mockResolvedValue({ granted: false });
    mocks.requestPermissionsAsync.mockResolvedValue({ granted: false });

    const result = await syncDailyStudyReminder({ ...defaultSettings, dailyReminderEnabled: true }, { requestPermission: true });

    expect(result).toEqual({ status: "permission-required" });
    expect(mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("cancels only its own notifications when the learner opts out", async () => {
    mocks.scheduled.push(
      { identifier: "ours", content: { data: { kind: "daily-study-reminder" } } },
      { identifier: "other-app", content: { data: { kind: "other" } } },
    );

    expect(await syncDailyStudyReminder(defaultSettings)).toEqual({ status: "disabled" });
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith("ours");
    expect(mocks.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("keeps a matching reminder instead of scheduling duplicates", async () => {
    const settings = { ...defaultSettings, dailyReminderEnabled: true };
    mocks.getPermissionsAsync.mockResolvedValue({ granted: true });
    mocks.scheduled.push({
      identifier: "existing",
      content: { body: `Dành ${settings.dailyStudyMinutes} phút học tiếng Trung hôm nay nhé.`, data: { kind: "daily-study-reminder", hour: settings.dailyReminderHour, minute: settings.dailyReminderMinute, studyMinutes: settings.dailyStudyMinutes } },
      trigger: { type: "daily", hour: settings.dailyReminderHour, minute: settings.dailyReminderMinute },
    });

    expect(await syncDailyStudyReminder(settings)).toEqual({ status: "scheduled" });
    expect(mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mocks.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});
