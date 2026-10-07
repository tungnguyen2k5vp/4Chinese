# Android native build fix — react-native-worklets

## Hiện tượng

Với source hiện tại (`Expo 57`, `React Native 0.86.3`, `react-native-worklets 0.10.1`, New Architecture bật), release build bằng JDK `25.0.3` dừng tại:

```text
:react-native-worklets:configureCMakeRelWithDebInfo[arm64-v8a]
WARNING: A restricted method in java.lang.System has been called
```

Stack trace cho thấy lỗi phát ra từ AGP `GeneratePrefabPackagesKt` khi đọc output của external native build, không phải từ TypeScript/Metro hay schema SQLite.

## Nguyên nhân đã xác nhận

Môi trường đang dùng Gradle `9.3.1` với JDK `25.0.3`. Chuỗi AGP/CMake/Prefab hiện tại của Expo/RN không xử lý ổn cảnh báo restricted method của JDK 25 trong task `GeneratePrefabPackages`. Cùng source, cùng dependency và cùng task đã build thành công khi chạy bằng JDK `19`.

Đây là sự cố toolchain, không phải lý do để hạ RN, hạ worklets, tắt New Architecture hoặc thay đổi ABI một cách ngẫu nhiên.

## Cách build reproducible

PowerShell:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-19'
$env:Path = $env:JAVA_HOME + '\bin;' + (($env:Path -split ';' | Where-Object { $_ -notmatch 'Java\\jdk-' }) -join ';')
Set-Location 'D:\ReactJS\HocTiengTrungApp\android'
.\gradlew.bat --stop
.\gradlew.bat app:assembleRelease --stacktrace --no-daemon
```

Kết quả đã xác nhận: `BUILD SUCCESSFUL`.

## Artifact kiểm tra

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- Kích thước: `215,362,076` bytes
- SHA-256: `A92689F3383DA047453D9DF8CBEC66BDD1C572D2FFBAC16C4FC612CBC1584EE6`
- Release hiện dùng debug keystore theo template Expo; chưa phải production signing.

## Không làm trong bản sửa này

- Không đổi version RN/Expo/Reanimated/Worklets.
- Không tắt New Architecture.
- Không bỏ ABI để che lỗi.
- Không xoá `.cxx`, database, app data hay cài đè lên thiết bị trước khi hoàn thành data-retention QA.

## Việc cần cố định trong CI/release

1. Chọn JDK 19 (hoặc JDK được AGP/Expo hiện hành xác nhận tương thích) trong CI và ghi ra log `java -version`.
2. Kiểm tra `JAVA_HOME`, Gradle, AGP, NDK và CMake trước build.
3. Chạy `app:assembleRelease`, kiểm tra APK/signature/manifest, rồi mới cài đè bằng `adb install -r` nếu thiết bị được cấp quyền.
4. Nếu nâng AGP/Expo sau này, phải chạy lại matrix JDK và giữ một fixture reproduce lỗi worklets.

## Trạng thái

- Toolchain workaround: **ĐÃ XÁC NHẬN**.
- Production signing: **CHƯA XÁC NHẬN**.
- Device install/launch/retention: **CHƯA TEST** tại thời điểm baseline.
