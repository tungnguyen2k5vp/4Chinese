import { describe, expect, it } from "vitest";

import { formatReviewCountdown } from "./review-countdown";

describe("formatReviewCountdown", () => {
  const now = Date.parse("2026-09-23T12:00:00.000Z");

  it("shows days, hours, and minutes precisely", () => {
    expect(
      formatReviewCountdown("2026-09-24T15:05:00.000Z", now),
    ).toBe("Còn 1 ngày 3 giờ 5 phút");
  });

  it("keeps zero hour visible when a review is more than one day away", () => {
    expect(
      formatReviewCountdown("2026-09-24T12:05:00.000Z", now),
    ).toBe("Còn 1 ngày 0 giờ 5 phút");
  });

  it("marks due and invalid dates clearly", () => {
    expect(formatReviewCountdown("2026-09-23T11:59:59.000Z", now)).toBe(
      "Đã đến hạn",
    );
    expect(formatReviewCountdown(null, now)).toBe("Chưa xếp lịch");
    expect(formatReviewCountdown("not-a-date", now)).toBe("Chưa xếp lịch");
  });
});
