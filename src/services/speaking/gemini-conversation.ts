import {
  GeminiConversationError,
  parseGeminiConversationReply,
  type ConversationHistoryItem,
  type ConversationScene,
  type GeminiConversationReply,
} from "./gemini-conversation-contract";

import { getCloudClient } from "@/services/cloud/client";

export { GeminiConversationError } from "./gemini-conversation-contract";
export type { ConversationHistoryItem, ConversationRole, ConversationScene, GeminiConversationReply } from "./gemini-conversation-contract";

function responseMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return typeof record.message === "string" && record.message.trim() ? record.message : null;
}

/** Sends text only; the microphone recording itself is never sent to Gemini. */
export async function sendGeminiConversationTurn(input: {
  message: string;
  history: ConversationHistoryItem[];
  level: number;
  scene: ConversationScene;
  signal?: AbortSignal;
}): Promise<GeminiConversationReply> {
  const message = input.message.trim();
  if (!message || message.length > 500) {
    throw new GeminiConversationError("Câu nói cần có nội dung và không dài quá 500 ký tự.", "invalid-input");
  }
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > 6) {
    throw new GeminiConversationError("Cấp HSK phải từ 1 đến 6.", "invalid-input");
  }
  if (!["daily", "restaurant", "directions"].includes(input.scene)) {
    throw new GeminiConversationError("Chủ đề hội thoại không hợp lệ.", "invalid-input");
  }

  const cloud = getCloudClient();
  if (!cloud) {
    throw new GeminiConversationError("Chưa cấu hình máy chủ Supabase cho hội thoại AI.", "not-configured");
  }
  const { data, error: sessionError } = await cloud.auth.getSession();
  const accessToken = data.session?.access_token;
  if (sessionError || !accessToken) {
    throw new GeminiConversationError("Hãy đăng nhập tài khoản Cloud để dùng hội thoại Gemini.", "login-required");
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/u, "");
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new GeminiConversationError("Thiếu cấu hình Supabase công khai trong ứng dụng.", "not-configured");
  }
  if (input.signal?.aborted) {
    throw new GeminiConversationError("Lượt hội thoại đã bị hủy.", "cancelled");
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  input.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 25_000);
  try {
    const response = await fetch(`${url}/functions/v1/gemini-conversation`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        level: input.level,
        scene: input.scene,
        history: input.history.slice(-12).map(({ role, text }) => ({ role, text: text.slice(0, 500) })),
      }),
      signal: controller.signal,
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Show a stable service message instead of leaking an HTML gateway page.
    }

    if (response.status === 401 || response.status === 403) {
      throw new GeminiConversationError("Phiên Cloud hết hạn hoặc chưa có quyền. Hãy đăng nhập lại rồi thử.", "unauthorized");
    }
    if (response.status === 404) {
      throw new GeminiConversationError("Hàm Gemini chưa được triển khai trên Supabase.", "not-deployed");
    }
    if (response.status === 429) {
      throw new GeminiConversationError(responseMessage(payload) ?? "Bạn đang gửi quá nhanh. Vui lòng đợi một phút rồi thử lại.", "rate-limited");
    }
    if (response.status === 503) {
      throw new GeminiConversationError(responseMessage(payload) ?? "Máy chủ chưa cấu hình khóa Gemini.", "not-configured");
    }
    if (!response.ok) {
      throw new GeminiConversationError(responseMessage(payload) ?? "Gemini chưa phản hồi được. Hãy thử lại sau.", "provider-error");
    }
    return parseGeminiConversationReply(payload);
  } catch (error) {
    if (error instanceof GeminiConversationError) throw error;
    if (controller.signal.aborted) {
      throw new GeminiConversationError(
        input.signal?.aborted ? "Lượt hội thoại đã bị hủy." : "Gemini phản hồi quá lâu. Hãy kiểm tra mạng rồi thử lại.",
        input.signal?.aborted ? "cancelled" : "timeout",
      );
    }
    throw new GeminiConversationError("Không kết nối được tới Gemini. Hãy kiểm tra Internet rồi thử lại.", "network");
  } finally {
    clearTimeout(timeout);
    input.signal?.removeEventListener("abort", abort);
  }
}
