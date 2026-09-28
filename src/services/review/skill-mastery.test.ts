import { describe, expect, it } from "vitest";

import { buildSkillMastery } from "./skill-mastery";

describe("buildSkillMastery", () => {
  it("uses a recent weighted window and keeps skills independent", () => {
    const metrics = buildSkillMastery([
      { reviewedAt: "2026-09-25T10:00:00.000Z", correct: true, exerciseType: "audio_to_hanzi", mode: "audio-hanzi" },
      { reviewedAt: "2026-09-25T09:00:00.000Z", correct: false, exerciseType: "audio_to_hanzi", mode: "audio-hanzi" },
      { reviewedAt: "2026-09-25T08:00:00.000Z", correct: false, exerciseType: "audio_to_hanzi", mode: "audio-hanzi" },
      { reviewedAt: "2026-09-25T07:00:00.000Z", correct: true, exerciseType: "hanzi_to_meaning", mode: "hanzi-meaning" },
    ]);
    expect(metrics.find((metric) => metric.skill === "listening")).toMatchObject({ attempts: 3, status: "weak" });
    expect(metrics.find((metric) => metric.skill === "meaning")).toMatchObject({ attempts: 1, accuracy: 100, status: "building" });
  });

  it("does not infer a skill from historical logs that have no exercise type", () => {
    const metrics = buildSkillMastery([{ reviewedAt: "2026-09-25T10:00:00.000Z", correct: true, exerciseType: null, mode: "meaning-hanzi" }]);
    expect(metrics.every((metric) => metric.attempts === 0)).toBe(true);
  });
});
