import {
  createShortDeckCode,
  normalizeShortDeckCode,
} from "@/services/decks/short-share";

const PUBLISH_RPC = "publish_hanzi_shared_deck";
const FETCH_RPC = "fetch_hanzi_shared_deck";
const MAX_WORDS = 500;

export interface EnglishSharedWord {
  headword: string;
  meaningVi: string;
  pos: string;
  ipa: string;
}

export interface EnglishSharedDeckPayload {
  version: 1;
  language: "en";
  name: string;
  words: EnglishSharedWord[];
}

export class EnglishDeckShareError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function createEnglishSharedDeckPayload(
  name: string,
  words: EnglishSharedWord[],
): EnglishSharedDeckPayload {
  if (!Array.isArray(words) || words.length < 1 || words.length > MAX_WORDS) {
    throw new EnglishDeckShareError("Bộ từ cần có từ 1 đến 500 mục để chia sẻ.");
  }
  const cleanWords = words.map((word) => ({
    headword: cleanText(word.headword, 300),
    meaningVi: cleanText(word.meaningVi, 2_000),
    pos: cleanText(word.pos, 200),
    ipa: cleanText(word.ipa, 300),
  }));
  if (cleanWords.some((word) => !word.headword || !word.meaningVi)) {
    throw new EnglishDeckShareError("Có từ hoặc nghĩa đang bị trống nên chưa thể chia sẻ.");
  }
  return {
    version: 1,
    language: "en",
    name: cleanText(name, 80) || "Bộ từ tiếng Anh",
    words: cleanWords,
  };
}

export function decodeEnglishSharedDeckPayload(
  value: unknown,
): EnglishSharedDeckPayload | null {
  if (!isRecord(value) || value.version !== 1 || value.language !== "en")
    return null;
  if (!Array.isArray(value.words) || value.words.length < 1 || value.words.length > MAX_WORDS)
    return null;
  const words: EnglishSharedWord[] = [];
  for (const item of value.words) {
    if (!isRecord(item)) return null;
    const word = {
      headword: cleanText(item.headword, 300),
      meaningVi: cleanText(item.meaningVi, 2_000),
      pos: cleanText(item.pos, 200),
      ipa: cleanText(item.ipa, 300),
    };
    if (!word.headword || !word.meaningVi) return null;
    words.push(word);
  }
  return {
    version: 1,
    language: "en",
    name: cleanText(value.name, 80) || "Bộ từ tiếng Anh",
    words,
  };
}

function connection() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/u, "");
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

function requestHeaders(anonKey: string) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
  };
}

async function httpError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.message === "string") return body.message;
  } catch {
    // Some gateway failures have no JSON body; keep the HTTP status as context.
  }
  return `HTTP ${response.status}`;
}

/** Uses the app's existing short-code deck RPC; payload stays language-tagged. */
export async function publishEnglishDeck(
  payload: EnglishSharedDeckPayload,
): Promise<string> {
  const config = connection();
  if (!config)
    throw new EnglishDeckShareError("Chưa cấu hình Supabase cho chia sẻ bộ từ.");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = createShortDeckCode();
    const response = await fetch(`${config.url}/rest/v1/rpc/${PUBLISH_RPC}`, {
      method: "POST",
      headers: requestHeaders(config.anonKey),
      body: JSON.stringify({ p_code: code, p_payload: payload }),
    });
    if (!response.ok)
      throw new EnglishDeckShareError(`Chưa tạo được mã chia sẻ: ${await httpError(response)}`);
    if (await response.json() === true) return code;
  }
  throw new EnglishDeckShareError("Chưa tạo được mã duy nhất. Hãy thử lại.");
}

export async function fetchEnglishDeck(
  input: string,
): Promise<EnglishSharedDeckPayload | null> {
  const code = normalizeShortDeckCode(input);
  if (!code) return null;
  const config = connection();
  if (!config)
    throw new EnglishDeckShareError("Chưa cấu hình Supabase cho chia sẻ bộ từ.");
  const response = await fetch(`${config.url}/rest/v1/rpc/${FETCH_RPC}`, {
    method: "POST",
    headers: requestHeaders(config.anonKey),
    body: JSON.stringify({ p_code: code }),
  });
  if (!response.ok)
    throw new EnglishDeckShareError(`Chưa tìm được bộ từ: ${await httpError(response)}`);
  return decodeEnglishSharedDeckPayload(await response.json() as unknown);
}
