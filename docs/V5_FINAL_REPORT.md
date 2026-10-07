# 4Chinese V5 — implementation report

> Latest follow-up (2026-10-02): app 0.1.29 / code31 / schema39. [V5_UPDATE_SUMMARY.md](V5_UPDATE_SUMMARY.md) contains current counts, 819 passing tests, 20 browser QA cases and the build-only APK. Keyboard tracking, conservative EPUB import, opt-in 7/30-day recording retention, strict lexical reading matching, safe stroke fallback and source-only advanced grammar drafts are implemented. The baseline ledger below records the earlier 0.1.26 iteration and is historical where it differs. The new APK has NOT been installed; the whole V5 specification is NOT yet academically complete or exam-ready.

Audit date: 2026-10-01. Built from the **existing dirty V4 worktree**, without rewriting the application, replacing SRS, resetting data or implementing Full Cloud Sync.

**Status: PARTIAL V5 implementation / internal test candidate. Not all requested work is finished.** App 0.1.26, Android versionCode 28, schema 37. Four coordinated subagents delivered separate content/curriculum, exam/written practice, Reader/roleplay and speaking-history work; the main agent integrated migrations, personal contexts, listening, release gates, backup compatibility and joint verification. Mobile offline-data, testing, audio, performance and release skills informed bounded queries, additive migrations and the separation between build evidence and device evidence.

## Implementation ledger

| Workstream | Delivered in this iteration | Status / not yet delivered |
| --- | --- | --- |
| Baseline and HSK audit | Reproducible inventory, initial gap snapshot, source/license/reference flags, fail-closed release gates | Audit complete; official alignment and academic correction NOT verified |
| Content model/review | Additive sense/example/collocation schema; evidence-based sequential review workflow | Foundation only; no bulk sense/collocation population or independent human review |
| Contextual curriculum | 6 original draft lessons, 10 target words each, 7–10 min, references/prerequisites/dialogues/activities validated | 0 published; learner path not replaced with unreviewed lessons |
| Question/exam framework | 5/10/15-minute variants, section timing, optional no-back, persisted high-water/resume, result type breakdown, strict validation | 28 legacy playable questions preserved; 18 new drafts excluded; full mocks pending |
| Writing/translation | 21 writing + 21 translation prompts, immutable timed drafts and snapshot titles | Self-practice, CURATED_UNREVIEWED; not an official writing mark |
| Speaking | 21 prompts; bounded metadata-only history; completion/replay evidence; explicit history deletion | Native recording/device verification pending; no pronunciation grade or retained audio library |
| Listening | New level-filtered library, inline player, rates, stop on leave/background, explicit transcript reveal and no-voice fallback | Reuses 35 legacy REVIEWED sentences through system TTS; no native/licensed recording or comprehension bank |
| Reader | 100k TXT import, bounded 2k chunks and token pages, durable chunk/character resume | TXT/manual/OCR core; EPUB/PDF/URL unsupported |
| Personal context memory | Local sentence/origin capture, deck-copy mapping, detail display, cloze review hint, delete, backup | Implemented local flow; no automatic sync/AI upload |
| Error Intelligence | Explicit-skill recurring-error grouping and concrete offline guidance | Partial: not a comprehensive tone/semantic confusion or remedial curriculum engine |
| AI roleplay V2 | Offline-first scenarios/goals, opt-in minimized AI text/history, transcript review, cancel/timeouts/session caps | Consent/offline tests passed; authenticated Gemini E2E NOT RUN |
| QA/release | 631 tests, exports, 9 browser journeys, additive/backup fixtures, internal APK build | Physical device, actual upgrade, native accessibility/performance pending |

## Required 26 answers

### 1. Current vocabulary count

**11,379 canonical bundled entries** after existing starter/normalization logic; raw source JSON has 11,330 records. Counts below are internal assigned bands, not proof of the official syllabus. Existing IDs/content fingerprint retained; no V5 vocabulary expansion or wholesale correction was claimed.

| Internal band | Vocabulary | Grammar points | Listening sentences* | Stories | Playable reading/context questions | New draft questions | Writing | Translation | Speaking | New draft lessons |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 508 | 10 | 14 | 6 | 4 | 6 | 3 | 3 | 3 | 2 |
| 2 | 770 | 8 | 6 | 6 | 4 | 6 | 3 | 3 | 3 | 2 |
| 3 | 955 | 10 | 5 | 6 | 4 | 6 | 3 | 3 | 3 | 2 |
| 4 | 1,006 | 6 | 4 | 0 | 4 | 0 | 3 | 3 | 3 | 0 |
| 5 | 1,078 | 3 | 3 | 0 | 4 | 0 | 3 | 3 | 3 | 0 |
| 6 | 1,154 | 3 | 3 | 0 | 4 | 0 | 3 | 3 | 3 | 0 |
| 7–9 | 5,908 | 0 | 0 | 0 | 4 | 0 | 3 | 3 | 3 | 0 |
| Total | **11,379** | **40** | **35** | **18** | **28** | **18** | **21** | **21** | **21** | **6** |

*Listening reuses legacy REVIEWED shared sentences. That label is not independently evidenced academic review; audio is system TTS, not native or official exam audio. Reproduce developer inventory with `npm run data:report:v5` and the listening repository filter. These are bundled content counts, not counts from a user's device database.

### 2. Official/reference alignment

**UNVERIFIED.** Reference/source discovery and infrastructure exist, but no licensed, versioned, reviewed reference is usable for an official crosswalk. Internal HSK tags must not be promoted by count. See [HSK_COVERAGE_V5](HSK_COVERAGE_V5.md).

### 3–6. Missing vocabulary, extra vocabulary, level conflicts and sense conflicts

All four are **UNKNOWN / null**, not zero. They require a usable reference and reviewed sense-level crosswalk. Structural validators and heuristic flags do not establish alignment. No fabricated official missing/extra list was generated.

### 7. Vietnamese meaning quality

**Incomplete.** 11,236 entries are queued by audit heuristics for review; 57 pinyin flags and 309 traditional-form flags need investigation, not automatic acceptance as errors. Sense schema and review workflow are foundations, not a fix for all ambiguous words. No corpus-wide human-reviewed correction was completed. See [VIETNAMESE_VOCAB_QUALITY](VIETNAMESE_VOCAB_QUALITY.md).

### 8. Example coverage

11,265 entries lack usable examples under the seed-declared review audit. Independently evidenced reviewed example coverage is **0** across the canonical corpus. This does not mean the app has no example text; it means existing text/review labels are insufficient evidence. The six contextual drafts do not count as published/reviewed word-example coverage. See [EXAMPLE_COVERAGE_V5](EXAMPLE_COVERAGE_V5.md).

### 9. Grammar coverage per level

40 existing points: **10 / 8 / 10 / 6 / 3 / 3 / 0** for bands 1/2/3/4/5/6/7–9. Independently evidenced review: **0**. No new complete grammar syllabus was added; advanced coverage remains thin. See [GRAMMAR_COVERAGE_V5](GRAMMAR_COVERAGE_V5.md).

### 10. Listening content per level

35 selectable sentence items: **14 / 6 / 5 / 4 / 3 / 3 / 0**. Twelve PENDING items are excluded. Native/licensed listening recordings: **0**; library comprehension questions: **0**. Offline TTS availability depends on an installed Mandarin voice. See [LISTENING_LIBRARY](LISTENING_LIBRARY.md).

### 11. Stories per level

Existing 18 stories: **6 / 6 / 6 / 0 / 0 / 0 / 0**. No new published stories in V5; independent academic review is not established.

### 12. Question count by skill/level

28 existing playable reading/context MCQs, **4 per band**. Each band's lightweight filters divide 2 reading and 2 language-in-context items; duration/filter variants do not create additional unique questions. Eighteen new drafts at bands 1–3: **2 vocabulary + 2 grammar cloze + 2 reading per band**, not playable. Exam-bank listening/writing/speaking/translation questions: **0**; separate self-practice prompt counts are reported below. See [QUESTION_BANK_V5](QUESTION_BANK_V5.md).

### 13. Mock profile status

Seven legacy original practice profiles retained; all unofficial/unverified. **0 verified full mock profiles**, no licensed exam audio, no official score conversion. No full-mock or Exam Ready claim. Optional no-back and section timing are implemented mechanics, not verified examination specifications.

### 14–16. Writing, translation and speaking prompts

**21 writing + 21 translation + 21 speaking**, three each per internal band. Original 14 written and seven speaking prompt IDs/content retained. Additions are original AI-assisted **CURATED_UNREVIEWED** self-practice, not reviewed official questions. Timed written variants and metadata-only speaking history preserve immutable snapshots. Recording is session-only; replay/self-check does not measure pronunciation or confer a language score. See [WRITING_V5](WRITING_V5.md) and [SPEAKING_V5](SPEAKING_V5.md).

### 17. Reader formats

Manual text and **TXT up to 100,000 characters**, UTF-8/UTF-16 BOM, with bounded lazy chunks, cancel/limit checks and durable semantic resume. Existing OCR path retained but not hardware-tested here. **EPUB/PDF/URL imports unsupported**, explicitly disclosed rather than simulated. See [READER_V5](READER_V5.md).

### 18. Personal contextual flashcards

Local UPSERT stores sentence and origin for Reader/Story/OCR/Lesson, associates saved originals and deck copies, shows context on word details and masks every target occurrence before review hints, including simple/traditional forms. Hint use counts as a hint rather than an unassisted pass. Explicit delete and backup compatibility implemented. This is integrated context support in existing word/SRS flow, not a new separate context-only deck engine. No automatic AI upload or sync. See [CONTEXTUAL_MEMORY](CONTEXTUAL_MEMORY.md).

### 19. Error Intelligence

Implemented recurring groups from persisted explicit skill/error evidence, bounded previews and specific offline guidance; resolved/invalid/duplicate records excluded. Empty/loading/failure distinguished. **Partial:** no inferred tone/semantic diagnosis, full confusion-pair analysis or new comprehensive micro-lesson bank. See [ERROR_INTELLIGENCE](ERROR_INTELLIGENCE.md).

### 20. Gemini E2E

**NOT RUN against authenticated live Gemini.** Unit tests and browser checks cover offline isolation, grant/revoke consent and request contracts. Operator probe prepared; executed without `--run` returns NOT_RUN. No available short-lived app QA token; no account created, no secret logged, no backend deployment or provider request made. Session caps are not persistent daily quotas. See [GEMINI_E2E_V5](GEMINI_E2E_V5.md) and [AI_ROLEPLAY_V5](AI_ROLEPLAY_V5.md).

### 21. Android device QA

**Basic update and launch PASS; feature QA remains incomplete.** A Realme RMX3085 connected over USB. `adb install -r` upgraded installed 0.1.25/code27 to 0.1.26/code28; Android accepted the signing identity. MainActivity is resumed and the app process is alive. A bounded app-log scan found no startup fatal, JS, SQLite-table or migration error signatures. Microphone, Mandarin STT/TTS, notifications, OCR, handwriting, lifecycle and in-app navigation beyond launch are NOT TESTED.

### 22. Upgrade data retention

Automated additive schema/old-backup/new-backup fixtures passed. The in-place device update retained the existing app sandbox/UID and did not uninstall or clear data; the app subsequently launched. Since this release app is not debuggable, individual SRS/deck/note/history counts could not be queried before and after. **Record-level learner progress verification is PARTIAL**, not a direct count comparison. See [V5_DEVICE_QA](V5_DEVICE_QA.md).

### 23. Accessibility

**Partial.** Explicit action labels/48px controls and reduced-motion lifecycle respected by new flows; isolated browser smoke tested 360px dark/reduced-motion listening with no horizontal overflow. Screenshot visually inspected. TalkBack/VoiceOver, Android fonts 130/160/200%, native keyboard/focus and permission dialogs remain NOT TESTED. Browser media emulation is not a hardware accessibility certification.

### 24. APK size

Final APK: **214,451,512 bytes (~204.52 MiB)**, +169,072 bytes (~0.08%) over baseline. Gradle assembly PASS (2m1s); package/version verified with `aapt`; `apksigner verify` PASS with an internal Android Debug certificate. SHA256 `59A2AF797B112C4950D2642FAACC94B97A3D2EC1A92EF50A29E8F21D20816F74`. See [APK_SIZE_AUDIT](APK_SIZE_AUDIT.md). Multi-ABI native modules dominate. No fonts, OCR, Digital Ink or audio modules were removed to chase size. Internal signing and debug-client tooling are not production release readiness. Signing compatibility with the phone is NOT TESTED.

### 25. Test count and checks

**130 test files / 631 tests PASS**, compared with baseline 111 files / 377 tests. `npm run check` (lint, TypeScript, tests, Android export) PASS; separate final test run PASS; Web export PASS; reproducible audit PASS; raw vocabulary structural validation PASS. **9 browser smoke journeys PASS**, zero captured errors. No claim of native audio/provider/hardware verification is inferred from mocks or browser tests. See [V5_WEB_SMOKE.json](V5_WEB_SMOKE.json).

### 26. Which HSK levels are ready?

| Label | Honest current conclusion |
| --- | --- |
| Learning Ready | Existing learning functions are available; **full V5 level-wide readiness not verified for any band**. HSK1–3 have more legacy learning material; 7–9 has no grammar/listening/story coverage in this inventory. |
| Content Complete | **None**; official alignment, reviewed senses/examples/grammar and balanced skill content incomplete. |
| Exam Practice Ready | Limited original reading/context practice available at every band (4 unique questions each). **No comprehensive multi-skill exam-practice-ready band verified**. |
| Exam Ready | **None**; no verified profile/full mock/audio/official scoring or academic/device evidence. |

## Remaining work / next evidence gates

1. Obtain a usable licensed/versioned syllabus/reference, validate crosswalk and inspect review queues; independently review HSK1–3 senses, Vietnamese definitions, pinyin, collocations/examples and grammar before publishing.
2. Review and integrate contextual lessons; expand grammar, reviewed questions and readings systematically. Six drafts and larger prompt counts are not substitutes for that work.
3. Add licensed/native listening assets, varied comprehension items and verified full-mock profiles/scoring. Preserve original practice labeling until evidence exists.
4. Complete deeper error-remediation coverage and any promised persistent AI quota/retention policy only with accurate contracts.
5. Supply a short-lived authenticated QA session for synthetic Gemini E2E; verify provider failure paths without exposing secrets or personal learning history.
6. Connect an authorized Android device for safe in-place update, actual retention snapshots, microphone/STT/TTS/OCR/handwriting/lifecycle/accessibility and cold-start/memory/frame measurements.

Full Cloud Sync remains explicitly out of V5; [V6_CLOUD_SYNC_BACKLOG](V6_CLOUD_SYNC_BACKLOG.md) lists compatibility follow-up only. No commit/push or remote deployment was performed. See [V5_RELEASE_CHECKLIST](V5_RELEASE_CHECKLIST.md) for gate-by-gate status.
