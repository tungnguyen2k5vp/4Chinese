# Từ dễ nhầm — V4

Đường dẫn: `/confusables`, vào từ Luyện tập → Từ dễ nhầm.

6 cặp gốc, mỗi cặp 2 câu ngữ cảnh: 知道/认识, 觉得/认为, 再/又,
刚/刚才, 二/两, 还是/或者. Có pinyin, nghĩa, bảng so sánh, lý do cho từng đáp án
và yêu cầu tự đặt câu. Các tình huống tránh câu có hai đáp án cùng đúng;
giải thích vẫn nói rõ phạm vi và các cách dùng khác của từ.
Nguồn CURATED/UNREVIEWED, version 1, chưa có thẩm định độc lập hay official level mapping.

## Lưu và vòng ôn

Migration 35 thêm `confusable_attempts`. Mỗi câu đã kiểm tra lưu offline một ID,
content version, lựa chọn, kết quả, thời điểm và trạng thái có gợi ý.
Retry cùng ID không tính hai lần; sửa nội dung của ID cũ bị từ chối.
Ghi attempt và Sổ lỗi trong cùng transaction. Chỉ nối vào từ có thật trong corpus,
không tạo dictionary entries giả. Không sửa user_vocabulary_progress, due hoặc review_log.
Lỗi dùng `MEANING/confusable_<pair>`; nhấn lỗi trở lại bài phân biệt đúng ngữ cảnh.
Từ gốc được chọn deterministic theo frequency_rank/ID; chưa có reviewed word-sense crosswalk.

Xem bảng so sánh rồi ẩn vẫn tính có gợi ý. Nút luyện lại sau khi biết đáp án cũng vậy.
Ba lượt đúng có gợi ý không tự khắc phục lỗi. Stats hiển thị số lượt, không gọi là mastery/điểm thi.
Ô tự đặt câu chưa lưu khi rời màn hình và không chấm tự động; UI thông báo rõ.
Backup mới chứa attempts; backup cũ thiếu trường này giữ nguyên attempts hiện tại.
Backup hỏng/đáp án không khớp/version không hỗ trợ bị từ chối trước khi thay dữ liệu.

## Kiểm thử

SQLite thật: legacy migration, retry/CAS-style conflict, invalid input, backup round-trip,
old backup, corrupt restore, no SRS mutation và hinted-versus-independent successes.
Browser: trả lời sai → giải thích → reload → stats đã lưu.
Không đồng nghĩa bộ minimal pairs ngữ âm hoặc taxonomy lỗi đa kỹ năng đã hoàn thành.
