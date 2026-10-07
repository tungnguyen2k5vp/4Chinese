# V5 release checklist — latest handoff 2026-10-02

Current candidate: **0.1.30 / Android versionCode32 / database schema39**. Status: **build/signature/install SUCCESS; bounded real-device caret visibility PASS; native QA PARTIAL; V5 not academically complete**. Results are main's handoff, not device checks performed by this documentation task.

| Latest 0.1.30 gate | Result | Evidence / boundary |
| --- | --- | --- |
| Final typecheck / lint / tests | PASS (main handoff) | Final typecheck/lint; 146 files / 819 tests PASS |
| Android release build / signature | SUCCESS / PASS | Signed APK 215357568 bytes; SHA256 80BDE32EF15A8A8CB2170776894ACF4EDFE77A3C400881BF16B1DCB473050D1B; signature verification does not establish store-production signing |
| Physical install | SUCCESS (main handoff) | `adb install -r`, 0.1.30/code32/schema39 |
| Real-device native caret visibility | PASS (bounded) | Caret visible after newline series ending at line 10; main visually verified [fixed](device-keyboard-v5-fixed.png) and [ten-line](device-keyboard-v5-ten-lines.png) screenshots |
| Native QA scope | PARTIAL | Realme RMX3085 / Android 13 / font scale 1.0; not all IMEs, large-font/accessibility, audio or lifecycle acceptance; main owns V5_DEVICE_QA.md |
| Sandbox / limited learner continuity | Observed, not full retention proof | UID 10414/dataDir unchanged; “Buổi 15” visible; not a full before/after learner-record comparison |
| Prior real-device keyboard regression | FAILED on 0.1.29/code31 | Line 5 hidden; history preserved separately from bounded 0.1.30 caret PASS |
| Historical level-filter consistency | PASS (bounded, 0.1.29) | Level-3 filtered list 39 words matched chart 39, as verified by main |
| Full V5 / academic release gates | Still incomplete | Academic review, licensed alignment/audio, complete native QA and production signing remain separate gates |

## Historical installed candidate — 0.1.29/code31

Historical candidate: **0.1.29 / Android versionCode31 / database schema39**. Status: **installed internal candidate; package/process verified by main; partial foreground vocabulary observations reported; native keyboard FAILED (line 5 hidden); V5 still PARTIAL, not production or exam-ready**. Evidence below is main's installation/verification handoff, not a device check performed by this documentation task.

| Latest gate | Result | Evidence / boundary |
| --- | --- | --- |
| Physical install / in-place upgrade | SUCCESS (main handoff) | `adb install -r` upgraded 0.1.26/code28 to the 0.1.29/code31 artifact on Realme RMX3085, serial FAJFPNTCPFGEKZB6, Android 13; reported font scale 1.0 |
| Installed package / running process / inspected log | PASS (main handoff) | Main verified version 0.1.29/code31, UID 10414, unchanged dataDir and PID 16068; inspected error log empty. This is a bounded observation, not an error-free-operation guarantee |
| Foreground launch / interactive UI verification | IN PROGRESS (partial main handoff) | Phone now unlocked; vocabulary screen observed with reported counts 179 / 37 and correct Vietnamese Unicode, including placeholder and middle-dot text. Not a complete native UI pass or learner-record comparison |
| Physical native keyboard | FAILED (main handoff) | Real device: line 5 hidden. Resized browser viewports did not detect this regression; 0.1.30 fix awaits actual retest |
| Browser QA | Historical PASS only | 20 cases belong to 0.1.28; not fresh browser acceptance of 0.1.29 |
| Migration / actual learner-data retention | NOT VERIFIED for latest upgrade | UID/dataDir unchanged confirms sandbox identity only; not a before/after comparison of decks, SRS, notes, history, settings or learning progress |
| Audio / permissions / file lifecycle / accessibility / performance | NOT RUN or NOT VERIFIED on latest hardware build | Android 13/font scale 1.0 are reported settings, not mic/TTS/TalkBack/large-font or native performance results; main owns [V5_DEVICE_QA.md](V5_DEVICE_QA.md) |
| Release/source gates | Still blocked | No Supabase deployment or Git push; academic review, licensed alignment/audio, production signing and complete native QA remain separate gates |

The checklist below is retained as **historical 0.1.26 evidence**. Its installed/launch/upgrade results do not establish acceptance of 0.1.29.

---

# V5 release checklist — 2026-10-01

Candidate: **0.1.26 / Android 28 / database 37**. Status: **internal candidate; V5 scope PARTIAL, not production or exam-ready**.

| Gate | Result | Evidence / remaining work |
| --- | --- | --- |
| Preserve existing dirty V4 repository | PASS | No reset/rekey/uninstall/commit/deploy; stable legacy prompt/profile IDs retained |
| Baseline before corpus work | PASS | [V5_BASELINE](V5_BASELINE.md); original audit snapshots in `v5-initial-audit/` |
| Reference audit reproducibility | PASS | `npm run data:audit:v5`; official coverage remains unknown |
| Existing vocabulary validation | PASS | `npm run data:validate`: 11,330 raw records, no structural issues; not academic verification |
| Lint / TypeScript / automated tests | PASS | `npm run check`; separate final `npm test`: 130 files, 631 tests |
| Android / Web exports | PASS | Final Android 2,167 modules; Web 1,696 modules |
| Browser interaction smoke | PASS | 9 journeys, zero captured errors: [V5_WEB_SMOKE.json](V5_WEB_SMOKE.json) |
| Additive migrations / backup fixtures | PASS | v36 context/senses and v37 speaking history; old backups remain readable; fixture assertions preserve legacy rows |
| Contextual answer concealment | PASS (automated) | All occurrences/simple/traditional targets masked before hint; explicit hint affects review behavior |
| Draft publication protection | PASS (automated) | Draft lessons/questions cannot enter normal learner attempts; content promotion requires evidence |
| Gemini consent / offline isolation | PASS (unit/browser) | Offline works without provider calls; grant/revoke mode verified; no private offline history sent |
| Authenticated Gemini end-to-end | NOT RUN | No short-lived app QA session token; [GEMINI_E2E_V5](GEMINI_E2E_V5.md) |
| Official HSK reference/license alignment | UNVERIFIED | No usable licensed/versioned/reviewed crosswalk; null is not zero |
| Full vocabulary senses/examples/collocations/grammar review | INCOMPLETE | Schema and review gates built; corpus-wide linguistic correction not performed |
| Contextual curriculum publication | INCOMPLETE | 6 drafts, 0 newly published; independent review and integration remain |
| Licensed/native listening and full mocks | INCOMPLETE | System TTS sentence library only; no verified full mock or official score conversion |
| APK assembly / certificate / size | PASS (internal artifact) | 0.1.26/code28; 214,451,512 bytes; APK signature verified (Android Debug). [APK_SIZE_AUDIT](APK_SIZE_AUDIT.md); installed signing compatibility NOT TESTED |
| Connected Android device | PASS (basic connection) | Realme RMX3085 detected; version 0.1.26 installed and MainActivity launched |
| Physical install / upgrade retained user data | PARTIAL | `adb install -r` upgraded 0.1.25/code27 in place; sandbox/UID retained and no clear-data/uninstall. Learner record counts not directly compared |
| Permissions / audio / OCR / Digital Ink / lifecycle | NOT TESTED on hardware | [V5_DEVICE_QA](V5_DEVICE_QA.md) |
| Accessibility | PARTIAL | 360px dark/reduced-motion browser layout tested; TalkBack/large font/native keyboard pending |
| Native cold start / memory / frame performance | NOT TESTED | No hardware measurements; bounded/lazy algorithms tested only |
| Full Cloud Sync | NOT IMPLEMENTED | V6 backlog only; existing sync behavior preserved |

## Safe hardware handoff

Capture installed package/version/certificate and aggregate counts without logging user content. Create a user-controlled backup. Confirm signing compatibility; install with `adb install -r`, never uninstall. Compare decks, SRS, notes, history, settings and path progress before/after. Test offline restart, interrupted exam/recording, microphone deny/revoke, OCR, handwriting, notifications, TalkBack and large fonts. Stop on any migration/certificate mismatch; do not use destructive fallback.

Production signing, physical QA, authenticated provider QA, source licensing and independent linguistic review are still release blockers. Automated green checks authorize an internal candidate, not a claim of complete V5 or readiness for an HSK examination.
