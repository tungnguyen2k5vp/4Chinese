export type ConversationScene = "daily" | "restaurant" | "directions";
export type ConversationRole = "user" | "model";

export type ConversationHistoryItem = {
  role: ConversationRole;
  text: string;
};

export type GeminiConversationReply = {
  replyChinese: string;
  pinyin: string;
  translationVi: string;
  correctionVi: string;
  suggestedChinese: string;
};

export class GeminiConversationError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "GeminiConversationError";
  }
}

export function parseGeminiConversationReply(value: unknown): GeminiConversationReply {
  if (!value || typeof value !== "object") {
    throw new GeminiConversationError("Máy chủ AI trả về dữ liệu không hợp lệ.", "invalid-response");
  }
  const result = value as Record<string, unknown>;
  const fields = ["replyChinese", "pinyin", "translationVi", "correctionVi", "suggestedChinese"] as const;
  if (fields.some((field) => typeof result[field] !== "string")) {
    throw new GeminiConversationError("Máy chủ AI thiếu nội dung câu trả lời.", "invalid-response");
  }
  const parsed = Object.fromEntries(fields.map((field) => [field, (result[field] as string).trim()])) as GeminiConversationReply;
  if (!parsed.replyChinese || parsed.replyChinese.length > 320
    || parsed.pinyin.length > 500 || parsed.translationVi.length > 900
    || parsed.correctionVi.length > 900 || parsed.suggestedChinese.length > 320) {
    throw new GeminiConversationError("Câu trả lời của AI quá dài hoặc trống.", "invalid-response");
  }
  return parsed;
}
