# APK size audit — V5 baseline (2026-10-01)

Measured existing V4-compatible baseline APK with .NET ZIP inspection after successful Gradle `:app:assembleRelease`: 214,282,440 bytes (~204.36 MiB). SHA256 `03AF63C2C40C450D220EB421FA3D68BE8C11DB11DC00AE4DA35F764AC34A0F81`. Four ABI universal build, version 0.1.25/code 27. This artifact is not a final V5 release and was not installed.

| Contributor | ZIP compressed bytes |
| --- | ---: |
| x86 native libraries (28 entries) | 46,821,360 |
| x86_64 native libraries (28 entries) | 46,784,160 |
| arm64-v8a native libraries (28 entries) | 42,726,384 |
| armeabi-v7a native libraries (28 entries) | 28,419,144 |
| Root entries including DEX (33) | 22,580,329 |
| Assets (31) | 21,636,834 |
| Resources (1,358) | 4,018,773 |

Native multi-ABI libraries dominate. Smaller ABI-specific internal artifacts or store-generated AAB splits should be evaluated against the actual device ABI, signing and module requirements; do not remove OCR/Digital Ink/audio modules blindly. No asset/font/module deletion was made to chase size. Debug-client tooling is included and production signing/minification/device QA remain release gates.

No cold-start/memory/per-frame performance result is inferred from APK size or bundling. Device measurement is NOT TESTED because ADB found no connected device.

## Final internal V5 artifact

`android/app/build/outputs/apk/release/app-release.apk`: **214,451,512 bytes (~204.52 MiB)**, +169,072 bytes (~0.08%) versus baseline. SHA256 `59A2AF797B112C4950D2642FAACC94B97A3D2EC1A92EF50A29E8F21D20816F74`.

Gradle `:app:assembleRelease` PASS in 2m1s, 905 tasks (80 executed / 825 up-to-date), JDK19 override. `aapt dump badging` confirms package `com.tungnguyen2k5vp.fourchinese`, versionName **0.1.26**, versionCode **28**, minSdk24/targetSdk36. `apksigner verify --print-certs` PASS; **Android Debug** internal certificate SHA256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. This verifies APK integrity, not signing compatibility with an inaccessible installed phone app.

| Contributor | Final ZIP compressed bytes |
| --- | ---: |
| x86 | 46,821,360 |
| x86_64 | 46,784,160 |
| arm64-v8a | 42,726,384 |
| armeabi-v7a | 28,419,144 |
| Root entries including DEX | 22,752,267 |
| Assets | 21,805,905 |
| Resources | 4,018,773 |

Native ABI sizes unchanged. No large audio corpus/dependency was added. Build warnings include Gradle deprecations, cross-drive hard-link fallback and existing manifest replace tags; none failed assembly. Final ADB device list empty: **not installed / no actual upgrade-retention evidence / no hardware performance result**. Production key/debug-client removal/minification still need a separately authorized, tested release workflow.
