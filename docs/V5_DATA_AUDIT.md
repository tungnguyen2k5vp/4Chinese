# V5 bundled content audit

Generated reproducibly from the current canonical bundled dictionary, legacy grammar/shared-sentence seeds and separate V5 draft/self-practice definitions. Not a device database or user content. This audit writes only its two owned documentation artifacts, never migrations, UI, SRS, IDs, translations or corpus data.

## Snapshot

App 0.1.33; schema 43; content manifest version 1. Raw JSON: 11828 words; canonical offline merge: 11877 words; grammar: 40 points; shared sentence seed: 47 sentences. Canonical SHA-256: `046657937e2ebdd15a301ad90f5751549b3de81fef83eb19654f923cd68f613e`. File hashes and detailed stable-ID review queues are in [V5_DATA_AUDIT.json](V5_DATA_AUDIT.json). Counts include starter corrections and supplemental surnames; they are not official HSK totals.

## Evidence and gaps

Licensed, reviewed reference usable: false. Official coverage: unknown. No level can be called Content Complete or Exam Ready using this audit. Sense comparison available: false; absent sense IDs are review gaps, not proven conflicts.

| HSK | Internal | Expected | Exact | Normalized | Missing | Extra | Level conflict | Sense conflict | Needs review (reference) | Internal review queue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 509 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 509 |
| 2 | 771 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 771 |
| 3 | 963 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 963 |
| 4 | 1014 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 1014 |
| 5 | 1461 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 1461 |
| 6 | 1242 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 1242 |
| 7-9 | 5917 | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 5917 |

Meaning review queue: 11734 words; pinyin flags: 499; contextual/observed traditional flags: 365. Words with zero seed-declared reviewed usable examples: 11763; zero independently evidenced reviewed examples: 11877. Grammar points needing review: 40.

## Official source discovery (checked 2026-10-01)

The [MOE announcement](https://en.moe.gov.cn/news/press_releases/202104/t20210428_528917.html) search extract identifies the 2021 proficiency standard and its July 1, 2021 effective date; direct retrieval hit a redirect loop. This is not verification of the current exam syllabus. The [CTI syllabus page](https://www.chinesetest.cn/syllabus) exposes an HSK3.0 syllabus link; this audit did not download, extract or scrape its lists, pin a PDF revision, or infer rollout dates. The [CTI rights notice](https://www.chinesetest.cn/legal-notice) describes copyright/reproduction restrictions; public access does not establish redistribution rights. Reference/version/license verification remains UNVERIFIED. Internal source strings naming HSK 3.0 are not alignment evidence.

## Reproduce and validate

```sh
npx --no-install tsx scripts/audit-v5-content.ts --write
npx --no-install tsx scripts/audit-v5-content.ts --check
npx --no-install vitest run src/services/hsk/v5-audit.test.ts src/services/hsk/alignment.test.ts
```

Default invocation prints a summary without writing. --write regenerates only docs/V5_DATA_AUDIT.md and docs/V5_DATA_AUDIT.json. Other agents' coverage/final-report documents are not written. --check compares both owned artifacts byte-for-byte and exits nonzero for stale reports. No timestamp, network, credentials or device is needed. SHA-256 fingerprints bind the current inventory, report logic, validators and content source files to the snapshot; regenerate after deliberate content changes and retain this checkpoint through version control/history before replacing it.

Optional: --reference <licensed-envelope.json>. Envelope: metadata {standardId, version, sourceUrl, effectiveDate, verificationStatus, reviewEvidence, licenseStatus, licenseEvidence}; vocabulary uses existing alignment entries {identifier, simplified, pinyinNumeric, level, sourceRef} with optional senseId; grammar is an optional array {identifier, level, pattern, sourceRef}. Both status fields and explicit evidence must pass before reference metrics are computed. The tool trusts supplied evidence assertions: a human must validate them; it never grants a license or academic approval. Test fixtures are not product references.

Pure functions are exported from src/services/hsk/v5-audit.ts. Stable word IDs and distinct readings are preserved. Required-level counts use the reference level; internal counts use internal levels. Sense conflict remains null without complete explicit sense IDs; mismatched tones yield lexical extra/missing rather than a fabricated sense verdict. Grammar coverage is pattern agreement, not independently reviewed learner content.

## Limits and follow-up

Prioritize HSK1 → HSK2 → HSK3 review queues. Obtain a legally usable, versioned, independently reviewed vocabulary/grammar reference; establish sense namespaces and sense-linked examples; review Vietnamese meaning/POS/context and lexical pronunciations; verify context-sensitive traditional forms manually. Seed REVIEWED is only a declaration, not independent review. Heuristics cannot prove naturalness, POS correctness, target-sense match, or level appropriateness. No AI output is promoted to VERIFIED. Installed upgrade databases may differ from these seeds; device QA/retention remain NOT TESTED (no connected device).

SDK prerequisite checked: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) and [Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/). No native APIs were added.

## Listening reuse and separate question definitions

| HSK | Reused legacy seed REVIEWED sentences | Legacy PENDING sentences | New standalone listening items | Native/licensed audio assets | Playable exam listening questions | Draft exam listening questions | Draft self-practice companion definitions | Independent listening review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 14 | 2 | 0 | 0 | 0 | 4 | 5 | 0 |
| 2 | 6 | 3 | 0 | 0 | 0 | 4 | 2 | 0 |
| 3 | 5 | 5 | 0 | 0 | 0 | 4 | 2 | 0 |
| 4 | 4 | 2 | 0 | 0 | 0 | 4 | 1 | 0 |
| 5 | 3 | 0 | 0 | 0 | 0 | 4 | 1 | 0 |
| 6 | 3 | 0 | 0 | 0 | 0 | 4 | 1 | 0 |
| 7-9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Legacy shared grammar sentence reuse, draft exam listening items and authored source-bound companion questions are different inventories. SYSTEM_TTS is not a native/licensed audio asset. Companion counts enumerate exact starter-source definitions while assuming a reviewed sentence only for lookup; they do not assert that source examples are independently reviewed or that matching sentences are installed/active. The audit never queries a device database. Draft exam items remain blocked from attempts; companion checks are explicitly disclosed unreviewed self-practice.

## Current V5 additions: keep drafts separate

| Inventory | Count | Reproducible source | Lifecycle / limits |
| --- | --- | --- | --- |
| grammarPendingPoints | 24 | src/data/grammar-v5-expansion.ts::grammarV5Expansion | AI_ASSISTED / PENDING; inactive editorial preview only |
| grammarPendingExampleSentences | 48 | grammarV5Expansion[].examples | PENDING, excluded from legacy reviewed coverage |
| advancedGrammarDraftPoints | 4 | src/data/grammar-v5-advanced-drafts.ts::advancedGrammarV5Drafts | AI_ASSISTED / DRAFT / UNVERIFIED; source-only review queue, not seeded or learner-visible |
| advancedGrammarDraftExamples | 8 | advancedGrammarV5Drafts[].examples | UNVERIFIED source-only examples, excluded from legacy reviewed coverage |
| lexicalDraftSenses | 35 | src/data/lexical-v5-drafts.ts::lexicalV5Drafts | AI_ASSISTED / DRAFT, not new vocabulary headwords |
| lexicalDraftCollocations | 71 | lexicalV5Drafts[].collocations | DRAFT definition placements, not published DB rows |
| lexicalPendingExampleSentences | 35 | lexicalV5Drafts[].example | One per sense; PENDING when staged, not reviewed |
| storyDrafts | 14 | src/data/stories-v5.ts::storiesV5Drafts | AI_ASSISTED / DRAFT; not seeded/published |
| storyDraftSentences | 69 | storiesV5Drafts[].sentences | DRAFT story lines, not shared sentence rows |
| storyDraftQuestions | 42 | storiesV5Drafts[].questions | DRAFT comprehension questions, not exam questions |
| roleplayScenes | 13 | src/services/speaking/roleplay-v5.ts::ROLEPLAY_SCENES | Original self-practice scripts; no independent review evidence |
| roleplayGoalExchanges | 42 | ROLEPLAY_SCENES[].goals | Each goal has learner + partner text; not user turns or exam items |
| originalPronunciationSelfPracticePairs | 10 | src/data/pronunciation-pairs.ts::pronunciationPairs | Original self-practice; no independent review or acoustic scoring; no official level mapping |
| existingPlayableReadingQuestions | 28 | src/services/exam/practice-bank.ts::originalPracticeBank | Legacy original practice, UNVERIFIED |
| examDraftCandidates | 84 | src/services/exam/draft-bank.ts::draftPracticeBank | ORIGINAL / AI_DRAFT / DRAFT; rejected from attempts |
| examDraftListeningTtsTranscripts | 24 | draftPracticeBank[].questions[].metadata.audio | Subset of exam candidates; SYSTEM_TTS, not recordings |
| listeningSelfPracticeCompanionDefinitions | 12 | src/db/listening-library.ts::getListeningComprehension (exact starter source matches) | AI_AUTHORED_SELF_PRACTICE / DRAFT; runtime matching sentence required |
| contextualDraftLessons | 6 | src/services/learning/v5-contextual-lessons.ts::v5ContextualLessons | AI_GENERATED / DRAFT / UNVERIFIED, not published |
| contextualDraftDialogueLines | 24 | v5ContextualLessons[].dialogue.lines | DRAFT SYSTEM_TTS text; not recorded audio |
| contextualDraftPracticeQuestions | 12 | v5ContextualLessons[].practice | DRAFT lesson questions, not exam-bank questions |

| Band | Grammar drafts | Grammar examples | Lexical senses (bound) | Collocations (bound) | Lexical examples (bound) | Story drafts | Story lines | Story questions | Roleplay scenes | Roleplay goals | Exam drafts | Exam TTS subset | Listening companion definitions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 4 | 8 | 16 | 33 | 16 | 2 | 9 | 6 | 1 | 3 | 14 | 4 | 5 |
| 2 | 4 | 8 | 9 | 18 | 9 | 2 | 10 | 6 | 6 | 21 | 14 | 4 | 2 |
| 3 | 4 | 8 | 7 | 14 | 7 | 2 | 10 | 6 | 5 | 15 | 14 | 4 | 2 |
| 4 | 4 | 8 | 1 | 2 | 1 | 2 | 10 | 6 | 1 | 3 | 14 | 4 | 1 |
| 5 | 4 | 8 | 0 | 0 | 0 | 2 | 10 | 6 | 0 | 0 | 14 | 4 | 1 |
| 6 | 4 | 8 | 1 | 2 | 1 | 2 | 10 | 6 | 0 | 0 | 14 | 4 | 1 |
| 7-9 | 4 | 8 | 0 | 0 | 0 | 2 | 10 | 6 | 0 | 0 | 0 | 0 | 0 |

These counts come from the shared exported buildV5ReadinessReport function in scripts/report-v5-readiness.ts, not hardcoded release totals. Structural validators run before enumeration. Detailed grammar IDs, lexical binding IDs, story subcounts, roleplay scene/goal counts, exam question IDs and companion source matches are in the JSON readinessReport.inventory.details. Inventory SHA-256: `8d1c300dde20926e64a68e1e024386bdcb4c39a2ce38f937d86d3842f3565d8f`.

Grammar's 24 pending points and 48 examples are excluded from legacy grammar/reviewed example coverage. The 35 lexical records are candidate senses for existing words, not added vocabulary entries; 71 collocations and 35 examples are draft placements. Bundled lexical matching reproduces spelling/reading/frequency/ID/limit rules without staging any rows. Unresolved lexical draft IDs: 1 (sense-v5-de-complement). Installed/custom/upgrade data can produce different staging results; runtime row counts remain unknown.

The 14 draft stories contain 69 authored lines and 42 comprehension questions, separate from the 18 legacy seeded stories. Story lines are not new shared sentence rows and story questions are not exam-bank items. The 13 roleplay scenes contain 42 scripted goal exchanges (84 learner/partner utterances), not recorded conversations or independently assessed exams. Exam candidates number 84; 24 SYSTEM_TTS transcripts are a subset of those candidates, not additional questions. Existing playable questions remain 28. 12 companion definitions are unreviewed self-practice, not verified listening evidence. 6 contextual draft lessons and their 24 dialogue lines/12 questions remain separate, unpublished lesson data.

Independent review of new draft content: 0; published new draft content: 0; verified full mocks: 0. No counts imply official alignment, level appropriateness, calibration, licensing, activation, Content Complete or Exam Ready. Inventory confidence is deterministic source enumeration; academic quality is UNVERIFIED and statistical inference is not applicable to counts. All levels remain not content-complete and not exam-ready.

Read-only readiness report: `npx --no-install tsx scripts/report-v5-readiness.ts`. Only the two V5_DATA_AUDIT artifacts are regenerated; final report, DOCX, version/build and other content documents are owned by integration. No phone installation or device QA is performed.
