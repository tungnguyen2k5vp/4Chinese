import { describe, expect, it } from "vitest";

import { exerciseForReviewMode, exerciseTypeForReviewMode, standardReviewModes } from "./exercise";

describe("review exercise definitions", () => {
  it('presents sentence cloze as Hanzi multiple choice, keeping the persisted exercise type', () => {
    expect(exerciseForReviewMode('cloze')).toMatchObject({ type: 'cloze', answer: 'hanzi', requiresHanziInput: false, playsAudio: false });
  });
  it("maps legacy navigation modes to stable learning-skill types", () => {
    expect(exerciseTypeForReviewMode("meaning-hanzi")).toBe("meaning_to_hanzi");
    expect(exerciseTypeForReviewMode("pinyin-hanzi")).toBe("pinyin_to_hanzi");
    expect(exerciseTypeForReviewMode("audio-meaning")).toBe("audio_to_meaning");
  });

  it("keeps pinyin-to-Hanzi and audio-to-Hanzi as Hanzi-only answers", () => {
    expect(exerciseForReviewMode("pinyin-hanzi")).toMatchObject({ answer: "hanzi", requiresHanziInput: true, playsAudio: false });
    expect(exerciseForReviewMode("audio-hanzi")).toMatchObject({ answer: "hanzi", requiresHanziInput: true, playsAudio: true });
  });

  it("exposes all nine review exercise modes", () => {
    expect(standardReviewModes).toEqual([
      "meaning-hanzi",
      "hanzi-meaning",
      "pinyin-hanzi",
      "audio-hanzi",
      "hanzi-pinyin",
      "audio-meaning",
      "cloze",
      "writing",
      "hanzi-recall-pinyin-compose",
    ]);
  });
});
