# V5.4.2 Final UI Baseline

Date: 2026-10-06  
Baseline source: repository state at the start of the V5.4.2 final UI pass. The worktree was already heavily modified and contains many uncommitted files; those changes are preserved.

## App and data baseline

- App version: `0.1.33` (`package.json` and `app.json`); Android `versionCode: 35`.
- Runtime: Expo SDK `57.0.23`, React Native `0.86.3`, React `19.2.3`.
- SQLite schema: `DATABASE_VERSION = 43`.
- Source route screens: 61 `.tsx` files excluding layouts. `__qa` and `content-review` are internal/developer-only candidates and must not be reachable in the release build.
- No database or learning/progress-rule change is in scope for this UI pass.

## Baseline checks

| Check | Result | Evidence |
|---|---|---|
| Lint | PASS with 5 warnings | 0 errors; existing `import/order` warnings in `src/services/exam/vocabulary-practice.test.ts` and `src/services/hsk/syllabus.test.ts` |
| Typecheck | PASS | `npm run typecheck` |
| Tests | PASS | `npm test -- --reporter=dot`: 157 test files, 863 tests passed |
| Android JS export | PASS | `npx expo export --platform android --output-dir dist-v5-4-2-baseline`; 2,300 modules bundled |
| Android native APK build | Pending final release-candidate build | Must be run after fixes and version/build increment, then installed on emulator first |

Expo SDK 57’s versioned reference lists React Native 0.86 and Android compile/target API 36; the project’s package versions are aligned with that reference. [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)

## Existing real-phone evidence reviewed

Reviewed the latest V5.4.1 Android capture set, including the contact sheets and full-resolution screenshots for Speaking AI, Listening, Learning Path Course, Statistics, and HSK:

- Device recorded in the manifest: Realme RMX3085, Android 13/API 33, 1080×2400, 480 dpi, font scale 1.0, light mode.
- Capture set: 60 route captures plus 4 supplemental images. The V5.4.1 report states that all 64 PNGs were dimension-validated.
- Confirmed visible issues: Speaking AI’s primary CTA sits behind the Android system navigation area; Listening exposes technical review/provenance labels; HSK says “Kho nội bộ”; Statistics shows more than six metric tiles and an ambiguous XP/Achievement/Weekly Goal action; the Learning Path Course still gives each lesson a large card despite already having path nodes.
- The Listening page also displays a native stack title (“Thư viện nghe”) and a second page title (“Luyện nghe”), making its header unnecessarily tall. The HSK selector is a horizontal scroller, but the later levels need selection/scroll verification.
- The V5.4.1 set does not cover dark mode, large font, keyboard, permission failures, reduced motion, gesture/3-button navigation, or TalkBack. Those are not treated as passed.

## Test and release guard

This baseline does not authorize skipping emulator-first validation. The V5.4.2 release-like source must first build, install, launch, and pass the relevant emulator checks. The ABI-matching APK built from that same corrected source can then be installed on the identified phone. Do not clear app data or alter learning records during either phase.

## V5.4.2 final follow-up — 2026-10-07

The baseline above records the starting point, not the final result. Final source is `0.1.34` / Android `versionCode 36`; SQLite remains schema 43.

- `npm run check`: PASS after the last UI change — lint 0 errors (the same 5 import-order warnings listed above), typecheck PASS, 157 test files / 863 tests PASS, Android export PASS (2,301 modules).
- Android release builds: PASS with JDK 19. The x86_64 APK was installed in place on the x86_64 emulator (`adb install -r`, no data clear) and the fixed source was cold-launched. An attempted universal APK exceeded available emulator storage; it was not force-installed and no emulator data/cache was deleted. The final arm64 APK was then built from the same source for a physical Android device.
- Fresh post-fix visual evidence is in `artifacts/ui-audit-2026-10-06/screens-v5-4-2-emulator-final/`: Home, Vocabulary, Listening, Path (light/system theme), and Path (dark theme). A route-aware root StatusBar now shows light icons on the Vocabulary blue header, dark icons on light pages, and light icons for dark mode; the Vocabulary → Listening transition was explicitly retested. Emulator app theme was restored to “Theo hệ thống”.
- The broader emulator screenshot set contains 34 feature/root screenshots plus 66 variant/runtime screenshots and 61 UI hierarchy dumps. Coverage is representative by feature; it is not one image for every one of the 61 source route files. See `FINAL_UI_SCREEN_MATRIX.md` and `PRODUCTION_ROUTE_AUDIT.md` for explicit gaps.
- At final device check only the x86_64 AVD was online. The phone was not connected/authorized, so the arm64 APK was not installed on it. No real-device V5.4.2 result is claimed.

Final arm64 APK: `android/app/build/outputs/apk/release/app-release.apk` (93,006,482 bytes; SHA-256 `6551E3C47B80385470D47BB87CF213E9445A5B5D729F7B1F7EB708940B893933`; local Android Debug certificate). This is a local test build, not a Play Store-signed release.
