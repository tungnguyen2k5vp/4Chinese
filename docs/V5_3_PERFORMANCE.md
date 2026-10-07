# 4Chinese V5.3 — Performance & runtime notes

Date: 2026-10-06

- The new landscape is inline `react-native-svg`; it adds no image network requests, bitmap assets, or package dependency.
- Screens continue using the app's existing data hooks/SQLite queries. UI work does not add polling, background synchronization, or duplicated data caches.
- TypeScript, lint, the complete Vitest suite, and `npx expo export --platform android` passed after the final source pass. The export produced an Android Hermes bundle (22 MB); this is a JavaScript bundle artifact, not an APK-size or release-performance result.
- Representative dynamic-font (160%) and system dark-mode captures were made on the emulator; exact coverage is listed in `V5_3_ACCESSIBILITY.md`. No frame-time benchmark, memory profiler, release-build benchmark, or low-end physical-device run was performed. The target phone was intentionally not installed/updated.

## Emulator runtime

The current-source screenshot pass used an Android 16 x86_64 emulator at 1080×1920 px / 420 dpi. A fresh debug launch showed the offline-data loading state and reached Home after approximately 30 seconds; this is a single observation, not a controlled startup benchmark. Replacing a stale Metro process and binding the local server on IPv4 restored the dev-client connection. The app loaded and the 60-route capture set was produced.

A debug APK was built and installed only on the emulator. No release APK, frame-time/memory profile, low-end physical-device benchmark, or physical-phone install/update was performed. The physical phone remained untouched.

