# Phần Android native cho hồ sơ XGame

Ngày cập nhật: 03/11/2026. 4Chinese vẫn là ứng dụng **React Native/Expo/TypeScript**; phần bổ sung là **một Activity Kotlin luyện viết** và luồng trả/lưu kết quả, không phải viết lại cả ứng dụng thành native Android.

## Mở demo

1. Cài APK portfolio trên thiết bị thử; APK cấu hình release nhưng dùng khóa debug hiện có, dành cho sideload/demo.
2. Mở phần luyện nhớ/viết Hán tự, ở khung viết chọn **“Luyện viết toàn màn hình ↗”**.
3. Viết vài nét → Hoàn tác → xoay màn hình → Xóa hết. Khi có model: nhận diện → chọn gợi ý → trở lại RN, xem lịch sử và mở lại ứng dụng.
4. Nếu chưa có model, dùng nút tải khi có mạng. Sau khi tải, nhận diện có thể chạy ngoại tuyến. Chọn gợi ý lưu **metadata luyện viết riêng**, không ghi tiến độ/XP hay thay đổi lịch ôn; trở lại mà không chọn thì không tạo lượt luyện.

APK hiện tại: [4Chinese-android-portfolio-2026-11-03.apk](../../outputs/project-upgrades-2026-11-03/4Chinese-android-portfolio-2026-11-03.apk).

Có thể mở phiên bổ trợ chữ 请 bằng deep link trên emulator đã cài app:

```powershell
adb -s <EMULATOR_SERIAL> shell am start -a android.intent.action.VIEW -d '4chinese://memory/session?character=%E8%AF%B7' com.tungnguyen2k5vp.fourchinese
```

Lần đầu trên emulator mới, app đã mất khoảng 5 phút rưỡi để khởi tạo dữ liệu học. Đây là quan sát trên máy ảo của lượt kiểm tra, chưa phải benchmark điện thoại. Mở app và chuẩn bị sẵn trước buổi trình bày; không xóa dữ liệu học để xử lý chậm.

## Phần cần tự hiểu

| File | Vai trò |
|---|---|
| `src/components/HanziHandwritingPad.tsx` | Nút mở màn hình native, chỉ hiện khi bản cài hỗ trợ |
| `src/services/handwriting/recognizer.ts` | Kiểm tra module/input/result; chờ `openPractice`, đọc/ack hàng đợi |
| `src/db/native-practice.ts` | Bảng lịch sử SQLite, validation, ghi theo UUID không trùng, 5 lượt gần nhất theo chữ |
| `src/db/migrations.ts`, `schema.ts` | Migration 46 → 47 thêm bảng riêng |
| `src/db/backup-repository.ts`, `src/services/backup/format.ts` | Backup/restore lịch sử; backup cũ không có trường này vẫn giữ lịch sử trên thiết bị |
| `modules/digital-ink-recognition/android/src/main/java/expo/modules/digitalinkrecognition/DigitalInkRecognitionModule.kt` | Expo bridge dùng activity result contract, chờ kết quả/hủy, chặn mở hai lần đồng thời |
| `modules/digital-ink-recognition/android/src/main/java/expo/modules/digitalinkrecognition/NativePracticeActivity.kt` | Android View/Canvas, MotionEvent, Bundle, ML Kit và vòng đời recognizer |
| `modules/digital-ink-recognition/android/src/main/java/expo/modules/digitalinkrecognition/PracticeResult.kt` | Result contract và hàng đợi SharedPreferences, commit trước khi đóng Activity |
| `modules/digital-ink-recognition/android/src/main/AndroidManifest.xml` | Khai báo Activity `exported=false` |

Nét được lưu dưới dạng tọa độ chuẩn hóa và thời điểm; Bundle khôi phục khi Activity tái tạo. Giới hạn 64 nét/2.048 điểm để không phình bộ nhớ/state. `onDestroy` đóng recognizer, callback kiểm tra Activity đã đóng trước khi cập nhật UI.

Kết quả gồm UUID, chữ tham khảo, gợi ý đã chọn, số nét và thời gian; không lưu ảnh/nét vào lịch sử. Gợi ý và UUID sống qua xoay màn hình. Native giữ tối đa 50 kết quả chờ; RN chỉ ack sau khi SQLite ghi thành công. Ghi lại cùng UUID không tạo lượt trùng; dữ liệu khác cùng UUID bị từ chối. Khi lỗi lưu, kết quả còn trong hàng đợi để thử lại lúc mở/foreground; hàng đợi đầy thì giữ màn viết và báo lỗi. Bảng này tách khỏi review/SRS/XP.

Mô hình ML Kit cần được tải qua nút riêng; không tự tải khi mở màn hình. Chưa có mô hình thì vẫn viết/hoàn tác/xóa, nút nhận diện bị khóa. Sau khi có mô hình có thể nhận diện offline. Kết quả nhận diện **không chấm thứ tự nét, không xác nhận viết đúng**.

## Chạy lại kiểm tra UI

Chỉ dùng emulator thử nghiệm, mở màn native trước, chờ kiểm tra mô hình hoàn tất:

```powershell
python scripts/check-native-practice.py --serial <EMULATOR_SERIAL> --output <THU_MUC_KET_QUA> --recognize
```

Nếu dùng ADB server riêng, thêm `--port <PORT>`. Script dùng Python stdlib, từ chối thiết bị không phải emulator; thử viết hai nét, xoay ngang/dọc, hoàn tác, xóa và hủy về RN. `--recognize` thử tải model khi thiếu, tắt Wi-Fi/data của máy ảo, xác minh không có default route, nhận diện thật, xoay giữ gợi ý, chọn/lưu và force-stop/mở lại kiểm tra lịch sử không mất/trùng. Script phục hồi mạng và thiết lập xoay sau khi chạy. Dùng phiên bổ trợ chữ 请 theo deep link ở trên; thao tác script tạo lịch sử thử nghiệm nên chỉ dùng dữ liệu thử.

Ngày 03/11 đã đạt kiểm tra trên máy ảo API 36.1: nét/undo/clear/hủy, xoay giữ nét và gợi ý, nhận diện ML Kit thật khi ngắt mạng, trả kết quả về RN/SQLite và giữ đúng một bản ghi sau force-stop/mở lại. [Kết quả JSON](../../outputs/project-upgrades-2026-11-03/android-qa/native-check-result.json); ảnh ở [thư mục QA](../../outputs/project-upgrades-2026-11-03/android-qa). Chưa thử nhiều điện thoại thật hoặc tình huống hệ điều hành tự hủy tiến trình đúng lúc result đang chờ; cơ chế replay/hàng đợi và UUID đã có kiểm tra dữ liệu, nhưng không coi đó là bằng chứng end-to-end cho mọi tình huống process death.

Kiểm tra SQLite/backup:

```powershell
npx vitest run src/db/native-practice.test.ts src/db/migrations.test.ts src/services/backup/format.test.ts
```

Đã đạt 17 test/3 file: nâng cấp database v46, replay/xung đột UUID, dữ liệu sai, SRS/review không đổi, backup/restore và backup cũ. TypeScript kiểm tra phạm vi các file sửa và ESLint đã đạt. `npx tsc --noEmit` toàn repo hiện còn lỗi trong các file Supabase `_shared/chinese-ai-gateway.ts` và `chinese-ai-registry.ts` ngoài phần thay đổi này; xem [ghi nhận kiểm tra](../../outputs/project-upgrades-2026-11-03/KIEM_TRA.md).

Build kiểm tra:

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-19'
$env:GRADLE_USER_HOME='C:\Users\Admin\.gradle'
cd android
.\gradlew.bat :app:assembleRelease --offline --no-daemon --max-workers=2 '-PreactNativeArchitectures=arm64-v8a,x86_64'
```

Máy này dùng JDK 19 và Gradle cache đã có; máy mới có thể cần mạng để tải toolchain/dependency. APK ở `android/app/build/outputs/apk/release/app-release.apk`. TypeScript/ESLint phần TS được sửa đã kiểm tra; Kotlin được biên dịch trong bản APK.

Xem kết quả và giới hạn cụ thể trong [tài liệu bàn giao mới](../../outputs/project-upgrades-2026-11-03/BAT_DAU_TAI_DAY.md). Trước khi ghi CV, tự đọc và sửa một chi tiết nhỏ, ví dụ cách hiển thị số điểm viết; chỉ mô tả đóng góp bạn thực sự hiểu. Các chức năng cũ và thay đổi có sẵn trong repo không được tự động tính là phần bổ sung của lượt này.
