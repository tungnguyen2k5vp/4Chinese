# V5.2 Production UI Checklist

Status: release gate template. Items are intentionally unchecked until current-build evidence is attached. This document was authored by source inspection only; it does not certify a build, route, device, accessibility mode, performance result, store signing, or deployment.

## Release identity and evidence

- Source configuration inspected: `app.json` and `package.json` report version `0.1.33`, Android `versionCode` 35, package `com.tungnguyen2k5vp.fourchinese`.
- Existing route-capture report: `docs/UI_QA_SCREENSHOT_PLAN_2026-10-06.md` records 60 route screenshots on AVD Pixel 2 / Android API 36 at font scale 1.0. It is a historical snapshot, not proof that the updated V5.2 source has been recaptured or fully interacted with.
- Existing accessibility/performance device notes refer to older builds. See `docs/ACCESSIBILITY_V5_2.md` and `docs/VISUAL_PERFORMANCE_V5_2.md` for boundaries.
- This checklist starts with no V5.2 test result recorded by its author. Attach exact build, source revision, device/OS, test fixture, date, result, and artifact for every checked gate.

Release owner: TBD  
Candidate source revision: TBD  
Candidate build/version: TBD  
Test devices/OS: TBD  
Release decision/date: TBD

## 0. Change scope and data safety

- [ ] Review the complete source diff and identify all UI, navigation, theme, animation, dependency, and asset changes in scope.
- [ ] Confirm visual work did not reset, replace, delete, re-key, or migrate SQLite data, vocabulary IDs, user progress, SRS schedules, personal decks, Reader position/context, speaking metadata, exam answers, or history.
- [ ] Confirm no unrequested cloud sync, auth, analytics, notification, permission, curriculum, scoring, or product feature was added.
- [ ] Test with disposable emulator fixtures or a verified backup copy. Do not clear/uninstall a physical user device or mutate production/Supabase data for visual QA.
- [ ] Confirm all existing routes, five tabs, deep links, back behavior, and offline flows still reach their original functions.

## 1. Automated source gates

Run from the repository root and record logs/exit codes for the candidate revision:

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npx expo export --platform android`
- [ ] `npm run check` as the combined project gate; it currently runs lint, typecheck, tests, and Android JS export.
- [ ] Build and install a release-like Android artifact using the project’s supported process (the package script is `npm run android:release:apk` where the native Android project/toolchain is available).
- [ ] Check changed files for whitespace/conflict markers and inspect the final repository status so unrelated dirty-worktree changes remain untouched.

Passing source tests are not visual QA or device certification. Record actual test suite/file counts from the candidate run; do not reuse an older report’s counts.

## 2. Route and interaction coverage

- [ ] Re-capture the full supported route inventory after V5.2 visual changes. The previous 60-route manifest is a useful scope index; refresh outdated captures and route titles against the candidate build.
- [ ] For each route, include the relevant populated state and any important empty, loading, error, disabled, selected, success, or confirmation state. A static screenshot is not proof that a flow works.
- [ ] Exercise primary actions, back/close, keyboard, deep link/invalid ID guards, orientation policy, and background/resume where relevant.
- [ ] Exercise the high-risk learning paths with persistent results: new learning, review correct/incorrect/skip/result/upcoming/weak, course unlock and lesson completion, Reader save/resume, deck add/edit/restore/practice, and exam save/submit/history.
- [ ] Confirm each operation persists once, route changes do not duplicate progress, and results remain correct after process/app restart.
- [ ] Confirm no placeholder content, technical route title, inaccessible modal, clipped footer, hidden action, broken asset, or accidental blocking overlay remains.

### Known previous findings to close or explicitly disposition

The prior route plan (`docs/UI_QA_SCREENSHOT_PLAN_2026-10-06.md`) recorded these observations on its test build. Their status for the candidate must be proven, not inferred:

- [ ] Re-run exam submission to `/exam/result`; the report documented an Android `ScreenStackFragment added into a non-stack container` crash on automatic result navigation. Verify both automatic navigation and reopening history.
- Current source mitigation: submit-to-result replacement waits 250 ms after the submitted state and both exam screens use `animation: 'none'`; this remains unverified until the flow is rerun on Android. Keep the gate unchecked until then.
- [ ] Re-check onboarding’s HSK selection step; the report documented the fixed footer covering part of HSK 5/6 options.
- [ ] Re-check visible route titles such as story detail; replace technical path names only if they remain visible and preserve route behavior.
- [ ] Re-test current source rather than treating historical PNGs as a pass for changed UI.

If a finding is still present, the release owner must block release or record an explicit, risk-accepted exception; “works from history” is not a pass for a broken automatic flow.

## 3. Theme, visual modes, and responsive layout

- [ ] Review every redesigned route in both `system` and explicit light/dark themes, including system theme changes while the app is open.
- [ ] Review semantic text, status, category, selected, disabled, overlay, and reading-surface pairs on the final rendered backgrounds. Use [ACCESSIBILITY_V5_2.md](ACCESSIBILITY_V5_2.md); token tests are not screen certification.
- [ ] Verify mode recipes do not change business logic: LEARN guided; REVIEW focused; READ calm; EXAM neutral; UTILITY functional. No mascot/confetti/XP interruption in an active exam.
- [ ] Check portrait compact and large screens, font scales 1.0 / 1.3 / 1.5, pinyin marks, Vietnamese diacritics, long Hanzi meanings, charts, dialogs, input, scroll, keyboard, and fixed footer reachability.
- [ ] Review status bar, stack header, bottom tab bar, Android gesture/three-button navigation area, cutouts/safe areas, and iOS bars if supported.
- [ ] Confirm new interactive targets meet 48 dp guidance, have visible pressed/focus/selected/disabled states, and do not rely on color alone.

## 4. Assistive technology and motion

- [ ] Complete TalkBack review of representative and changed routes with speech, focus order, button names, selected/checked/disabled state, progress values, error/status announcements, sheets/dialogs, and route transitions.
- [ ] Complete VoiceOver review if iOS remains supported; do not infer it from Android.
- [ ] Verify OS Reduce Motion and app `full/reduced/off` settings before launch and during a session. OS preference wins; no essential instruction depends on motion.
- [ ] Verify reduced-motion fallback, animation cleanup on route changes/background, and no repeated list-wide layout animation.
- [ ] Check sound/haptic preferences independently. Missing UI sound assets must fail silently and never block study; do not confuse UI sound with TTS or recording.
- [ ] Check microphone, speech, file/photo, and notification permission grant/deny/revoke flows for clear recovery and alternatives.

## 5. Performance and stability

- [ ] Complete the device measurement plan in [VISUAL_PERFORMANCE_V5_2.md](VISUAL_PERFORMANCE_V5_2.md), with raw evidence from named physical devices as required by the product target.
- [ ] Measure cold and warm startup with repeated valid samples; keep build/device/thermal conditions consistent. Record distribution, not a single number.
- [ ] Profile long vocabulary/review/deck lists, lesson/path transitions, Reader large documents, keyboard routes, and reduced-motion behavior for jank/memory regressions.
- [ ] Confirm animations stop when inactive and when a screen unmounts; verify no work continues for an off-screen route.
- [ ] Do not claim 60 FPS, a startup speedup, lower memory, or production performance from code inspection, emulator screenshots, JS export time, or an old single-device report.

## 6. Data, privacy, assets, and offline operation

- [ ] Confirm visual changes preserve Reader bounds/chunking/resume and current personal-context saves; preserve speaking consent/quota/audio-retention boundaries; preserve current exam “UNVERIFIED” messaging.
- [ ] Confirm core learning remains usable offline and no remote art/sound fetch is necessary for task completion.
- [ ] Verify every shipped illustration/audio asset has approved ownership/license/provenance and optimized bundled exports. Pending assets remain absent/silent; do not add placeholders or borrowed artwork.
- [ ] Verify no user text, recording, secret, service-role key, or local QA fixture is accidentally shipped or logged.
- [ ] Do not run cloud/RLS checks against production. Use only an explicitly designated test project/account and safe test credentials.

## 7. Build and handoff

- [ ] Confirm Android release-like build compiles and installs over a compatible existing test build without clearing app data; verify package ID, version/versionCode, signing expectations, permissions, and startup.
- [ ] Confirm screenshots and final report correspond to the exact candidate build/source revision, not an earlier capture.
- [ ] Record unresolved bugs, untested routes/services/devices, licensing gaps, and any accepted risk plainly.
- [ ] Record the release owner’s approval. Source-level checkboxes alone do not authorize Play Store submission, Supabase deployment, or physical-device data changes.

## Current verification status at authoring

| Area | What exists | V5.2 status |
| --- | --- | --- |
| Theme contrast | `src/theme/tokens.test.ts` checks selected semantic pairs, skill colors on `surface`, and white labels on HSK colors in both theme objects. | Test exists; not run in this document task; no full rendered-screen/WCAG claim. |
| Motion | Source hooks/components honor OS/app preferences for selected shared animations. | Source inspected; current device preference behavior not tested here. |
| Route captures | Historical 60-route Pixel 2/API 36 capture at font scale 1.0. | Refresh changed routes and run functional/accessibility states on candidate. |
| Accessibility | Shared controls expose some roles/labels/states; existing docs list manual gates. | TalkBack, VoiceOver, large font, system bars, and permission flows remain unverified for V5.2. |
| Performance | Animated component implementation and older single-device report exist. | No V5.2 profiling; no frame-rate or startup-performance certification. |
| Release build | Project scripts define lint/typecheck/test/export and local Android build commands. | No build/install/deploy performed as part of this document task. |

Release decision: **Not approved by this checklist until the applicable unchecked gates have current evidence and the release owner signs off.**

