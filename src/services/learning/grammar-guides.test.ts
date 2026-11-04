import { describe, expect, it } from "vitest";

import { grammarGuides, normalizeGrammarSearch } from "./grammar-guides";

import { grammarSeed } from "@/db/grammar";

describe("original grammar teaching notes", () => {
  it("links only to available structures and gives complete, distinct speaking variants", () => {
    const ids = new Set(grammarSeed.map(point => point.id));
    for (const [id, guide] of Object.entries(grammarGuides)) {
      expect(ids.has(id), id).toBe(true);
      expect(guide.use.length).toBeGreaterThan(0);
      expect(guide.tip.length).toBeGreaterThan(0);
      if (!guide.forms) continue;
      expect(new Set(guide.forms.map(form => form.label)).size).toBe(guide.forms.length);
      for (const form of guide.forms) {
        expect(form.pattern && form.hanzi && form.pinyin && form.vi, id).toBeTruthy();
      }
    }
    expect(grammarGuides['gram-bi']?.forms?.map(form => form.hanzi)).toEqual(['他比我高。', '我没有他高。', '他不比我高。']);
  });
  it("finds Vietnamese use cases without accents and keeps Hanzi searchable", () => {
    expect(normalizeGrammarSearch('Địa ĐIỂM 在')).toBe('dia diem 在');
    expect(normalizeGrammarSearch(grammarGuides['gram-guo']!.use)).toContain('trai nghiem');
  });
});
