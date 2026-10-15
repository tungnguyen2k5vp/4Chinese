import { describe, expect, it } from "vitest";

import { buildDeckClozeQuiz, explainDeckClozeAnswer } from "./cloze-quiz";

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

  it("explains the apology in its actual example and contrasts every distractor", () => {
    const apology = makeWord("apology", "对不起");
    apology.primaryMeaningVi = "xin lỗi";
    apology.examples[0] = { ...apology.examples[0]!, chinese: "对不起，我来晚了。", pinyin: "Duìbuqǐ, wǒ lái wǎn le.", vietnamese: "Xin lỗi, tôi đến muộn." };
    const star = { ...makeWord("star", "星星"), primaryMeaningVi: "ngôi sao" };
    const questions = buildDeckClozeQuiz([apology, star, makeWord("yesterday", "昨天"), makeWord("sunday", "星期日")], 10, () => 0.4);
    const question = questions.find(item => item.target.id === "apology")!;
    const explanation = explainDeckClozeAnswer(question, star.id);
    expect(question.sentence).toBe("＿＿，我来晚了。");
    expect(question.example.chinese).toBe("对不起，我来晚了。");
    expect(explanation.correctReason).toContain("đến muộn");
    expect(explanation.correctReason).toContain("lời xin lỗi");
    expect(explanation.alternatives).toHaveLength(3);
    expect(explanation.alternatives.find(item => item.selected)?.reason).toContain("ngôi sao");
    expect(explanation.alternatives.find(item => item.selected)?.reason).toContain("không diễn đạt lời xin lỗi");
    expect(explainDeckClozeAnswer(question, apology.id).alternatives.some(item => item.selected)).toBe(false);
  });

  it("uses the saved translation for other contexts and does not invent a grammar rule", () => {
    const book = { ...makeWord("book", "书"), primaryMeaningVi: "sách" };
    book.examples[0] = { ...book.examples[0]!, chinese: "我喜欢这本书。", vietnamese: "Tôi thích cuốn sách này." };
    const friend = { ...makeWord("friend", "朋友"), primaryMeaningVi: "bạn bè" };
    const question = buildDeckClozeQuiz([book, friend], 10, () => 0.4).find(item => item.target.id === book.id)!;
    const explanation = explainDeckClozeAnswer(question, friend.id);
    expect(explanation.correctReason).toContain(book.examples[0]!.vietnamese);
    expect(explanation.alternatives[0]?.reason).toContain("bạn bè");
    expect(explanation.alternatives[0]?.reason).toContain("sách");
    expect(explanation.alternatives[0]?.reason).not.toContain("sai ngữ pháp");
  });
});
