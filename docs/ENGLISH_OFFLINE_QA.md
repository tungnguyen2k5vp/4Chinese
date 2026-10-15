# V7 runtime checkpoint QA — 2026-10-10

Latest: PARTIAL V7; native core smoke build39 plus card-edit/draft/offline/schedule smoke build40 verified on dedicated Android emulator. Latest source172files/956tests PASS; Web151cards/seven-page E2E PASS. No phone installation: user confirmed WAIT FOR FULL V7. See [build40 card-editor QA](ENGLISH_CARD_EDITOR_QA.md) and historical [build39 QA](NATIVE_RELEASE_BUILD39_QA.md). Earlier counts/unauthorized/build-only sections below are historical checkpoints, not full V7 acceptance. Native151card pagination/editor200%/TalkBack remain unverified.

## Automated checks

- Full suite: 166 files, 929 passed, zero failed. `artifacts/v7-2026-10-10/learner-final-tests.json`.
- Typecheck passed; lint zero errors and 5 pre-existing warnings; content structure validator passed. Raw Chinese vocabulary remains 11,828, effective 11,877. Academic correctness is not established by this validator.
- Fresh/legacy Chinese migrations and existing SRS/backup tests are included; English learner schema uses a separate database and refuses a Chinese handle.
- Independent headless Edge profile, 390×844, then compact 320×740/dark theme: create deck/card, isolated statistics, start learning, no early due card, draft/SRS survive reload, empty review queue, controlled-Date due review → reveal → save → one review/10 English XP. No page errors in final run.
- Evidence: `artifacts/v7-2026-10-10/learner-ui/result.json` and seven PNG captures. Final run also disables networking after load and saves another custom card with independent stats. This is loaded-Web persistence, not proof of offline browser cold-start or Android airplane mode. Captures represent viewport states, not every app screen or full scroll-content coverage. Test records are synthetic and isolated from the user's browser/phone profile.
- E2E command: `node scripts/smoke-english-v7.cjs D:\ReactJS\HocTiengTrungApp\artifacts\v7-2026-10-10\qa-tools\node_modules\playwright`. QA-only Playwright is installed in artifacts, not app dependencies. Serve generated `dist-v7-learner-web` with the existing server on port 8097.

## Bugs caught and fixed

1. Draft writes could still be pending at reload. The form now exposes saving/saved/error status; E2E waits for committed-save feedback before reload. A forced process kill before a write commits is not claimed safe. Saving a custom card and clearing its draft are now in one transaction.
2. Expo SQLite's installed Suspense provider uses a single cached database instance. Nesting a second Suspense database provider closed the Chinese handle. The initial fix used non-Suspense. The latest runtime owns one dedicated English handle/context shared across all tabs/routes, leaving the Chinese SQLite context unchanged and avoiding close/reopen races between per-screen providers.
3. Fully mocked timers stalled screenshot animation frames. The E2E clock now overrides Date only; timers/rendering remain real. No artificial 30-minute wait is needed.

## Android build and limitations

`gradlew.bat :app:assembleRelease -PreactNativeArchitectures=x86_64 --console=plain --stacktrace` succeeded using existing JDK 19, in 3m04s. JDK 25 initially failed in Worklets CMake configuration; no global Java setting was changed.

APK: `android/app/build/outputs/apk/release/app-release.apk`; 100,174,142 bytes; package `com.tungnguyen2k5vp.fourchinese`; version 0.1.35/build 37. SHA-256 `6C3881AEEF32D0BF9890794C01E561C76F5E12FBBFB79B0D7DD0ECE15CBA99B1`. Signature verification passed, but signer is **Android Debug**, not a production store identity. This is an x86_64 release-variant QA artifact, not an ARM64 phone release. No production dictionary is bundled, and language switching is not enabled globally.

An exact copy is archived at `artifacts/v7-2026-10-10/native/v7-learner-x86_64-release-debug-signed.apk`. The read-only headless emulator started by this task was stopped after checking its exact PID/executable/arguments; no emulator data was deleted or reset.

Read-only/headless existing emulator `Medium_Phone_API_36.1`, port 5556, started but ADB remained `unauthorized`. No ADB key was replaced, no emulator wiped, no APK installed. Android keyboard/back/offline/TTS playback, TalkBack, font 200%, process death and permission/lifecycle checks are NOT VERIFIED. Web is not a substitute for these checks.

TTS tests cover exact US/GB selection, missing voice, pending-request cancellation and failure callbacks. Playback uses installed voices and explicit unavailable messages; no native recording/acoustic score or offline voice guarantee is claimed.

## Continuation: language settings, activity and personal bulk

Full suite: 170 files/944 tests, zero failures (`language-activity-spelling-tests.json`). Earlier activity/bulk checkpoint was 939; controller foreign-schema refusal and deck recovery brought it to 941, spelling added three tests. Typecheck/lint/content checks passed; five unrelated lint warnings remain.

After the final recovery-boundary change, typecheck/lint and the entire suite were run again: `final-language-runtime-tests.json`, 170 files/944 PASS/0 failed, success true. Temporary Web QA server was stopped after the final run; generated artifacts and screenshots are retained.

`learner-ui-activity-bulk/result.json`: 15 Web journeys passed, including local-day daily plan, real persisted mistake, bulk draft reload/invalid-row block, 10/50/100 UI batch saves, distinct senses and compact preview. `learner-ui-language-switch` adds persisted Settings/accent, five adapted tabs, unsaved-deck switch block, English progress unchanged across switching and retained bulk draft. The last run also exercises trash/restore and spelling; consult that result's `success`, not screenshot existence alone. An initial run failed a test locator because both a Home action and a tab were labeled HSK; the runner now targets the tab role and waits for loaded HSK data.

Captures are isolated Web QA, not phone screenshots, not full coverage of the whole app. New captures live under the language-switch folder. Settings warns that CEFR/corpus and advanced modules are not released and Chinese-only backup does not contain English data.

The intermediate Android build log `native/language-activity-bulk-build.log` reports Gradle BUILD SUCCESSFUL in 2m24s. This artifact predates final spelling/race-guard changes and must not be presented as the latest complete source. ADB remains unauthorized; no phone installation or database wipe occurred.

### Latest QA APK (not phone/store distribution)

Final `native/language-spelling-recovery-final-build.log`: Gradle success in 1m16s, exit 0; JDK19, x86_64, release variant. Exact archived artifact: `native/v7-language-spelling-recovery-x86_64-release-debug-signed.apk`, 100,235,934 bytes, SHA256 `C71930C73FAB08A693739E85E268E6739C9E7C37FA3FE25ADDE93009FF914164`. Signature verified with SDK apksigner; signer remains Android Debug. Includes the dedicated English runtime/recovery boundary, language tabs/settings, activity, bulk/deck management, suspension and spelling. This does not establish runtime behavior on Android or ARM64 compatibility.

The latest Web runner writes a CSV manifest with PNG dimensions, byte counts, SHA256, explicit WEB platform and viewport-only scope. It excludes the historical `failure.png` from the success capture list; that diagnostic is retained, not silently counted as a successful capture. Final rerun after the recovery-boundary addition: **20 journeys PASS, 17 screenshots, zero page errors**, `success=true`, result updated at 22:06:35 local time on 2026-10-10. The fault-injection recovery path itself is not native verified. HSK screenshot waits for actual loaded progress, not only its title.
