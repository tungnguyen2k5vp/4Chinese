import { describe, expect, it } from "vitest";

import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { migrateDatabaseSchema } from "./migrations";
import { copyVocabularyBatchToDeck, getExampleSentences, getVocabulary, listVocabulary } from "./repository";

describe("stored vocabulary examples", () => {
  it("does not let a previously generated row hide a user's real example in detail or lists", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.prepare(`INSERT INTO example_sentence(id,vocabulary_id,chinese,pinyin,vietnamese,difficulty)
        VALUES(?,?,?,?,?,0)`).run(
        "custom-1-ex-1", "custom-1", "我正在学习“您好”这个词。",
        "Wǒ zhèngzài xuéxí nín hǎo zhège cí.",
        "Tôi đang học ý nghĩa của từ “xin chào”.",
      );
      expect((await getVocabulary(db, "custom-1"))?.examples.map((item) => item.chinese)).toEqual(["您好！"]);
      const listed = await listVocabulary(db, { deckId: "deck-1" });
      expect(listed[0]?.examples.map((item) => item.chinese)).toEqual(["您好！"]);
      // Read-time repair must not mutate a user's database or history.
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM example_sentence WHERE vocabulary_id='custom-1'").get())
        .toEqual({ count: 2 });
    } finally { sqlite.close(); }
  });

  it("does not persist a fake sentence when copying a word with no verified context", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const source = await getVocabulary(db, "custom-1");
      expect(source).not.toBeNull();
      const result = await copyVocabularyBatchToDeck(db, "deck-1", [{
        ...source!, id: "unverified-word", simplified: "罕见词", traditional: "罕见词",
        pinyin: "hǎn jiàn cí", pinyinNumeric: "han3 jian4 ci2",
        primaryMeaningVi: "từ hiếm", meaningsVi: ["từ hiếm"], examples: [],
      }]);
      expect(result.saved).toBe(1);
      const copied = sqlite.prepare("SELECT id FROM vocabulary WHERE deck_id='deck-1' AND simplified='罕见词'").get() as { id: string };
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM example_sentence WHERE vocabulary_id=?").get(copied.id))
        .toEqual({ count: 0 });
      expect((await getVocabulary(db, copied.id))?.examples).toEqual([]);
    } finally { sqlite.close(); }
  });

  it("finds a real sentence even after more than twenty old generated rows", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const insert = sqlite.prepare(`INSERT INTO example_sentence(id,vocabulary_id,chinese,pinyin,vietnamese,difficulty)
        VALUES(?,?,?,?,?,0)`);
      for (let index = 0; index < 25; index++) {
        insert.run(
          `old-generated-${index}`, "custom-1", `我正在学习“词${index}”这个词。`,
          "Wǒ zhèngzài xuéxí...", `Tôi đang học ý nghĩa của từ “từ ${index}”.`,
        );
      }
      expect((await getExampleSentences(db, "custom-1", 5)).map((item) => item.chinese)).toEqual(["您好！"]);
    } finally { sqlite.close(); }
  });
});
