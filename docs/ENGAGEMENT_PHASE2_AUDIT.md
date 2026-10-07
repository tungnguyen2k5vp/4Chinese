# Engagement Phase 2 audit — 1 Oct 2026

Scope: retention + adaptive engagement + production polish. This audit uses the current working tree and distinguishes source implementation from release evidence. The phone build received a limited install/launch smoke test, not complete device certification.

| Checkpoint | Source status | Evidence / open item |
|---|---|---|
| A. Theme foundation | Implemented | Semantic light/dark tokens, persisted `system/light/dark`, explicit foreground/background status roles, and contrast tests; compatibility palette remains for gradual migration. |
| B. Full dark mode | Source migration broadly implemented; visual certification pending | Home, onboarding, HSK/path/lesson, learn/review, stats/profile/settings, vocabulary/decks/import, grammar/reader/stories/cloud, speaking, mistakes, and writing surfaces now consume theme tokens. See `DARK_MODE.md`; both palettes still need route-by-route device review. |
| C. Motion and feedback | Shared source implementation complete; manual route review pending | OS/app reduced motion, spring press, progress cleanup, pulse guard, haptic fallback. Automated tests do not certify device feel or every overlay. |
| D. Home polish | Source implemented | Local next-action, daily tasks, quick sessions, comeback/fatigue logic. Device visual/perf review remains. |
| E. Learning path | Source implemented | Course progress, activities, persisted completion evidence. Full route visual review remains. |
| F. Lesson/SRS/practice | Source rollout implemented | Learn/path, review, writing, speaking, grammar, and deck practice routes use shared semantic surfaces; SRS rules are unchanged by this visual checkpoint. Accessibility/device review remains. |
| G. Achievement/statistics | Source implemented, visual certification pending | Data-backed XP/weekly goal/achievement content; achievement route now uses semantic theme. |
| H. Mascot architecture | Internal implementation/spec complete | Bundled neutral vector guide; replacement art must be owned/licensed and supplied in variants. |
| I. UI sound | Safe fallback complete; assets pending | Service and manifest are silent by default; no licensed sound files supplied. |
| J. Analytics + flags | Offline-safe source implementation | Analytics properties allowlist/screen-name union and exception-safe flags; no remote provider configured. |
| K. Accessibility + performance | Automated/source checks pass; manual certification pending | Semantic controls/progress and palette tests are in place. TalkBack, large-font, full-screen contrast, memory/jank and cold-start checks require a device. |
| L. Release hardening | Local ARM64 release-build/update smoke test passed; broader release certification pending | `npm run check`: lint, TypeScript, 90 test files / 312 tests, Android JS export passed. APK 0.1.25/code 27 (91,365,962 bytes), signed with the repository's debug keystore for local testing, updated in place; `MainActivity` opened and Home labels/progress were visible. Five cold starts: 1,196–1,309 ms, median 1,214 ms (single-device sample). Not Play Store-signed. Accessibility/performance route checks remain. |

## Data boundary

The theme/motion/accessibility polish does not modify SQLite/SRS behavior. The broader worktree contains pre-existing user changes and is intentionally preserved; this report does not attribute those changes to this checkpoint.

## Decision

Do not label Phase 2 fully release-certified until B and K are visually/manual-tested and L has a successful install-and-smoke test. Automated source verification is recorded separately from device evidence.
