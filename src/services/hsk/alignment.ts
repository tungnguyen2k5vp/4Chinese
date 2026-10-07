/** Official coverage is unknown until a versioned reference has been imported. */
export type HskLevel = "1" | "2" | "3" | "4" | "5" | "6" | "7-9";
export type AlignmentStatus =
  | "EXACT"
  | "NORMALIZED_MATCH"
  | "EXTRA"
  | "MISSING_REFERENCE"
  | "LEVEL_CONFLICT"
  | "SENSE_CONFLICT"
  | "NEEDS_REVIEW";
export interface VocabularyCandidate {
  id: string;
  simplified: string;
  pinyinNumeric: string;
  hskBand: string | number;
}
export interface OfficialVocabularyEntry {
  identifier: string;
  simplified: string;
  pinyinNumeric: string;
  level: HskLevel;
  sourceRef: string;
}
export interface AlignmentRow {
  vocabularyId: string | null;
  officialIdentifier: string | null;
  level: string;
  status: AlignmentStatus;
  sourceRef: string | null;
}
const normalize = (value: string) =>
  value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
const key = (word: { simplified: string; pinyinNumeric: string }) =>
  `${normalize(word.simplified)}|${normalize(word.pinyinNumeric)}`;

export function assertNoDuplicateOfficialMapping(
  entries: readonly OfficialVocabularyEntry[],
): void {
  const identifiers = new Set<string>();
  const keys = new Set<string>();
  for (const entry of entries) {
    if (
      !entry.identifier.trim() ||
      !entry.sourceRef.trim() ||
      !entry.simplified.trim() ||
      !entry.pinyinNumeric.trim()
    )
      throw new Error("INVALID_OFFICIAL_REFERENCE");
    if (!["1", "2", "3", "4", "5", "6", "7-9"].includes(entry.level))
      throw new Error("INVALID_OFFICIAL_LEVEL");
    if (identifiers.has(entry.identifier) || keys.has(key(entry)))
      throw new Error(`DUPLICATE_OFFICIAL_MAPPING:${entry.identifier}`);
    identifiers.add(entry.identifier);
    keys.add(key(entry));
  }
}

export function auditHskCoverage(
  words: readonly VocabularyCandidate[],
  reference: readonly OfficialVocabularyEntry[] | null,
) {
  if (new Set(words.map((word) => word.id)).size !== words.length)
    throw new Error("DUPLICATE_VOCABULARY_ID");
  const rows: AlignmentRow[] = [];
  if (reference === null) {
    for (const word of words)
      rows.push({
        vocabularyId: word.id,
        officialIdentifier: null,
        level: String(word.hskBand),
        status: "MISSING_REFERENCE",
        sourceRef: null,
      });
    return {
      referenceAvailable: false,
      officialEntries: null,
      matched: null,
      missing: null,
      extra: null,
      conflicts: null,
      coveragePercent: null,
      rows,
    };
  }
  if (reference.length === 0) throw new Error("EMPTY_OFFICIAL_REFERENCE");
  assertNoDuplicateOfficialMapping(reference);
  const byKey = new Map(reference.map((entry) => [key(entry), entry]));
  const matchedIdentifiers = new Set<string>();
  let matched = 0;
  let extra = 0;
  let conflicts = 0;
  for (const word of words) {
    const entry = byKey.get(key(word));
    let status: AlignmentStatus = "EXTRA";
    if (entry) {
      if (matchedIdentifiers.has(entry.identifier)) status = "NEEDS_REVIEW";
      else if (String(word.hskBand) !== entry.level) status = "LEVEL_CONFLICT";
      else
        status =
          word.simplified === entry.simplified &&
          word.pinyinNumeric === entry.pinyinNumeric
            ? "EXACT"
            : "NORMALIZED_MATCH";
      matchedIdentifiers.add(entry.identifier);
      if (status === "EXACT" || status === "NORMALIZED_MATCH") matched++;
      else conflicts++;
    } else extra++;
    rows.push({
      vocabularyId: word.id,
      officialIdentifier: entry?.identifier ?? null,
      level: entry?.level ?? String(word.hskBand),
      status,
      sourceRef: entry?.sourceRef ?? null,
    });
  }
  let missing = 0;
  for (const entry of reference)
    if (!matchedIdentifiers.has(entry.identifier)) {
      missing++;
      rows.push({
        vocabularyId: null,
        officialIdentifier: entry.identifier,
        level: entry.level,
        status: "MISSING_REFERENCE",
        sourceRef: entry.sourceRef,
      });
    }
  return {
    referenceAvailable: true,
    officialEntries: reference.length,
    matched,
    missing,
    extra,
    conflicts,
    coveragePercent: (matched / reference.length) * 100,
    rows,
  };
}

export function assertRequiredHskEntriesPresent(
  report: ReturnType<typeof auditHskCoverage>,
): void {
  if (!report.referenceAvailable)
    throw new Error("OFFICIAL_REFERENCE_NOT_IMPORTED");
  if (report.missing !== 0 || report.conflicts !== 0)
    throw new Error("REQUIRED_HSK_ALIGNMENT_INCOMPLETE");
}
