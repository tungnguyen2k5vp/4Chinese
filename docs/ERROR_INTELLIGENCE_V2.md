# Error Intelligence V2

## Trạng thái

Đã thêm lớp phân cụm lỗi quan sát được trong `src/services/learning/error-intelligence-v2.ts` và nối vào màn hình Sổ lỗi. Lớp mới không thay thế SRS, không tự sửa dữ liệu học và không suy đoán nguyên nhân phát âm/ngữ nghĩa từ một lần trả lời sai.

## Quy tắc kết luận

- Chỉ dùng các bản ghi `mistake_records` chưa được giải quyết.
- Nhóm theo kỹ năng/bài tập đã được lưu; tiền tố `confusable_` mới được coi là nhóm từ dễ nhầm.
- Mặc định cần ít nhất 5 lần sai cộng dồn và 2 mục lỗi đang mở.
- Dưới ngưỡng vẫn hiển thị để người học biết, nhưng ghi rõ “chưa đủ mẫu” và không tạo bài chữa lỗi.
- Không gọi đây là tỷ lệ lỗi vì schema hiện tại chưa lưu tổng số lần thử thành công/thất bại theo cùng một mẫu.

## Remedial micro-lesson

Khi đủ mẫu, hệ thống tạo đề xuất offline gồm giải thích ngắn, 3 bước và loại bài tập phù hợp với nhóm lỗi. Đây là đề xuất dựa trên lỗi đã quan sát, không phải chẩn đoán AI. Việc hoàn thành bài chữa lỗi không thay đổi ngày đến hạn SRS; chỉ luồng ghi nhận lỗi hiện có mới cập nhật `mistake_records`.

## Giới hạn còn lại

- Cần bổ sung lịch sử attempt chi tiết nếu muốn tính error-rate đáng tin cậy.
- Cần QA nội dung từng micro-lesson trước khi nâng trạng thái PUBLISHED.
- Các nhóm nhỏ chưa đủ mẫu không được tự động gắn nhãn “yếu”.

