# Retention and production-polish phase audit

## Implemented in source

- Home picks a next action from local state, prioritizing due review, a resumable course, available new vocabulary, then the daily plan.
- Quick sessions offer 3, 5, or 10 minutes. Due review is preferred before new cards, and the quick-session budget does not rewrite the daily goal or SRS schedule.
- A comeback prompt appears after at least one full local calendar day without study; fatigue guard uses recent review outcomes without changing SRS intervals.
- Daily reminders are opt-in, default off, locally scheduled, and configurable. Reminder content avoids vocabulary/account data; tapping navigates to the daily plan.
- Analytics defaults to no-op and now drops free-form/user data before any configured provider; flags have deterministic offline defaults and exception-safe reads/refresh.
- Theme foundation supports system/light/dark; semantic tokens now cover the main Home, learning, review, vocabulary/deck, HSK/path, grammar/reader, speaking, mistakes, and writing routes and shared primitives. Source migration is broad; visual parity is not yet device-certified.
- Shared press/progress/pulse motion respects OS/app Reduce Motion; progress animations clean up on change/unmount.
- Empty learn/review queues do not produce false abandoned-session events.

## Data and safety guarantees for this polish

- No SQLite schema, vocabulary row, due date, or SRS algorithm was changed by the theme/motion/privacy changes in this checkpoint.
- Reminder settings remain backward-compatible JSON fields; older settings hydrate from defaults with reminders disabled.
- The v0.1.25/code27 update was installed in place after explicit user authorization. Future upgrades must still use `adb install -r` only after authorization; never uninstall/data-clear as part of an upgrade.

## Remaining release evidence

- Lint, typecheck, 90 test files / 312 tests, and Android JS export passed. ARM64 release-build APK 0.1.25 (91,365,962 bytes / 87.1 MiB; local debug-keystore signature, not Play Store signing) built and installed in place.
- Route-by-route dark/light visual review, TalkBack and large-text checks remain manual.
- In-place Android 0.1.25 upgrade and Home launch smoke test passed on the connected Realme device (`MainActivity`, Vietnamese labels/progress visible; no uninstall/data clear). Five cold starts measured 1,196–1,309 ms (median 1,214 ms), but low-end performance, reminder permission/delivery, TalkBack, large-text and route-by-route theme checks remain open.
