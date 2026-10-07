import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  auditHskCoverage,
  type OfficialVocabularyEntry,
  type VocabularyCandidate,
} from "../src/services/hsk/alignment";

const words = JSON.parse(
  readFileSync(resolve("src/data/hsk-vocabulary.json"), "utf8"),
) as VocabularyCandidate[];
const referencePath = process.argv[2];
const reference = referencePath
  ? (JSON.parse(
      readFileSync(resolve(referencePath), "utf8"),
    ) as OfficialVocabularyEntry[])
  : null;
const audit = auditHskCoverage(words, reference);
const levels = ["1", "2", "3", "4", "5", "6", "7-9"].map((level) => ({
  level,
  appEntries: words.filter((word) => String(word.hskBand) === level).length,
  officialEntries: reference
    ? reference.filter((entry) => entry.level === level).length
    : null,
  exact: audit.rows.filter(
    (row) => row.level === level && row.status === "EXACT",
  ).length,
  normalized: audit.rows.filter(
    (row) => row.level === level && row.status === "NORMALIZED_MATCH",
  ).length,
  missing: reference
    ? audit.rows.filter(
        (row) => row.level === level && row.vocabularyId === null,
      ).length
    : null,
  extra: reference
    ? audit.rows.filter((row) => row.level === level && row.status === "EXTRA")
        .length
    : null,
  conflicts: reference
    ? audit.rows.filter(
        (row) =>
          row.level === level &&
          ["LEVEL_CONFLICT", "NEEDS_REVIEW"].includes(row.status),
      ).length
    : null,
}));
writeFileSync(
  resolve("docs/HSK_DATA_AUDIT.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      referencePath: referencePath ?? null,
      appEntries: words.length,
      ...audit,
      levels,
    },
    null,
    2,
  ),
  "utf8",
);
console.log(
  JSON.stringify(
    {
      appEntries: words.length,
      referenceAvailable: audit.referenceAvailable,
      coveragePercent: audit.coveragePercent,
      levels,
    },
    null,
    2,
  ),
);
