# 4Chinese V5.3.1 — UI refinement audit

Ngày: 2026-10-06  
Phạm vi: tinh chỉnh giao diện sau V5.3; không thay đổi lịch SRS, thứ tự mở khóa bài học, dữ liệu HSK, sync hay schema.

## Kết luận

Source và kiểm thử tự động đã được cập nhật. Chưa thể gọi đợt này hoàn tất về mặt visual QA: môi trường làm việc hiện không có `adb`/Android SDK trong PATH, còn trình duyệt QA bị chặn bởi ACL. Vì vậy không có ảnh runtime V5.3.1 và không có ảnh/contact sheet mới. Bộ `screens-v5-3-runtime-final` là baseline V5.3, không phải bằng chứng sau update này.

## KEEP / FIX / REFINE / UPGRADE

| Mục | Quyết định | Thay đổi / trạng thái |
|---|---|---|
| Thanh trạng thái | FIX | Root dùng `expo-status-bar` và chọn icon sáng/tối theo theme; màn từ vựng giữ override sáng vì header xanh. Cần xác nhận trên bản chạy thật. |
| Nút gear ở góc | KEEP trong dev; kiểm tra release còn mở | Ảnh V5.3 ghi rõ đây là development-client control. Không tìm thấy nút gear sản phẩm toàn cục trong source. Không xóa dev tooling; cần capture preview/release (`developmentClient:false`) để chứng minh nó biến mất. |
| Tràn màn hình nói AI | FIX | Giới hạn co ngang bằng `minWidth: 0`/`width: 100%` cho vùng màn hình, khung hội thoại, ô nhập và composer; không khóa cỡ chữ người dùng. Chưa có capture 160% để kết luận runtime. |
| Minh họa | UPGRADE | Thêm 8 bố cục SVG khác nhau cho học, đọc, nghe, nói, HSK, thành tích, thống kê và chào mừng; không thêm dependency hoặc ảnh lớn. |
| Lộ trình | REFINE | Node giảm chiều cao tối thiểu, nội dung giữ được chỗ co; sheet cuộn được và hiển thị loại hoạt động lấy từ DB. Điều kiện mở bài và completion không đổi. |
| Luyện nghe | REFINE | Đưa mô tả nghe/TTS lên trước, chip HSK cuộn ngang; bỏ các cột cao thấp trông như waveform nhưng không lấy từ âm thanh. Chỉ cung cấp phát/dừng/replay đúng khả năng hiện tại. |
| Thống kê | FIX | Người mới thấy empty state và CTA phiên 5 phút; số 0, chart rỗng và hàng kỹ năng/HSK không có tiến độ bị ẩn. Hiển thị 0% chỉ khi có lượt ôn thật. |
| Chọn HSK | REFINE | Bảy chip trên một hàng cuộn ngang ở màn HSK; danh sách tiến độ cấp độ hiện có vẫn được giữ. |
| Copy | REFINE | Thay một số slogan trang trí tiếng Anh ở hub, đọc và nói bằng copy tiếng Việt. Nhãn trạng thái dữ liệu như `DRAFT / UNREVIEWED` được giữ để không làm người học hiểu nhầm. |
| Dialog | REFINE một phần | Xác nhận xóa tóm tắt hội thoại và bài đọc chuyển sang dialog trong app có nút xóa nguy hiểm. Các native Alert khác chưa được di trú toàn bộ; lời nhắc quyền hệ điều hành không bị thay. |

## Ranh giới dữ liệu

Các thay đổi mới chỉ tác động presentation. Thống kê dùng giá trị từ `DashboardStats`, heatmap và các lần ôn thực tế; cấp độ có kho từ nhưng chưa học không bị tính thành tiến độ. Kỹ năng lộ trình dùng `listLessonActivities` hiện có. Không reset DB, không ghi tiến độ mới khi mở sheet, không đổi API sync hay dữ liệu câu hỏi.

## Kiểm tra tự động

- `npm run typecheck`: PASS.
- `npm test`: PASS — 157 test files, 863 tests.
- `npx expo export --platform android --output-dir dist-v5-3-1-check`: PASS — tạo JS bundle Android; đây không phải APK và không cài đặt app.
- `npm run lint`: 0 lỗi; cảnh báo import/unused phát sinh trong thay đổi được dọn. Các cảnh báo còn lại được đếm trong báo cáo cuối.
- Device visual QA, font 160%, theme tối trên device, TalkBack, release/preview: CHƯA CHẠY.

Chi tiết: [scene system](V5_3_1_SCENE_SYSTEM.md), [path](V5_3_1_PATH_REFINEMENT.md), [listening](V5_3_1_LISTENING_REDESIGN.md), [responsive QA](V5_3_1_RESPONSIVE_QA.md), [visual QA](V5_3_1_VISUAL_QA.md), [final report](V5_3_1_FINAL_REPORT.md).
