import { describe, expect, it } from "vitest";

import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { seedGrammarContent } from "./grammar";
import { listGrammarMicroLessons } from "./grammar-focus";
import { migrateDatabaseSchema } from "./migrations";

describe("grammar micro lessons from real evidence", () => {
  it("requires multiple formats, respects recency and never changes SRS", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await seedGrammarContent(db, []);
      const before = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .all();
      const now = Date.parse("2026-10-01T00:00:00Z");
      for (let i = 0; i < 5; i++)
        sqlite
          .prepare(
            "INSERT INTO grammar_attempts(id,grammar_id,exercise_type,correct,created_at) VALUES(?,?,?,?,?)",
          )
          .run(
            `focus-${i}`,
            "vn-zai-you",
            i % 2 ? "grammar_choice" : "grammar_fill_blank",
            0,
            new Date(now - i * 1000).toISOString(),
          );
      expect(await listGrammarMicroLessons(db, now)).toMatchObject([
        { grammarId: "vn-zai-you", samples: 5, wrong: 5 },
      ]);
      expect(await listGrammarMicroLessons(db, now + 31 * 86400000)).toEqual(
        [],
      );
      expect(
        sqlite.prepare("SELECT * FROM user_vocabulary_progress").all(),
      ).toEqual(before);
    } finally {
      sqlite.close();
    }
  });
});
