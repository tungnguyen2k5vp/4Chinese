import { File, UploadType } from "expo-file-system";

import type { Vocabulary } from "@/types/models";

const FUNCTION_NAME = "pronunciation-score";

export class PronunciationScoreError extends Error {}

export type PronunciationScore = { score: number; transcript: string; feedback: string };

function config() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/u, "");
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

function clampScore(value: unknown): number {
  const parsed = typeof value === "number" ? value : 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function readMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null) return fallback;
  const message = (payload as Record<string, unknown>).message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

/** Uploads one temporary recording to the server-side AI evaluator. */
export async function scorePronunciationAudio(
  audioUri: string,
  word: Pick<Vocabulary, "simplified" | "traditional" | "pinyin" | "primaryMeaningVi">,
  signal?: AbortSignal,
): Promise<PronunciationScore> {
  const connection = config();
  if (!connection) throw new PronunciationScoreError("Chưa cấu hình Supabase cho chấm phát âm AI.");
  if (signal?.aborted) throw new PronunciationScoreError("Đã hủy gửi bản ghi âm.");

  const endpoint = `${connection.url}/functions/v1/${FUNCTION_NAME}`;
  let response: { status: number; body: string };
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    // Do not use fetch + a React-Native FormData file object here. On Android
    // that combination can reject before a HTTP response is returned. Expo's
    // native uploader streams the recording and creates a correct multipart
    // boundary on both Android and iOS.
    const audio = new File(audioUri);
    if (!audio.exists || audio.size <= 0 || audio.size > 5 * 1024 * 1024)
      throw new PronunciationScoreError("Bản ghi âm rỗng, không tồn tại hoặc vượt quá 5 MB.");
    response = await audio.upload(endpoint, {
      httpMethod: "POST",
      uploadType: UploadType.MULTIPART,
      fieldName: "audio",
      mimeType: "audio/m4a",
      parameters: {
        simplified: word.simplified,
        traditional: word.traditional,
        pinyin: word.pinyin,
        meaningVi: word.primaryMeaningVi,
      },
      headers: {
        apikey: connection.anonKey,
        Authorization: `Bearer ${connection.anonKey}`,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof PronunciationScoreError) throw error;
    throw new PronunciationScoreError(
      error instanceof Error && error.name === "AbortError"
        ? "Máy chủ chấm phát âm phản hồi quá lâu. Hãy kiểm tra Internet/VPN rồi thử lại."
        : "Không gửi được bản ghi âm tới máy chủ chấm phát âm. Hãy kiểm tra Internet, tắt VPN nếu có và thử lại.",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }

  let payload: unknown = null;
  try {
    payload = response.body ? JSON.parse(response.body) : null;
  } catch {
    // The status-specific messages below are more useful than a JSON parse
    // error when an edge function/proxy returns plain text.
  }
  if (response.status === 404) {
    throw new PronunciationScoreError(
      "Tính năng AI chấm phát âm chưa được triển khai trên máy chủ. Hãy triển khai hàm pronunciation-score trên Supabase.",
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new PronunciationScoreError(
      "Máy chủ từ chối yêu cầu chấm phát âm. Hãy kiểm tra khóa Supabase hoặc quyền của hàm AI.",
    );
  }
  if (response.status === 503) {
    throw new PronunciationScoreError(
      "Máy chủ AI chưa được cấu hình khóa chấm phát âm hoặc đang tạm ngừng. Hãy thử lại sau.",
    );
  }
  if (response.status === 429) {
    throw new PronunciationScoreError("Máy chủ AI đang giới hạn lượt dùng hoặc đã hết hạn mức. Hãy thử lại sau.");
  }
  if (response.status < 200 || response.status >= 300 || typeof payload !== "object" || payload === null) {
    throw new PronunciationScoreError(readMessage(payload, "Máy chủ chấm phát âm đang gặp lỗi."));
  }
  const result = payload as Record<string, unknown>;
  if (typeof result.transcript !== "string" || typeof result.feedback !== "string" ||
      typeof result.score !== "number" || !Number.isFinite(result.score)) {
    throw new PronunciationScoreError("Máy chủ trả về kết quả chấm không hợp lệ.");
  }
  return { score: clampScore(result.score), transcript: result.transcript, feedback: result.feedback };
}
