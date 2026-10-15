# Tổng đến hạn Trang chủ và phiên 10 từ

Yêu cầu bổ sung trực tiếp ngày13/10/2026: Trang chủ phải hiện tổng từ đến hạn trong mọi bộ, còn mỗi lượt chỉ ôn tối đa10 từ.

Nguyên nhân tìm được: `ChineseHome` gọi thống kê với `selectedHskBands`; list bộ riêng không lọc HSK. Từ HSK5 trong bộ riêng có thể không được tính khi người học đang chọn HSK1. Số tổng và hàng đợi mở từ Home vì thế không cùng phạm vi.

Trang chủ lấy `getDueCount(db)` toàn bộ HSK và các bộ còn hoạt động. Card đến hạn lên ngay sau lời chào, trước gợi ý HSK; có tổng, giải thích phạm vi và nút ôn `min(10,total)`. Zero state chỉ nói hiện không có từ đến hạn, không giả đã hoàn thành mục tiêu học. Reload khi focus và mỗi30giây trong foreground.

Review chung đếm cùng query, tải10 từ theo thứ tự ưu tiên hiện có và tải mới lần nữa khi bấm Bắt đầu. Bộ riêng, từ yếu, daily plan và store queue cũng chặn10 card IDs; không cộng trùng ID trong queue. Review tiếng Anh cũng dùng limit10; Quick Review5 hiện hữu giữ nguyên. Tổng Home không bị cắt thành10. Counter giảm theo ngày ôn thực sau chấm, không trừ số giả khi chỉ mở/đóng màn.

Loại trừ khỏi tổng/queue: chưa học, đã biết, bỏ qua/tạm ngừng, chưa đến hạn, bộ trong thùng rác. List bộ được bổ sung cùng điều kiện `is_known=0`. Count dựa vào card ID/lịch học: cùng chữ nhưng thẻ/ý nghĩa riêng không tự bị gộp vì sẽ mất danh tính học.

Không sửa scheduler, thời gian ôn, nội dung HSK hoặc tiến độ cũ; không reset database. Settings cũ lớn hơn10 vẫn đọc được nhưng không tạo phiên vượt10. Cài đặt phiên ôn chỉ hiển thị10; cài đặt học từ mới không bị đổi.

Test thật `src/db/home-review-scope.test.ts`: 21 thẻ eligible ở2 bộ/2 cấp, bộ xóa và future/known/suspended/new bị loại; tổng bộ=global;10 unique IDs/phiên; sau đổi ngày ôn trong fixture còn11; read-only count/queue không ghi tiến độ. Daily planner và store được test với giới hạn cũ50 và ID trùng. Đây là SQLite QA fixture, không phải số từ trên điện thoại của người dùng.

Đợt này chỉ đổi source và kiểm thử máy ảo/Web; chưa cài phiên bản mới lên điện thoại. Đây là ngoại lệ thêm ngoài brief V8.1 English-only, được nêu rõ trong final source/data report.
