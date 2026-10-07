# 4Chinese V5.2 — Báo cáo hoàn tất

Ngày: 2026-10-06  
Phạm vi: cập nhật UI/UX, rà soát route và kiểm thử Android cho repository 4Chinese.

## Kết luận

Các thay đổi V5.2 đã được triển khai và qua bộ kiểm tra mã nguồn: 155/155 test files, 856/856 tests; TypeScript và Expo Android export đều thành công. APK debug cũng đã được build và cài lên emulator Android `emulator-5556`.

Đã chụp đủ 60/60 mục trong route manifest sau cập nhật, đối chiếu đúng tên tệp (0 thiếu, 0 thừa, 0 tệp rỗng) và rà soát cả 6 contact sheet. Bộ ảnh gồm 57 route deep link, chi tiết bộ từ QA và hai màn Exam chụp sau flow tương tác. Ảnh chạy từ development build nên còn nút nổi dev menu ở góc phải; đây không phải UI release. Ca `mistakes/practice` là negative test cố ý hiển thị alert “Không mở được bài”. Không triển khai lên Supabase hay production; điện thoại vật lý không bị sử dụng.

## Thay đổi đã thực hiện

- Chuẩn hóa semantic color/type tokens và hệ thống visual modes theo route.
- Onboarding: vùng lựa chọn có thể cuộn độc lập, giữ footer thao tác cố định.
- Reader: chuyển thành hub đọc tập trung, làm rõ xử lý nội dung trên thiết bị.
- Speaking AI: phân biệt kịch bản offline và AI, bổ sung công khai quyền riêng tư/consent; không gửi consent thay người dùng.
- Empty state: dùng thông điệp và hành động đúng trạng thái; màn ôn tập báo rõ khi chưa có từ đến hạn.
- Learning Path: gom nhóm chặng và trạng thái tiến độ dễ quét hơn.
- Exam: chế độ hiển thị trung tính; điều chỉnh chuyển màn kết quả để tránh lỗi native ScreenStack đã gặp.
- Story detail: tiêu đề điều hướng dễ hiểu hơn.

Không chủ đích thay đổi schema dữ liệu hoặc nội dung nghiệp vụ.

## Kết quả kiểm tra

| Gate | Kết quả |
| --- | --- |
| ESLint | Không có lỗi; còn 5 cảnh báo import-order đã tồn tại ở `src/services/exam/vocabulary-practice.test.ts` (3) và `src/services/hsk/syllabus.test.ts` (2). |
| TypeScript | Pass. |
| Unit/integration tests | 155 files và 856 tests pass. |
| Expo Android export | Pass; bundle Android được xuất vào `dist`. |
| Android debug build | Build thành công bằng JDK 19; cài đặt lên emulator thành công. |
| Exam regression | Trên emulator: làm xong bài 4 câu, đến trang kết quả 4/4, mở lại kết quả từ lịch sử; không tái hiện lỗi ScreenStack trong lần kiểm tra này. |
| Toàn bộ 60 screenshot sau cập nhật | Pass về độ phủ và đối chiếu manifest: 60/60, 0 thiếu/thừa/tệp rỗng; 6 contact sheet đã rà soát. Một ảnh là ca negative guard có chủ đích; empty/setup states phản ánh dữ liệu QA hiện có. |

Các cảnh báo lint được ghi nhận, không tự ý sửa các test files ngoài phạm vi UI.

## Bằng chứng ảnh đã kiểm tra

Đây là ảnh kiểm tra trên emulator debug, không phải bộ chứng nhận phát hành. Các ảnh Exam có nội dung được gắn nhãn `UNVERIFIED` trong giao diện vì bài luyện mẫu không phải đề thi chính thức.

- [Bộ 60 ảnh post-V5.2](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/)
- [Manifest post-V5.2](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.2.csv)
- Contact sheets: [01](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/contact-sheets-final/contact-sheet-01.png), [02](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/contact-sheets-final/contact-sheet-02.png), [03](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/contact-sheets-final/contact-sheet-03.png), [04](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/contact-sheets-final/contact-sheet-04.png), [05](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/contact-sheets-final/contact-sheet-05.png), [06](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/contact-sheets-final/contact-sheet-06.png).

- [Home](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/home.png)
- [Onboarding — lựa chọn trình độ và footer cố định](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/onboarding.png)
- [Reader hub](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/reader.png)
- [Learning Path](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/path_index.png)
- [Speaking AI — cấu hình](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/speaking_ai.png)
- [Speaking AI — thông báo consent, chưa đồng ý thay người dùng](../artifacts/ui-audit-2026-10-06/screens-v5-2/speaking-ai-consent.png)
- [Exam — câu hỏi](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/exam_session.png)
- [Exam — kết quả 4/4](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/exam_result.png)
- [Ôn tập — trạng thái chưa có từ đến hạn](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/review_index.png)
- [Story detail](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/stories_detail.png)
- [Bộ từ riêng — trạng thái QA demo trống](../artifacts/ui-audit-2026-10-06/screens-v5-2-verified/decks_index.png)

## Còn lại trước khi release sign-off

1. Chạy smoke trên thiết bị Android vật lý và cấu hình release; lượt hiện tại chỉ xác nhận trên emulator debug.
2. Đánh giá 5 cảnh báo lint import-order còn lại trước khi bật gate cảnh báo thành lỗi theo chính sách repo.
3. Nếu cần xác nhận toàn bộ trạng thái tương tác (không chỉ route/screenshot), chạy thêm các flow có dữ liệu: tạo từ, ôn có từ đến hạn, ghi âm Shadowing và speaking AI sau khi người dùng tự đồng ý.

Trạng thái phù hợp là **V5.2 implementation complete; 60/60 emulator screenshot coverage complete; physical-device and release sign-off pending**.
