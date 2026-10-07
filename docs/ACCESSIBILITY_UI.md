# Accessibility and inclusive interaction

## Implemented in source

- Progress indicators expose role, label, and numeric values; learning feedback uses concise status text and polite live announcements.
- Shared buttons and pressables expose button roles and disabled state; settings use switch/radio semantics and selected/checked state.
- New controls target at least 48 dp; haptics are optional and do not block an action when unsupported.
- OS Reduce Motion is honored by shared press, pulse, and progress animations; app preferences may reduce motion further.
- Light/dark semantic text/status colors are checked at 4.5:1 in `src/theme/tokens.test.ts`; HSK solid badges are checked against white labels.
- Color is not the only success/error cue; copy and icons are present in the migrated learning surfaces.

## Not yet certified

Automated checks cannot establish TalkBack quality, every screen's contrast, or large-font layout. Manual Android checks remain required for the full route set and dialogs/sheets:

1. Navigate Home, HSK, vocabulary, path/lesson, review, writing, speaking, settings, and results using TalkBack only.
2. Verify useful Vietnamese labels, focus order, selected/checked state, and live success/error announcements.
3. Enable Android large font/display size and confirm no clipping/overlap, especially in lesson cards, charts, and handwriting controls.
4. Test system light/dark switching, reduced motion, and contrast on each route.
5. Test reminder permission denied/granted and delivery, plus microphone/audio permission/failure states.

## Physical-device smoke evidence (1 Oct 2026)

- Installed local release build `0.1.25` (`versionCode 27`) in-place on Realme RMX3085, Android 13/API 33, ARM64. No uninstall or app-data clear was performed.
- After launch, the Home accessibility tree exposed Vietnamese labels and current study/review progress. A prior review-screen hierarchy scan contained 35 nodes and 15 clickable controls; all 15 had a visible label or content description.
- UIAutomator verifies the Android node hierarchy only; TalkBack speech, focus order across routes, large-font layout, and permission flows remain manual gates.
- Home's small eyebrow and Vocabulary's brand label now use `theme.onPrimary`, which passes the existing 4.5:1 semantic contrast test. The installed build includes these changes.
