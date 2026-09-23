import { describe, expect, it } from "vitest";

import { buildDeckClozeQuiz } from "./cloze-quiz";

import type { Vocabulary } from "@/types/models";

const makeWord = (id: string, simplified: string): Vocabulary => ({
  id,
  simplified,
  traditional: simplified,
  pinyin: "cè shì",
  pinyinNumeric: "ce4 shi4",
  primaryMeaningVi: "kiểm tra",
  meaningsVi: ["kiểm tra"],
  meaningsEn: ["test"],
  pos: ["danh từ"],
  hskBand: 1,
  frequencyRank: null,
  classifiers: [],
  radical: null,
  strokeCount: null,
  visualType: "none",
  imageUri: null,
  imageSource: null,
  imageLicense: null,
  imageAttribution: null,
  audioUri: null,
  source: "test",
  sourceVersion: "test",
  sourceUrl: "",
  translationStatus: "verified",
  examples: [{ id: id + "-example", vocabularyId: id, chinese: `Tôi dùng ${simplified} trong câu.`, pinyin: "", vietnamese: "", difficulty: 1 }],
});

describe("buildDeckClozeQuiz", () => {
  it("hides the target and keeps every answer inside the deck", () => {
    const words = [makeWord("one", "书"), makeWord("two", "学生"), makeWord("three", "学校"), makeWord("four", "老师")];
    const questions = buildDeckClozeQuiz(words, 10, () => 0.4);

    expect(questions).toHaveLength(4);
    expect(questions[0]?.sentence).toContain("＿＿");
    expect(questions[0]?.sentence).not.toContain(questions[0]?.target.simplified ?? "");
    expect(questions[0]?.choices).toContainEqual(questions[0]?.target);
  });

  it("does not make a question without an example containing the word", () => {
    const missingExample = { ...makeWord("missing", "今天"), examples: [] };
    const questions = buildDeckClozeQuiz([makeWord("one", "书"), missingExample]);
    expect(questions).toHaveLength(1);
    expect(questions[0]?.target.simplified).toBe("书");
  });
});
