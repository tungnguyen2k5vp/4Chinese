# V5 baseline — 2026-10-01 (UTC+7)

Captured before V5 implementation, from the existing dirty V4 worktree. Existing changes were preserved; no reset, rekey, sync or SRS migration was performed.

| Check | Result / evidence |
| --- | --- |
| `npm run check` | PASS: lint, TypeScript, 111 test files / 377 tests; Android export 2,153 modules |
| `npx expo export --platform web --output-dir dist-v5-baseline` | PASS: 1,682 modules, browser bundle 23 MB |
| App | 0.1.25 / Android versionCode 27 |
| Database schema | 35 (`src/db/schema.ts`) |
| Content | global version 1; vocabulary 1, grammar/sentence 2; partial categories remain partial |
| Routes | V4 baseline 55 route files / 53 screens / 2 layouts |
| Physical device | `adb devices -l`: empty. Upgrade, retained data, permissions and TalkBack NOT TESTED |
| APK | PASS: `:app:assembleRelease` (JDK 19 override), 1m12s / 905 tasks; 214,282,440 bytes (~204.36 MiB), internal debug-signed universal artifact, NOT installed |

## Scope and protections

V5 extends current repositories and engines. Full Cloud Sync, scheduler replacement, destructive database operations and unofficial “Exam Ready” claims are out of scope. Settings/deck metadata sync wording stays unchanged. Official coverage is UNKNOWN without a licensed, versioned, reviewed reference. Original practice content is not an official exam.

No connected device means build/export results cannot be presented as device QA. Do not uninstall the existing app to bypass signing or upgrade issues.
