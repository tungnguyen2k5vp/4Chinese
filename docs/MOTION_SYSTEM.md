# Motion and interaction feedback

## Principles

- Motion communicates a state change and never delays a study action.
- Keep press feedback brief, progress animation one-shot, and avoid looping decoration in study flows.
- Do not add list-wide layout animations to large vocabulary/review lists.

## Companion and completion

- `visual/LearningGuide` uses original layered SVG artwork: a human companion with independent arm, head, eyes and book. Welcome waves for 1600 ms with two blinks. Interactive greetings cycle through wave, nod (900 ms) and high-five (1600 ms, a hand spark); greeting taps never select celebration.
- `celebrate` adds a small body jump, two radial rings and 20 rotating/falling particles during a finite 1600 ms timeline. Results pass `autoPlay={false}`: opening/re-entering results shows static art; tapping explicitly celebrates. Genuine lesson/deck completion retains its existing trigger. No completion callback, reward, timer, or persistence is attached to the animation.
- The home/onboarding greeting and genuine completion are interactive contexts. Practice/Library illustrations remain static; questions and individual answer feedback have no mascot. The earlier unDraw scenes are retained in the repository but no longer imported by this component; see `ASSET_CREDITS.md`.
- Only opacity and transforms use the native driver. Motion waits for the initial OS accessibility preference and consumes a mood/tap trigger once; focus and full/reduced changes do not replay it. Blur/background/unmount settle; reduced/off keep the static illustration, messages and completion text.
- A deck's `celebrate=learn` route parameter is presentation only, consumed on arrival; its banner can be dismissed and clears on blur. Existing session finalization, result counts, routes, SRS and progress writes retain their behavior.
- Warm canvas, jade actions and category-specific coral/amber/lilac surfaces use semantic light/dark tokens. `tokens.test.ts` checks normal text/category ink at 4.5:1 contrast.
- `node scripts/qa-playful-ui.cjs` checks isolated RN-web motion, result/deck UI, narrow layouts, dark theme and approximate 150% text. Set `QA_OUTPUT` for screenshots. It uses fixture reads and icon/audio stubs; native frame pacing, Android font scale and TalkBack require device checks.

## Interaction beyond completion

- `StudyTransition` keeps the original 280 ms question slide. Learn/review feedback blocks now reveal in 200 ms so text stays readable; the existing icon stamp is primary. MCQ feedback icons stay static because the option already stamps. Only the selected wrong option label shakes (220 ms, at most 5 px). Generic `success`/`error` primitives remain available. No animation callback submits, rates or advances a turn.
- `AnswerFeedbackIcon` stamps a check/cross for 360 ms: scale 0.45 → 1.18 → 0.96 → 1 and rotation -18° → 4° → 0°. Learn/review feedback and selected/correct review options follow existing answer state. Marks are decorative; explanatory text and selected semantics remain. Rapid reselection replaces the previous mark; blur/background/reduced/off settle it.
- Word details without a real `imageUri` use a local recall card instead of the decorative Hanzi placeholder. Tap/Enter flips in 320 ms between Hanzi/pinyin and the real meaning/first Chinese example. Only one face mounts. Audio is outside the flip target and can be explicitly played with general sound off. The existing bookmark and study actions retain their original persistence rules.
- `FlashcardFlip` accepts optional `active`; word details use screen focus to settle on blur. Background/reduced/off/turn change also settle to the requested face. Rapid flips retarget rather than queue; animation never updates a learning result.
- Review result statistics reveal from the existing counts, gated by screen focus; no XP, streak or unlock value is synthesized. Review hints reveal in 180 ms keyed by turn, without changing hint accounting or replaying on theme rerender.
- `reveal` fades content upward by 10 px: word-detail tabs, disclosure content, path lesson details and the first three groups in Practice/Library. Hub staggers cap at 120 ms. Later groups and large vocabulary lists do not animate individually.
- Disclosure arrows rotate for 180 ms. Expansion semantics update immediately; closing unmounts content immediately. Word tabs use `MotionPressable`, retaining tab/selected semantics. Transitions do not key/remount the notes input; unsaved text survives tab changes. Existing note-save results reveal in 180 ms with a static check/cross; errors never show a success mark.
- Audio playback uses the existing `PulseRing` only while the speech state is active. Its 1200 ms loop stops on playback end, stop, background and unmount; reduced/off use a static ring. Speech callbacks, playback rules and audio services are unchanged.
- Path markers pop once for the current lesson and the detail sheet reveals on open. Unlock rules, selected IDs, persisted lesson status and navigation callbacks remain unchanged.

## Shared primitives

- `MotionPressable` retargets a 100 ms ease-out scale on press/release (default 0.98), compensates the hit area, and resets on disabled/reduced motion/background. Selection haptic remains opt-in.
- `AnimatedProgressBar` clamps its value, exposes a semantic progressbar value, stops the prior animation before replacing it, and cleans up on unmount.
- `PulseRing` is decorative and stops its loop when inactive or motion is reduced/disabled.
- `PrimaryButton` shares that behavior: primary/danger scale to 0.97, secondary/ghost to 0.98; loading is disabled and announced as busy.
- `StudyTransition` animates only the learn/review question and feedback regions: opacity 0.7 → 1, translateX 12 → 0, 280 ms ease-out. First question skips entrance; turn identity includes index/pass. No input remount, animation completion callbacks, or delayed study actions.
- Progress stays at 360 ms; non-finite input maps to zero, finite input clamps to [0, 1]. Semantics always expose the real target, including on web. Backgrounding settles at that target.
- Learn/review guard both in-flight work and already submitted turns, including synchronous passes. Animation never submits or saves an answer.

## Preferences

`AccessibilityInfo.isReduceMotionEnabled()` always wins. The app setting supports `full`, `reduced`, and `off`; `reduced`/`off` remove non-essential motion, and `off` also disables the app's motion feedback. Haptics remain separately opt-in.

## Performance caveat

Native driver is used for opacity/transform. Progress width, measured disclosure height and the small SVG feedback stroke use the JS driver. Verify rapid progress updates, long lists, background/foreground transitions, and low-end-device frame pacing before release. Do not infer device performance from bundle export.

## Visible interaction follow-up

- Word Detail uses one shared selection pill travelling between its existing tabs in 320 ms, with a bounded 1.12x stretch. Selection/content update immediately; rapid input retargets the same pill. Resize, blur, background, reduced/off settle to the selected tab.
- `AnswerFeedbackIcon` draws its circle, then the check or two cross strokes over 360 ms, instead of scaling a complete stamp. The existing answer state is the only trigger. Decorative SVG remains hidden from accessibility; a static complete symbol is shown when inactive/reduced/off.
- Review's existing hint action expands its own card over 280 ms using `Disclosure`. The original hint/reveal handlers and assisted-answer rules remain unchanged. Disclosure content is mounted on opening, hidden from accessibility immediately on closing, and unmounted after collapse. This also gives the existing Chinese information disclosures a continuous open/close motion.
- Evidence and scope are recorded in [the interaction follow-up](MOTION_UX_V2_INTERACTIONS.md). Earlier V2 reports describe their captured baseline, not this follow-up.

Motion UX V2: [research](MOTION_UX_V2_RESEARCH.md), [native QA](MOTION_UX_V2_NATIVE_QA.md), [final report](MOTION_UX_V2_FINAL_REPORT.md). Native evidence uses an isolated Android API 36 x86_64 development-client APK and Metro, separate from RN-web fixture evidence and standalone release validation.

Run `node scripts/qa-motion-p1.cjs [path-to-playwright]` for isolated RN-web component checks (existing esbuild, Playwright and Edge required; `QA_BROWSER` can override the executable). This stubs optional haptics and simulates document visibility; it does not measure native frame pacing or real device lifecycle behavior.
