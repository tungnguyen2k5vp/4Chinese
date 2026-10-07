# 4Chinese V5.3.1 — Visual QA & capture record

## Kết quả capture hậu cập nhật

- Contact sheet tuyển **18 ảnh màn hình sản phẩm** từ phiên runtime ngày 2026-10-06. Thư mục lưu 27 PNG tổng cộng, gồm ảnh đại diện, ảnh Reader/listening bổ sung, keyboard diagnostic và ảnh lỗi khởi chạy; không tính toàn bộ 27 file là màn hình nghiệm thu. Ảnh được tạo từ APK debug/dev-client V5.3.1 trên Android emulator `emulator-5556` (Android 16 / API 36, 1080×2400, 420 dpi); Metro chỉ kết nối cục bộ qua ADB reverse.
- Bộ ảnh ở trên được chụp trên emulator; sau đó, theo yêu cầu riêng của người dùng, APK standalone đã được cài kiểm tra trên điện thoại thật. Chi tiết triển khai nằm ở mục dưới.
- Đây là ảnh debug dev-client: nút bánh răng nổi che một phần header. Chúng cho thấy giao diện sau update nhưng **không phải ảnh release sạch** và không xác nhận release status bar.
- Contact sheet: [`contact-sheet-v5.3.1.jpg`](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/contact-sheet-v5.3.1.jpg). Ảnh PNG gốc nằm trong [`screens-v5-3-1-runtime`](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/). Chụp ảnh lỗi mở app (`initial.png`, `retry.png`) không nằm trong contact sheet và không được tính là màn hình sản phẩm.

## Ảnh trong contact sheet

| Màn hình | Ảnh |
|---|---|
| Trang chủ | [home.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/home.png) |
| Chọn HSK, bảy chip | [hsk_selector.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/hsk_selector.png) |
| Thống kê trống | [stats_empty.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/stats_empty.png) |
| Thống kê sparse (10 phút phát sinh trong QA) | [stats_sparse.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/stats_sparse.png) |
| Thư viện nghe | [listening_library.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/listening_library.png) |
| Đã chọn câu nghe / TTS sẵn sàng | [listening_selected.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/listening_selected.png) |
| Listening nâng cao trống | [listening_empty.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/listening_empty.png) |
| Lộ trình HSK 1 | [path_course.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/path_course.png) |
| Sheet bài học mở | [path_sheet.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/path_sheet.png) |
| Sheet bài học đang khóa | [path_sheet_locked.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/path_sheet_locked.png) |
| Speaking AI, khung 360 dp | [speaking_small.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/speaking_small.png) |
| Speaking AI, chat/composer 360 dp | [speaking_chat_360.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/speaking_chat_360.png) |
| Speaking AI, cỡ chữ 160% | [speaking_font_160.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/speaking_font_160.png) |
| Reader landing | [reader.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/reader.png) |
| Reader thư viện cuộn xuống | [reader_lower.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/reader_lower.png) |
| Reader dán văn bản | [reader_add_text.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/reader_add_text.png) |
| Reader bản nháp sau khi tách | [reader_parse.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/reader_parse.png) |
| Thống kê tối / giảm chuyển động | [dark_reduced_motion.png](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/dark_reduced_motion.png) |

Manifest kết quả từng trường hợp ở [`capture-manifest-v5.3.1.csv`](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.3.1.csv). Trong 16 mục mục tiêu, 10 đã chụp và xem lại, 3 chụp một phần/có giới hạn, 3 chưa chụp; không quy các mục còn thiếu thành PASS.

## Giới hạn còn lại

- Home trong contact sheet vẫn là ảnh dev-client có gear; chưa lưu ảnh Home release từ điện thoại vào bộ screenshot QA. Bản standalone đã được mở trực tiếp trên điện thoại (chi tiết bên dưới).
- Listening đã chụp trạng thái câu được chọn và TTS sẵn sàng; chưa xác nhận âm thanh thực sự phát ra loa.
- Speaking đã chụp setup/chat/composer, nhưng emulator chỉ hiện IME tools panel chứ không có bàn phím QWERTY tiêu chuẩn; hành vi bàn phím chưa được nghiệm thu. Chưa kiểm tra TalkBack, 412 dp hoặc font 200%.
- Chưa có lượt ôn thật để chụp accuracy 0%; cũng chưa có fixture hội thoại/bài đọc đã lưu để mở hai hộp thoại xác nhận xóa. Không thực hiện thao tác xóa nào.
- Ảnh `stats_sparse.png` ghi nhận 10 phút do thời gian ở app trong QA, không phải số liệu học được seed; ảnh `stats_empty.png` được chụp trước khi thời gian tích lũy.
- Emulator đã trả về cấu hình thường: kích thước 1080×2400, font scale 1.0, animation scale 1.0, light mode.

## Cập nhật sau phiên chụp — cài standalone trên điện thoại

- Theo yêu cầu của người dùng ngày 2026-10-06, tạo [`app-release.apk`](../android/app/build/outputs/apk/release/app-release.apk) bằng `:app:assembleRelease -PreactNativeArchitectures=arm64-v8a`. APK chứa `assets/index.android.bundle` (~21 MB) và native ABI `arm64-v8a`; mở thẳng `MainActivity`, không cần Expo Go, Expo Development Launcher, Metro hay ADB reverse.
- Cài bằng `adb install -r` trên Realme RMX3085, Android 13 / API 33, ARM64. Package `com.tungnguyen2k5vp.fourchinese`, versionName `0.1.33`, versionCode `35`. Bản cũ được cập nhật tại chỗ; dữ liệu ứng dụng không bị xóa. Xác minh thêm: tiến trình app còn chạy ở `MainActivity` sau khi Metro dừng và ADB reverse bị gỡ.
- APK standalone ký bằng Android Debug certificate hiện cấu hình trong `android/app/build.gradle`; đây là gói sideload để người dùng xem thử, **không phải artifact production/Play Store**. Cần signing identity production và version/build number mới trước khi phát hành công khai.
- Lần cài đầu dùng nhầm APK x86_64 nên Android từ chối với `INSTALL_FAILED_NO_MATCHING_ABIS`; lệnh đó không thay đổi app. APK ARM64 standalone sau đó cài thành công. Ảnh chẩn đoán tạm từ điện thoại đã xóa; ảnh trong contact sheet vẫn chỉ là ảnh emulator.

## Đã xác minh ngoài ảnh

`npm run typecheck`, `npm test` (157 files / 863 tests), `npm run lint` và Android JS bundle export đã qua như ghi trong báo cáo cuối. Các kiểm tra đó không thay cho nghiệm thu release, keyboard, âm thanh, TalkBack hoặc những dialog còn thiếu.
