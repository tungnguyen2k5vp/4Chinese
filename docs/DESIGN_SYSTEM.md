# 4Chinese design system

## Source of truth

- Semantic light/dark palettes live in `src/theme/tokens.ts` and are supplied by `ThemeProvider`.
- `ThemeMode` supports `system`, `light`, and `dark`; the preference remains in the existing settings JSON and does not require a database migration.
- Use `useTheme()` for colors and `useThemeStyles()`/a theme-parameterized style factory for component styles. Use `themedCard(theme)` for card surfaces.
- Keep `src/constants/design.ts` spacing, radius, typography, and static `colors` only as a compatibility bridge for screens not yet migrated. Do not add new UI against that static palette.

## Semantic color roles

`background`, `backgroundSecondary`, `surface`, `surfaceElevated`, `surfacePressed`, text roles, `border`, and `divider` describe structure. `primary` is the action/fill color; `primaryText` is its readable text/icon counterpart. `success`, `warning`, `error`, and `info` are foreground/status colors; `onPrimary`, `onSuccess`, `onWarning`, and `onError` are labels placed on those filled backgrounds. `*Soft` tokens are status containers, not status text.

HSK/skill/tone colors are content categories. Keep labels and icons meaningful without relying on color alone. Light HSK badge colors are contrast-tested against white labels.

## Layout and typography

- Spacing: 4, 8, 12, 16, 24, 32 dp.
- Radius: 10, 16, 22 dp, and pill.
- Minimum new interactive target: 48 dp.
- Keep a clear page-title / section-title / body / caption hierarchy; Hanzi may use a dedicated display size.
- Avoid all-caps Vietnamese paragraphs and prevent truncation at larger font scales.

## Verification

`src/theme/tokens.test.ts` enforces WCAG AA 4.5:1 for semantic text/status roles on theme surfaces, filled-action/status label contrast, and white labels on HSK badges. This validates palette values only; it does not certify every screen or replace device visual checks. Legacy static-color screens remain a migration item; see `DARK_MODE.md` and `ENGAGEMENT_PHASE2_AUDIT.md`.
