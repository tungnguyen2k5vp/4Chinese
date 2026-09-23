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
});
