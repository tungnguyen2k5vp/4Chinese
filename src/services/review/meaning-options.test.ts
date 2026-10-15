import { describe, expect, it } from "vitest";

import { buildReviewMeaningOptions, buildReviewPinyinOptions } from "@/services/review/meaning-options";

const target = { id: "word-a", primaryMeaningVi: "nhà ăn", hskBand: 1 } as const;

describe("four-choice Hanzi-to-meaning options", () => {
  it("stops at four when the session already supplies all three distractors", () => {
    const session = [target, ...["sách", "trường học", "bạn bè"].map((meaning, i) => ({ id: `session-${i}`, primaryMeaningVi: meaning, hskBand: 1 as const }))];
    const catalog = ["màu sắc", "hôm qua", "ngôi sao", "xin lỗi"].map((meaning, i) => ({ id: `catalog-${i}`, primaryMeaningVi: meaning, hskBand: 1 as const }));
    expect(buildReviewMeaningOptions(target, session, catalog)).toHaveLength(4);
  });
  it("always makes four distinct choices and includes the target meaning", () => {
    const choices = buildReviewMeaningOptions(
      target,
      [
        target,
        { id: "word-b", primaryMeaningVi: "  NHÀ   ĂN ", hskBand: 1 },
        { id: "word-c", primaryMeaningVi: "nhà", hskBand: 1 },
      ],
      [
        { id: "word-d", primaryMeaningVi: "dãy số", hskBand: 1 },
        { id: "word-e", primaryMeaningVi: "thức ăn", hskBand: 1 },
        { id: "word-f", primaryMeaningVi: "bệnh viện", hskBand: 2 },
      ],
    );

    expect(choices).toHaveLength(4);
    expect(new Set(choices.map(value => value.normalize("NFC").toLocaleLowerCase("vi"))).size).toBe(4);
    expect(choices).toContain("nhà ăn");
  });

  it("uses other HSK bands only when the same band has too few distinct meanings", () => {
    const choices = buildReviewMeaningOptions(
      target,
      [{ id: "word-b", primaryMeaningVi: "nhà ăn", hskBand: 1 }],
      [
        { id: "word-c", primaryMeaningVi: "màu xanh", hskBand: 2 },
        { id: "word-d", primaryMeaningVi: "hôm nay", hskBand: 3 },
        { id: "word-e", primaryMeaningVi: "bạn bè", hskBand: 4 },
      ],
    );

    expect(choices).toHaveLength(4);
    expect(choices).toContain("nhà ăn");
  });

  it("refuses to show an incomplete question instead of fabricating distractors", () => {
    expect(buildReviewMeaningOptions(target, [], [])).toEqual([]);
  });

  it("does not count duplicate meanings or duplicate session passes as extra choices", () => {
    const session = [target, target, ...["sách", "trường học", "bạn bè"].map((meaning,i)=>({id:`repeat-${i}`,primaryMeaningVi:meaning,hskBand:1 as const}))];
    expect(buildReviewMeaningOptions(target,[...session,...session,...session],session)).toHaveLength(4);
  });

  it("fills all four pinyin options for a one-word deck using the real catalog", () => {
    const target = {id:"color",pinyin:"yán sè",hskBand:1 as const};
    const catalog = ["shū", "xué xiào", "péng you", "zuó tiān"].map((pinyin,i)=>({id:`pinyin-${i}`,pinyin,hskBand:1 as const}));
    expect(buildReviewPinyinOptions(target,[target,target,target],catalog)).toHaveLength(4);
    expect(buildReviewPinyinOptions(target,[target],catalog)).toContain("yán sè");
    expect(buildReviewPinyinOptions(target,[...catalog,target],catalog)).toHaveLength(4);
  });
});
