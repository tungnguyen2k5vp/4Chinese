# 4Chinese V8.2 — implementation and QA status (2026-10-14)

> Historical checkpoint. This document predates the final private-emulator QA pass and is retained for chronology. Its build-50 installation notes do not mean the V8.2 build 51/release was installed during the current pass. For current status, see `V8_2_FINAL_REPORT.md` and `V8_2_ANDROID_VISUAL_QA.md` (2026-10-15).

## How to read this report

This status distinguishes the Word report (current-state/product audit input) from the V8.2 master brief (the user's requested UI/interaction specification). The old Word counts do not authorize a database reset or corpus rewrite. Existing dirty-worktree changes were preserved.

Status labels separate source changes from proof: **Code + automated QA** means implementation is present and covered by local checks; **Device screenshot captured** means the current build was navigated to that route and photographed, not that every control was exercised; **Partial / audit pending** means the area still needs a focused pass before it can be called complete.

## Feature areas

| Feature group | Changes in this workstream | Status / remaining check |
| --- | --- | --- |
| 01 · Tổng quan | In this UI pass the review CTA now reflects the saved session size, the word-of-day card is directly below the hero, and the hero illustration is shorter. (`src/app/(tabs)/index.tsx`) | Build 49 screenshot predates these changes; no post-edit screenshot/device pass yet. |
| 02 · Kho từ | In this UI pass the memory chart is collapsed by default behind an accessible toggle, so the list starts earlier; the filter/header are shorter. (`src/app/(tabs)/vocabulary.tsx`) | Six routes were captured in build 49, before this UI pass. Large-text and device checks remain. |
| 03 · Học và ôn | Review answer distractors, reveal/Pinyin flow and session-size choices are represented in the review implementation; this UI pass compresses the due-count hero. (`src/app/review/*`, `src/app/speaking/tones.tsx`, `src/services/speaking/tones.ts`) | Automated suite passes; no complete post-edit review loop/persistence/finish test on device. |
| 04 · Bộ từ | This UI pass replaces the large create card with a modal, compresses secondary actions, moves reversible archive into a row menu, and makes friend-code entry single-line. (`src/app/decks/index.tsx`) | Build 49 routes predate the change; soft-delete/import/keyboard interactions need device verification. Listening/quiz sample limitations in the earlier gallery remain. |
| 05 · HSK | HSK 3.0 catalog no longer pins the list header; vocabulary rows show Vietnamese meaning and audio where available. The HSK progress illustration is now shorter and the syllabus header title is localized. (`src/components/Hsk30Catalog.tsx`, `src/app/hsk/syllabus.tsx`, `src/app/(tabs)/hsk.tsx`, `src/app/_layout.tsx`) | Five routes were captured in build 49, before these UI adjustments; scrolling/playback/course navigation remain untested. |
| 06 · Ngữ pháp | List title wraps and the HSK badge keeps its width instead of clipping. (`src/app/grammar/index.tsx`) | Six routes captured, including a grammar detail. Interaction and narrow-screen/large-text checks remain. |
| 07 · Nghe và nói | Tone marks remain hidden before answering; speaking uses an HSK selector and exercise prompts rather than repeated level controls. (`src/app/speaking/tones.tsx`, `src/app/exam/speaking.tsx`) | Seven routes captured. Microphone and camera permissions were not granted; playback, recording quality and interruption behavior remain untested. |
| 08 · Đọc | Reader/context work includes directly tappable inline terms, a coverage card and contextual lookup/save actions. | Five routes captured. Inline colored/underlined terms and coverage are visibly present in `08-doc/05-doc-truyen.png`; the term-tap sheet itself was not captured. `/content-review` returned to the home screen in this route pass. |
| 09 · Thi | Existing expiry/result changes remain. This UI pass removes the duplicate body heading, groups in-progress attempts with progress rows, and groups compact recent-result links. (`src/app/exam/index.tsx`, `src/app/exam/session.tsx`, `src/app/exam/result.tsx`) | Five routes were captured in build 49, before the new layout. Save/resume and explicit-submit persistence were not tested. |
| 10 · Tài khoản | Related profile/settings and accessibility work remains in the existing worktree. | Three routes captured. Accessibility states, account flows and settings persistence still need a focused pass. |

## System-level P0 checks from the report

- **Answer disclosure:** tone Pinyin is masked until the user answers; covered by `src/services/speaking/tones.test.ts`.
- **Review answer choices:** the existing review answer-generation tests cover four distinct options and small-corpus fallback behavior; detailed build-48 corpus evidence remains in `docs/CHINESE_REVIEW_BUILD48_QA_2026-10-14.md` and `artifacts/review-four-answers-fix-2026-10-14/catalog-audit.json`.
- **Responsive handwriting boards:** `WritingCanvas` and `StrokeWriter` now measure their available width instead of relying on a fixed screen-width canvas; `StrokeWriter.test.ts` covers 13 cases.
- **Grammar/deck clipping:** grammar heading/badge sizing and deck chart label sizing were adjusted in source; physical viewport screenshots are still needed.
- **Speaking controls:** duplicate level buttons were replaced by the HSK selector/exercise flow. This does not prove real microphone/audio quality.
- **Expired exams:** timeout on reopen is explicit rather than silently changing an in-progress attempt to submitted. Learner-data persistence must still be verified on device.

## Verification performed

- `npm run typecheck` — passed after the UI pass.
- `npm run lint` — passed with 0 errors and 8 warnings in untouched English, settings, syllabus and test files.
- `npm run content:validate` — passed structural validation (11,828 bundled vocabulary records; 11,877 internal records). This check is not academic/content verification.
- `npm test -- --reporter=dot --maxWorkers=4` — **205 test files, 1,121 tests passed** after the UI pass.
- `npx expo export --platform android --output-dir artifacts/v8-2-android-bundle-check-2026-10-14` — passed; Metro bundled 2,388 modules into a 26 MB Android Hermes bundle. This is a JavaScript bundle check, **not an APK build or installation**.
- Focused checks: `StrokeWriter.test.ts` **13/13**; `LocalVoiceRecorder.test.ts` **14/14**. The speaking test's React Native/vector-icon shims were completed so the headless screen tests load without resolving Metro-only icon internals.

## Post-pass APK build (addendum)

- A native release build has now completed successfully with JDK 19. Android package metadata confirms version **0.1.48 / versionCode 50**.
- Review APK: `artifacts/v8-2-review-build50-2026-10-14/app-release.apk` (219,547,600 bytes; SHA-256 `F36F71812F2FFBA3DA3D8FD45F5E951143914D375A189A9A2EACE948E9BC6772`).
- At the user's request, this build was installed in place on the connected Realme RMX3085 and launched. ADB reports versionCode 50 / versionName 0.1.48; `firstInstallTime` is unchanged and `MainActivity` is resumed. No app data was cleared. This is only an install/launch smoke check; post-change route screenshots and feature-interaction checks remain outstanding.

## Device and visual confirmation

- Release APK: `android/app/build/outputs/apk/release/app-release.apk` — version **0.1.47 / versionCode 49**, 96,850,126 bytes; ARM64 build for the connected handset.
- Installed on Realme RMX3085 (Android 13, API 33, arm64-v8a) as an in-place update. Device capture metadata records `lastUpdateTime=2026-10-14 12:53:28`; `firstInstallTime=2026-09-22 16:43:35` remained unchanged, consistent with keeping the existing app/data installation. The app launched and no fatal crash was seen in the smoke check.
- Current gallery: `artifacts/chinese-device-qa-2026-10-14-build49/` — **52 routed screen captures across the ten feature folders**, plus a root-level home PNG (53 PNG files total). It is a review aid, not evidence that every interaction passed. Open `index.html` for the gallery and `manifest.json` for route/text metadata.
- The build 49 home page and gallery are from before this UI pass and remained substantially like build 48. That is why the new layout must not be judged from the old gallery. The app is now installed as build 50, which includes visible hierarchy changes in Home, Vocabulary, Personal Decks, Exam Center, Review Setup, and HSK Overview; a new screenshot gallery has not yet been captured.
- The capture pass only navigated routes and took screenshots; it did not grade SRS answers or create/delete learner data. Microphone and camera remained ungranted. An assistant-like floating bubble overlaps captured content; its source is unconfirmed and it should not be assumed to be part of the app UI.

## Remaining before calling V8.2 fully verified

1. Walk through review answer/reveal, 5/10/15/20 sizing, completion/continue, and review schedule; verify actual persistence without resetting the user's data.
2. Exercise speaking/listening permissions and playback, tap an inline reader word and verify contextual actions, story audio controls, expired-exam resume, and account accessibility on device.
3. Identify whether the floating assistant-like bubble comes from the phone or app; if app-owned, reposition it, then recheck the obscured screen area.
4. Repeat visual checks with narrow viewport/large text/bottom safe area, then re-audit all report copy/layout P0s.

The handset is now on **0.1.48 / build 50** after an in-place update and successful app launch. The existing gallery at `artifacts/chinese-device-qa-2026-10-14-build49/` is still the old build; new-source screenshots and interaction QA have not yet been captured. A browser preview attempt remained on the offline-database startup screen, so those screenshots were discarded. Local typecheck, tests, and APK packaging pass, but V8.2 is not a full release sign-off until changed screens receive visual/interaction verification and remaining Word/master-brief items and assistive/audio checks are covered. See `docs/V8_2_MASTER_AUDIT.md` for the line-by-line UI audit and status.
