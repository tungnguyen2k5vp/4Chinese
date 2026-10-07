# UI performance report — 1 Oct 2026

## Existing physical baseline

One pre-upgrade cold launch of installed 4Chinese v0.1.23 / versionCode 25 on the connected Android phone used `adb shell am force-stop` then `adb shell am start -W`:

- `LaunchState`: COLD
- `TotalTime`: 1,152 ms
- `WaitTime`: 1,165 ms

This is a single observation, not a benchmark distribution. A five-run post-update sample is recorded below.

## Current source/build verification

- `npm run check` passed: lint, TypeScript, 90 test files / 312 tests, and Android JavaScript export. The Hermes bundle was about 20 MB; export size/duration is not a runtime-speed measurement.
- Android release-build APK 0.1.25/code 27 (ARM64; 91,365,962 bytes / 87.1 MiB; locally debug-key signed, not Play Store signed) was installed in place on the connected Realme RMX3085. The package opened `MainActivity`; Home exposed study/review labels and no fatal crash appeared in the recent log sample.

## Post-upgrade cold-start sample

Five valid `COLD` launches, each after `adb shell am force-stop` and measured with `adb shell am start -W`, were 1,309; 1,264; 1,211; 1,196; and 1,214 ms. Median: 1,214 ms; range: 1,196–1,309 ms. A separate attempt during ADB daemon startup returned `UNKNOWN` and was excluded.

Compared with the pre-upgrade 1,152 ms single-run baseline, the post-upgrade median is 62 ms (~5.4%) higher. This is not a controlled before/after study: one baseline run versus five current runs cannot distinguish normal device variation from a real regression. No speedup is claimed.

## Source-level safeguards

- Quick-session choice and fatigue guard use local state; no polling/network call was added.
- Progress animation clamps values, cancels superseded animations, and cleans up on unmount. OS/app Reduce Motion sets values immediately.
- Motion surfaces avoid list-wide layout animation; press/pulse use opacity/transform native animation where possible.
- Analytics and flag failures are swallowed/fallback locally; no remote service is configured.

## Remaining measurements

The current phone sample closes the first post-update cold-start capture, but repeat the before/after comparison on representative low-end devices. Also record startup memory/frame jank during a long vocabulary list and review queue, theme-switch delay, and reminder behavior. Never infer physical performance from Metro/Expo export duration.
