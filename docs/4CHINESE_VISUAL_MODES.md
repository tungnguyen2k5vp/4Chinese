# 4Chinese Visual Modes

Status: presentation-only mode identifiers and recipes are implemented in `src/theme/visual-modes.ts`, with limited screen-level call sites. These are not user-selectable/persisted settings and are not part of `ThemeTokens` or `UserSettings`. The route map is a default classification, not proof that every route has the corresponding visual treatment or has been visually tested.

## What a visual mode means

A visual mode describes the emotional tone and information density of a route. It is a styling/context choice only: it must not change routing, feature availability, curriculum, exam timing, SRS, session state, data persistence, scoring, or permissions. Resolve the default mode from the route’s purpose; if a shared detail route has a genuine existing source context, a future implementation may inherit that presentation context without persisting it.

The modes consume the semantic light/dark palette in `src/theme/tokens.ts`. They are not extra themes and must not create a second palette. `visualModePresentation` currently supplies a presentation recipe to the course detail, Reader, Review session, Exam center, and Exam result routes; many other routes still use their existing shared theme without a mode-specific treatment. Respect app/system Reduce Motion and the 48 dp control guidance in `docs/4CHINESE_DESIGN_SYSTEM_V2.md`.

## Mode recipes

| Mode | Learner intent | Visual recipe | Feedback and motion | Avoid |
| --- | --- | --- | --- | --- |
| `LEARN` | Discover and encode new knowledge; guided practice | Warm but structured. Use one prominent next action, visible progress, small skill-color markers, and the Learning Guide when it adds reassurance or context. Keep cards scannable and provide helpful explanations. | Brief correct/try-again state and a next step; subtle one-shot progress. Milestone celebration only when the existing product state actually reaches a milestone. | Confetti for every answer, using color as the only correctness cue, multiple competing primary cards, invented curriculum context. |
| `REVIEW` | Retrieve known material and repair gaps | Quiet and focused. Give the active prompt generous space; keep secondary stats and navigation visually subordinate. Keep choice states distinct and easy to compare. | Immediate, concise correct/incorrect feedback; one-shot transitions. Honor Reduce Motion; haptic remains opt-in. | Mascot as a persistent focal element, streak/XP pressure, repeated celebration during a recall loop, motion that delays the next card. |
| `READ` | Read sustained Chinese content and optionally inspect words | Calm, paper-like reading surface within the current theme. Favor a readable line length, comfortable line height, clear paragraph/chunk boundaries, and restrained chrome. Let the original text remain the focal point. | Minimal transition motion; selection feedback only when a token is deliberately selected. | Decorative gradients behind text, dense toolbars, surprise scrolling, reduced contrast in “paper” mode, changing saved position semantics. |
| `EXAM` | Complete timed, assessment-like practice | Neutral and predictable. Prioritize question, response controls, remaining time, and explicit navigation/submission state. Make the layout stable and high-contrast. | Only feedback needed to communicate an action/state; no celebratory interruption during an active exam. Avoid reflow that can obscure the timer or answer. | Mascot, confetti, XP popup, gamified pressure, novel colors that resemble correctness before submission, automatic navigation changes not already required by the flow. |
| `UTILITY` | Find, manage, configure, or inspect app content | Functional and consistent with the rest of the app. Use semantic headings, search/filter hierarchy, row/divider patterns, explicit destructive-action affordances, and clear empty/loading/error/retry states. | Press state and status announcements; no decorative animation. | Oversized hero treatments, redundant cards around every row, unlabeled icon-only actions, hiding recovery actions in prose. |

These recipes should be applied without changing the app’s existing feature behavior. In particular, “milestone” is a visual-feedback condition, not authorization to create new reward logic.

## Route-to-mode map

This is the current default classification in `visualModeForRoute`. It is presentation-only and is not used as a universal router wrapper. Routes with distinct subflows (for example, speaking practice versus recording management) have explicit exceptions; keep those exceptions covered by tests.

| Mode | Default routes |
| --- | --- |
| `LEARN` | `/`, `/onboarding`, `/daily/*`, `/learn/*`, `/path/*`, `/grammar/*` except `/grammar/focus`, `/writing/*`, `/listening/*`, and `/speaking/*` except `/speaking/pairs` and `/speaking/recordings`; tab Home and HSK routes. |
| `REVIEW` | `/review/*`, `/mistakes/*`, `/confusables/*`, `/grammar/focus`, `/speaking/pairs`, `/decks/quiz`, `/decks/listening`, and `/decks/pronunciation`. |
| `READ` | `/reader/*` and `/stories/*`. Reading content within a lesson can use the local reading surface while the enclosing lesson retains its learning workflow. |
| `EXAM` | Every `/exam/*` route: exam center, readiness, skills, session, result, written practice, and timed speaking. Keep the exam session/results visual identity neutral. |
| `UTILITY` | Remaining tabs (vocabulary, statistics, profile), HSK/reference routes outside the HSK tab, global search, library, deck list/detail/editor/bulk-add/trash, speaking recording management, cloud backup, achievements, and internal content-review routes. |

The five bottom tabs remain unchanged: Home, HSK, Vocabulary, Statistics, and Profile. Route mode must not become a reason to rename or remove destinations.

## Application rules

1. **Theme first.** Theme determines readable surface/text/status pairs. Mode cannot override contrast or force light mode.
2. **Mode second.** Mode determines composition, density, and how much decoration is appropriate. It can select token-backed recipes; it cannot alter behavior.
3. **Category third.** Skill/HSK colors identify what content is being studied. Semantic status always takes precedence when a component reports success, error, warning, or disabled state.
4. **No implicit persistence.** Do not add a stored mode preference or a database migration for route intent. Use the existing theme and motion settings as-is.
5. **Accessible states.** Every selection/status uses text or an icon plus color, and exposes its role/value/state to assistive technology.
6. **Motion stays optional.** Reduced motion removes non-essential animations; no mode can override the OS setting. Do not put loops in study lists.
7. **Navigation is stable.** Keep current routes, tab structure, back behavior, and deep-link semantics. If a design requires a new route, get explicit product approval separately.
8. **Use existing data only.** Progress, streaks, next actions, lesson locks, exam results, and review counts must continue to derive from their current sources. Do not invent contextual curriculum or achievements to fill a screen.

## Implementation boundary

Keep the typed descriptor separate from `ThemeMode` (`system/light/dark`) and `motionMode` (`full/reduced/off`). Do not expose mode selection as a new profile setting. Before extending mode styling, audit call sites rather than changing a shared `Screen` default; that component serves learning, reading, utility, and exam routes. Do not treat route classification as a substitute for interaction/state testing.

## Validation matrix

For each mode, review at least one representative route in both light and dark themes and at large text size. Also test its empty/loading/error/success/disabled cases, keyboard/focus behavior, OS reduced motion, and a route/back transition. A palette unit test is not sufficient evidence that a mode is readable or that a route’s full content fits.

| Mode | Representative screen | Specific regression risk |
| --- | --- | --- |
| `LEARN` | Home and a populated path lesson | Progress/action hierarchy must not change; lesson completion still happens once. |
| `REVIEW` | Populated review session and result | Answer feedback and SRS scheduling remain unchanged; no new state on revisit. |
| `READ` | Saved multi-chunk Reader document | Current chunk/token page and durable resume position remain intact. |
| `EXAM` | Active exam and submitted result | Timer/answers/persistence/back behavior remain stable; retest the known submit-to-result Android crash documented in `UI_QA_SCREENSHOT_PLAN_2026-10-06.md`. |
| `UTILITY` | Vocabulary search and profile settings | Search/filter/settings semantics and keyboard behavior remain unchanged. |

