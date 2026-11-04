import { describe, expect, it } from "vitest";

import {
  buildEnglishBulkSavePlan,
  bulkPreviewIssues,
  type EnglishBulkPreview,
} from "./recognized-bulk";
import { SKYPEDIA_SOURCE, type SkypediaMeaning } from "./skypedia";

function candidate(id: string, pos: string, meaning: string): SkypediaMeaning {
  return {
    id,
    entryId: "en:sky:w:1",
    senseId: id,
    headword: "bank",
    meaning,
    shortMeaning: meaning,
    usageNote: "",
    pos,
    rawPos: pos,
    example: "",
    ipa: "",
    ipaRegion: "",
    pronunciations: [],
    source: SKYPEDIA_SOURCE,
    matchType: "EXACT_HEADWORD",
    rankingExplanation: "Khớp chính xác; chọn sense thủ công.",
    isInflectedForm: false,
    definitionEn: null,
    usageLabel: null,
  };
}

function row(overrides: Partial<EnglishBulkPreview> = {}): EnglishBulkPreview {
  const meanings = [
    candidate("bank-n", "danh từ", "ngân hàng"),
    candidate("bank-v", "động từ", "dự trữ"),
  ];
  return {
    line: 1,
    headword: "bank",
    meaning: "",
    issue: "",
    meanings,
    selected: null,
    excluded: false,
    ...overrides,
  };
}

describe("English bulk sense confirmation", () => {
  it("requires a person to choose among ambiguous senses rather than accepting source order", () => {
    expect(bulkPreviewIssues([row()]).get(1)).toContain("Cần chọn");
    expect(bulkPreviewIssues([row({ selected: candidate("bank-n", "danh từ", "ngân hàng"), meaning: "ngân hàng" })])).toEqual(new Map());
  });

  it("treats an edited user meaning as an explicit override and catches duplicate lines", () => {
    const edited = row({ meaning: "bờ sông", selected: null });
    expect(bulkPreviewIssues([edited])).toEqual(new Map());
    const duplicate = row({ line: 2, meaning: "bờ sông", selected: null });
    expect(bulkPreviewIssues([edited, duplicate]).get(2)).toContain("Trùng");
  });

  it("counts only saveable rows and keeps unresolved rows in the next plan", () => {
    const items = Array.from({ length: 100 }, (_, index) =>
      index < 91
        ? row({ line: index + 1, headword: `word-${index + 1}`, meaning: `nghĩa ${index + 1}`, meanings: [] })
        : row({ line: index + 1, headword: `word-${index + 1}` }),
    );
    items[99] = { ...items[99]!, excluded: true };

    const plan = buildEnglishBulkSavePlan(items);

    expect(plan.eligible).toHaveLength(91);
    expect(plan.remaining).toHaveLength(8);
    expect(plan.excludedCount).toBe(1);
    expect(plan.issues.size).toBe(8);
  });
});
