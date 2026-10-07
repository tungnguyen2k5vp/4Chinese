# Dark mode

## Behavior

- `system` (default) follows React Native `useColorScheme()`; explicit `light` and `dark` preferences override it.
- Preference is stored in `UserSettings.themeMode` within the existing settings JSON; older settings receive the safe default without schema/data reset.
- Root status bar, stack headers/content background, and bottom tabs read the active theme. The profile exposes the three modes.
- Theme tokens include separate action-fill/text roles (`primary`/`primaryText`) and foreground/background status roles (`success`/`onSuccess`, etc.) so brighter dark-mode text is not reused as a low-contrast button label.

## Current migration coverage

Theme-token migration is now broad across the main app routes: Home/tabs, onboarding/root, HSK and learning path/lesson, daily plan, learn and review (session/result/upcoming/weak), stats/profile/achievements, vocabulary and word detail, deck management/bulk-add/listening/quiz, grammar, reader, stories, cloud, speaking/shadowing/tones, mistakes, and handwriting/writing. Shared cards, controls, progress, and meaning-list components also use semantic tokens. Compatibility tokens remain where legacy components still depend on them; this is source coverage, not a claim that every pixel has been visually certified.

Writing canvases intentionally retain a light paper area for stroke/ink contrast; their surrounding UI, grid, and hints should still use theme-aware colors.

## Validation and release gate

- Palette tests cover semantic text/status contrast and filled-label contrast.
- `npm run check` passed: lint, TypeScript, 90 test files / 312 tests, and Android JavaScript export. This does not visually validate each route.
- Before calling dark mode complete, review every major route and overlay in both modes, including keyboard/input, disabled, empty, loading, error, and success states; check OS theme switching and large font scale on Android.
- Android release 0.1.25/code 27 (ARM64) was installed in place on the connected Realme device after package/signature verification; `MainActivity` opened with no recent fatal crash. The post-update Home accessibility tree exposed Vietnamese labels and review progress. An earlier review-screen screenshot also showed Hanzi/Vietnamese rendering legibly in the active light theme. These are limited single-screen checks, not visual certification of all light/dark routes. No uninstall/data clear was used.
- Home's small eyebrow and Vocabulary's brand label use `theme.onPrimary` rather than low-contrast pale-blue literals; the semantic palette test enforces at least 4.5:1 for `onPrimary` over `primary`.
