# Học từ mới tiếng Anh — cập nhật 20/10/2026

## Luồng hiện tại

- Thêm nhiều từ → chọn nghĩa → lưu → xem lần lượt các flashcard để chọn từ muốn học.
- Kho từ / chi tiết bộ → Học từ mới → chọn mục tiêu 5, 10, 15 hoặc 20 từ. Mỗi thẻ hiển thị từ, phiên âm đã lưu (hoặc báo chưa có), nghĩa và loa nghe lại. Tự đọc một lần khi thẻ xuất hiện, dùng giọng US/UK trong cài đặt; đổi mục tiêu hoặc render lại không tự phát thêm.
- “Đã biết” lưu từ ở cấp 1, hẹn ôn theo khoảng khởi tạo hiện có và không ghi một lượt ôn giả. Không dùng cơ chế miễn ôn dài hạn `isKnown`. “Học từ này” chỉ đưa từ vào danh sách chuẩn bị học. Đủ số lượng thì tự chuyển, hoặc học số đã chọn khi đã xem hết từ khả dụng.
- Nhập một từ thủ công hoặc mở chi tiết từ mới → Lưu & học ngay / Học ngay.
- Các từ đã chọn đi qua hai vòng không chấm SRS: nhìn từ và gõ theo, rồi chỉ nhìn nghĩa và tự gõ tiếng Anh. Trả lời sai phải sửa lại trước khi đi tiếp.
- Sau hai vòng, chuyển thẳng sang bài ôn hiện có với đúng nhóm từ đã chọn, không lấy nhầm hàng đợi đến hạn.
- Không còn ba nhãn bước. Một thanh tiến trình duy nhất tính trên 3 × số từ: gõ theo, tự nhớ, rồi ôn; chuyển sang bài ôn không quay về 0.

## Dữ liệu và mức nhớ

Các từ được chọn “Học từ này” và hai vòng làm quen chỉ đọc dữ liệu. Thoát trước bài ôn vẫn giữ những từ này ở trạng thái NEW; các từ bấm “Đã biết” đã được lưu cấp 1 riêng. Khi bắt đầu bài ôn, cả nhóm chuyển sang LEARNING trong một giao dịch; lỗi giữa chừng sẽ rollback toàn bộ nhóm.

Lượt ôn thật đầu tiên vẫn lưu đúng kết quả, thời gian và lỗi, nhưng không tăng cấp từ chỉ vì vừa nhìn mẫu: khởi tạo ở mức 1. Những lượt đến hạn tiếp theo dùng bộ lập lịch hiện có. Các từ không chọn, bộ từ khác và dữ liệu tiếng Trung không bị thay đổi.

## Giao diện đã làm gọn

Chi tiết từ tập trung vào từ, nghĩa, phát âm US/UK, mức nhớ và hành động chính. Nghĩa khác, sửa thẻ và thông tin nguồn nằm trong các thao tác riêng. Từ chưa đến hạn có nút mở bộ từ thay vì đưa đến một hàng đợi ôn rỗng.

Chi tiết bộ giữ biểu đồ mức nhớ và danh sách từ, đưa Học từ mới / Ôn tập lên trước, gom các bài luyện phụ. Nút bỏ qua dùng icon tạm dừng kèm nhãn thay cho dấu ba chấm dễ hiểu nhầm. Màn quản lý bộ và thêm từ rút gọn hướng dẫn, loại bỏ tiêu đề lặp.

## Kiểm chứng

- `npm run typecheck`: đạt.
- `npm run lint`: không lỗi; 9 cảnh báo có sẵn ở các phần khác.
- 30 tệp / 176 bài kiểm thử tiếng Anh: đạt, gồm giao dịch, lựa chọn chính xác, rollback, lưu “Đã biết” cấp 1 và lịch ôn.
- `node scripts/qa-english-new-learning.cjs`: kiểm thử giao diện web thật, SQLite riêng; gồm nhập hàng loạt, chọn từ, sai/đúng ở cả hai vòng, ôn và hoàn tất, từ chưa chọn vẫn NEW, nhập thủ công, lối vào từ kho, màn nhỏ và chế độ tối.
- Android JavaScript/Hermes export: đạt. Đây không phải kiểm thử APK trên thiết bị.

Ảnh và kết quả hiện tại: `artifacts/english-flashcards-2026-10-20/index.html`. Kiểm tra yêu cầu tự đọc và nghe lại dùng bộ giả lập Speech API trong trình duyệt riêng, không phải xác nhận âm thanh Android thật.

Chưa cài bản sửa này lên điện thoại. ADB tại thời điểm kiểm tra chỉ thấy máy ảo offline, không có điện thoại sẵn sàng; bàn phím và vòng đời Android native chưa được xác nhận.
