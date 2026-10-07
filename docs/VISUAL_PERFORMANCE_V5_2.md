# Visual Performance V5.2 — Measurement Plan

Status: source-level animation safeguards are present; this is a measurement plan, not a performance benchmark. No V5.2 device profiling, frame-rate certification, or 60 FPS claim was performed for this document.

## Current implementation facts

- `src/components/Screen.tsx` uses React Native `Animated` for a short opacity/translate entrance and skips it when the motion preference says to reduce or disable motion.
- `src/components/ui/MotionPressable.tsx` uses a small transform spring when motion is enabled. Haptic feedback is optional.
- `src/components/ui/PulseRing.tsx` loops only while the path marker is active and motion is enabled; cleanup stops the loop.
- `src/components/ui/AnimatedProgressBar.tsx` clamps progress, stops superseded animations, and uses an animated width. This width animation is JS/layout-driven (`useNativeDriver: false`); it applies the current value directly when motion is reduced/disabled.
- `docs/MOTION_SYSTEM.md` and `docs/UI_PERFORMANCE.md` prohibit list-wide layout animation and require low-end Android review. Source inspection cannot show how the app performs at runtime.

These are code characteristics only. Do not infer smooth frame pacing, startup speed, low memory use, or a specific frames-per-second result from them.

## Existing evidence and limits

`docs/UI_PERFORMANCE_REPORT.md` contains historical measurements for older builds: a single v0.1.23/code 25 cold-start observation and a five-run v0.1.25/code 27 sample on one Android device. Its author explicitly notes that the before/after comparison is uncontrolled and makes no speedup claim. Those figures are not a V5.2 baseline and cannot be presented as current release performance.

The 2026-10-06 route screenshot plan used one Pixel 2 emulator configuration for visual route capture. Screenshots do not measure jank, memory, CPU, startup distributions, or a real low-end device. No V5.2 performance run was performed during this documentation task.

## Measurement protocol before release

### Record the test conditions

For every capture, record:

- App version, source revision/build type, device model, chipset/RAM if known, Android/iOS version, display refresh setting, resolution, font scale, theme, motion setting, battery/thermal state, and fixture size.
- Route and exact actions, cold versus warm launch, network state, and whether test content is disposable/local. Never clear or replace a user’s production database to create a performance fixture.
- Tool and raw artifact (for example, Android Studio profiler or Perfetto trace). Keep the trace and its interpretation together.

Use the same build configuration, device, and script when comparing revisions. Separate emulator results from physical-device results and debug builds from release-like builds.

### Required scenarios

- [ ] Cold start and warm resume, with multiple valid runs. Report each sample and a distribution (median and range; use a larger sample before presenting a percentile). Do not compare a single old sample to a new median as causal evidence.
- [ ] Home initial paint and navigation to Home, path, lesson, Review, Reader, and result screens.
- [ ] Scroll a representative long vocabulary list, review queue, story list, and deck list with realistic large fixtures. Capture frame timeline/jank and memory while scrolling and after leaving the route.
- [ ] Rapid progress changes, current-path pulse active/inactive, route back/foreground transitions, and theme changes. Repeat with OS/app reduced motion enabled.
- [ ] Reader with a large supported document and multiple chunks; test page navigation, word selection, keyboard, and resume without changing persistence semantics.
- [ ] Speaking composer and keyboard show/hide; writing surface/stylus flow; tab navigation and dialogs/sheets.
- [ ] Lower-end supported Android hardware; add iOS profiling if iOS is a supported target.

### Metrics and reporting

Report cold/warm startup distributions, frame-time/jank observations for named scenarios, memory observations, CPU where available, route transition duration, and whether the result is repeatable. Include both the test conditions and limitations. Choose release budgets with the product/release owner before declaring a metric pass; this document does not invent a universal device budget.

The target display refresh rate varies by device and settings. Report measured behavior against that tested device; do not promise 60 FPS or call a build “60 FPS certified” from a short spot check. Export duration and bundle size are not runtime frame-rate measurements.

| Scenario | Device/build/fixture | Samples/artifact | Result and accepted budget | Status |
| --- | --- | --- | --- | --- |
| Cold/warm startup | TBD | TBD | TBD | Not measured for V5.2 |
| Long-list scroll and memory | TBD | TBD | TBD | Not measured for V5.2 |
| Reader large document | TBD | TBD | TBD | Not measured for V5.2 |
| Motion on/off and route transitions | TBD | TBD | TBD | Not measured for V5.2 |
| Lower-end physical device | TBD | TBD | TBD | Not measured for V5.2 |

## Performance guardrails for implementation

- Prefer static composition and simple local opacity/transform changes. Keep animation localized; do not animate layout for every row in a long list.
- Keep animations interruptible and lifecycle-safe. Clean up loops and listeners on inactive state, route blur, background, and unmount where applicable.
- Honor OS Reduce Motion even if the app setting is `full`. A motion setting is not permission to make a study action wait.
- Keep list rendering virtualized where the current route already uses it; avoid duplicating large arrays or reading complete Reader documents when the current chunk/page data is sufficient.
- Do not add remote image/sound loading, heavy visual packages, or high-resolution decorative backgrounds as an incidental polish change. Such work requires measured value and explicit scope.
- Preserve DB state and route behavior. Performance work must not remove content or reduce visual fidelity in ways that change meaning just to make a benchmark look better.

## Release interpretation

If a scenario was not profiled on a named device/build with saved evidence, mark it **not measured**. If a regression appears, reproduce it on the same conditions, identify the owning route/component, record before/after samples, and re-run the matching functional and accessibility gate. Do not publish the historical v0.1.23/v0.1.25 numbers as the current V5.2 result.

