import { describe, expect, it } from "vitest";

import { illustrationForVocabulary } from "@/services/media/illustration";

describe("illustrationForVocabulary", () => {
  it("uses the curated university image for 留学生", () => {
    const illustration = illustrationForVocabulary({
      simplified: "留学生",
      traditional: "留學生",
    });

    expect(illustration?.uri).toContain("1523050854058-8df90110c9f1");
    expect(illustration?.source).toContain("curated");
  });

  it("does not assign an unrelated image from a fuzzy meaning", () => {
    expect(
      illustrationForVocabulary({
        simplified: "努力",
        traditional: "努力",
      }),
    ).toBeNull();
  });
});
