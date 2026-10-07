import { describe, expect, it } from "vitest";

import {
  auditHskCoverage,
  assertRequiredHskEntriesPresent,
  assertNoDuplicateOfficialMapping,
  type OfficialVocabularyEntry,
} from "./alignment";

const words = [
  { id: "hello", simplified: "你好", pinyinNumeric: "ni3 hao3", hskBand: 1 },
] as const;
const reference: [OfficialVocabularyEntry] = [
  {
    identifier: "ref-hello",
    simplified: "你好",
    pinyinNumeric: "ni3 hao3",
    level: "1",
    sourceRef: "official-fixture-only",
  },
];
describe("versioned HSK alignment", () => {
  it("does not convert app word count to official coverage", () => {
    const report = auditHskCoverage(words, null);
    expect(report.coveragePercent).toBeNull();
    expect(report.missing).toBeNull();
    expect(() => assertRequiredHskEntriesPresent(report)).toThrow(
      "OFFICIAL_REFERENCE_NOT_IMPORTED",
    );
  });
  it("matches a word and reading exactly", () => {
    const report = auditHskCoverage(words, reference);
    expect(report.coveragePercent).toBe(100);
    expect(report.rows[0]?.status).toBe("EXACT");
    expect(() => assertRequiredHskEntriesPresent(report)).not.toThrow();
  });
  it("normalizes whitespace but never removes tones", () => {
    expect(
      auditHskCoverage(
        [{ ...words[0], pinyinNumeric: " ni3  hao3 " }],
        reference,
      ).rows[0]?.status,
    ).toBe("NORMALIZED_MATCH");
    expect(
      auditHskCoverage([{ ...words[0], pinyinNumeric: "ni2 hao3" }], reference)
        .missing,
    ).toBe(1);
  });
  it("reports conflicting level without awarding coverage", () => {
    const report = auditHskCoverage([{ ...words[0], hskBand: 2 }], reference);
    expect(report.conflicts).toBe(1);
    expect(report.coveragePercent).toBe(0);
    expect(() => assertRequiredHskEntriesPresent(report)).toThrow(
      "REQUIRED_HSK_ALIGNMENT_INCOMPLETE",
    );
  });
  it("does not double count duplicate lexical app rows", () => {
    const report = auditHskCoverage(
      [...words, { ...words[0], id: "duplicate" }],
      reference,
    );
    expect(report.matched).toBe(1);
    expect(report.conflicts).toBe(1);
  });
  it("rejects duplicate official identifiers and lexical mappings", () => {
    expect(() =>
      assertNoDuplicateOfficialMapping([...reference, reference[0]]),
    ).toThrow("DUPLICATE_OFFICIAL_MAPPING");
    expect(() =>
      assertNoDuplicateOfficialMapping([
        ...reference,
        { ...reference[0], identifier: "other" },
      ]),
    ).toThrow("DUPLICATE_OFFICIAL_MAPPING");
  });
  it("rejects empty references and duplicate app IDs", () => {
    expect(() => auditHskCoverage(words, [])).toThrow(
      "EMPTY_OFFICIAL_REFERENCE",
    );
    expect(() => auditHskCoverage([...words, words[0]], reference)).toThrow(
      "DUPLICATE_VOCABULARY_ID",
    );
  });
});
