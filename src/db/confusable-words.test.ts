import { describe, expect, it } from "vitest";

import { exportLocalBackup, importLocalBackup } from "./backup-repository";
import {
  listConfusableStats,
  recordConfusableAnswer,
} from "./confusable-words";
import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { migrateDatabaseSchema } from "./migrations";

import {
  confusablePairs,
  validateConfusableAttempt,
} from "@/data/confusable-words";
import { parseLocalBackup } from "@/services/backup/format";

describe("contextual confusable practice", () => {
  it("contains structurally complete practice prompts and honest provenance for six legacy and nine V5 pairs", () => {
    expect(confusablePairs).toHaveLength(15);
    expect(new Set(confusablePairs.map((pair) => pair.id)).size).toBe(15);
    expect(confusablePairs.slice(0, 6).map((pair) => pair.id)).toEqual(["know", "opinion", "again", "just", "two", "or"]);
    expect(confusablePairs.slice(6).map((pair) => pair.id)).toEqual([
      "v5-bu-mei", "v5-zuo-gan", "v5-kan-jian", "v5-ting-tingjian", "v5-xiang-yao",
      "v5-bixu", "v5-yihou-houlai", "v5-yidian-youidian", "v5-shihe-heshi",
    ]);
    for (const pair of confusablePairs) {
      expect(pair.sourceType).toBe(pair.id.startsWith("v5-") ? "AI_ASSISTED" : "CURATED");
      expect(pair.reviewStatus).toBe("UNREVIEWED");
      expect(pair.contentVersion).toBe(1);
      expect(pair.words).toHaveLength(2);
      expect(new Set(pair.words.map((word) => word.hanzi)).size).toBe(2);
      for (const word of pair.words) {
        expect(word.hanzi).toMatch(/\p{Script=Han}/u);
        expect(word.pinyin).toMatch(/[a-zü]/iu);
        expect(word.meaning.trim()).not.toBe("");
        expect(word.usage.length).toBeGreaterThan(20);
      }
      if (pair.id.startsWith("v5-")) {
        expect(pair.reviewLabel).toBe("PENDING");
        expect(pair.provenance).toBe("4Chinese original V5 contrast practice · AI-assisted · pending independent review");
        expect(pair.writingPrompt).toContain("chưa kiểm duyệt độc lập");
        expect(pair.examples).toHaveLength(2);
      }
      expect(pair.questions).toHaveLength(2);
      expect(new Set(pair.questions.map((question) => question.id)).size).toBe(2);
      for (const question of pair.questions) {
        expect(pair.words.some((word) => word.hanzi === question.answer)).toBe(
          true,
        );
        expect(question.sentence.split("___")).toHaveLength(2);
        expect(question.explanation.length).toBeGreaterThan(30);
        expect(question.translation.trim()).not.toBe("");
      }
      pair.examples?.forEach((example, index) => {
        expect(example.hanzi).toBe(pair.questions[index]!.sentence.replace("___", pair.questions[index]!.answer));
        expect(example.vi).toBe(pair.questions[index]!.translation);
      });
    }
    expect(
      confusablePairs
        .find((pair) => pair.id === "opinion")!
        .questions.every((question) => question.answer === "觉得"),
    ).toBe(true);
  });
  it("keeps all 18 added question IDs/answers stable and supplies disambiguating contexts", () => {
    expect(confusablePairs.slice(6).flatMap((pair) => pair.questions.map((q) => `${pair.id}/${q.id}=${q.answer}`))).toEqual([
      "v5-bu-mei/possession=没", "v5-bu-mei/intention=不", "v5-zuo-gan/homework=做", "v5-zuo-gan/capable=干",
      "v5-kan-jian/reading=看", "v5-kan-jian/farewell=见", "v5-ting-tingjian/imperative=听", "v5-ting-tingjian/failed-result=听见",
      "v5-xiang-yao/miss=想", "v5-xiang-yao/order=要", "v5-bixu/obligation=必须", "v5-bixu/essential=必需",
      "v5-yihou-houlai/anchor=以后", "v5-yihou-houlai/narrative=后来", "v5-yidian-youidian/adjust=一点儿",
      "v5-yidian-youidian/complaint=有点儿", "v5-shihe-heshi/object=适合", "v5-shihe-heshi/attributive=合适",
    ]);
    const question = (pairId: string, questionId: string) => confusablePairs.find((pair) => pair.id === pairId)!.questions.find((q) => q.id === questionId)!;
    expect(question("v5-bu-mei", "intention").sentence).toContain("明天");
    expect(question("v5-zuo-gan", "capable").sentence).toContain("精明能___");
    expect(question("v5-ting-tingjian", "failed-result").sentence).toContain("认真听了");
    expect(question("v5-yihou-houlai", "narrative").sentence).toContain("居上");
    expect(question("v5-shihe-heshi", "attributive").sentence).toContain("请用形容词");
    expect(question("v5-shihe-heshi", "attributive").explanation).toContain("không khẳng định");
  });
  it("records retries once, rolls back conflicting/invalid answers and leaves old SRS untouched", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      // Use a real fixture word to verify the mistake link, without changing its ID.
      sqlite
        .prepare("UPDATE vocabulary SET simplified=? WHERE id=?")
        .run("知道", "hsk-1-ni");
      const before = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .all();
      const input = {
        id: "conf-test",
        pairId: "know",
        questionId: "address",
        selectedWord: "认识",
        assisted: false,
      };
      expect(await recordConfusableAnswer(db, input)).toBe(false);
      expect(await recordConfusableAnswer(db, input)).toBe(false);
      expect(await listConfusableStats(db)).toEqual([
        { pair_id: "know", attempts: 1, correct: 0 },
      ]);
      await expect(
        recordConfusableAnswer(db, { ...input, selectedWord: "知道" }),
      ).rejects.toThrow("CONFUSABLE_ATTEMPT_CONFLICT");
      await expect(
        recordConfusableAnswer(db, { ...input, id: "bad", selectedWord: "是" }),
      ).rejects.toThrow("INVALID_CONFUSABLE_ATTEMPT");
      expect(
        sqlite.prepare("SELECT * FROM user_vocabulary_progress").all(),
      ).toEqual(before);
      expect(
        sqlite.prepare("SELECT COUNT(*) count FROM review_log").get(),
      ).toEqual({ count: 1 });
      expect(
        sqlite
          .prepare(
            "SELECT wrong_count FROM mistake_records WHERE exercise_type=?",
          )
          .get("confusable_know"),
      ).toEqual({ wrong_count: 1 });
    } finally {
      sqlite.close();
    }
  });
  it("backs up attempts, preserves them for old backups and rejects corrupted restores before mutation", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await recordConfusableAnswer(db, {
        id: "conf-backup",
        pairId: "again",
        questionId: "repeat",
        selectedWord: "再",
        assisted: true,
      });
      const backup = await exportLocalBackup(db, "test");
      expect(backup.data.confusableAttempts).toHaveLength(1);
      await importLocalBackup(db, parseLocalBackup(JSON.stringify(backup)));
      delete backup.data.confusableAttempts;
      await importLocalBackup(db, parseLocalBackup(JSON.stringify(backup)));
      expect((await listConfusableStats(db))[0]!.attempts).toBe(1);
      const corrupt = await exportLocalBackup(db, "test");
      corrupt.data.confusableAttempts![0]!.correct = 0;
      expect(() => parseLocalBackup(JSON.stringify(corrupt))).toThrow();
      await expect(importLocalBackup(db, corrupt)).rejects.toThrow(
        "INVALID_CONFUSABLE_ATTEMPT",
      );
      expect((await listConfusableStats(db))[0]!.correct).toBe(1);
    } finally {
      sqlite.close();
    }
  });
  it("does not resolve a tracked mistake from hinted successes", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite
        .prepare("UPDATE vocabulary SET simplified=? WHERE id=?")
        .run("知道", "hsk-1-ni");
      const input = { pairId: "know", questionId: "address", assisted: false };
      await recordConfusableAnswer(db, {
        ...input,
        id: "wrong-hint",
        selectedWord: "认识",
      });
      for (let i = 0; i < 3; i++)
        await recordConfusableAnswer(db, {
          ...input,
          id: `hint-${i}`,
          selectedWord: "知道",
          assisted: true,
        });
      expect(
        sqlite
          .prepare(
            "SELECT resolved,correct_streak FROM mistake_records WHERE exercise_type=?",
          )
          .get("confusable_know"),
      ).toEqual({ resolved: 0, correct_streak: 0 });
      for (let i = 0; i < 3; i++)
        await recordConfusableAnswer(db, {
          ...input,
          id: `independent-${i}`,
          selectedWord: "知道",
        });
      expect(
        sqlite
          .prepare(
            "SELECT resolved,correct_streak FROM mistake_records WHERE exercise_type=?",
          )
          .get("confusable_know"),
      ).toEqual({ resolved: 1, correct_streak: 3 });
    } finally {
      sqlite.close();
    }
  });
  it("does not accept invalid timestamps, unknown content versions or false score evidence", () => {
    const row = {
      id: "conf-validator",
      pair_id: "or",
      question_id: "drink",
      content_version: 1,
      selected_word: "还是",
      correct: 1,
      assisted: 0,
      created_at: "2026-10-01T08:00:00Z",
    };
    expect(() => validateConfusableAttempt(row)).not.toThrow();
    for (const changes of [
      { content_version: 2 },
      { correct: 0 },
      { assisted: "0" },
      { created_at: "bad" },
      { pair_id: "missing" },
    ]) {
      expect(() => validateConfusableAttempt({ ...row, ...changes })).toThrow(
        "INVALID_CONFUSABLE_ATTEMPT",
      );
    }
  });
});
