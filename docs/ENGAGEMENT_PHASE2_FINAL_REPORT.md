# Engagement Phase 2 — final source report

**Status: source implementation, automated checks, and local-device update smoke test complete; not a full release certification.**

The implementation has adaptive local study planning, quick sessions, reminder opt-in, learning-path progress, semantic theme/motion primitives, safe analytics/feature-flag boundaries, and external-asset fallback specifications. This checkpoint broadens theme-token coverage across onboarding, learning, vocabulary/decks, grammar/reader, speaking, mistakes, and writing, while preserving SRS/data logic and improving animation cleanup/reduced-motion behavior and analytics privacy filtering.

The audit status of each A–L checkpoint is in `ENGAGEMENT_PHASE2_AUDIT.md`. Theme migration is broadly present in source, but route-by-route visual parity and full physical accessibility/performance certification are still outstanding. Version 0.1.25 has been installed on the connected phone in place.

## Verification

- `npm run check`: lint passed, TypeScript passed, 90 test files / 312 tests passed, Android JavaScript export passed (Hermes bundle about 20 MB).
- Android release-build APK built with JDK 19 and `arm64-v8a`: 91,365,962 bytes (87.1 MiB) at `android/app/build/outputs/apk/release/app-release.apk`; package/version verified as `com.tungnguyen2k5vp.fourchinese`, 0.1.25/code 27. It uses the repository's debug keystore for local testing (not Play Store signing); its signer SHA-256 matched the installed app.
- `adb install -r` succeeded on Realme RMX3085 (Android 13/API 33); no uninstall/data clear was used. Package manager reports versionCode 27 and versionName 0.1.25; `MainActivity` opened and the Home accessibility tree exposed Vietnamese labels and due-review progress. No fatal crash appeared in the recent log sample.
- Five post-update cold starts measured 1,196–1,309 ms (median 1,214 ms); the pre-update 1,152 ms baseline is only one run, so this does not establish a performance change.
- Source/export checks do not measure runtime performance, theme rendering, or accessibility on the device.

## Release blockers / handoff

- Verify both palettes route-by-route on Android; source migration alone does not certify visual parity.
- Run TalkBack/large font/notification permission and delivery checks, plus route-by-route visual review in both themes.
- Repeat performance measurements on low-end devices and longer sessions; the current cold-start set is a limited single-device sample, not a performance certification.
- Configure no remote analytics/flags and no UI sound assets until privacy, licensing, and deployment review are complete.
