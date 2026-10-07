export type HomeActionKind = "review" | "course" | "new-words" | "daily-plan" | "stats";

export type HomeActionInput = {
  dueCount: number;
  activeCourse?: { id: string; title: string } | null;
  remainingNewWords: number;
  hasUnlearnedWords: boolean;
  studiedMinutes: number;
  studyGoalMinutes: number;
};

export type HomeAction = {
  kind: HomeActionKind;
  title: string;
  subtitle: string;
  href: string;
};

/** Select one clear action without allowing optional content to outrank due reviews. */
export function getHomeNextAction(input: HomeActionInput): HomeAction {
  if (input.dueCount > 0) {
    return {
      kind: "review",
      title: `Ôn ${input.dueCount} từ đến hạn`,
      subtitle: "Ôn từ đến hạn trước để giữ đúng lịch SRS.",
      href: "/review",
    };
  }

  if (input.activeCourse) {
    return {
      kind: "course",
      title: `Tiếp tục ${input.activeCourse.title}`,
      subtitle: "Tiếp tục đúng bài đang học trong lộ trình.",
      href: `/path/${input.activeCourse.id}`,
    };
  }

  if (input.remainingNewWords > 0 && input.hasUnlearnedWords) {
    return {
      kind: "new-words",
      title: "Học một nhóm từ mới",
      subtitle: `${input.remainingNewWords} từ còn lại theo mục tiêu hôm nay.`,
      href: "/learn/setup",
    };
  }

  if (input.studyGoalMinutes > 0 && input.studiedMinutes < input.studyGoalMinutes) {
    return {
      kind: "daily-plan",
      title: "Chọn một hoạt động ngắn",
      subtitle: "Bạn có thể luyện đọc, viết hoặc củng cố từ đã học.",
      href: "/daily",
    };
  }

  return {
    kind: "stats",
    title: "Xem tiến độ học tập",
    subtitle: "Mục tiêu hôm nay đã hoàn tất; xem lại chặng đường của bạn.",
    href: "/(tabs)/stats",
  };
}

export type ComebackPlan = {
  daysAway: number;
  minutes: 3 | 5;
  title: string;
  message: string;
};

function calendarDayNumber(key: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const timestamp = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== key) return null;
  return Math.floor(timestamp / 86_400_000);
}

/** Offer a gentle, low-pressure restart only after at least one full missed day. */
export function getComebackPlan(
  lastStudyDate: string | null | undefined,
  todayDate: string,
  dueCount: number,
): ComebackPlan | null {
  if (!lastStudyDate) return null;
  const lastDay = calendarDayNumber(lastStudyDate);
  const today = calendarDayNumber(todayDate);
  if (lastDay == null || today == null) return null;
  const daysAway = today - lastDay;
  if (daysAway < 2) return null;

  return {
    daysAway,
    minutes: dueCount > 0 ? 5 : 3,
    title: "Chào mừng bạn quay lại",
    message: dueCount > 0
      ? "Bắt đầu nhẹ nhàng với vài từ đến hạn. Lịch ôn vẫn được giữ nguyên."
      : "Một phiên ngắn là đủ để nối lại nhịp học, không cần học bù.",
  };
}

export function normalizeQuickSessionMinutes(value: unknown): 3 | 5 | 10 | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "3" || candidate === 3) return 3;
  if (candidate === "5" || candidate === 5) return 5;
  if (candidate === "10" || candidate === 10) return 10;
  return null;
}
