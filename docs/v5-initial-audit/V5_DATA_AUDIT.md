# V5 bundled content audit

Generated reproducibly before corpus edits. Scope: canonical bundled dictionary and grammar/shared-sentence seeds, not a device database or user content. No migration, UI, SRS, ID, translation, or corpus writes.

## Snapshot

App 0.1.25; schema 36; content manifest version 1. Raw JSON: 11330 words; canonical offline merge: 11379 words; grammar: 40 points; shared sentence seed: 47 sentences. Canonical SHA-256: `ee8c7048fb3564fd67183e7952e5c3c0243b8c96465d0709dbfdfde43d3789dc`. File hashes and detailed stable-ID review queues are in [V5_DATA_AUDIT.json](V5_DATA_AUDIT.json). Counts include starter corrections and supplemental surnames; they are not official HSK totals.

## Evidence and gaps

Licensed, reviewed reference usable: false. Official coverage: unknown. No level can be called Content Complete or Exam Ready using this audit. Sense comparison available: false; absent sense IDs are review gaps, not proven conflicts.

| HSK | Internal | Expected | Exact | Normalized | Missing | Extra | Level conflict | Sense conflict | Needs review (reference) | Internal review queue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 508 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 508 |
| 2 | 770 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 770 |
| 3 | 955 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 955 |
| 4 | 1006 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 1006 |
| 5 | 1078 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 1078 |
| 6 | 1154 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 1154 |
| 7-9 | 5908 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 5908 |

Meaning review queue: 11236 words; pinyin flags: 57; contextual/observed traditional flags: 309. Words with zero seed-declared reviewed usable examples: 11265; zero independently evidenced reviewed examples: 11379. Grammar points needing review: 40.

## Official source discovery (checked 2026-10-01)

The [MOE announcement](https://en.moe.gov.cn/news/press_releases/202104/t20210428_528917.html) search extract identifies the 2021 proficiency standard and its July 1, 2021 effective date; direct retrieval hit a redirect loop. This is not verification of the current exam syllabus. The [CTI syllabus page](https://www.chinesetest.cn/syllabus) exposes an HSK3.0 syllabus link; this audit did not download, extract or scrape its lists, pin a PDF revision, or infer rollout dates. The [CTI rights notice](https://www.chinesetest.cn/legal-notice) describes copyright/reproduction restrictions; public access does not establish redistribution rights. Reference/version/license verification remains UNVERIFIED. Internal source strings naming HSK 3.0 are not alignment evidence.

## Reproduce and validate

```sh
npx --no-install tsx scripts/audit-v5-content.ts --write
npx --no-install tsx scripts/audit-v5-content.ts --check
npx --no-install vitest run src/services/hsk/v5-audit.test.ts src/services/hsk/alignment.test.ts
```

Default invocation prints a summary without writing. --write regenerates only the six owned audit artifacts. --check compares all six byte-for-byte and exits nonzero for stale reports. No timestamp, network, credentials or device is needed. SHA-256 fingerprints bind the snapshot to its source; regenerate after deliberate content changes and retain this checkpoint through version control/history before replacing it.

Optional: --reference <licensed-envelope.json>. Envelope: metadata {standardId, version, sourceUrl, effectiveDate, verificationStatus, reviewEvidence, licenseStatus, licenseEvidence}; vocabulary uses existing alignment entries {identifier, simplified, pinyinNumeric, level, sourceRef} with optional senseId; grammar is an optional array {identifier, level, pattern, sourceRef}. Both status fields and explicit evidence must pass before reference metrics are computed. The tool trusts supplied evidence assertions: a human must validate them; it never grants a license or academic approval. Test fixtures are not product references.

Pure functions are exported from src/services/hsk/v5-audit.ts. Stable word IDs and distinct readings are preserved. Required-level counts use the reference level; internal counts use internal levels. Sense conflict remains null without complete explicit sense IDs; mismatched tones yield lexical extra/missing rather than a fabricated sense verdict. Grammar coverage is pattern agreement, not independently reviewed learner content.

## Limits and follow-up

Prioritize HSK1 → HSK2 → HSK3 review queues. Obtain a legally usable, versioned, independently reviewed vocabulary/grammar reference; establish sense namespaces and sense-linked examples; review Vietnamese meaning/POS/context and lexical pronunciations; verify context-sensitive traditional forms manually. Seed REVIEWED is only a declaration, not independent review. Heuristics cannot prove naturalness, POS correctness, target-sense match, or level appropriateness. No AI output is promoted to VERIFIED. Installed upgrade databases may differ from these seeds; device QA/retention remain NOT TESTED (no connected device).

SDK prerequisite checked: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) and [Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/). No native APIs were added.

## Listening reuse inventory

| HSK | Reused legacy seed REVIEWED sentences | Legacy PENDING sentences | New listening items | Native/licensed audio assets | Listening questions | Independent listening review |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 14 | 2 | 0 | 0 | 0 | 0 |
| 2 | 6 | 3 | 0 | 0 | 0 | 0 |
| 3 | 5 | 5 | 0 | 0 | 0 | 0 |
| 4 | 4 | 2 | 0 | 0 | 0 | 0 |
| 5 | 3 | 0 | 0 | 0 | 0 | 0 |
| 6 | 3 | 0 | 0 | 0 | 0 | 0 |
| 7-9 | 0 | 0 | 0 | 0 | 0 | 0 |

These are existing shared grammar sentence seeds reusable by the read-only listening library, not new listening content or academic review. No new recordings or listening questions were authored by this audit. System TTS is a playback fallback, not a native/licensed audio asset. Installed active/REVIEWED row counts can differ after upgrades; this audit does not query a device database or assert activation.
