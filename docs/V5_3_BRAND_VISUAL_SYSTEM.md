# 4Chinese V5.3 — Brand & visual system

Date: 2026-10-06

## Direction

V5.3 gives the main learning destinations a recognizable illustrated identity: a calm landscape, a clear lesson/course focus, and visual tones that distinguish learning, reading, voice practice, and progress. The existing theme remains the source of semantic colors; the work does not replace the app-wide theme or introduce a second color-token system.

## Composition rules

- Lead with one destination-specific hero, then the task or next action. Avoid stacking several equally prominent summary cards.
- Use the native navigation title/back action once. When a page's body already supplies its own hero heading, use `Screen.hideHeader`; when only the duplicate body title is redundant, use `Screen.hideTitle` and retain the explanatory subtitle.
- Keep HSK level, lesson state, XP, counts, due items, and speaking summaries sourced from the existing app/database. Never invent progress to make a screen look populated.
- Keep exam, settings, import, and other task-focused tools restrained; the landscape is for learning destinations, not a universal background.

## Theme and surfaces

`LearningLandscape` selects theme-aware warm paper/green or cool blue and voice-mauve variations. Interactive surfaces continue to use `useTheme()` and the shared semantic values (primary, success, warning, skill colors, border, and surfaces). A representative Practice screen was verified in system dark mode; this is not a full dark-mode pass across all routes.

## Source of truth

- `src/components/visual/LearningLandscape.tsx`
- `src/components/Screen.tsx`
- `src/constants/design.ts` and `src/theme/ThemeProvider.tsx`

