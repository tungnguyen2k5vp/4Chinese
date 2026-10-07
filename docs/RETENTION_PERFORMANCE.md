# Retention-phase performance evidence

## Android cold-start baseline before upgrade

Measured on the connected physical Android phone with `adb shell am force-stop` followed by `adb shell am start -W` for the installed 4Chinese app (v0.1.23, versionCode 25):

- `LaunchState`: COLD
- `TotalTime`: 1,152 ms
- `WaitTime`: 1,165 ms

This is a single-device, single-run baseline, not a statistical benchmark. Record the same command after installing the new build; compare several cold launches before claiming an improvement or regression.

## Performance safeguards

- Quick-session timing is local and does not add network requests.
- Reminder reconciliation only reads scheduled local notifications at app startup and touches notifications tagged for 4Chinese; no background polling loop is added.
- New Home decision logic uses already-loaded dashboard/settings state plus a one-row availability query.
- Existing list virtualization and bounded vocabulary search paths remain unchanged.

## Post-upgrade evidence — 1 Oct 2026

- `npm run check` passed after the contrast fix: lint, TypeScript, 90 test files / 312 tests, and Android Expo export (20 MB Hermes bundle). The version metadata was then advanced to `0.1.25` / `versionCode 27`; the ARM64 release Gradle build succeeded.
- APK: `android/app/build/outputs/apk/release/app-release.apk`, 91,365,962 bytes (87.1 MiB), `arm64-v8a`, package `com.tungnguyen2k5vp.fourchinese`, target SDK 36. SHA-256: `63757D2A0926B715582698B1CE74685A854A88699EB403BCE818C451B5BE5F68`. It is signed with the Android debug certificate for local device testing, not a Play Store production signing key.
- Installed on the connected Realme RMX3085 (Android 13/API 33) using `adb install -r`. Package manager confirmed `0.1.25` / code 27; the app launched to Home and exposed current progress/review labels. No uninstall or data clear occurred.
- Cold starts using `am force-stop` + `am start -W`: 1,309; 1,264; 1,211; 1,196; 1,214 ms (`COLD`). Median 1,214 ms; mean 1,239 ms. One initial attempt during ADB daemon startup returned `UNKNOWN` and is excluded.
- The pre-upgrade v0.1.23 baseline above was one run at 1,152 ms. The new median is 62 ms (~5.4%) higher, but a single baseline run versus five current runs is insufficient to establish a regression or improvement. Do not claim a speedup from this sample.

## Remaining performance gates

Repeat cold-start and sustained-screen measurements on representative low-end devices, capture a controlled frame/memory profile, and validate large-font layout. Do not infer device performance from Metro export time alone.
