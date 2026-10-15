import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";
import { describe, expect, it } from "vitest";

import { expoAdapter } from "../fixtures/legacy_database";

import {
  lookupSkypedia,
  lookupSkypediaBatch,
  presentSkypediaMeaning,
  rankEnglishDictionaryCandidates,
  searchSkypedia,
} from "./skypedia";

const sourcePath =
  "artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db";

describe("Skypedia candidate ranking over the existing read-only corpus", () => {
  it.skipIf(!existsSync(sourcePath))(
    "searches exact words, phrases, prefixes and Vietnamese without loading the corpus into JS",
    async () => {
      const db = new DatabaseSync(sourcePath, { readOnly: true });
      try {
        const adapter = expoAdapter(db);
        expect(await searchSkypedia(adapter, "hello")).toEqual([
          expect.objectContaining({ headword: "hello", match: "exact", senseCount: expect.any(Number) }),
        ]);
        expect((await searchSkypedia(adapter, "look up")).some((row) => row.headword === "look up" && row.match === "exact")).toBe(true);
        expect((await searchSkypedia(adapter, "appl")).some((row) => row.headword === "apple" && row.match === "prefix")).toBe(true);
        expect((await searchSkypedia(adapter, "cam on")).some((row) => row.match === "meaning")).toBe(true);
      } finally {
        db.close();
      }
    },
    30_000,
  );

  it.skipIf(!existsSync(sourcePath))(
    "ranks direct shorts noun senses ahead of a source-labelled inflected verb",
    async () => {
      const db = new DatabaseSync(sourcePath, { readOnly: true });
      try {
        const candidates = await lookupSkypedia(expoAdapter(db), "shorts");
        expect(candidates).toHaveLength(3);
        expect(candidates.slice(0, 2).map((row) => row.rawPos)).toEqual([
          "N",
          "N",
        ]);
        expect(candidates.slice(0, 2).every((row) => !row.isInflectedForm)).toBe(
          true,
        );
        expect(candidates[2]).toMatchObject({
          rawPos: "V",
          isInflectedForm: true,
          matchType: "EXACT_HEADWORD",
        });
        expect(candidates[0]!.senseId).toBe("en:sky:wd:434537");
      } finally {
        db.close();
      }
    },
  );

  it.skipIf(!existsSync(sourcePath))("promotes only a previously confirmed sense when the same card is reopened", async () => {
    const db = new DatabaseSync(sourcePath, { readOnly: true });
    try {
      const bank = await lookupSkypedia(expoAdapter(db), "bank");
      const selected = "en:sky:wd:322479";
      const ranked = rankEnglishDictionaryCandidates(bank, { preferredSenseId: selected });
      expect(ranked[0]?.senseId).toBe(selected);
      expect(ranked).toHaveLength(bank.length);
      expect(ranked.every((row) => row.rankingExplanation.length > 0)).toBe(true);
      expect(ranked[0]?.rankingExplanation.toLocaleLowerCase("vi")).not.toContain("phổ biến nhất");
    } finally {
      db.close();
    }
  });

  it.skipIf(!existsSync(sourcePath))(
    "keeps bank/book/love multi-sense, keeps look up as one phrase and does not invent a went lemma",
    async () => {
      const db = new DatabaseSync(sourcePath, { readOnly: true });
      try {
        const inputs = ["bank", "book", "love", "look up", "went"];
        const rows = await lookupSkypediaBatch(expoAdapter(db), inputs);
        expect(rows.map((items) => items.length)).toEqual([19, 8, 8, 3, 1]);
        expect(rows[0]!.some((row) => row.rawPos === "N")).toBe(true);
        expect(rows[0]!.some((row) => row.rawPos === "V")).toBe(true);
        expect(rows[1]!.some((row) => row.rawPos === "N")).toBe(true);
        expect(rows[1]!.some((row) => row.rawPos === "V")).toBe(true);
        expect(rows[3]!.every((row) => row.headword === "look up")).toBe(true);
        expect(rows[4]![0]).toMatchObject({ headword: "went", rawPos: "V" });
        expect(rows[4]!.some((row) => row.headword === "go")).toBe(false);
        expect(rows[4]![0]!.meaning).toContain("go");
      } finally {
        db.close();
      }
    },
  );

  it.skipIf(!existsSync(sourcePath))(
    "batches 100 words in one parameterized source read and keeps IPA at entry scope",
    async () => {
      const raw = new DatabaseSync(sourcePath, { readOnly: true });
      let queries = 0;
      const base = expoAdapter(raw);
      const adapter = {
        getFirstAsync: base.getFirstAsync.bind(base),
        getAllAsync: async <T>(sql: string, ...values: unknown[]) => {
          queries += 1;
          return base.getAllAsync<T>(sql, ...(values as SQLiteBindValue[]));
        },
      } as unknown as Pick<SQLiteDatabase, "getAllAsync" | "getFirstAsync">;
      try {
        const result = await lookupSkypediaBatch(
          adapter,
          Array.from({ length: 100 }, (_, index) => ["lead", "read", "wind", "look up"][index % 4]!),
        );
        expect(result).toHaveLength(100);
        expect(queries).toBe(1);
        const read = result[1]!.find((row) => row.headword === "read")!;
        expect(read.pronunciations).toHaveLength(1);
        expect(read.ipaRegion).toBe("");
        expect(read.rankingExplanation).toContain("mục từ");
      } finally {
        raw.close();
      }
    },
  );

  it.skipIf(!existsSync(sourcePath))("records lookup and JS ranking timings for 10, 50, and 100 pasted lines", async () => {
    const raw = new DatabaseSync(sourcePath, { readOnly: true });
    try {
      const corpus = raw.prepare("SELECT word FROM words WHERE lang_code='en' ORDER BY id LIMIT 150").all() as { word: string }[];
      const curated = ["shorts", "BANK", " Book ", "love", "look up", "went", "lead", "read", "wind", "hello", "apple", "run", "set", "bank", "love", "zzzznotaword999", "  love  "];
      const inputs = [...curated, ...corpus.map((row) => row.word).filter((word) => !curated.some((item) => item.trim().toLocaleLowerCase("en-US") === word.trim().toLocaleLowerCase("en-US")))];
      for (const size of [10, 50, 100]) {
        let sqliteMs = 0;
        let queryCount = 0;
        const base = expoAdapter(raw);
        const adapter = {
          getFirstAsync: base.getFirstAsync.bind(base),
          getAllAsync: async <T>(sql: string, ...values: unknown[]) => {
            queryCount += 1;
            const started = performance.now();
            const result = await base.getAllAsync<T>(sql, ...(values as SQLiteBindValue[]));
            sqliteMs += performance.now() - started;
            return result;
          },
        } as unknown as Pick<SQLiteDatabase, "getAllAsync" | "getFirstAsync">;
        const started = performance.now();
        const results = await lookupSkypediaBatch(adapter, inputs.slice(0, size));
        const totalMs = performance.now() - started;
        const rankingAndGroupingMs = Math.max(0, totalMs - sqliteMs);
        console.info(`V7.3_BENCH lines=${size} queries=${queryCount} matches=${results.reduce((sum, row) => sum + row.length, 0)} sqliteMs=${sqliteMs.toFixed(2)} rankingGroupingMs=${rankingAndGroupingMs.toFixed(2)} totalLookupMs=${totalMs.toFixed(2)}`);
        expect(results).toHaveLength(size);
        expect(queryCount).toBe(1);
      }
    } finally {
      raw.close();
    }
  });

  it("separates only a recognized source-era note and retains the original text", () => {
    const raw = "Quả táo, quả táo tây. [từ thế kỷ IX]";
    expect(presentSkypediaMeaning(raw)).toEqual({
      shortMeaning: "Quả táo, quả táo tây.",
      usageNote: "[từ thế kỷ IX]",
    });
    expect(presentSkypediaMeaning("Nghĩa không rõ dạng ghi chú")).toEqual({
      shortMeaning: "Nghĩa không rõ dạng ghi chú",
      usageNote: "",
    });
  });
});
