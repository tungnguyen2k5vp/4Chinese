import { describe, expect, it } from "vitest";

import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { migrateDatabaseSchema } from "./migrations";
import { getDashboardStats, listVocabulary } from "./repository";

describe("band-scoped memory statistics", () => {
  it("uses the same HSK scope for chart counts and the filtered word list", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.prepare(`INSERT INTO vocabulary(
        id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,
        pos,hsk_band,source,source_version,source_url,translation_status,search_text,is_custom,deck_id
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        "hsk-79-test", "测试", "測試", "cè shì", "ce4 shi4", "kiểm tra", '["kiểm tra"]',
        '["test"]', '["động từ"]', "7-9", "test", "1", "", "verified", "ce4 shi4 kiem tra", 0, null,
      );
      sqlite.prepare(`INSERT INTO user_vocabulary_progress(
        vocabulary_id,status,studied,due,next_review_at,state,memory_level,mastery_level,
        is_known,is_suspended,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        "hsk-79-test", "LEARNING", 1, "2099-01-01", "2099-01-01", 2, 3, 3, 0, 0,
        "2026-01-01", "2026-01-01",
      );

      const scoped = await getDashboardStats(db, ["7-9"]);
      expect(scoped.learned).toBe(1);
      expect(scoped.mastery[3]).toBe(1);
      expect(scoped.mastery[4]).toBe(0);

      const words = await listVocabulary(db, {
        band: "7-9",
        filter: "learned",
        memoryLevel: 3,
      });
      expect(words.map((word) => word.id)).toEqual(["hsk-79-test"]);
    } finally {
      sqlite.close();
    }
  });
});
