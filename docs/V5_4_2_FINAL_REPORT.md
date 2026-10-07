# V5.4.2 final UI QA report

Date: 2026-10-07  
App: 4Chinese `0.1.34` / Android `versionCode 36`  
Database: schema 43 (unchanged)  
Decision: **EMULATOR QA PASS for the corrected candidate; physical-phone validation remains pending. Do not describe V5.4.2 as fully device-certified.**

## What changed in this continuation

- Centralized StatusBar style in the root navigator, derived from both theme and active route. Vocabulary keeps light status icons on its blue header; light pages use dark icons; dark mode uses light icons. The former child-level StatusBar override was removed so its native setting cannot leak into the next route.
- Preserved the existing Speaking AI Android permission-flow guard: the pending microphone permission request is not mistaken for an app-background cancellation, and the fallback remains available when permission is denied.
- No schema, study progress, scheduling, scoring, or XP logic change was made.

## Verification results

| Area | Result | Evidence / limits |
|---|---|---|
| Lint | PASS with warnings | 0 errors; 5 pre-existing `import/order` warnings in exam-vocabulary and HSK-syllabus tests. |
| Typecheck | PASS | `npm run typecheck` in final `npm run check`. |
| Automated tests | PASS | 157 test files, 863 tests. |
| Android JavaScript export | PASS | `npm run check`; 2,301 modules bundled. |
| Native Android build | PASS | JDK 19; x86_64 build installed on AVD and arm64 APK built afterward from the same corrected source. |
| Emulator install and launch | PASS | x86_64 AVD; `adb install -r` succeeded without clearing data; cold start reached Home. Installed version 0.1.34/code 36. |
| Status-bar contrast | PASS on checked routes | Fresh Home, Vocabulary, Listening and Path light captures plus Path dark; explicitly tested Vocabulary → Listening transition. Theme restored to “Theo hệ thống”. |
| Speaking AI safe area / keyboard / mic denial | PASS on tested states | 360/390 dp, gesture/3-button, 200% font, keyboard, native mic prompt and denied fallback evidence exists. No learner message was submitted during permission testing. |
| Reduced motion | PASS on emulator | Reduced motion selected and tested, then restored to full motion. |
| Production internal routes | PASS on emulator/source | QA/content-review guards and story-preview guard are represented by production-hidden captures. |
| Dark mode / large text / horizontal width | PARTIAL | Representative routes/stress variants only; not every route/state combination. |
| Listening / Path / HSK wording and layout | PARTIAL-to-PASS by screen sample | Fresh Listening and Path screenshots, HSK selector/HSK6 captures. Dynamic course/lesson and all question/playback flows were not exhaustively executed. |
| Statistics zero state / exact metric cap | NOT VERIFIED | Available Statistics screenshot is populated; no fresh zero-state capture or full metric count. |
| OCR/Digital Ink unavailable, notifications denied | NOT VERIFIED | No runtime denial/unavailable exercise in this pass. |
| TalkBack | NOT VERIFIED | Accessibility hierarchy dumps do not replace a TalkBack session. |
| Physical Android phone | NOT VERIFIED | ADB detects a handset, but it is `unauthorized`; only the x86_64 AVD is authorized. Phone details/package signer could not be inspected, and no phone install was attempted. |

Full issue disposition is in [`FINAL_UI_FIXES.md`](FINAL_UI_FIXES.md). The source route inventory and its runtime limits are in [`PRODUCTION_ROUTE_AUDIT.md`](PRODUCTION_ROUTE_AUDIT.md). Screenshot families and variants are in [`FINAL_UI_SCREEN_MATRIX.md`](FINAL_UI_SCREEN_MATRIX.md).

## Build artifact

Final arm64 local-test APK: [`app-release.apk`](../android/app/build/outputs/apk/release/app-release.apk)

- Package: `com.tungnguyen2k5vp.fourchinese`
- Version: `0.1.34`, code `36`
- ABI: `arm64-v8a`
- Size: 93,006,482 bytes
- SHA-256: `6551E3C47B80385470D47BB87CF213E9445A5B5D729F7B1F7EB708940B893933`
- Signing: local Android Debug key; certificate digest `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. This is not a Play Store release signature.

The final emulator install used an x86_64-only build because the AVD could not fit a universal two-ABI APK. That attempt returned `INSTALL_FAILED_INSUFFICIENT_STORAGE`; no app data or cache was deleted. The x86_64-only build from the corrected source installed and passed the described emulator checks. The separate arm64 build was generated from the same source/version for the phone.

## Screenshot evidence

- Corrected-candidate captures: [`screens-v5-4-2-emulator-final`](../artifacts/ui-audit-2026-10-06/screens-v5-4-2-emulator-final/)
- Representative feature-entry set: [`screens-v5-4-2-emulator`](../artifacts/ui-audit-2026-10-06/screens-v5-4-2-emulator/)
- Corrected-candidate manifest: [`capture-manifest-v5.4.2-final.csv`](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.4.2-final.csv)

The source inventory is 61 non-layout route files. The evidence directories have 34 feature-entry PNGs/32 hierarchy XMLs and 67 runtime/variant PNGs/63 XMLs respectively. This is family/state coverage, not a claim of one fresh screenshot for every route. Five screenshots were captured after the final route-aware StatusBar fix: Home, Vocabulary, Listening, Path (system/light/restored), and Path (dark).

## What remains before physical installation

Unlock the detected phone and accept its Android USB-debugging authorization prompt. Then confirm its model/API and inspect the installed app certificate before writing anything. If the signer matches, install the arm64 APK in place with `adb install -r`, launch, and verify the key screens/permission fallback. If Android reports a signature mismatch, stop—do not uninstall or clear data. Record phone screenshots and update this report only after the device run.

The current freeze is therefore provisional; see [`UI_FREEZE_V5_4_2.md`](UI_FREEZE_V5_4_2.md).
