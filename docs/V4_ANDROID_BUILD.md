# APK thử V4 — 2026-10-01

Đã build thành công, **chưa cài** và không phải bản phát hành lên store.

## Bằng chứng

- Command: `android/gradlew.bat :app:assembleRelease -Dorg.gradle.java.home=C:/Program Files/Java/jdk-19 --console=plain`.
- Gradle: BUILD SUCCESSFUL, 1m12s, 905 tasks (60 executed / 845 up-to-date).
- SDK path được cấu hình trong `android/local.properties` (ignored), không thay biến Java hệ thống.
- APK: `android/app/build/outputs/apk/release/app-release.apk`.
- Package: `com.tungnguyen2k5vp.fourchinese`.
- Version: `0.1.25`, versionCode `27`; đây là cùng version hiện có, chưa bump cho release.
- minSdk 24 / targetSdk 36; universal APK với bốn ABI.
- Size: 214.282.440 bytes (~204,36 MiB), tại 15:33:05 UTC+7.
- SHA256: `03AF63C2C40C450D220EB421FA3D68BE8C11DB11DC00AE4DA35F764AC34A0F81`.
- `apksigner verify --verbose --print-certs`: exit 0, Verifies, v2 true.
- Certificate: Android Debug, SHA256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

Tên task `assembleRelease` không biến debug signing thành production signing.
APK kiểm tra nội bộ, không upload store hoặc tuyên bố nghiệm thu thiết bị.

## Còn phải nghiệm thu

Install/update không mất dữ liệu cũ; microphone grant/deny/revoke; background/interruption;
TalkBack, font-scale, safe area, offline restart; cold/warm launch, memory và scroll.
Release thật cần keystore quản lý an toàn, versionCode tăng và artifact final đã kiểm tra.
Không đọc keystore secrets, xóa database, cài APK hoặc push GitHub trong lượt này.

JDK25 mặc định gây lỗi CMake/Worklets trong môi trường này; chỉ override Gradle bằng JDK19 cho build thử.
Warnings hard-link C→D chuyển sang copy và Gradle deprecation không làm build thất bại.
