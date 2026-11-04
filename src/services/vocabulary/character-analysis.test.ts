import { describe, expect, it } from "vitest";

import { analyzeVocabulary, buildMnemonicNote } from "./character-analysis";

describe("character analysis", () => {
  it("decomposes common characters and creates a Vietnamese mnemonic", () => {
    const result = analyzeVocabulary({ simplified: "休", primaryMeaningVi: "nghỉ", radical: "亻" });

    expect(result[0]?.decomposition).toContain("亻");
    expect(result[0]?.decomposition).toContain("木");
    expect(result[0]?.mnemonic).toContain("nghỉ");
  });

  it("also returns a fallback for custom characters", () => {
    const result = analyzeVocabulary({ simplified: "龘", primaryMeaningVi: "từ tùy chỉnh", radical: null });

    expect(result).toHaveLength(1);
    expect(buildMnemonicNote(result)).toContain("龘");
  });

  it("uses reviewed decompositions and specific mnemonics for commonly confusing characters", () => {
    const result = analyzeVocabulary({ simplified: "\u8fd9\u6837", primaryMeaningVi: "lo\u1ea1i n\u00e0y", radical: null });

    expect(result[0]?.decomposition).toContain("\u8fb6");
    expect(result[0]?.decomposition).toContain("\u6587");
    expect(result[0]?.mnemonic).toContain("n\u01a1i n\u00e0y");
    expect(result[1]?.decomposition).toContain("\u6728");
    expect(result[1]?.decomposition).toContain("\u7f8a");
    expect(result[1]?.mnemonic).toContain("ki\u1ec3u");
  });
  it("does not confuse whole-word meanings, punctuation or first components with radicals", () => {
    const analyses = analyzeVocabulary({ simplified: "想拿，学ABC想", primaryMeaningVi: "nghĩa cả cụm", radical: "木" });
    expect(analyses.map(item => item.character)).toEqual(["想", "拿", "学"]);
    expect(analyses.map(item => item.radical)).toEqual(["心", "手", "子"]);
    expect(buildMnemonicNote(analyses)).not.toContain("nghĩa cả cụm");
    const unknown = analyzeVocabulary({ simplified: "龘休", primaryMeaningVi: "nghĩa cả từ", radical: "龙" });
    expect(unknown[0]?.radical).toBeNull();
    expect(unknown[0]?.decomposition).toBe("Chưa có phân rã đã kiểm tra");
  });
});
