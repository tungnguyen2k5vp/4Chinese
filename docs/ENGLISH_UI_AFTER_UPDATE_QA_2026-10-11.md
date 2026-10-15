# Báo cáo rà soát giao diện tiếng Anh sau cập nhật — 2026-10-11

## Kết quả

Đã rà soát và tổng hợp **35 ảnh** trên viewport di động 390 × 844, DPR 2; toàn bộ 35 lượt chụp hoàn tất, không có lỗi tương tác trong runner và không còn ảnh trạng thái đang tải.

Ảnh được render từ Expo Web export hiện có. Đây là ảnh giao diện responsive của source mới, **không phải ảnh native Android**. Lần build native mới không thực hiện được vì chế độ offline thiếu plugin Gradle `org.gradle.toolchains.foojay-resolver-convention:1.0.0`; ADB tại thời điểm kiểm tra chỉ thấy emulator, không thấy điện thoại thật. Không cài đặt hoặc cập nhật APK lên điện thoại.

## Phạm vi đã chụp

- Cài đặt/chọn chế độ học tiếng Anh; Home trạng thái trống, demo có dữ liệu và màn cuộn; CEFR A1/B1.
- Kho từ trạng thái trống/demo, form tạo bộ từ/thêm thẻ, quản lý bộ từ; empty state bulk khi chưa có bộ.
- Luồng bulk có bộ thử tạm: nhập, mở hướng dẫn định dạng, xem trước 2 dòng hợp lệ. Không xác nhận lưu thẻ.
- Ôn tập trống, câu hỏi demo, đáp án, chính tả, phiên nhanh.
- Reader landing, bài đọc demo, tra từ, modal nhập bài và cỡ chữ lớn.
- Thống kê trống/demo; trạng thái biên tập thẻ khi không truyền ID; 5 màn dark mode.

Để chụp các trạng thái phụ thuộc dữ liệu, runner tạo một bộ từ/thẻ tổng hợp trong browser context tạm. Dữ liệu đó không nằm trên điện thoại hay database dùng thật; đóng context sẽ loại bỏ. Màn biên tập thẻ chỉ chụp được trạng thái báo không có thẻ/bản nháp vì không có ID thẻ hợp lệ được cung cấp.

## Ghi nhận trực quan

1. **Ôn tập có dấu hiệu tràn ngang ở bản Web mobile:** nội dung/nút của hàng âm thanh/TTS trong flashcard bị cắt ở cạnh phải trên câu hỏi và đáp án, thấy ở `19-review-demo-question.png`, `20-review-demo-answer-revealed.png` và `33-dark-review.png`. Cần xác minh lại trên native trước khi kết luận lỗi xuất hiện y hệt trên Android; nhưng hiện tại đây là điểm cần sửa/kiểm tra ưu tiên.
2. **Reader tra từ:** bottom sheet hiển thị được từ, ô nhập nghĩa và bộ nhận thẻ; nền được làm mờ đúng. Nên kiểm tra thêm khi bàn phím mở để chắc nút lưu không bị che.
3. **Phạm vi ngôn ngữ:** đây là chế độ *học tiếng Anh* nhưng ngôn ngữ hướng dẫn/giao diện vẫn là tiếng Việt; nội dung ví dụ và từ vựng mới là tiếng Anh. Bộ ảnh không thể hiện một UI đã dịch hoàn toàn sang tiếng Anh.
4. **Biên tập thẻ:** ảnh hiện tại là trạng thái phục hồi “không mở được thẻ hoặc bản nháp” do route không có ID, không phải màn chỉnh sửa thẻ hợp lệ.

## Nguồn và giới hạn

English source mới nhất trong lượt rà soát có thời điểm sửa `2026-10-11 11:28:23`; bundle `dist-v7-redesign-web` được tạo `11:29:54`, nên bundle có sau lần sửa source đó. Tuy nhiên, do thiếu plugin Gradle trong cache và mạng bị chặn, chưa thể dựng/cài bản Android mới để kiểm tra native. Cần làm lại vòng native QA khi dependency Gradle sẵn sàng; không coi bộ ảnh Web này là nghiệm thu native.

## Tệp bằng chứng

- Ảnh lẻ: `artifacts/english-ui-after-update-2026-10-11/screenshots/`
- Contact sheets: `artifacts/english-ui-after-update-2026-10-11/contact-sheets/`
- Manifest và README: trong cùng thư mục artifact.
- ZIP bàn giao: `artifacts/english-ui-after-update-2026-10-11.zip`
