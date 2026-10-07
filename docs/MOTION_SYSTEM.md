# Motion and interaction feedback

## Principles

- Motion communicates a state change and never delays a study action.
- Keep press feedback brief, progress animation one-shot, and avoid looping decoration in study flows.
- Do not add list-wide layout animations to large vocabulary/review lists.

## Shared primitives

- `MotionPressable` uses a short spring scale and optional selection haptic. The haptic service catches unsupported-device failures.
- `AnimatedProgressBar` clamps its value, exposes a semantic progressbar value, stops the prior animation before replacing it, and cleans up on unmount.
- `PulseRing` is decorative and stops its loop when inactive or motion is reduced/disabled.
- `PrimaryButton` suppresses scale feedback when OS or app Reduce Motion is active.

## Preferences

`AccessibilityInfo.isReduceMotionEnabled()` always wins. The app setting supports `full`, `reduced`, and `off`; `reduced`/`off` remove non-essential motion, and `off` also disables the app's motion feedback. Haptics remain separately opt-in.

## Performance caveat

Native driver is used for opacity/transform; progress width necessarily uses a small JS-driven layout animation. Verify rapid progress updates, long lists, background/foreground transitions, and low-end-device frame pacing before release. Do not infer device performance from bundle export.
