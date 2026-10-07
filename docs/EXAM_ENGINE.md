# Exam engine V4

## Có thể dùng

Các route /exam, /exam/session, /exam/result phục vụ bài luyện gốc.
Bảy profile có bốn câu đọc/ngữ pháp trong ngữ cảnh mỗi bài; thời lượng 5 hoặc 10 phút.
Đây không phải cấu trúc HSK chính thức hoặc thang điểm quy đổi.

- Snapshot profile/questions bất biến; chỉ answers, flags, currentIndex được cập nhật.
- SQLite exam_attempts (migration33), revision/CAS chống ghi đè từ màn/thiết bị cục bộ stale.
- Lưu từng thao tác; reload/resume giữ đáp án/cờ/vị trí.
- Deadline dựa wall clock: rời app không tạm dừng đồng hồ. Bài quá hạn tự nộp khi mở lại.
- Autosubmit idempotent; một lần lỗi không tạo vòng nộp/lỗi vô hạn.
- Xác nhận nộp/rời bài dùng modal trên native và web.
- Kết quả: đúng/tổng, phần trăm nội bộ, thời gian, từng section, câu đã chọn/đáp án/giải thích Việt.

## Framework section-timed

Profile.navigation hỗ trợ FREE (mặc định cho snapshot cũ) và SECTION_TIMED.
Đồng hồ từng phần cố định theo thứ tự; không sửa đáp án/cờ hoặc chuyển về phần đã hết giờ.
Validator yêu cầu câu theo section liên tục. Unit và SQLite integration kiểm tra boundary/stale/deadline.
Chưa có profile FULL MOCK được kiểm chứng và bundle; framework này chưa phải full mock usable.

## Integrity và backup

Chặn profile sai, choices trùng, answer index sai, AI_DRAFT, ID trùng và snapshot giả mạo.
Backup bao gồm examAttempts, validate toàn bộ trước transaction; không suy ra kết quả từ dữ liệu chưa nộp.
Không dùng dữ liệu luyện gốc làm predicted official score hoặc readiness chứng nhận.

## QA

362 tests toàn repository; Edge smoke xác nhận reload, cờ, hủy/xác nhận nộp và kết quả.
Chưa kiểm thử Android APK/đóng tiến trình trên điện thoại hoặc clock tampering có chủ ý.
Đồng hồ local phục vụ luyện tập, không phải chống gian lận cho kỳ thi có giám sát.
