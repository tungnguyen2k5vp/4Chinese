import { describe, expect, it } from "vitest";

import {
  formatEnglishStudyDuration,
  getEnglishAccuracyPresentation,
} from "./english-stats-presentation";

describe("English statistics presentation", () => {
  it("does not display an accuracy score before the first review", () => {
    expect(getEnglishAccuracyPresentation(0, 0)).toBeNull();
  });

  it("keeps a real 0% result distinct from insufficient data", () => {
    expect(getEnglishAccuracyPresentation(1, 0)).toEqual({
      percent: 0,
      value: "0%",
      badge: "Cần luyện thêm",
    });
  });

  it("labels accuracy only from recorded attempts", () => {
    expect(getEnglishAccuracyPresentation(10, 7)).toMatchObject({
      percent: 70,
      value: "70%",
      badge: "Khá",
    });
    expect(getEnglishAccuracyPresentation(10, 9)?.badge).toBe("Xuất sắc");
  });

  it("formats response duration as readable hours, minutes and seconds", () => {
    expect(formatEnglishStudyDuration(642_000)).toBe("10 phút 42 giây");
    expect(formatEnglishStudyDuration(65_000)).toBe("1 phút 5 giây");
    expect(formatEnglishStudyDuration(60_000)).toBe("1 phút");
    expect(formatEnglishStudyDuration(3_661_000)).toBe("1 giờ 1 phút");
    expect(formatEnglishStudyDuration(0)).toBe("0 giây");
  });
});
