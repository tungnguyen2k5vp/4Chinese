# V5.4.2 UI fixes — disposition

Status reflects the source and emulator evidence available on 2026-10-07. `PARTIAL` means representative evidence exists but the full route/state matrix is not certified. `NOT VERIFIED` is not a pass.

## P0

| Item | Status | Evidence / remaining scope |
|---|---|---|
| Speaking AI CTA safe-area and keyboard clearance | PASS on emulator | 360/390 dp, gesture/3-button navigation, keyboard, and large-font captures are in the V5.4.2 emulator folders. No physical-device claim. |
| Learner-facing copy; remove internal provenance wording | PARTIAL | Listening, HSK, Confusables and AI representative screens/source paths reviewed; not every alert/dynamic screen individually audited. |
| Production access to `content-review` and `__qa` | PASS on emulator | Release route guards/source and `prod-hidden-content-review`, `prod-hidden-qa`, `prod-hidden-story-preview` evidence. |
| Horizontal layout at 360 dp | PARTIAL | Speaking AI setup/chat/input verified; HSK, statistics, exam and reader controls are not all runtime-captured at 360 dp. |
| Status-bar contrast, light/dark | PASS on representative routes | Centralized style in the root using theme plus active route: white icons on Vocabulary's blue header and in dark mode, dark icons on light pages. Fresh Vocabulary → Listening transition and Home/Listening/Path light + Path dark captures pass; every route shell was not individually recaptured. |
| Keyboard interactions | PARTIAL | Speaking AI composer/keyboard verified without submitting a learner turn; Search, Bulk Add, Writing, Reader notes, and Custom Word forms remain outside this runtime pass. |
| Large-font behavior | PARTIAL | 130%/160% representative screens and 200% Speaking AI setup/chat verified; not every screen at every scale. |
| Dark-mode contrast | PARTIAL | Fresh Path dark screenshot plus representative prior dark captures; not every dialog/disabled state was exercised. |
| Permission/error paths | PARTIAL | Native microphone prompt and denied fallback verified; OCR/Digital Ink unavailable and notification-denied paths not runtime-verified. |

## P1

| Item | Status | Evidence / remaining scope |
|---|---|---|
| Redundant/tall feature headers | PARTIAL | Listening header/copy reviewed and its learner-facing page is no longer duplicated; other feature headers were sampled, not all individually measured. |
| Learning Path hierarchy | PARTIAL | Root Path shows one active HSK journey plus compact level rows. Course/lesson child routes were source-audited but not freshly captured after the last patch. |
| Listening controls and honest capability copy | PARTIAL | Fresh screenshot states that audio is on-device TTS and is self-practice; playback/question flows were not all exercised in the final pass. |
| Statistics: six-metric limit and zero state | NOT VERIFIED | The available Statistics capture is populated; no fresh zero-state capture or full metric count was made. |
| HSK selection visibility and wording | PASS for selector samples | HSK 1 and HSK 6 selection/scroll captures exist; all level-specific flows were not exhaustively tested. |
| Vietnamese terminology and heading hierarchy | PARTIAL | Main feature screens reviewed; no full-dialog/alert copy sweep. |
| Alerts, empty states, dark variants | PARTIAL | Microphone denial and representative dark/empty states exist; not all feature-specific states were exercised. |
| Illustrations and reduced motion | PARTIAL | Reduced-motion mode tested and restored; illustration/state behavior sampled, not every screen. |

## Release gates

| Gate | Status |
|---|---|
| Schema/progress behavior unchanged | PASS by scope/source diff; schema remains 43 |
| `npm run check` | PASS: lint 0 errors (5 existing warnings), typecheck, 157 files / 863 tests, Android export |
| Android release APK | PASS: x86_64 candidate installed/tested on emulator; arm64 candidate built from the same corrected source |
| Emulator-first rule | PASS: V5.4.2 tested on AVD before any physical install |
| Physical phone install | NOT VERIFIED: ADB detects a handset as `unauthorized`; no phone inspection or install was attempted |
| Final screen matrix, route audit, UI freeze, report | See the four V5.4.2 documents linked from `V5_4_2_FINAL_REPORT.md` |
