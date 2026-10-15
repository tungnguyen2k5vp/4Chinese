# Số từ mỗi phiên và lịch ôn đầy đủ — 13/10/2026

## Kết quả

- Màn hình chuẩn bị ôn có lựa chọn 5, 10, 15, 20 từ. Lưu lựa chọn cho lần sau và lấy đúng số từ vào hàng đợi; nếu ít từ đến hạn hơn thì ôn số từ đang có.
- Nút ôn trong bộ từ mở cùng màn hình lựa chọn, giữ phạm vi bộ từ. Phiên gợi ý và ôn từ yếu dùng số lượng đã lưu, có thể ít hơn theo số từ/thời lượng còn lại.
- Lịch ôn hiển thị tất cả từ đã học trong các bộ đang hoạt động và mọi cấp HSK, gồm từ đã đến hạn, chưa đến hạn, trí nhớ sâu và từ đánh dấu đã biết. Từ tạm ngừng ôn nếu vẫn có trạng thái đã học cũng được hiển thị với nhãn riêng.
- Mỗi trang 50 từ, tổng số từ lấy từ dữ liệu thật; có số trang, phạm vi đang xem, nút trước/sau ở trên và dưới danh sách. Sắp xếp theo lịch ôn và ID để không trùng/bỏ sót khi nhiều từ cùng lịch.
- Tự cập nhật mỗi phút; nếu số từ giảm làm mất trang đang xem thì chuyển về trang hợp lệ. Không cập nhật cấp nhớ/lịch SRS khi xem lịch.

## Bằng chứng kiểm thử

- SQLite thật trong bộ kiểm thử: 123 từ hợp lệ chia 50–50–23, không trùng/thiếu; có nhiều cấp HSK và bộ từ, có từ đến hạn, đã biết, tạm ngừng và cấp nhớ 6; loại từ chưa học và bộ đã vào thùng rác. Kiểm tra snapshot dữ liệu học không đổi sau khi đọc.
- Lưu/đọc lại cả bốn cỡ phiên; lấy số từ đến hạn và kiểm tra hàng đợi thực tế đúng số lượng, loại ID trùng; tương thích cài đặt cũ không còn hỗ trợ.
- Kiểm thử tương tác React Native Web trên screen thật và Zustand thật, giả lập SQLite/router: chọn cả bốn cỡ, mở lại vẫn nhớ cỡ, giới hạn theo số từ của bộ, chuyển ba trang, khóa nút ở trang cuối, tự điều chỉnh khi tổng số từ giảm. Không có lỗi JavaScript.
- Typecheck và lint các tệp thay đổi: đạt, không cảnh báo lint.
- Toàn bộ Vitest: 203 tệp, 1.113 test đạt.
- Export bundle Android: đạt, 2.389 module.

[Gallery 4 ảnh](../artifacts/chinese-review-setup-schedule-2026-10-13/verified/index.html) · [Kết quả tương tác](../artifacts/chinese-review-setup-schedule-2026-10-13/verified/result.json).

Ảnh là kiểm thử component web với dữ liệu mẫu, không phải ảnh từ điện thoại. Chưa tạo/cài APK cho thay đổi này.
