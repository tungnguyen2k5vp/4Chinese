# V5 follow-up release evidence

## Latest candidate — 2026-10-02 / 0.1.30 (installed; bounded native PASS)

- App 0.1.30 / code32 / schema39. Main reports release build SUCCESS, signature verification PASS and `adb install -r` SUCCESS. Signed APK: 215357568 bytes; SHA256 80BDE32EF15A8A8CB2170776894ACF4EDFE77A3C400881BF16B1DCB473050D1B. Signature verification does not establish store-production signing.
- Final typecheck/lint PASS; 146 files / 819 tests PASS, per main's final handoff.
- Real-device Android IME caret visibility PASS (bounded): after a newline series ending at line 10, the caret was visible. Main visually verified [fixed keyboard screenshot](device-keyboard-v5-fixed.png) and [ten-line screenshot](device-keyboard-v5-ten-lines.png). Screen measures actual IME/root overlap, applies paddingBottom only to actual overlap, and uses a flex:1 ScrollView.
- Native QA remains PARTIAL: this observation is limited to the tested Realme RMX3085, Android 13, font scale 1.0 and observed IME interaction. It does not establish all IMEs, large-font/accessibility, audio, file lifecycle or complete device acceptance. Main owns V5_DEVICE_QA.md.
- Main reports UID 10414 and dataDir unchanged on 0.1.30; “Buổi 15” visible. These observations do not prove preservation of every learner record. Earlier 0.1.29 level-3 filtered list contained 39 words, matching chart count 39; this is a historical bounded consistency check.
- Preserve the historical real-device 0.1.29/code31 keyboard FAILED result (line 5 hidden) below; the separately evidenced 0.1.30 caret retest is PASS. V5 remains academically/source/license incomplete, not full exam-ready.

## Historical installed candidate — 2026-10-02 / 0.1.29 (keyboard FAILED)

- App 0.1.29 / code31 / schema39. Installation SUCCESS reported by main: `adb install -r` upgraded the physical Realme RMX3085 (serial FAJFPNTCPFGEKZB6, Android 13, font scale 1.0) from 0.1.26/code28. No Supabase deployment or Git push. Installation is not launch, migration, learner-data-retention or native interaction acceptance.
- Main verified installed version 0.1.29/code31, UID 10414, unchanged dataDir and running PID 16068; the inspected error log was empty. This confirms the reported package/process/sandbox observations, not a comparison of learner records or a guarantee of error-free operation. Update from main: the phone is now unlocked and the vocabulary screen is visible, with reported counts 179 / 37 and correct Vietnamese Unicode, including the placeholder and middle-dot text. These are partial screen observations, not an independently checked learner-record comparison. Subsequent physical Android keyboard QA FAILED: line 5 hidden. The earlier partial vocabulary observation does not override this failure; font scale 1.0 is a reported setting, not a large-font/accessibility test.
- 146 files / 819 tests PASS; lint/typecheck PASS; Android/web export PASS.
- Browser QA boundary: the 20 PASS cases belong to the historical 0.1.28 checkpoint, not a fresh browser run of 0.1.29. That checkpoint ran scripts/smoke-v5-web.cjs (9), smoke-v5-completion.cjs (4), smoke-bulk-keyboard.cjs (3), smoke-epub-v5.cjs (4), with zero captured page errors. Browser keyboard tests used a resized viewport, not a physical IME. These results do not establish browser or native interaction acceptance of the latest 0.1.29 APK; the newly reported install SUCCESS is separate evidence.
- Gradle assembleRelease PASS after the final keyboard/lifecycle/fallback fixes. APK 215358332 bytes; SHA256 60EF1790AD9367ED91BD1A20D27748179E4BAF4AD170E4DA2A0F978A11B926CF; apksigner Verifies / v2 true. Internal debug-key signing, not store production.
- Three coordinated branches: EPUB/security bounds, lexical reading staging, recording retention/lifecycle. Main handled keyboard, schema39 integration and verification. Cross-review identified two native risks and fixes were applied before the final build.
- Physical Android keyboard QA FAILED on 0.1.29: line 5 hidden. iOS keyboard, document-provider, file/audio lifecycle and accessibility checks NOT RUN. Authenticated Gemini probe NOT_RUN because no valid QA session token was configured. No credentials printed or new accounts created.
- Raw recordings excluded from app DB/JSON backup by design. Existing Android SecureStore XML only allowlists shared preferences; file-domain audio is not included. This is a static configuration observation, not a verified device restore or iCloud exclusion.
- Academic/source/license gates remain unsatisfied; 9 lexical binding gaps, 6 missing stroke-data characters, advanced grammar and licensed audio remain open. See the latest summary for details.

## Historical candidate — 0.1.27 (not current)

- App 0.1.27 / Android versionCode29 / database schema38.
- Latest APK is build-only, not installed on phone. Earlier 0.1.26 installation evidence does not apply to this artifact.
- Lint and typecheck PASS; 139 test files / 688 tests PASS after final cross-consumer draft filters.
- Android export PASS; web export PASS. Final smoke scripts: 9 existing journeys + 4 follow-up journeys PASS, zero captured page errors; isolated 412px profile and existing 360px dark/reduced-motion check.
- Gradle `:app:assembleRelease` PASS. Universal APK 215292620 bytes, SHA256 BE212FFCB93BC4258EADBE7486D4876B4ADE84C767C1A0263D1710730BE90562. aapt reports package com.tungnguyen2k5vp.fourchinese versionName0.1.27 code29. apksigner reports Verifies / v2 true. Debug-key internal signing, not production distribution.
- APK includes 4 ABI, ~205.32MiB; no claim of memory/FPS/native benchmark on this new device build.
- Authenticated Gemini E2E, native microphone/TTS/TalkBack/actual learner database retention on upgrade remain not run for this build.
- Clinical/academic accuracy, licensed/versioned official alignment and complete mock gates are not satisfied by tests. Draft counts remain distinct from publication.

See V5_UPDATE_SUMMARY.md and V5_DATA_AUDIT.md for counts and gaps. Existing report/checklist entries for 0.1.26 are historical and must not be used to infer device acceptance of 0.1.27.
