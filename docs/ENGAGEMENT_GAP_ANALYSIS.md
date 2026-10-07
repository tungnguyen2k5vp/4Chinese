# Engagement / retention gap analysis — 1 Oct 2026

This replaces the earlier gap list, which no longer reflected the current tree. Status below is source-level and is not device certification.

## Source implemented

- Home next-action selection, daily task card, quick 3/5/10-minute sessions, comeback prompt, and local fatigue guard.
- Local opt-in reminder settings and notification navigation; default remains off.
- Learning-path progress/activities, achievement and weekly-goal views, and shared feedback/progress components.
- OS/system and manual theme preferences, reduced-motion setting, provider-neutral analytics/flags, and silent sound fallback.
- Current polish adds contrasting foreground/container roles, dynamic theme on the main learning flow/path lesson/achievement views, cleanup for interrupted progress animations, privacy allowlisting for analytics, exception-safe flag fallback, and semantic high-contrast foregrounds for Home/Vocabulary labels.
- Route inventory: all 42 route entry points render a themed screen or delegate to a themed child; the pronunciation route is a wrapper around the themed native screen.

## Open before calling the mobile experience complete

1. Manually inspect all major routes, sheets, dialogs, keyboard states, and large-font behavior in both themes; source coverage does not replace visual verification.
2. Complete TalkBack-only navigation, notification denial/grant/delivery, microphone/speech failure, and real study-session accessibility checks.
3. Expand performance evidence to representative low-end Android devices and longer interaction sessions. Current post-install cold-start data is five runs on one Realme and is not a cross-device benchmark.
4. Remote analytics/feature flags and licensed UI sound/illustration assets are intentionally not configured; they require privacy/license review and external setup.

## Data-safety boundary

This design/engagement polish does not alter SQLite schema, vocabulary rows, due dates, or SRS intervals. The phone was updated with `adb install -r`; no uninstall or data clear was performed. Existing unrelated working-tree changes are not audited by this summary.
