# Accessibility V5.2 — Source Status and Release Gates

Status: source-level safeguards and palette tests exist; this document does **not** claim full accessibility conformance or device certification. Manual gates below remain open until someone records results against the V5.2 build.

## How to read this document

- **Implemented in source** means the audited code contains the behavior described. It does not mean every route was tested with assistive technology.
- **Automated check exists** means a test file asserts a narrow property. No test command was run while authoring this document.
- **Release gate** means manual or build verification still required. Do not mark it complete from a screenshot, source inspection, or palette test alone.
- Historical device notes in `ACCESSIBILITY_UI.md` concern an older 0.1.25 / versionCode 27 build; they are not V5.2 evidence.

## Current source baseline

### Theme and contrast

`src/theme/tokens.ts` currently provides light/dark semantic colors, including page/content surfaces, selected/disabled surfaces, a reading background, inverse text, status foreground/background pairs, a level-keyed HSK palette, and skill colors. `ThemeProvider` resolves the existing `system | light | dark` setting. These tokens are implemented source; having a token does not certify that every screen uses it correctly.

`src/theme/tokens.test.ts` contains narrow numerical assertions in both theme objects:

- Selected text/status foreground roles have contrast ratio at least 4.5 against `background` and `surface`.
- `onPrimary`, `onSuccess`, `onWarning`, and `onError` have ratio at least 4.5 against their filled color.
- Each current `skillColors` foreground has ratio at least 4.5 against `surface`.
- White has ratio at least 4.5 on each HSK badge color in both theme palettes, and `hskByLevel` matches the seven-color band ordering.
- The test checks a few token relationships/existence, including `surfaceRaised`/`surfaceElevated` and `readingBackground`.

This test does not measure a rendered screen, overlays or alpha compositing, every theme surface, custom route colors, focus indication, color-vision use, or readability at a given font size. In particular, the current test does not calculate text contrast on `readingBackground`, `backgroundSecondary`, `surfaceSelected`, or `surfaceDisabled`. Do not describe the current test as WCAG certification or a full contrast audit.

### Semantics and interaction

- `PrimaryButton` exposes button role and label, disables press while disabled/loading, and uses a 48 dp minimum height.
- `MotionPressable` exposes button role, optional label, and disabled state. The label is optional at the component boundary, so each call site still needs review.
- `AnimatedProgressBar` exposes progressbar role, optional label, and numeric current value. Confirm that each production call site supplies a useful localized label.
- `EmptyState` exposes its title as a header, hides its decorative mark from accessibility traversal, and can render primary/secondary actions. This is shared source behavior, not proof that every empty/error/loading state has an appropriate action or copy.
- `ToolHub` headings and actions have header/button roles, labels/hints, and a 76 dp row target. Other screens do not inherit those guarantees automatically.
- The route tree uses Expo Router and five tabs. Accessibility labels, selection state, focus order, live announcements, and back behavior must be checked per flow.

### Motion

`src/hooks/use-reduced-motion.ts` reads the OS Reduce Motion preference and app `motionMode`; an OS change event updates the hook, and the app can further choose `reduced` or `off`. `Screen` also checks the OS setting and skips its entrance transition when motion is reduced/disabled. `MotionPressable`, `AnimatedProgressBar`, and `PulseRing` contain motion-aware behavior. Haptics are separately opt-in and are not a replacement for visual status.

There is a source-level fallback difference to verify: `Screen` treats a failed OS preference read as reduced motion; `useReducedMotion()` catches the same read failure without changing its initial `false` state. Verify this on supported platforms and align behavior if the fallback could expose motion against a user’s preference. No device or OS-preference test was run in this documentation pass.

## V5.2 manual gates

Record build identifier, device/OS, screen size, font scale, theme, motion setting, route, test date, outcome, and evidence. A failed or untested item remains open.

### Contrast, status, and color independence

- [ ] Review rendered light and dark screens at normal and high display contrast. Include body copy, muted labels, disabled controls, chips, selected controls, error/success banners, chart labels, dialogs, toasts, keyboard surfaces, and overlays.
- [ ] Measure actual rendered foreground/background pairs for the reading surface and every newly introduced card/hero/color. Test alpha-blended states on their final background.
- [ ] Verify status and selection remain understandable without color: visible words/icons, accessible state, and distinguishable shape/border where appropriate.
- [ ] Review HSK and skill labels at small and large text sizes; categories must have text labels and must not imply mastery or correctness.
- [ ] If a contrast failure is fixed by a token change, extend the token test to cover the affected pair. Keep a separate route-level visual check.

### Text resizing and layout

- [ ] Test Android font/display scales 1.0, 1.3, and 1.5 on a compact and a larger supported screen. Add iOS Dynamic Type checks if iOS remains supported.
- [ ] Check screen titles, tab labels, Vietnamese diacritics, pinyin tone marks, Hanzi prompts, long meanings, buttons, helper/error text, charts, forms, and bottom actions for clipping, overlap, truncation, or unreachable controls.
- [ ] Keep content scrollable when it grows; verify the keyboard does not cover the active field or action. Confirm back/submit controls remain reachable.
- [ ] Verify no `allowFontScaling={false}` or fixed-height wrapper defeats system scaling without an approved, tested exception.

### TalkBack and focus

- [ ] On a current Android build, navigate representative routes and the full route manifest using TalkBack without touch exploration shortcuts. Include Home, HSK, vocabulary/search/detail, lesson, Learn, Review/session/result, Reader, writing, speaking/permissions, exam/session/result, profile/settings, decks, and dialogs.
- [ ] Confirm Vietnamese labels describe the action and context; icon-only controls are named; decorative art is skipped; repeated controls have distinguishable labels.
- [ ] Confirm focus order follows visual order, selected/checked/disabled/expanded states are announced, progress exposes a useful value, and no modal or sheet traps focus after dismissal.
- [ ] Confirm errors and answer feedback announce once and do not announce a long transcript or every list update. Confirm focus moves intentionally after route transitions and submission.
- [ ] If iOS is supported, repeat representative VoiceOver flows; Android results do not establish VoiceOver behavior.

### Reduced motion, theme, and system bars

- [ ] Toggle the OS Reduce Motion setting both before launch and while a route is open. Check page entrance, press feedback, path pulse, progress changes, celebratory states, and any new artwork animation.
- [ ] Test app `full`, `reduced`, and `off` preferences independently from OS preference; OS Reduce Motion must take precedence. Confirm the reduced state is conveyed without animation.
- [ ] Switch `system/light/dark` while navigating. Check text/surface/status colors and the Android status bar on each theme.
- [ ] `src/app/_layout.tsx` currently themes the React Native `StatusBar` and stack header; the tabs layout themes its tab bar. No explicit navigation-bar color/icon API call was found in the audited app source/config. Verify the Android gesture/three-button navigation area and platform edge-to-edge behavior on devices; inspect iOS safe areas if supported.
- [ ] Check notches/cutouts, system bars, modal edges, orientation policy, keyboard, and bottom tabs together. A themed status bar alone does not prove all system chrome is readable.

### Permissions and assistive alternatives

- [ ] Verify microphone, speech-recognition, file-picker, photo, and notification permission grant/deny/revoke flows. Each denial needs an understandable recovery path and a usable non-microphone/non-network alternative where one exists.
- [ ] Verify writing canvas, charts, audio controls, and token-selection interactions expose a meaningful accessible alternative or explanation; do not claim a canvas is fully accessible from button labels alone.

## Evidence and sign-off

`docs/UI_QA_SCREENSHOT_PLAN_2026-10-06.md` records a 60-route Android emulator capture at font scale 1.0 and explicitly lists TalkBack/font-scale/theme checks as pending. It also records a prior exam result transition crash and onboarding footer overlap; re-run those flows and update their status from current-build evidence rather than assuming they were fixed.

`docs/ACCESSIBILITY_UI.md` includes a limited older-build physical smoke note (0.1.25 / code 27). It does not certify the current 0.1.33 / code 35 source, the V5.2 visual state, TalkBack speech/focus, large type, iOS, or every route. This documentation pass did not run a device, TalkBack, VoiceOver, or font-scale test.

Release status remains **not accessibility-certified** until all applicable gates above have current, reproducible evidence and blocking findings are closed or explicitly accepted by the release owner.

