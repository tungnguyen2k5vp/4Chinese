import type { SQLiteDatabase } from "expo-sqlite";

import { normalizeEnglishHeadword } from "@/services/languages/config";

export const SKYPEDIA_VERSION = "388adc0826300912e5b0311c089e0e70494b065f";
export const SKYPEDIA_SOURCE = `SKYPEDIA_LOCAL:${SKYPEDIA_VERSION}`;
export const SKYPEDIA_URL = `https://raw.githubusercontent.com/skypediacode/english-vietnamese-dictionary/${SKYPEDIA_VERSION}/dictionary_en_vi.db`;
export const SKYPEDIA_REPOSITORY =
  "https://github.com/skypediacode/english-vietnamese-dictionary";

/** SQLite deserialize cannot open WAL headers. Change only the private in-memory
 * transport copy, never vocabulary rows or the upstream file.
 * https://www.sqlite.org/c3ref/deserialize.html */
export function skypediaDeserializeBytes(input: Uint8Array): Uint8Array {
  if (
    input.length < 100 ||
    String.fromCharCode(...input.slice(0, 16)) !== "SQLite format 3\u0000"
  )
    throw new Error("Dữ liệu tải về không phải từ điển SQLite hợp lệ.");
  const bytes = new Uint8Array(input);
  bytes[18] = 1;
  bytes[19] = 1;
  return bytes;
}
export interface PersonalBulkLine {
  line: number;
  headword: string;
  meaning: string;
  issue: string;
}
export interface SkypediaMeaning {
  id: string;
  entryId: string;
  senseId: string;
  headword: string;
  /** Original Vietnamese definition, preserved exactly as it was imported. */
  meaning: string;
  shortMeaning: string;
  usageNote: string;
  pos: string;
  rawPos: string;
  example: string;
  ipa: string;
  ipaRegion: string;
  pronunciations: { ipa: string; region: string }[];
  source: typeof SKYPEDIA_SOURCE;
  matchType:
    | "EXACT_HEADWORD"
    | "EXACT_PHRASE"
    | "EXACT_FORM"
    | "LEMMA_MATCH"
    | "MEANING_MATCH"
    | "NORMALIZED_MATCH"
    | "FUZZY_MATCH";
  rankingExplanation: string;
  isInflectedForm: boolean;
  definitionEn: null;
  usageLabel: null;
}

export interface SkypediaSearchResult {
  headword: string;
  senseCount: number;
  match: "exact" | "prefix" | "meaning";
}

const vietnameseLetterVariants: [string, string][] = [
  ...["àáảãạăằắẳẵặâầấẩẫậ"].map((chars) => [...chars].map((c) => [c, "a"] as [string, string])).flat(),
  ...["èéẻẽẹêềếểễệ"].map((chars) => [...chars].map((c) => [c, "e"] as [string, string])).flat(),
  ...["ìíỉĩị"].map((chars) => [...chars].map((c) => [c, "i"] as [string, string])).flat(),
  ...["òóỏõọôồốổỗộơờớởỡợ"].map((chars) => [...chars].map((c) => [c, "o"] as [string, string])).flat(),
  ...["ùúủũụưừứửữự"].map((chars) => [...chars].map((c) => [c, "u"] as [string, string])).flat(),
  ...["ỳýỷỹỵ"].map((chars) => [...chars].map((c) => [c, "y"] as [string, string])).flat(),
  ["đ", "d"],
];

/** Search the pinned source in SQLite; never hydrate the dictionary into JS. */
export async function searchSkypedia(
  db: ContentDb,
  input: string,
  limit = 10,
): Promise<SkypediaSearchResult[]> {
  const query = input.trim().normalize("NFC").replace(/\s+/gu, " ");
  if (query.length < 2 || query.length > 200) return [];
  const safeLimit = Math.max(1, Math.min(20, Math.trunc(limit)));
  const englishLike = /[a-z]/iu.test(query);
  if (englishLike) {
    const exact = await db.getAllAsync<{ headword: string; senseCount: number }>(
      `SELECT w.word headword,COUNT(DISTINCT wd.id) senseCount
       FROM words w JOIN word_definitions wd ON wd.word_id=w.id
       JOIN definitions d ON d.id=wd.definition_id
       WHERE w.lang_code='en' AND w.word=? COLLATE NOCASE AND d.definition_lang='vi'
       GROUP BY w.id,w.word ORDER BY w.word LIMIT ?`,
      query,
      safeLimit,
    );
    if (exact.length)
      return exact.map((row) => ({ ...row, match: "exact" as const }));

    const prefix = `${query.replace(/[\\%_]/gu, "\\$&")}%`;
    const suggestions = await db.getAllAsync<{ headword: string; senseCount: number }>(
      `SELECT w.word headword,COUNT(DISTINCT wd.id) senseCount
       FROM words w JOIN word_definitions wd ON wd.word_id=w.id
       JOIN definitions d ON d.id=wd.definition_id
       WHERE w.lang_code='en' AND w.word LIKE ? ESCAPE '\\' COLLATE NOCASE
         AND d.definition_lang='vi'
       GROUP BY w.id,w.word ORDER BY CASE WHEN w.word=? COLLATE NOCASE THEN 0 ELSE 1 END,w.word LIMIT ?`,
      prefix,
      query,
      safeLimit,
    );
    if (suggestions.length)
      return suggestions.map((row) => ({ ...row, match: "prefix" as const }));
  }

  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/giu, "d")
    .toLocaleLowerCase("vi")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
  const terms = normalized.split(" ").filter(Boolean).slice(0, 5);
  if (!terms.length) return [];
  // SQLite's built-in LIKE does not fold Vietnamese accents. Normalize only the
  // source characters relevant to this query, and keep all matching in SQLite.
  let expression = "lower(d.definition)";
  const needed = new Set(normalized);
  for (const [from, to] of vietnameseLetterVariants) {
    if (!needed.has(to)) continue;
    expression = `replace(${expression},'${from}','${to}')`;
    expression = `replace(${expression},'${from.toLocaleUpperCase("vi")}','${to}')`;
  }
  const predicates = terms.map(() => `${expression} LIKE ? ESCAPE '\\'`).join(" AND ");
  const rows = await db.getAllAsync<{ headword: string; senseCount: number }>(
    `WITH matched_definitions AS (
       SELECT d.id FROM definitions d
       WHERE d.definition_lang='vi' AND ${predicates} LIMIT 128
     )
     SELECT w.word headword,COUNT(DISTINCT wd.id) senseCount
     FROM matched_definitions d JOIN word_definitions wd ON wd.definition_id=d.id
     JOIN words w ON w.id=wd.word_id
     WHERE w.lang_code='en'
     GROUP BY w.id,w.word ORDER BY w.word LIMIT ?`,
    ...terms.map((term) => `%${term.replace(/[\\%_]/gu, "\\$&")}%`),
    safeLimit,
  );
  return rows.map((row) => ({ ...row, match: "meaning" as const }));
}
export interface EnglishDictionaryRankingContext {
  /** A user-confirmed sense may lead when reopening that same saved card. */
  preferredSenseId?: string | null;
  preferredPos?: string | null;
}
const matchPriority: Record<SkypediaMeaning["matchType"], number> = {
  EXACT_HEADWORD: 0,
  EXACT_PHRASE: 0,
  EXACT_FORM: 1,
  LEMMA_MATCH: 2,
  NORMALIZED_MATCH: 3,
  MEANING_MATCH: 4,
  FUZZY_MATCH: 5,
};
/**
 * Orders only by observable lexical evidence and optional user context.
 * It intentionally does not infer frequency or a "most common" sense.
 */
export function rankEnglishDictionaryCandidates(
  candidates: SkypediaMeaning[],
  context: EnglishDictionaryRankingContext = {},
): SkypediaMeaning[] {
  const preferredPos = context.preferredPos?.trim().toLocaleLowerCase("vi");
  return candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => {
      const a = left.candidate;
      const b = right.candidate;
      const aSense = a.senseId === context.preferredSenseId ? 0 : 1;
      const bSense = b.senseId === context.preferredSenseId ? 0 : 1;
      if (aSense !== bSense) return aSense - bSense;
      const aPos = preferredPos && a.pos.trim().toLocaleLowerCase("vi") === preferredPos ? 0 : 1;
      const bPos = preferredPos && b.pos.trim().toLocaleLowerCase("vi") === preferredPos ? 0 : 1;
      if (aPos !== bPos) return aPos - bPos;
      const match = matchPriority[a.matchType] - matchPriority[b.matchType];
      if (match) return match;
      const inflection = Number(a.isInflectedForm) - Number(b.isInflectedForm);
      return inflection || left.index - right.index;
    })
    .map(({ candidate }) => candidate);
}
const posNames: Record<string, string> = {
  N: "danh từ",
  V: "động từ",
  A: "tính từ",
  R: "trạng từ",
  P: "giới từ",
  C: "liên từ",
  I: "thán từ",
  O: "thán từ",
  noun: "danh từ",
  verb: "động từ",
  adjective: "tính từ",
  adverb: "trạng từ",
};
export function englishPosLabel(pos: string) {
  return posNames[pos] ?? pos;
}

/** Plain words are the default; existing TAB-separated custom meanings still work. */
export function parsePersonalEnglishList(text: string): PersonalBulkLine[] {
  const lines = text.split(/\r\n|\n|\r/u).filter((line) => line.trim());
  if (lines.length > 100 || text.length > 230000)
    throw new Error("Chỉ nhập tối đa 100 từ mỗi lần.");
  return lines.map((raw, index) => {
    const fields = raw.split("\t");
    const headword = fields[0]?.trim() ?? "";
    const meaning = fields[1]?.trim() ?? "";
    const issue =
      fields.length > 2
        ? "Dòng có quá nhiều cột. Hãy sửa danh sách hoặc bỏ mục này."
        : !/[a-z]/iu.test(headword) || headword.length > 300
          ? "Từ/cụm tiếng Anh chưa hợp lệ."
          : meaning.length > 2000
            ? "Nghĩa dài quá 2.000 ký tự."
            : "";
    return { line: index + 1, headword, meaning, issue };
  });
}
type ContentDb = Pick<SQLiteDatabase, "getAllAsync" | "getFirstAsync">;
type SkypediaRow = {
  id: number;
  word_id: number;
  headword: string;
  meaning: string;
  pos: string;
  sub_pos: string | null;
  example: string | null;
  ipa: string | null;
  region: string | null;
};
function inflectedDefinition(value: string) {
  return /(?:động từ|danh từ|tính từ|trạng từ)\s+(?:được\s+)?(?:chia|biến đổi|thời|ở ngôi|quá khứ|hiện tại)|(?:quá khứ|quá khứ phân từ|động tính từ quá khứ|số nhiều)\s+(?:của|của từ)|\b(?:third[- ]person singular|past tense|past participle|present participle|plural form|inflected form) of\b/iu.test(
    value,
  );
}
/** Only detach a narrow, recognizable source date note. The original is retained. */
export function presentSkypediaMeaning(value: string) {
  const match = value.match(/\s+(\[từ thế kỷ\s+[IVXLCDM]+\])\s*$/iu);
  if (!match || match.index === undefined)
    return { shortMeaning: value, usageNote: "" };
  return {
    shortMeaning: value.slice(0, match.index).trimEnd(),
    usageNote: match[1]!,
  };
}
function rankSkypediaRows(input: string, rows: SkypediaRow[]) {
  const inputExact = input.trim().toLocaleLowerCase("en-US");
  const inputNormalized = normalizeEnglishHeadword(input);
  const senses = new Map<number, SkypediaMeaning>();
  for (const row of rows) {
    let candidate = senses.get(row.id);
    if (!candidate) {
      const display = presentSkypediaMeaning(row.meaning);
      const inflected = inflectedDefinition(row.meaning);
      const matchType =
        row.headword.trim().toLocaleLowerCase("en-US") !== inputExact
          ? "NORMALIZED_MATCH"
          : /\s/u.test(inputNormalized)
            ? "EXACT_PHRASE"
            : "EXACT_HEADWORD";
      candidate = {
        id: `en:sky:wd:${row.id}`,
        senseId: `en:sky:wd:${row.id}`,
        entryId: `en:sky:w:${row.word_id}`,
        headword: row.headword,
        meaning: row.meaning,
        shortMeaning: display.shortMeaning,
        usageNote: display.usageNote,
        pos: englishPosLabel(row.pos),
        rawPos: row.pos,
        example: row.example ?? "",
        ipa: row.ipa ?? "",
        ipaRegion: row.region ?? "",
        pronunciations: [],
        source: SKYPEDIA_SOURCE,
        matchType,
        rankingExplanation: inflected
          ? "Nguồn ghi đây là dạng chia của một mục từ khác; mục từ khớp trực tiếp được xếp trước."
          : matchType === "NORMALIZED_MATCH"
            ? "Khớp sau khi chuẩn hóa chữ hoa và khoảng trắng."
            : "Khớp đúng mục từ trong từ điển nguồn.",
        isInflectedForm: inflected,
        definitionEn: null,
        usageLabel: null,
      };
      senses.set(row.id, candidate);
    }
    if (row.ipa?.trim()) {
      const pronunciation = {
        ipa: row.ipa.trim(),
        region: row.region?.trim() ?? "",
      };
      if (
        !candidate.pronunciations.some(
          (item) =>
            item.ipa === pronunciation.ipa &&
            item.region === pronunciation.region,
        )
      )
        candidate.pronunciations.push(pronunciation);
    }
  }
  const candidates = [...senses.values()].map((candidate) => ({
    ...candidate,
    ipa: candidate.pronunciations[0]?.ipa ?? "",
    ipaRegion: candidate.pronunciations[0]?.region ?? "",
  }));
  return rankEnglishDictionaryCandidates(candidates);
}
/** Exact source senses only. This database has no morphology, frequency, or sense-level IPA. */
export async function lookupSkypediaBatch(
  db: ContentDb,
  inputs: string[],
): Promise<SkypediaMeaning[][]> {
  if (inputs.length > 100) throw new Error("Chỉ tra tối đa 100 từ mỗi lần.");
  const variants = [
    ...new Set(
      inputs.flatMap((input) => {
        const key = normalizeEnglishHeadword(input);
        return key && key.length <= 300
          ? [
              key,
              input.trim(),
              key.toUpperCase(),
              key.charAt(0).toUpperCase() + key.slice(1),
            ]
          : [];
      }),
    ),
  ];
  if (!variants.length) return inputs.map(() => []);
  const rows = await db.getAllAsync<SkypediaRow>(
    `SELECT wd.id,w.id word_id,w.word headword,d.definition meaning,d.pos,d.sub_pos,wd.example,p.ipa,p.region
     FROM words w JOIN word_definitions wd ON wd.word_id=w.id
     JOIN definitions d ON d.id=wd.definition_id
     LEFT JOIN pronunciations p ON p.word_id=w.id
     WHERE w.lang_code='en' AND w.word IN (${variants.map(() => "?").join(",")})
       AND d.definition_lang='vi'
     ORDER BY wd.id,p.id`,
    ...variants,
  );
  const rowsByHeadword = new Map<string, SkypediaRow[]>();
  for (const row of rows) {
    const key = normalizeEnglishHeadword(row.headword);
    const matching = rowsByHeadword.get(key);
    if (matching) matching.push(row);
    else rowsByHeadword.set(key, [row]);
  }
  return inputs.map((input) => {
    const normalized = normalizeEnglishHeadword(input);
    return rankSkypediaRows(input, rowsByHeadword.get(normalized) ?? []);
  });
}
/** Original Skypedia tables stay read-only and separate from learner databases. */
export async function lookupSkypedia(
  db: ContentDb,
  input: string,
): Promise<SkypediaMeaning[]> {
  if (!normalizeEnglishHeadword(input) || input.length > 300) return [];
  return (await lookupSkypediaBatch(db, [input]))[0] ?? [];
}
