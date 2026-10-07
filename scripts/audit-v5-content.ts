/** Generate a deterministic bundled-seed audit; never opens a device database. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getOfflineVocabulary } from "../src/db/database";
import { grammarSeed } from "../src/db/grammar";
import { DATABASE_VERSION } from "../src/db/schema";
import { CONTENT_VERSION } from "../src/services/content/content-version";
import {
  auditV5Content,
  type AuditExample,
  type AuditReference,
} from "../src/services/hsk/v5-audit";

import {
  buildV5ReadinessReport,
  V5_INVENTORY_SOURCE_FILES,
} from "./report-v5-readiness";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
if (
  args.some(
    (arg) =>
      !["--write", "--check", "--reference"].includes(arg) &&
      args[args.indexOf(arg) - 1] !== "--reference",
  )
)
  throw new Error(
    "Usage: audit-v5-content.ts [--write | --check] [--reference licensed-envelope.json]",
  );
if (args.includes("--write") && args.includes("--check"))
  throw new Error("Choose --write or --check, not both");
const referenceIndex = args.indexOf("--reference");
if (
  referenceIndex >= 0 &&
  (!args[referenceIndex + 1] || args[referenceIndex + 1]!.startsWith("--"))
)
  throw new Error("Missing --reference envelope path");
const referencePath =
  referenceIndex >= 0 ? resolve(root, args[referenceIndex + 1]!) : null;
const reference = referencePath
  ? (JSON.parse(readFileSync(referencePath, "utf8")) as AuditReference)
  : null;
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const packageInfo = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
) as { version: string };
const sourceFiles = [
  ...new Set([
    "src/data/hsk-vocabulary.json",
    "src/data/starter-vocabulary.ts",
    "src/data/supplemental-vocabulary.ts",
    "src/services/vocabulary/quality.ts",
    "src/db/database.ts",
    "src/db/grammar.ts",
    "src/data/grammar-hsk-advanced.ts",
    "src/data/vietnamese-contrasts.ts",
    "src/services/hsk/alignment.ts",
    "src/services/pinyin/pinyin.ts",
    "src/services/hsk/v5-audit.ts",
    "scripts/audit-v5-content.ts",
    "src/db/schema.ts",
    "src/services/content/content-version.ts",
    ...V5_INVENTORY_SOURCE_FILES,
  ]),
];
const fingerprints = sourceFiles.map((path) => ({
  path,
  sha256: hash(readFileSync(resolve(root, path))),
}));
const words = getOfflineVocabulary();
const readinessReport = buildV5ReadinessReport(words);
// Match seedGrammarContent exactly: first bundled row for a spelling gets a shared link.
const firstIdBySpelling = new Map<string, string>();
for (const word of words)
  if (!firstIdBySpelling.has(word.simplified))
    firstIdBySpelling.set(word.simplified, word.id);
const sharedExamples: AuditExample[] = grammarSeed.flatMap((point) =>
  point.examples.map((example, index) => ({
    id: `sentence-${point.id}-${index + 1}`,
    chinese: example.hanzi,
    pinyin: example.pinyin,
    vietnamese: example.vi,
    vocabularyIds: [
      ...new Set(
        example.words.flatMap((token) => {
          const id = firstIdBySpelling.get(token);
          return id ? [id] : [];
        }),
      ),
    ],
    reviewStatus: point.id.startsWith("vn-") ? "PENDING" : "REVIEWED",
    reviewEvidence:
      "src/db/grammar.ts::seedGrammarContent (seed declaration, not independent academic review)",
    sourceType: "CURATED",
  })),
);
const result = auditV5Content({
  words,
  grammar: grammarSeed,
  sharedExamples,
  reference,
});
const rawWords = JSON.parse(
  readFileSync(resolve(root, "src/data/hsk-vocabulary.json"), "utf8"),
) as typeof words;
const rawStats = {
  vocabulary: rawWords.length,
  byLevel: result.levels.map(({ level }) => ({
    level,
    internal: rawWords.filter((word) => String(word.hskBand) === level).length,
  })),
  declaredMachineTranslations: rawWords.filter(
    (word) => word.translationStatus === "machine",
  ).length,
  storedExamples: rawWords.reduce((sum, word) => sum + word.examples.length, 0),
};
const listeningReuse = result.levels.map(({ level }) => ({
  level,
  legacySeedDeclaredReviewedSentences: grammarSeed
    .filter((point) => point.hsk === level && !point.id.startsWith("vn-"))
    .reduce((sum, point) => sum + point.examples.length, 0),
  legacyPendingSentences: grammarSeed
    .filter((point) => point.hsk === level && point.id.startsWith("vn-"))
    .reduce((sum, point) => sum + point.examples.length, 0),
  newListeningItems: 0,
  nativeOrLicensedAudioAssets: 0,
  playableExamListeningQuestions: 0,
  draftExamListeningQuestions: readinessReport.levels.find(
    (item) => item.level === level,
  )!.draftListeningQuestions,
  selfPracticeCompanionDefinitions: readinessReport.levels.find(
    (item) => item.level === level,
  )!.listeningSelfPracticeCompanionDefinitions,
  independentlyReviewedListeningItems: 0,
  scope: "BUNDLED_REUSE_AND_SEPARATE_DRAFT_DEFINITIONS_NOT_DEVICE_QUERY",
}));
// These are source-discovery records, not imported lists or redistribution permission.
const sourceVerification = [
  {
    standardId: "GF0025-2021",
    sourceUrl:
      "https://en.moe.gov.cn/news/press_releases/202104/t20210428_528917.html",
    checkedOn: "2026-10-01",
    sourceStatus: "OFFICIAL_METADATA_DISCOVERED",
    effectiveDate: "2021-07-01",
    verificationStatus: "UNVERIFIED_REFERENCE",
    licenseStatus: "UNVERIFIED",
    evidence:
      "MOE announcement search extract confirms publication/effective date; direct fetch had a redirect loop. No list imported; does not identify current exam syllabus.",
  },
  {
    standardId: "HSK_EXAM_SYLLABUS_UNPINNED",
    sourceUrl: "https://www.chinesetest.cn/syllabus",
    checkedOn: "2026-10-01",
    sourceStatus: "OFFICIAL_PAGE_CHECKED",
    effectiveDate: null,
    verificationStatus: "UNVERIFIED_REFERENCE",
    licenseStatus: "UNVERIFIED",
    evidence:
      "CTI page links an HSK3.0 examination syllabus; linked PDF/version/word and grammar lists not fetched or scraped. Exam rollout is not inferred.",
  },
  {
    standardId: "CTI_RIGHTS_NOTICE",
    sourceUrl: "https://www.chinesetest.cn/legal-notice",
    checkedOn: "2026-10-01",
    sourceStatus: "OFFICIAL_PAGE_CHECKED",
    effectiveDate: null,
    verificationStatus: "RIGHTS_NOTICE_CHECKED_NOT_A_DATA_LICENSE",
    licenseStatus: "UNVERIFIED",
    evidence:
      "Notice describes copyright, attribution and reproduction restrictions, including linked third-party content. It does not establish app redistribution rights for a reference dataset.",
  },
];
const report = {
  ...result,
  snapshot: {
    appVersion: packageInfo.version,
    databaseVersion: DATABASE_VERSION,
    contentVersion: CONTENT_VERSION,
    canonicalSeedSha256: hash(JSON.stringify(words)),
    grammarSeedSha256: hash(JSON.stringify(grammarSeed)),
    referenceSha256: referencePath ? hash(readFileSync(referencePath)) : null,
    newContentInventorySha256: hash(JSON.stringify(readinessReport.inventory)),
    fingerprints,
    rawStats,
  },
  sourceVerification,
  listeningReuse,
  readinessReport,
};
const value = (input: number | null) =>
  input === null ? "unknown" : String(input);
const table = (headers: string[], rows: string[][]) =>
  [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
const sum = (select: (level: (typeof result.levels)[number]) => number) =>
  result.levels.reduce((total, level) => total + select(level), 0);
const commands =
  "```sh\nnpx --no-install tsx scripts/audit-v5-content.ts --write\nnpx --no-install tsx scripts/audit-v5-content.ts --check\nnpx --no-install vitest run src/services/hsk/v5-audit.test.ts src/services/hsk/alignment.test.ts\n```";
const hskTable = table(
  [
    "HSK",
    "Internal",
    "Expected",
    "Exact",
    "Normalized",
    "Missing",
    "Extra",
    "Level conflict",
    "Sense conflict",
    "Needs review (reference)",
    "Internal review queue",
  ],
  result.levels.map((level) => [
    level.level,
    ...[
      level.internal,
      level.officialExpected,
      level.exact,
      level.normalized,
      level.missing,
      level.extra,
      level.levelConflict,
      level.senseConflict,
      level.needsReview,
      level.internalNeedsReview,
    ].map(value),
  ]),
);
const exampleTable = table(
  [
    "HSK",
    "Words",
    "0 reviewed",
    "1",
    "2",
    "3+",
    "0 independent review",
    "Stored examples",
    "Shared links",
    "Generic flags",
  ],
  result.levels.map((level) => [
    level.level,
    ...[
      level.internal,
      level.examples.reviewedBuckets.zero,
      level.examples.reviewedBuckets.one,
      level.examples.reviewedBuckets.two,
      level.examples.reviewedBuckets.threePlus,
      level.examples.independentBuckets.zero,
      level.examples.stored,
      level.examples.linkedShared,
      level.examples.generic,
    ].map(String),
  ]),
);
const grammarTable = table(
  [
    "HSK",
    "Internal points",
    "Verified required",
    "Covered (lexical)",
    "Missing",
    "Needs review (internal)",
    "Independent review",
    "Point source refs",
  ],
  result.levels.map((level) => [
    level.level,
    ...[
      level.grammar.internal,
      level.grammar.verifiedRequired,
      level.grammar.covered,
      level.grammar.missing,
      level.grammar.needsReview,
      level.grammar.independentlyReviewed,
      level.grammar.withSourceReference,
    ].map(value),
  ]),
);
const meaningTable = table(
  [
    "HSK",
    "Words",
    "Suspect/review queue",
    "Declared verified",
    "Independent verification",
    "Pinyin flags",
    "Neutral entries",
    "ü notation",
    "Multiple readings",
    "Erhua",
    "Traditional flags",
  ],
  result.levels.map((level) => [
    level.level,
    ...[
      level.internal,
      level.meaning.suspect,
      level.meaning.declaredVerified,
      null,
      level.pinyin.flagged,
      level.pinyin.neutral,
      level.pinyin.umlaut,
      level.pinyin.multipleReadings,
      level.pinyin.erhua,
      level.traditionalNeedsReview,
    ].map(value),
  ]),
);
const reviewSamples = result.wordRows
  .filter(
    (word) =>
      Number(word.level) <= 3 &&
      (word.pinyin.reasons.length ||
        word.meaningReasons.some(
          (reason) => reason !== "TRANSLATION_NOT_DECLARED_VERIFIED",
        )),
  )
  .slice()
  .sort(
    (a, b) =>
      Number(a.level) - Number(b.level) ||
      (a.vocabularyId < b.vocabularyId ? -1 : 1),
  )
  .slice(0, 25);
const artifacts = new Map<string, string>([
  [
    "docs/V5_DATA_AUDIT.md",
    `# V5 bundled content audit\n\nGenerated reproducibly from the current canonical bundled dictionary, legacy grammar/shared-sentence seeds and separate V5 draft/self-practice definitions. Not a device database or user content. This audit writes only its two owned documentation artifacts, never migrations, UI, SRS, IDs, translations or corpus data.\n\n## Snapshot\n\nApp ${packageInfo.version}; schema ${DATABASE_VERSION}; content manifest version ${CONTENT_VERSION}. Raw JSON: ${rawStats.vocabulary} words; canonical offline merge: ${words.length} words; grammar: ${grammarSeed.length} points; shared sentence seed: ${sharedExamples.length} sentences. Canonical SHA-256: \`${report.snapshot.canonicalSeedSha256}\`. File hashes and detailed stable-ID review queues are in [V5_DATA_AUDIT.json](V5_DATA_AUDIT.json). Counts include starter corrections and supplemental surnames; they are not official HSK totals.\n\n## Evidence and gaps\n\nLicensed, reviewed reference usable: ${result.reference.usable}. Official coverage: ${value(result.reference.coveragePercent)}. No level can be called Content Complete or Exam Ready using this audit. Sense comparison available: ${result.reference.senseComparable}; absent sense IDs are review gaps, not proven conflicts.\n\n${hskTable}\n\nMeaning review queue: ${sum((level) => level.meaning.suspect)} words; pinyin flags: ${sum((level) => level.pinyin.flagged)}; contextual/observed traditional flags: ${sum((level) => level.traditionalNeedsReview)}. Words with zero seed-declared reviewed usable examples: ${sum((level) => level.examples.reviewedBuckets.zero)}; zero independently evidenced reviewed examples: ${sum((level) => level.examples.independentBuckets.zero)}. Grammar points needing review: ${sum((level) => level.grammar.needsReview)}.\n\n## Official source discovery (checked 2026-10-01)\n\nThe [MOE announcement](https://en.moe.gov.cn/news/press_releases/202104/t20210428_528917.html) search extract identifies the 2021 proficiency standard and its July 1, 2021 effective date; direct retrieval hit a redirect loop. This is not verification of the current exam syllabus. The [CTI syllabus page](https://www.chinesetest.cn/syllabus) exposes an HSK3.0 syllabus link; this audit did not download, extract or scrape its lists, pin a PDF revision, or infer rollout dates. The [CTI rights notice](https://www.chinesetest.cn/legal-notice) describes copyright/reproduction restrictions; public access does not establish redistribution rights. Reference/version/license verification remains UNVERIFIED. Internal source strings naming HSK 3.0 are not alignment evidence.\n\n## Reproduce and validate\n\n${commands}\n\nDefault invocation prints a summary without writing. --write regenerates only docs/V5_DATA_AUDIT.md and docs/V5_DATA_AUDIT.json. Other agents' coverage/final-report documents are not written. --check compares both owned artifacts byte-for-byte and exits nonzero for stale reports. No timestamp, network, credentials or device is needed. SHA-256 fingerprints bind the current inventory, report logic, validators and content source files to the snapshot; regenerate after deliberate content changes and retain this checkpoint through version control/history before replacing it.\n\nOptional: --reference <licensed-envelope.json>. Envelope: metadata {standardId, version, sourceUrl, effectiveDate, verificationStatus, reviewEvidence, licenseStatus, licenseEvidence}; vocabulary uses existing alignment entries {identifier, simplified, pinyinNumeric, level, sourceRef} with optional senseId; grammar is an optional array {identifier, level, pattern, sourceRef}. Both status fields and explicit evidence must pass before reference metrics are computed. The tool trusts supplied evidence assertions: a human must validate them; it never grants a license or academic approval. Test fixtures are not product references.\n\nPure functions are exported from src/services/hsk/v5-audit.ts. Stable word IDs and distinct readings are preserved. Required-level counts use the reference level; internal counts use internal levels. Sense conflict remains null without complete explicit sense IDs; mismatched tones yield lexical extra/missing rather than a fabricated sense verdict. Grammar coverage is pattern agreement, not independently reviewed learner content.\n\n## Limits and follow-up\n\nPrioritize HSK1 → HSK2 → HSK3 review queues. Obtain a legally usable, versioned, independently reviewed vocabulary/grammar reference; establish sense namespaces and sense-linked examples; review Vietnamese meaning/POS/context and lexical pronunciations; verify context-sensitive traditional forms manually. Seed REVIEWED is only a declaration, not independent review. Heuristics cannot prove naturalness, POS correctness, target-sense match, or level appropriateness. No AI output is promoted to VERIFIED. Installed upgrade databases may differ from these seeds; device QA/retention remain NOT TESTED (no connected device).\n\nSDK prerequisite checked: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) and [Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/). No native APIs were added.\n`,
  ],
  [
    "docs/HSK_COVERAGE_V5.md",
    `# HSK vocabulary coverage V5\n\nThis is internal inventory plus evidence-gated reference alignment, not official coverage. Reference usable: ${result.reference.usable}; overall coverage: ${value(result.reference.coveragePercent)}. Unknown is null in JSON, not zero.\n\n${hskTable}\n\nExact/normalized use the existing tone-sensitive alignment implementation. Level conflicts and duplicate lexical mappings do not earn coverage. Expected/missing/extra and reference needs-review remain unknown without a licensed reviewed version. Sense conflicts require explicit comparable sense IDs; differing readings/meaning strings are not proof of a conflict. Internal review queue includes missing sense metadata and is not a missing-vocabulary count. Traditional text is never auto-converted.\n\nRaw source JSON count: ${rawStats.vocabulary}; canonical offline count after existing corrections/starter/supplements: ${words.length}. Raw counts per level:\n\n${table(
      ["HSK", "Raw JSON entries"],
      rawStats.byLevel.map((level) => [level.level, String(level.internal)]),
    )}\n\nSee [V5_DATA_AUDIT.md](V5_DATA_AUDIT.md) for source/license checks and reproduction. Acquire a version-pinned, legally usable reference before making syllabus completeness claims.\n`,
  ],
  [
    "docs/VIETNAMESE_VOCAB_QUALITY.md",
    `# Vietnamese vocabulary quality V5\n\nVietnamese-first review queue, HSK1–3 first. No corpus edits. Declared verified is the existing translation flag, not independent evidence of naturalness, sense/POS correctness, licensing or academic approval. Independent verification is unknown, not inferred from absence of heuristic flags.\n\n${meaningTable}\n\nDetections: missing/duplicate glosses, unchanged English primary glosses, possible encoding damage, dictionary placeholders/reading notes, opaque POS codes, broad/long glosses and machine/missing translation status. Legitimate loanwords, surnames and short accent-free Vietnamese can trigger review; no flag proves a translation wrong. Naturalness, overly broad senses, wrong POS and missing context require bilingual human review. No AI output becomes VERIFIED.\n\nPinyin compares NFC tone marks against numeric 1–4 and neutral 0/5, accepts v/u:/ü aliases, apostrophes and spaced/joined marked forms, reports multiple readings and erhua. It never strips tones for agreement or overwrites readings. Syllabic nasal tones are flagged when the reused converter cannot safely compare them. Syntax/agreement is not lexical pronunciation verification. Traditional flags cover observed one-to-many forms and a conservative contextual-character watchlist, not an exhaustive conversion validator.\n\n## HSK1–3 sample queue (stable IDs; full queue in JSON)\n\n${table(
      ["HSK", "ID", "Word", "Reasons"],
      reviewSamples.map((word) => [
        word.level,
        word.vocabularyId,
        word.simplified,
        [...word.pinyin.reasons, ...word.meaningReasons].join(", "),
      ]),
    )}\n\nSee [V5_DATA_AUDIT.md](V5_DATA_AUDIT.md) for reproduction and evidence limits.\n`,
  ],
  [
    "docs/EXAMPLE_COVERAGE_V5.md",
    `# Example coverage V5\n\nCounts are word buckets, not total sentences. Reviewed means an explicit reviewed lifecycle plus source evidence, with malformed/generic/link-conflicting examples excluded. Vocabulary examples have no review lifecycle: do not infer it from translationStatus. Grammar shared-sentence seed declarations are reproduced exactly (non-vn points REVIEWED; vn contrasts PENDING), linking tokens to the first bundled vocabulary ID as existing seeding does. Shared token links do not prove target-sense usage. No SQLite database is opened.\n\n${exampleTable}\n\nIndependent review requires an explicit reviewer in addition to lifecycle/source evidence; none is inferred from curated provenance. AI-generated examples require reviewer evidence even when labelled VERIFIED/PUBLISHED. Identical IDs count at most once; dangling/wrong vocabulary links, incompatible explicit senses, missing fields, suspicious pinyin and metalinguistic templates are flagged. “Tôi đang học từ X” and “Đây là ví dụ của từ X” never earn reviewed coverage.\n\nRaw stored examples: ${rawStats.storedExamples}; canonical stored examples: ${sum((level) => level.examples.stored)}; shared sentence seed: ${sharedExamples.length}. Shared links may associate one sentence with multiple words. Runtime curated fallbacks are not added to reviewed counts or treated as stored seed examples. The 0/1/2/3+ buckets sum to each level’s internal vocabulary total.\n\nReview naturalness, target sense, translation and level appropriateness before publication; prioritize HSK1 → HSK2 → HSK3. See [V5_DATA_AUDIT.md](V5_DATA_AUDIT.md) for exact reproduction and [V5_DATA_AUDIT.json](V5_DATA_AUDIT.json) for stable-ID diagnostics.\n`,
  ],
  [
    "docs/GRAMMAR_COVERAGE_V5.md",
    `# Grammar coverage V5\n\nReuse existing grammarSeed (foundation + advanced + Vietnamese contrasts). Internal levels are curriculum labels, not verified required syllabus points. No licensed reviewed grammar reference has been inferred from counts or an official landing page.\n\n${grammarTable}\n\nCovered is reference-pattern agreement only; it does not certify the point or its examples. Missing/required/covered remain null unless a usable grammar reference is supplied. Needs review counts internal source/reviewer gaps, quiz validation, unresolved vocabulary tokens and dangling related/prerequisite IDs. Points without source refs or independent reviewer evidence remain pending; a shared example marked REVIEWED does not verify its parent point. HSK7–9 zero internal points is an observed gap, not proof that the official standard requires zero.\n\nDetailed point IDs, unlinked vocabulary tokens, dangling grammar IDs and comparison statuses are in [V5_DATA_AUDIT.json](V5_DATA_AUDIT.json). A missing token link may be a multiword phrase rather than missing vocabulary. Obtain licensed versioned grammar references, establish provenance and a review workflow, then expand HSK1–3 first. Do not fabricate an advanced required list.\n\nSee [V5_DATA_AUDIT.md](V5_DATA_AUDIT.md) for source discovery, contract and reproduction.\n`,
  ],
  ["docs/V5_DATA_AUDIT.json", `${JSON.stringify(report)}\n`],
]);
// Other coverage documents are integration-owned: never overwrite them in this scoped pass.
for (const path of artifacts.keys()) {
  if (path !== "docs/V5_DATA_AUDIT.md" && path !== "docs/V5_DATA_AUDIT.json")
    artifacts.delete(path);
}
artifacts.set(
  "docs/V5_DATA_AUDIT.md",
  artifacts.get("docs/V5_DATA_AUDIT.md")! +
    `\n## Listening reuse and separate question definitions\n\n${table(
      [
        "HSK",
        "Reused legacy seed REVIEWED sentences",
        "Legacy PENDING sentences",
        "New standalone listening items",
        "Native/licensed audio assets",
        "Playable exam listening questions",
        "Draft exam listening questions",
        "Draft self-practice companion definitions",
        "Independent listening review",
      ],
      listeningReuse.map((level) => [
        level.level,
        ...[
          level.legacySeedDeclaredReviewedSentences,
          level.legacyPendingSentences,
          level.newListeningItems,
          level.nativeOrLicensedAudioAssets,
          level.playableExamListeningQuestions,
          level.draftExamListeningQuestions,
          level.selfPracticeCompanionDefinitions,
          level.independentlyReviewedListeningItems,
        ].map(String),
      ]),
    )}\n\nLegacy shared grammar sentence reuse, draft exam listening items and authored source-bound companion questions are different inventories. SYSTEM_TTS is not a native/licensed audio asset. Companion counts enumerate exact starter-source definitions while assuming a reviewed sentence only for lookup; they do not assert that source examples are independently reviewed or that matching sentences are installed/active. The audit never queries a device database. Draft exam items remain blocked from attempts; companion checks are explicitly disclosed unreviewed self-practice.\n`,
);
const inventoryTable = table(
  ["Inventory", "Count", "Reproducible source", "Lifecycle / limits"],
  readinessReport.inventory.sourceRows.map((row) => [
    row.name,
    String(row.count),
    row.source,
    row.status,
  ]),
);
const draftLevelTable = table(
  [
    "Band",
    "Grammar drafts",
    "Grammar examples",
    "Lexical senses (bound)",
    "Collocations (bound)",
    "Lexical examples (bound)",
    "Story drafts",
    "Story lines",
    "Story questions",
    "Roleplay scenes",
    "Roleplay goals",
    "Exam drafts",
    "Exam TTS subset",
    "Listening companion definitions",
  ],
  readinessReport.levels.map((row) => [
    row.level,
    ...[
      row.grammarPendingDraftPoints,
      row.grammarPendingDraftSentences,
      row.lexicalDraftSensesWithBundledBinding,
      row.lexicalDraftCollocationsWithBundledBinding,
      row.lexicalPendingSentencesWithBundledBinding,
      row.storyDrafts,
      row.storyDraftSentences,
      row.storyDraftQuestions,
      row.roleplayScenes,
      row.roleplayGoalExchanges,
      row.draftBankQuestions,
      row.draftListeningQuestions,
      row.listeningSelfPracticeCompanionDefinitions,
    ].map(String),
  ]),
);
artifacts.set(
  "docs/V5_DATA_AUDIT.md",
  artifacts.get("docs/V5_DATA_AUDIT.md")! +
    `\n## Current V5 additions: keep drafts separate\n\n${inventoryTable}\n\n${draftLevelTable}\n\nThese counts come from the shared exported buildV5ReadinessReport function in scripts/report-v5-readiness.ts, not hardcoded release totals. Structural validators run before enumeration. Detailed grammar IDs, lexical binding IDs, story subcounts, roleplay scene/goal counts, exam question IDs and companion source matches are in the JSON readinessReport.inventory.details. Inventory SHA-256: \`${report.snapshot.newContentInventorySha256}\`.\n\nGrammar's ${readinessReport.inventory.totals.grammarPendingPoints} pending points and ${readinessReport.inventory.totals.grammarPendingExampleSentences} examples are excluded from legacy grammar/reviewed example coverage. The ${readinessReport.inventory.totals.lexicalDraftSenses} lexical records are candidate senses for existing words, not added vocabulary entries; ${readinessReport.inventory.totals.lexicalDraftCollocations} collocations and ${readinessReport.inventory.totals.lexicalPendingExampleSentences} examples are draft placements. Bundled lexical matching reproduces spelling/reading/frequency/ID/limit rules without staging any rows. Unresolved lexical draft IDs: ${readinessReport.inventory.details.unresolvedLexicalDraftIds.length} (${readinessReport.inventory.details.unresolvedLexicalDraftIds.join(", ") || "none"}). Installed/custom/upgrade data can produce different staging results; runtime row counts remain unknown.\n\nThe ${readinessReport.inventory.totals.storyDrafts} draft stories contain ${readinessReport.inventory.totals.storyDraftSentences} authored lines and ${readinessReport.inventory.totals.storyDraftQuestions} comprehension questions, separate from the ${readinessReport.levels.reduce((n, row) => n + row.stories, 0)} legacy seeded stories. Story lines are not new shared sentence rows and story questions are not exam-bank items. The ${readinessReport.inventory.totals.roleplayScenes} roleplay scenes contain ${readinessReport.inventory.totals.roleplayGoalExchanges} scripted goal exchanges (${readinessReport.inventory.details.roleplay.reduce((n, scene) => n + scene.scriptedUtterances, 0)} learner/partner utterances), not recorded conversations or independently assessed exams. Exam candidates number ${readinessReport.inventory.totals.examDraftCandidates}; ${readinessReport.inventory.totals.examDraftListeningTtsTranscripts} SYSTEM_TTS transcripts are a subset of those candidates, not additional questions. Existing playable questions remain ${readinessReport.inventory.totals.existingPlayableReadingQuestions}. ${readinessReport.inventory.totals.listeningSelfPracticeCompanionDefinitions} companion definitions are unreviewed self-practice, not verified listening evidence. ${readinessReport.inventory.totals.contextualDraftLessons} contextual draft lessons and their ${readinessReport.inventory.totals.contextualDraftDialogueLines} dialogue lines/${readinessReport.inventory.totals.contextualDraftPracticeQuestions} questions remain separate, unpublished lesson data.\n\nIndependent review of new draft content: ${readinessReport.inventory.independentlyReviewedNewDraftContent}; published new draft content: ${readinessReport.inventory.publishedNewDraftContent}; verified full mocks: ${readinessReport.inventory.verifiedFullMocks}. No counts imply official alignment, level appropriateness, calibration, licensing, activation, Content Complete or Exam Ready. Inventory confidence is deterministic source enumeration; academic quality is UNVERIFIED and statistical inference is not applicable to counts. All levels remain not content-complete and not exam-ready.\n\nRead-only readiness report: \`npx --no-install tsx scripts/report-v5-readiness.ts\`. Only the two V5_DATA_AUDIT artifacts are regenerated; final report, DOCX, version/build and other content documents are owned by integration. No phone installation or device QA is performed.\n`,
);
if (args.includes("--write")) {
  for (const [path, content] of artifacts)
    writeFileSync(resolve(root, path), content, "utf8");
} else if (args.includes("--check")) {
  const stale: string[] = [];
  for (const [path, content] of artifacts) {
    try {
      if (readFileSync(resolve(root, path), "utf8") !== content)
        stale.push(path);
    } catch {
      stale.push(path);
    }
  }
  if (stale.length) throw new Error(`STALE_V5_AUDIT:${stale.join(",")}`);
}
console.log(
  JSON.stringify(
    {
      mode: args.includes("--write")
        ? "generated"
        : args.includes("--check")
          ? "checked"
          : "read-only-summary",
      snapshot: {
        vocabulary: words.length,
        grammar: grammarSeed.length,
        rawVocabulary: rawStats.vocabulary,
        canonicalSeedSha256: report.snapshot.canonicalSeedSha256,
      },
      reference: result.reference,
      levels: result.levels,
      inventory: readinessReport.inventory.totals,
      inventorySha256: report.snapshot.newContentInventorySha256,
      artifacts: [...artifacts.keys()],
    },
    null,
    2,
  ),
);
