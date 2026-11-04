import {
  decodeDeckShareCode,
  decodeSharedDeckPayload,
  type SharedDeckPayload,
} from "@/services/decks/share-code";

const CODE_LENGTH = 8;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PUBLISH_RPC = "publish_hanzi_shared_deck";
const FETCH_RPC = "fetch_hanzi_shared_deck";

export class ShortDeckShareError extends Error {}

function config() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/u, "");
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function isShortDeckShareConfigured(): boolean {
  return Boolean(config());
}

export function normalizeShortDeckCode(value: string): string | null {
  const code = value.trim().toUpperCase().replace(/[\s-]/gu, "");
  return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(code) ? code : null;
}

/** Generates an easy-to-read 8-character code with no ambiguous 0/O or 1/I. */
export function createShortDeckCode(): string {
  return Array.from({ length: CODE_LENGTH }, () => {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    return CODE_ALPHABET[index] ?? "A";
  }).join("");
}

function headers(anonKey: string) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
  };
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "message" in body && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    // The HTTP status is enough when a gateway returns an empty response.
  }
  return `HTTP ${response.status}`;
}

async function request(connection: NonNullable<ReturnType<typeof config>>, rpc: string, body: object) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(`${connection.url}/rest/v1/rpc/${rpc}`, {
      method: "POST", headers: headers(connection.anonKey), body: JSON.stringify(body), signal: controller.signal,
    });
  } finally { clearTimeout(timer); }
}

/** Publishes a deck and retries the extremely unlikely short-code collision. */
export async function publishShortDeck(payload: SharedDeckPayload): Promise<string> {
  const connection = config();
  if (!connection) {
    throw new ShortDeckShareError("Chưa cấu hình Supabase cho mã bộ từ ngắn.");
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = createShortDeckCode();
    const response = await request(connection, PUBLISH_RPC, { p_code: code, p_payload: payload });
    if (response.ok) {
      const inserted: unknown = await response.json();
      if (inserted === true) return code;
      continue;
    }
    throw new ShortDeckShareError(`Không thể tạo mã bộ từ: ${await responseMessage(response)}`);
  }
  throw new ShortDeckShareError("Không thể tạo mã duy nhất. Hãy thử lại.");
}

export async function fetchShortDeck(codeInput: string): Promise<SharedDeckPayload | null> {
  const code = normalizeShortDeckCode(codeInput);
  if (!code) return null;
  const connection = config();
  if (!connection) {
    throw new ShortDeckShareError("Chưa cấu hình Supabase cho mã bộ từ ngắn.");
  }
  const response = await request(connection, FETCH_RPC, { p_code: code });
  if (!response.ok) {
    throw new ShortDeckShareError(`Không thể tìm mã bộ từ: ${await responseMessage(response)}`);
  }
  return decodeSharedDeckPayload(await response.json() as unknown);
}

/**
 * Imports either the current short Supabase code or the original self-contained
 * HZD1/HZD2 code. Offline payloads are decoded locally, so they remain usable even
 * when the old code was created before the Supabase sharing table existed.
 */
export async function fetchSharedDeck(codeInput: string): Promise<SharedDeckPayload | null> {
  const legacyPayload = decodeDeckShareCode(codeInput);
  if (legacyPayload) return legacyPayload;
  return fetchShortDeck(codeInput);
}
