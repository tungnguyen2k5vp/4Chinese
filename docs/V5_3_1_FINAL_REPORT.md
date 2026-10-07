# 4Chinese V5.3.1 — Final report

Ngày: 2026-10-06  
Trạng thái: **Source refinement và automated checks hoàn tất; visual acceptance còn mở.**

## Nội dung đã cập nhật

- Bổ sung hệ scene SVG theo 8 mục đích và gắn vào các màn học, HSK, đọc, nghe, nói, thống kê, thành tích, onboarding.
- Đặt status bar style ở root theo theme; giữ override sáng riêng cho header xanh của kho từ.
- Cải thiện co ngang ở màn chung và Speaking AI; selector HSK/Listening là hàng cuộn ngang.
- Thống kê ẩn số liệu rỗng, lọc metric không có giá trị, không giả định tiến độ từ số lượng từ trong kho; empty state có đường vào `/daily?minutes=5`.
- Lộ trình dùng activity DB trong sheet, thu gọn khoảng dọc và giữ điều kiện mở bài/completion gốc.
- Listening ưu tiên chọn và nghe, bỏ hình waveform giả, giữ nhãn nguồn/TTS/DRAFT và hành vi play/stop.
- Một số slogan chuyển sang tiếng Việt. Xác nhận xóa bài đọc/tóm tắt hội thoại dùng modal trong app.
- Không thay đổi DB, HSK content, SRS, unlock, XP, Cloud Sync hoặc permission prompt của OS.

## Kết quả kiểm tra

- `npm run typecheck`: PASS.
- `npm test`: PASS, 157 test files / 863 tests.
- `npm run lint`: exit 0, 0 lỗi, 5 cảnh báo import-order còn lại trong hai test file vốn đã có ở baseline (`vocabulary-practice.test.ts`, `syllabus.test.ts`).
- `npx expo export --platform android --output-dir dist-v5-3-1-check`: PASS; bước này chỉ xuất Android JS bundle 22 MB, không tạo/cài APK. APK standalone được build và cài riêng sau đó, như ghi ở phần Runtime visual QA.
- Ở lượt visual QA ban đầu chỉ cài APK debug lên emulator. Sau đó, theo yêu cầu mới của người dùng, đã cài APK standalone kiểm tra lên điện thoại thật; xem phần Runtime visual QA bên dưới.

## Runtime visual QA — 2026-10-06

- Đã chụp và kiểm tra contact sheet gồm 18 ảnh sản phẩm trên Android 16 / API 36 emulator `emulator-5556`, chạy APK debug/dev-client V5.3.1. Thư mục có thêm ảnh phụ/diagnostic; APK chỉ cài vào emulator, điện thoại thật không bị tác động.
- Contact sheet và ảnh gốc: [Visual QA](V5_3_1_VISUAL_QA.md), [`contact-sheet-v5.3.1.jpg`](../artifacts/ui-audit-2026-10-06/screens-v5-3-1-runtime/contact-sheet-v5.3.1.jpg), [`capture-manifest-v5.3.1.csv`](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.3.1.csv).
- Trong 16 mục tiêu của manifest: 10 đã chụp/xem lại, 3 chỉ chụp một phần hoặc có giới hạn, 3 chưa chụp. Gear dev-client còn phủ một phần header; không coi các ảnh này là bản release sạch.
- Sau đó đã build và cài [`app-release.apk`](../android/app/build/outputs/apk/release/app-release.apk) standalone ARM64 lên Realme RMX3085 / Android 13 bằng `adb install -r`. JavaScript được đóng gói trong APK; app chạy trực tiếp ở `MainActivity` khi Metro đã dừng và ADB reverse đã gỡ. Dữ liệu ứng dụng được giữ.
- Đây là sideload để xem thử, chưa phải bản phát hành: `build.gradle` ký release bằng Android Debug certificate; version vẫn `0.1.33` / code 35. Cần keystore/identity production và tăng version trước khi phát hành ra store.

## Còn mở — chưa phải nghiệm thu hoàn chỉnh

1. Nếu phát hành ra store: cấu hình signing identity production và tăng build number; APK cài thử hiện dùng Android Debug certificate, không dùng đưa lên Play.
2. Kiểm tra bàn phím thật/keyboard resize, viewport 412 dp, font 200% và TalkBack. Emulator chỉ hiện IME tools panel nên trạng thái bàn phím chưa nghiệm thu.
3. Chụp accuracy 0% sau lượt ôn có denominator thật; chụp xác nhận xóa Reader và Speaking khi có fixture đã lưu. Hiện không có ảnh hai dialog và không có dữ liệu nào bị xóa.
4. Xác nhận âm thanh Listening/TTS qua thiết bị; ảnh hiện tại chỉ chứng minh giao diện trạng thái sẵn sàng.
5. Các destructive confirmations còn lại ở deck/cloud/profile/audio vẫn cần audit riêng. Không thay OS permission prompts.

Chi tiết giới hạn, ảnh từng màn và cấu hình emulator được ghi tại [Visual QA](V5_3_1_VISUAL_QA.md), [Responsive QA](V5_3_1_RESPONSIVE_QA.md), [Audit](V5_3_1_UI_REFINEMENT_AUDIT.md).
