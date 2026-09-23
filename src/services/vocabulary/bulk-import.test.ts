import type { SQLiteDatabase } from "expo-sqlite";
import { describe, expect, it, vi } from "vitest";

import {
  parseBulkVocabularyInput,
  rankBulkCandidates,
  resolveBulkVocabulary,
} from "./bulk-import";

import { findBulkLookupCandidates, findHanziWordCandidates } from "@/db/repository";
import { normalizeSearch } from "@/services/search/normalize";
import type { Vocabulary } from "@/types/models";

const candidate = (
  id: string,
  simplified: string,
  meaning: string,
  hskBand: Vocabulary["hskBand"],
  frequencyRank: number | null,
): Vocabulary => ({
  id,
  simplified,
  traditional: simplified,
  pinyin: "",
  pinyinNumeric: "",
  primaryMeaningVi: meaning,
  meaningsVi: [meaning],
  meaningsEn: [],
  pos: [],
  hskBand,
  frequencyRank,
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
  sourceVersion: "1",
  sourceUrl: "",
  translationStatus: "verified",
  examples: [],
});

const dbRow = (word: Vocabulary) => ({
  id: word.id,
  simplified: word.simplified,
  traditional: word.traditional,
  pinyin: word.pinyin,
  pinyin_numeric: word.pinyinNumeric,
  primary_meaning_vi: word.primaryMeaningVi,
  meanings_vi: JSON.stringify(word.meaningsVi),
  meanings_en: JSON.stringify(word.meaningsEn),
  pos: JSON.stringify(word.pos),
  hsk_band: String(word.hskBand),
  frequency_rank: word.frequencyRank,
  classifiers: "[]",
  radical: null,
  stroke_count: null,
  visual_type: "none",
  image_uri: null,
  image_source: null,
  image_license: null,
  image_attribution: null,
  audio_uri: null,
  source: "test",
  source_version: "1",
  source_url: "",
  translation_status: "verified",
  search_text: normalizeSearch(`${word.simplified} ${word.pinyin} ${word.pinyinNumeric} ${word.primaryMeaningVi}`),
  is_custom: 0,
  deck_id: null,
});

describe("parseBulkVocabularyInput", () => {
  it("parses, de-duplicates and limits newline-separated words", () => {
    expect(parseBulkVocabularyInput("李\n quân\n李\n- 学习", 3)).toEqual([
      "李",
      "quân",
      "学习",
    ]);
  });

  it("prefers the whole country phrase over an unrelated frequent word", () => {
    const move = candidate("move", "着", "(cờ) nước đi", 2, 20);
    const vietnam = candidate("vietnam", "越南", "Việt Nam", 2, null);
    expect(rankBulkCandidates("Nước Việt Nam", [move, vietnam])[0]?.id).toBe("vietnam");
    expect(rankBulkCandidates("Nước Việt Nam", [move, vietnam]).map((item) => item.id)).not.toContain("move");
  });

  it("uses HSK 1-2 as a tie breaker for equally relevant beginner meanings", () => {
    const beginner = candidate("beginner", "学", "học", 1, 500);
    const advanced = candidate("advanced", "学术", "học", 5, 20);
    expect(rankBulkCandidates("học", [advanced, beginner])[0]?.id).toBe("beginner");
  });

  it("prefers a primary meaning over a secondary dictionary sense", () => {
    const many = candidate("many", "多", "nhiều", 1, 500);
    const hundred = candidate("hundred", "百", "một trăm; nhiều", 1, 20);
    expect(rankBulkCandidates("nhiều", [hundred, many])[0]?.id).toBe("many");
  });

  it("does not collapse Vietnamese tone differences into a wrong word", () => {
    const book = candidate("book", "书", "sách; thư", 1, 20);
    const order = candidate("order", "次", "thứ; lần", 2, 80);
    expect(rankBulkCandidates("thứ", [book, order])[0]?.id).toBe("order");
  });

  it("matches Vietnamese phrases, casing and diacritic-free input through semantic aliases", () => {
    const morning = candidate("morning", "上午", "buổi sáng", 1, 40);
    const noon = candidate("noon", "中午", "buổi trưa", 1, 40);
    const earlyMorning = candidate("early-morning", "早上", "buổi sáng; sáng sớm", 1, 40);

    expect(rankBulkCandidates("BUỔI SÁNG", [noon, morning])[0]?.id).toBe("morning");
    expect(rankBulkCandidates("buoi trua", [morning, noon])[0]?.id).toBe("noon");
    expect(rankBulkCandidates("Sáng sớm", [morning, earlyMorning])[0]?.id).toBe("early-morning");
  });

  it("does not promote a technical dictionary note over a common meaning", () => {
    const technical = candidate("technical", "上", "dùng trong 上聲[shang3 sheng1]", 1, 1);
    const common = candidate("common", "上", "trên; lên; ở trên", 1, 40);
    common.pinyin = "shàng";
    common.pinyinNumeric = "shang4";
    technical.pinyin = "shǎng";
    technical.pinyinNumeric = "shang3";

    expect(rankBulkCandidates("trên", [technical, common])[0]?.id).toBe("common");
  });

  it("prioritizes a requested surname over an unrelated short meaning", () => {
    const surname = candidate("xie", "谢", "Tạ; họ Tạ", 4, null);
    surname.pos = ["họ", "danh từ riêng"];
    const generic = candidate("generic", "他", "ta; anh ấy", 1, 10);

    expect(rankBulkCandidates("họ Tạ", [generic, surname])[0]?.id).toBe("xie");
    expect(rankBulkCandidates("họ Tạ", [generic, surname]).map((item) => item.id)).not.toContain("generic");
  });

  it("resolves the everyday food and routine meanings used by bulk import", () => {
    const cases: [string, string, string][] = [
      ["ăn", "eat", "吃"],
      ["uống", "drink", "喝"],
      ["đồ ăn", "food", "食物"],
      ["muốn", "want", "想"],
      ["cái bát", "bowl", "碗"],
      ["nhà ăn", "canteen", "食堂"],
      ["mỳ", "noodles", "面条儿"],
      ["canh giữ", "look-after", "看"],
    ];

    for (const [query, id, simplified] of cases) {
      const word = candidate(id, simplified, query, id === "food" ? 2 : 1, 100);
      expect(rankBulkCandidates(query, [word])[0]?.id, query).toBe(id);
    }
  });

  it("keeps Hanzi substring lookup fast without losing the matching word", () => {
    const country = candidate("country", "中国", "Trung Quốc", 1, 20);
    const person = candidate("person", "你", "bạn", 1, 1);

    expect(rankBulkCandidates("国", [person, country]).map((word) => word.id)).toContain("country");
    expect(rankBulkCandidates("国", [person, country]).map((word) => word.id)).not.toContain("person");
  });

  it("fetches only a bounded candidate set after the lightweight index scan", async () => {
    const country = dbRow(candidate("country", "中国", "Trung Quốc", 1, 20));
    const person = dbRow(candidate("person", "你", "bạn", 1, 1));
    const rows = [country, person];
    const calls: string[] = [];
    const db = {
      getAllAsync: vi.fn(async (sql: string, ...values: unknown[]) => {
        calls.push(sql);
        if (sql.includes("SELECT id,simplified")) return [];
        if (sql.includes("v.search_text LIKE")) return [country];
        return rows.filter((row) => values.includes(row.id));
      }),
    } as unknown as SQLiteDatabase;

    const result = await findBulkLookupCandidates(db, [{ value: "trung quốc" }]);

    expect(result.map((word) => word.id)).toContain("country");
    expect(result.map((word) => word.id)).not.toContain("person");
    expect(calls.some((sql) => sql.includes("search_text ||"))).toBe(false);
    expect(calls.filter((sql) => sql.includes("SELECT v.*")).length).toBe(1);
  });

  it("does not wait forever when the SQLite bridge is locked", async () => {
    const db = {
      getAllAsync: () => new Promise<never>(() => undefined),
    } as unknown as SQLiteDatabase;

    const result = await resolveBulkVocabulary(db, "Hôm qua\nXin lỗi");

    expect(result).toHaveLength(2);
    expect(result.every((item) => item.word)).toBe(true);
  }, 5000);

  it("filters handwriting combinations through the offline dictionary", async () => {
    const db = {
      getAllAsync: vi.fn(async () => []),
    } as unknown as SQLiteDatabase;

    const result = await findHanziWordCandidates(db, [["你", "他"], ["好", "号"]]);

    expect(result).toContain("你好");
    expect(result).not.toContain("他号");
  });
});
