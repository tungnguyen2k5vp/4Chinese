# UI freeze — V5.4.2 candidate

Date: 2026-10-07  
Frozen candidate: 4Chinese `0.1.34`, Android `versionCode 36`, schema 43.  
Scope: visual/UI-only stabilization; preserve the current visual direction, route behavior, learning data and progress rules.

## Freeze status

The corrected source passes automated checks and an x86_64 Android emulator install/smoke test. A local arm64 APK is built. The freeze is **provisional for physical-device release**: ADB sees a handset but reports it as `unauthorized`, and route/runtime coverage is representative rather than exhaustive. See [`V5_4_2_FINAL_REPORT.md`](V5_4_2_FINAL_REPORT.md).

## Allowed changes while frozen

- P0 regression fixes with a reproducible screenshot/log/test and a minimal patch.
- Release-blocking build, permission, accessibility, data-preservation, or crash fixes.
- Documentation or test-evidence corrections that do not change app behavior.

## Not allowed without a new scoped task

- Redesigning the established UI direction or adding visual features/assets.
- Changing database schema, learner progression, scheduling, scoring, XP, or study-session semantics.
- Broad copy rewrites or route/navigation changes unrelated to a reproduced P0/P1 defect.
- Clearing user data, uninstalling the phone app to bypass signature conflicts, or installing on a phone before identifying it and validating the existing app signature.

## Required gates for any source change

1. Keep the patch limited to a documented defect and add/update a test where practical.
2. Run `npm run check`: lint, typecheck, full Vitest suite, and Android export.
3. Build the required Android ABI with the pinned local toolchain (JDK 19 was used for this candidate).
4. Install/update on the emulator with `adb install -r`; preserve emulator data and rerun impacted visual checks.
5. Rebuild the arm64 candidate from the same source. On physical connection, inspect device model/API and installed package signer before `adb install -r`; do not uninstall or clear app data if Android reports a signature mismatch.
6. Refresh the manifest, screen matrix, route audit and final report. A source change invalidates earlier screenshots for the affected screen/state.

## Signing and distribution

The local APK is signed with the repository's Android Debug key (SHA-256 certificate digest `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`). It is intended for local testing/update compatibility, not Play Store distribution. A store release requires the proper production signing and release process.

## Version policy

Do not change `0.1.34`/code 36 for documentation-only edits. Any subsequent app binary should increment Android `versionCode` and update the app version consistently; update this freeze record to the new candidate identifier and invalidate only the affected evidence.
