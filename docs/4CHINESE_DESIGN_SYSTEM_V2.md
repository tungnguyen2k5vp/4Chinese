# 4Chinese Design System V2

Status: design specification for the V5.2 visual overhaul. This document distinguishes existing source from proposed guidance; it does not claim that the V2 recipes have been implemented or visually certified.

## Purpose and source of truth

The system should make the app feel coherent while keeping its current learning, review, exam, offline-data, navigation, and accessibility behavior intact. Presentation changes are not permission to change SRS scheduling, progress records, identifiers, or SQLite contents.

Existing theme source of truth:

- `src/theme/tokens.ts` defines `ThemeTokens`, light/dark palettes, semantic surfaces/text/status roles, HSK/skill/tone colors.
- `src/theme/ThemeProvider.tsx` resolves the stored `system | light | dark` preference and exposes `useTheme()` / `useThemeStyles()`.
- `src/constants/design.ts` supplies spacing, radius, a small type-size scale, and compatibility colors. Its static colors are a migration bridge, not the palette for new work.
- `docs/DESIGN_SYSTEM.md`, `docs/DARK_MODE.md`, `docs/MOTION_SYSTEM.md`, and `docs/ACCESSIBILITY_UI.md` describe the current contracts and their verification limits.

Use theme-aware styles for new or redesigned surfaces. Existing shared APIs such as `themedCard(theme)`, `Screen`, `PrimaryButton`, `MotionPressable`, and `AnimatedProgressBar` are available. Avoid parallel palettes or a screen-local design system.

## Three orthogonal semantic layers

These layers answer different questions. Apply them together; never use a category color to communicate an interaction state.

### 1. Theme and semantic role — “what does this color do?”

The light/dark theme owns structural and status colors. Use these existing roles rather than raw hex values:

| Role | Existing token examples | Use |
| --- | --- | --- |
| Page and hierarchy | `background`, `backgroundSecondary`, `surface`, `surfaceElevated`, `surfacePressed`, `border`, `divider`, `overlay`, `shadow` | Page canvas, nested surfaces, pressed state, separators, overlays |
| Text | `textPrimary`, `textSecondary`, `textMuted` | Main content, supporting copy, low-emphasis labels |
| Action | `primary`, `primaryPressed`, `primarySoft`, `primaryText`, `onPrimary` | Action fill, subtle action container, readable foreground |
| Status | `success`, `onSuccess`, `successSoft`; equivalent `warning`, `error`, and `info` roles | Correct/incorrect, warnings, and neutral information |

Filled backgrounds use their corresponding `on*` foreground token. Soft status tokens are containers, not a substitute for readable status text. `ThemeTokens` already has distinct dark-mode status foreground/background roles; preserve that separation.

### 2. Experience mode — “what should this activity feel like?”

The source now defines a presentation-only `VisualMode` type and route recipes in `src/theme/visual-modes.ts`. These modes may guide density, surface treatment, accent use, illustrations, and motion, but must not change business rules or become a new persisted user preference. This is not a user-selectable setting, and screen integration remains partial. Route mapping and recipes are specified in [4CHINESE_VISUAL_MODES.md](4CHINESE_VISUAL_MODES.md).

Mode recipes consume the semantic theme tokens above. They do not introduce a second set of colors or override contrast requirements.

### 3. Content category — “what skill or level is this?”

Skill and HSK colors are labels for content category, not status. They should be used sparingly on badges, small markers, and chart series; keep a visible text label or icon alongside them. Never imply mastery, correctness, availability, or urgency using category color alone.

Current `theme.skill` mapping from `src/theme/tokens.ts`:

| Category | Token | Current shared color |
| --- | --- | --- |
| Vocabulary | `skill.vocabulary` | `#2457D6` |
| Listening | `skill.listening` | `#08776F` |
| Speaking | `skill.speaking` | `#9B4E8C` |
| Reading | `skill.reading` | `#9A6B16` |
| Grammar | `skill.grammar` | `#5F4EB2` |
| Hanzi / writing | `skill.hanzi` | `#C24E3A` |
| Review | `skill.review` | `#16754F` |

Current `theme.hsk` order follows the `HskBand` union in `src/types/models.ts`: HSK 1, 2, 3, 4, 5, 6, and 7–9. The seven current colors are `#2457D6`, `#08776F`, `#9A6B16`, `#9B4E8C`, `#C24E3A`, `#5F4EB2`, and `#273A67`, respectively. Keep band labels visible (for example, `HSK 7–9`) and map by the explicit band value/order, not by an unrelated list index where the order could drift.

`theme.tones` is a distinct learning-content palette for tone-related UI. It must not be repurposed for success/error states.

## Color and contrast rules

- Existing `src/theme/tokens.test.ts` checks semantic text/status contrast against light/dark `background` and `surface`, filled action/status foreground pairs, and white text on the light HSK badge colors. This is a palette test, not screen certification; the HSK check does not currently iterate a dark-mode HSK badge background.
- Before extending a palette or adding a filled badge, provide a readable foreground pair and cover the pair in a contrast test. Do not assume that a category color is an accessible text color.
- Status must be conveyed with copy and/or a recognizable icon as well as color. Keep category and status legible in grayscale and color-vision simulations.
- Avoid translucent light literals inside a dark theme. In particular, migrate screen-local literals to semantic roles when changing those surfaces.
- Read `docs/DARK_MODE.md` as source-coverage context, not as proof that every route, overlay, keyboard state, or font size has been visually checked.

## Layout, spacing, shape, and density

Current shared spacing is 4, 8, 12, 16, 24, and 32 dp (`src/constants/design.ts`). Current radii are 10, 16, and 22 dp plus pill. Continue using these values instead of adding near-duplicates. Reserve the largest gaps for major section transitions; keep related labels and controls close enough to read as a group.

New interactive controls should have a minimum 48 dp touch target. Some existing controls are smaller; the V5.2 pass should review them rather than treating old dimensions as a standard. Provide generous hit slop only as a supplement, not a substitute for visible target size. Avoid fixed-height text containers that clip Vietnamese diacritics, pinyin marks, or enlarged text.

Card roles:

- **Page surface:** the screen canvas, not a card.
- **Content card:** `surface` with a quiet border or shadow; use `themedCard(theme)` where its existing spacing/radius fit.
- **Raised card:** reserve `surfaceElevated` for a real overlay, menu, or hierarchy step, not every section.
- **Soft semantic container:** use `primarySoft` or a status `*Soft` token only when it supports an action/status relationship.
- **Learning hero:** one leading, high-priority card per learning surface at most; its main action and progress should remain obvious without large decorative art.

Avoid placing every row in a heavily shadowed rounded card. Use spacing, divider, and typography to express list hierarchy.

## Typography: Vietnamese, Hanzi, and pinyin

### Existing state

`src/constants/design.ts` currently has only `caption: 12`, `body: 15`, `subtitle: 18`, `title: 24`, `hero: 36`, and `hanzi: 48`. No shared font-family roles or dedicated pinyin scale were found in source during the audit. Use platform font fallback for Vietnamese and Chinese glyphs; do not force a font that drops Vietnamese marks or Hanzi coverage. The following V2 scale is a proposal for consistent screen work, not a claim about current token exports.

### Proposed role scale

Sizes are dp/sp in React Native text styles. The second number is a suggested line height; allow text to grow with accessibility font scaling.

| Role | Vietnamese / Latin | Hanzi / Chinese | Pinyin |
| --- | --- | --- | --- |
| Metadata | 12 / 16, regular or semibold | Avoid Hanzi as the only metadata label | 12 / 18 |
| Body | 16 / 24, regular | 18–20 / 28–30 inline | 14–16 / 22–24 |
| Emphasis | 18 / 26, semibold | 24–28 / 36–40 | 18 / 26 |
| Section heading | 20 / 28, bold | 28–32 / 40–44 when it is the section subject | 18 / 26 |
| Screen title | 24 / 32, bold | Use only when the screen title itself is Chinese | 18–20 / 28–30 when paired below a Vietnamese title |
| Display / study prompt | 30–36 / 38–46, bold as needed | 44–56 / 56–68 for a featured single word | 20–24 / 30–34 |

Apply these rules:

- Vietnamese is the primary instruction language. Preserve correct accents and sentence case; do not set body paragraphs in uppercase.
- Present a Chinese study item in the order supported by the activity (Hanzi, pinyin, Vietnamese meaning); do not make pinyin the only readable identifier.
- Keep pinyin diacritics intact. Use a line height that prevents tone marks from colliding with the line above.
- Avoid text baked into illustration assets. Screen-reader text and localization belong in app UI.
- Avoid truncating Vietnamese help, errors, or the actual Chinese prompt. For compact labels, wrap or adapt the layout before reducing below a readable size.
- Do not bundle a new typeface unless glyph coverage, license, APK size, rendering, and accessibility scaling have been checked. No custom font was found in the audited source.

## Buttons, choices, and icons

- Use `PrimaryButton` for the single primary action, with secondary/ghost/danger variants for subordinate actions. Loading and disabled states must remain visible and semantically exposed.
- Use `MotionPressable` for reusable press feedback and opt-in haptic; do not stack multiple scale/opacity animations on the same hit target.
- Group related choices with a visible selected state plus accessible checked/selected semantics. Category color alone is not a selected-state indicator.
- Use the existing Ionicons set for interface icons. Keep a consistent visual weight and familiar metaphors; pair unfamiliar icons with labels. Do not use emoji or a Chinese glyph as the sole action label.
- Decorative icon/art should be hidden from assistive technology when adjacent text already conveys the same meaning; informative art needs a concise accessibility label.
- An icon-only control requires a meaningful localized accessibility label, a visible focus/pressed state, and at least a 48 dp target.

## Motion and feedback

Keep the current contracts documented in `docs/MOTION_SYSTEM.md`: motion communicates state without delaying study, large lists do not receive layout-wide animations, OS Reduce Motion takes precedence, and haptics are optional. Prefer one-shot state transitions and progress. A loop is reserved for a necessary, localized cue and must stop when inactive or reduced/disabled.

Use `playFeedback` for existing semantic haptic/sound routing. Haptic failures are already caught and cannot block a learning action. The UI sound manifest is currently intentionally silent; see [4CHINESE_VISUAL_ASSET_SPEC.md](4CHINESE_VISUAL_ASSET_SPEC.md). Never make correctness, completion, or navigation dependent on audio.

## Review checklist

- [ ] Every new color has an explicit semantic role and foreground pair; no new static screen palette.
- [ ] Light and dark appearance, including selected, disabled, error, empty, loading, and success states, is checked.
- [ ] Skill/HSK labels remain understandable without hue.
- [ ] Vietnamese, Hanzi, and pinyin follow the type roles and wrap at large font scale.
- [ ] Interactive targets meet 48 dp unless a platform-native control has a documented exception.
- [ ] TalkBack labels/state, keyboard focus, and reduced-motion behavior are checked on the actual route.
- [ ] Visual work leaves IDs, routes, SRS, session outcomes, offline persistence, and migration contracts unchanged.

