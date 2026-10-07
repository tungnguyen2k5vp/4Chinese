import { describe, expect, it } from "vitest";

import { parseGeminiConversationReply } from "./gemini-conversation-contract";

describe("Gemini conversation response validation", () => {
  it("accepts complete short bilingual coaching output", () => {
    expect(parseGeminiConversationReply({
      replyChinese: "你好！",
      pinyin: "Nǐ hǎo!",
      translationVi: "Xin chào!",
      correctionVi: "Câu của bạn tự nhiên.",
      suggestedChinese: "你呢？",
    })).toEqual({
      replyChinese: "你好！",
      pinyin: "Nǐ hǎo!",
      translationVi: "Xin chào!",
      correctionVi: "Câu của bạn tự nhiên.",
      suggestedChinese: "你呢？",
    });
  });

  it("rejects missing, non-string, empty, and oversized response fields", () => {
    expect(() => parseGeminiConversationReply(null)).toThrow(/không hợp lệ/u);
    expect(() => parseGeminiConversationReply({ replyChinese: "你好" })).toThrow(/thiếu nội dung/u);
    expect(() => parseGeminiConversationReply({
      replyChinese: "x".repeat(321),
      pinyin: "",
      translationVi: "",
      correctionVi: "",
      suggestedChinese: "",
    })).toThrow(/quá dài hoặc trống/u);
  });
});
