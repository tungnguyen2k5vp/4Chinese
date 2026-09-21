import { describe, expect, it } from "vitest";

import { pairBilingualMeanings, primaryEnglishMeaning } from "./bilingual-meanings";

describe("pairBilingualMeanings", () => {
  it("keeps matching bilingual senses on the same row", () => {
    expect(pairBilingualMeanings(["học", "học tập"], ["to study", "to learn"])).toEqual([
      { vi: "học", en: "to study" },
      { vi: "học tập", en: "to learn" },
    ]);
  });

  it("groups synonyms when one source has a single corresponding sense", () => {
    expect(pairBilingualMeanings(["cảm ơn", "biết ơn"], ["to thank"])).toEqual([
      { vi: "cảm ơn; biết ơn", en: "to thank" },
    ]);
  });

  it("removes classifier metadata and exposes an explicit English fallback", () => {
    expect(pairBilingualMeanings(["quyển", "LT:本[ben3]"], ["classifier for books"])).toEqual([
      { vi: "quyển", en: "classifier for books" },
    ]);
    expect(primaryEnglishMeaning([])).toBe("Chưa có bản dịch tiếng Anh");
  });
});
