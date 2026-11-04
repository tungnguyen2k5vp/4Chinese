import { describe, expect, it } from "vitest";

import { normalizeChainWord, pickDictionaryChainWord, validateWordChainGuess } from "./word-chain";

describe("English word chain rules", () => {
  it("normalizes casing and surrounding whitespace without changing spelling", () => {
    expect(normalizeChainWord("  Apple ")).toBe("apple");
  });

  it("accepts only a valid, new word beginning with the previous word's last letter", () => {
    expect(validateWordChainGuess("elephant", "apple", new Set(["apple"]), "easy")).toMatchObject({ valid: true, word: "elephant" });
    expect(validateWordChainGuess("tiger", "apple", new Set(), "easy")).toMatchObject({ valid: false, reason: "wrong-letter" });
  });

  it("rejects repeats, unsupported punctuation, and words under selected difficulty", () => {
    expect(validateWordChainGuess("apple", "grape", new Set(["apple"]), "easy")).toMatchObject({ valid: false, reason: "already-used" });
    expect(validateWordChainGuess("e-mail", "grape", new Set(), "easy")).toMatchObject({ valid: false, reason: "characters" });
    expect(validateWordChainGuess("emu", "grape", new Set(), "hard")).toMatchObject({ valid: true });
    expect(validateWordChainGuess("e", "grape", new Set(), "hard")).toMatchObject({ valid: false, reason: "too-short" });
  });

  it("asks the local dictionary query for words with a Vietnamese definition", async () => {
    let sql = "";
    const db = {
      getAllAsync: async (query: string) => {
        sql = query;
        return [{ word: "apple" }, { word: "apron" }];
      },
    } as never;
    expect(await pickDictionaryChainWord(db, "a", new Set(["apple"]), "easy")).toBe("apron");
    expect(sql).toContain("JOIN definitions d");
    expect(sql).toContain("d.definition_lang='vi'");
  });
});
