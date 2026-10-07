# 4Chinese V5.3 — Accessibility QA

Date: 2026-10-06

## Implemented/preserved

- Semantic labels remain attached to the main action cards, progress bars, and controls; state is expressed in text as well as color.
- `LearningLandscape` is decorative and hidden from the accessibility tree.
- Existing theme semantic colors and contrast tests remain in use. The app keeps its explicit locked/current/completed text labels and in-app error/retry path on the redesigned statistics surface.
- Redundant in-content headings were removed on the Practice, Library, Speaking, and Achievements hubs. `Screen.hideTitle` is used where explanatory copy remains useful. Native back navigation remains available.
- Reduced-motion entrance behavior and the app's shared motion control are unchanged.

## Verification limits

The full test suite passed (155 files / 856 tests), including existing accessibility/theme tests. The current-source 60-route emulator screenshot pass was captured at 1080×1920 px, 420 dpi, font scale 1.0; see the [final manifest](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.3-final.csv). A temporary 160% system font scale was also checked on Practice, Path, and AI roleplay; labels wrapped and the scrollable layouts remained usable in the captured viewport. Practice was checked in system dark mode and the semantic surfaces remained legible. These font/theme runtime checks predate the final-pass additions. Emulator settings were restored to font scale 1.0/light mode afterward.

The final-pass tone options expose radio state and readable tone labels; empty-state SVG artwork remains decorative, with meaning supplied by nearby text. This was not a runtime TalkBack/VoiceOver audit. Font scale 200%, dark mode across every route, switch access, and every focus order remain unverified and must not be described as complete. Screens were captured for all routes, but a screen-reader/focus-order review is still pending.

Representative captures: [Practice at 160%](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/practice-font-160.png), [Path at 160%](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/path-index-font-160.png), [AI roleplay at 160%](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/speaking-ai-font-160.png), [Practice dark mode](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/practice-dark.png), [current-source Speaking/Tones](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/speaking_tones.png), [current-source Exam result](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/exam_result.png).

