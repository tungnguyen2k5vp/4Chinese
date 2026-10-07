# Báo cáo chụp màn hình V5.4.1 — Android thực tế

Ngày thực hiện: 06/10/2026  
Nhãn `V5.4.1` áp dụng cho bộ ảnh/QA, không phải số phiên bản cài đặt của app.

## Kết quả

- Đối chiếu đủ **60/60 route người dùng** trong `src/app` với manifest hiện hành.
- Lưu **64 ảnh PNG**: 60 ảnh route, 3 trạng thái onboarding bổ sung và 1 ảnh xác nhận app đã trở về Trang chủ.
- Cả 64 ảnh đều được kiểm tra mở được và đúng kích thước **1080×2400**. Bốn contact sheet tổng hợp toàn bộ ảnh.
- Chụp trực tiếp từ app Android standalone trên điện thoại; không dùng Expo Go, development client hay Metro. Route `/exam` lần đầu còn splash nên đã chụp lại sau khi chờ tải ổn định.
- App được để lại ở Trang chủ. Không xóa dữ liệu app, không tạo/xóa deck, không trả lời hoặc nộp bài thi.

## Thiết bị và build

- Realme RMX3085, Android 13 / API 33, màn hình 1080×2400, 480 dpi, font scale 1.0, giao diện sáng, portrait.
- Package `com.tungnguyen2k5vp.fourchinese`, `versionName 0.1.33`, `versionCode 35`.
- `V5.4.1` chỉ là nhãn bộ bằng chứng mới; không thay đổi version app.

## Bằng chứng

- [Manifest 64 dòng (60 route + 4 ảnh bổ sung)](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.4.1.csv)
- [Ảnh route 1–20](../artifacts/ui-audit-2026-10-06/screens-v5-4-1-phone/contact-sheets/contact-sheet-v5.4.1-phone-01.png)
- [Ảnh route 21–40](../artifacts/ui-audit-2026-10-06/screens-v5-4-1-phone/contact-sheets/contact-sheet-v5.4.1-phone-02.png)
- [Ảnh route 41–60](../artifacts/ui-audit-2026-10-06/screens-v5-4-1-phone/contact-sheets/contact-sheet-v5.4.1-phone-03.png)
- [Onboarding bổ sung và checkpoint Trang chủ](../artifacts/ui-audit-2026-10-06/screens-v5-4-1-phone/contact-sheets/contact-sheet-v5.4.1-phone-04-supplemental.png)
- [Ảnh onboarding bước 2](../artifacts/ui-audit-2026-10-06/screens-v5-4-1-phone/onboarding_goal.png)
- [Ảnh Trang chủ cuối phiên](../artifacts/ui-audit-2026-10-06/screens-v5-4-1-phone/home-final.png)

Ảnh gốc nằm trong `artifacts/ui-audit-2026-10-06/screens-v5-4-1-phone/`. `__qa.tsx` không tính vào 60 route vì đây là màn fixture chỉ dành cho development; trong standalone build nó chuyển hướng về Trang chủ.

## Trạng thái route và giới hạn dữ liệu

- `/learn/session` và `/review/session` được mở từ cold start nên không có hàng đợi trong bộ nhớ; app chuyển về màn setup/index. Vì vậy ảnh tương ứng ghi lại empty/redirect state, không phải thẻ học đang hoạt động.
- Các route deck chi tiết/nhập hàng loạt/nghe/phát âm/quiz dùng ID sentinel `v5-4-1-readonly-missing`; chúng thể hiện empty/guard state, không phải nội dung của một deck thật. Không có deck thử nghiệm nào được tạo.
- Trang luyện thi cho thấy có một bài HSK 1 đang dở ở câu 1/4. Để không tiếp tục đồng hồ hoặc đụng vào đáp án hiện có, `/exam/session` và `/exam/result` được chụp bằng ID sentinel và thể hiện trạng thái không tìm thấy bài; chưa xác minh ảnh phiên thi/kết quả thật.
- `/mistakes/practice` cũng dùng ID sentinel vì không chọn hay sửa một lỗi học thật.
- Reader được chụp tại màn thư viện/đọc mặc định; chưa mở file, Document Picker, EPUB/TXT hay OCR. Các route nói được chụp ở màn mặc định; chưa xin quyền microphone, ghi âm hoặc gọi dịch vụ AI.
- Đây là bao phủ đầy đủ các trang route ở cấu hình portrait/sáng/font 1.0, không phải mọi biến thể tương tác hoặc ma trận thiết bị. Chưa chụp dark mode, font lớn, xoay màn hình, TalkBack/iOS hay trạng thái lỗi mạng/quyền.

## Ghi chú QA và ảnh hưởng dữ liệu

- Quan sát trực quan: màn `/exam` có tiêu đề “Trung tâm luyện thi” xuất hiện hai lần và khoảng trống lớn giữa header với nội dung chính. Đây là ghi nhận QA, chưa sửa code.
- Thời gian học trên Trang chủ hiển thị `30/60 phút` ở ảnh đầu và `31/60 phút` ở checkpoint cuối. Một số route gọi `useStudySession`, vốn ghi thời gian foreground vào thống kê; việc mở màn hình trong lúc chụp phù hợp với phần tăng này. Không có câu trả lời/hoàn tất bài nào được gửi, nhưng có thể app đã cộng thêm thời gian nền học. Ảnh không cho biết chính xác số giây nên không tự sửa ngược DB.
- Onboarding được cuộn và chọn HSK 6 để chụp các trạng thái phụ. Đã dừng trước nút “Bắt đầu học”; theo luồng code, chỉ nút đó mới gọi `saveSettings`. Màn hình tạm chưa được lưu và app được mở lại ở Trang chủ.
- Các contact sheet đã được rà trực quan; không phát hiện ảnh rỗng hoặc ảnh splash còn sót sau khi chụp lại `/exam`.
