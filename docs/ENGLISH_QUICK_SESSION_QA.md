# V7 — ôn nhanh và đồng hồ chủ động

Cập nhật nguồn đã kiểm Web ngày10/10, đối chiếu lại ngày11/10/2026. **Chưa nằm trong APK build40; chưa native QA phần này.**

Đã có nút ôn nhanh trên bộ từ/hoạt động tiếng Anh. Phiên lấy tối đa5thẻ đến hạn từ cùng repository due queue, loại NEW/future/suspended/trash; đã trả lời5thẻ thì kết thúc, không kéo thêm thẻ vào phiên. Thẻ ngoài phiên không đổi lịch. Thành công lưu mới tăng bộ đếm UI/XP; retry kết quả giữ nguyên operation ID và đáp án/thời gian đã chốt, không ghi trùng.

`ActiveStudyClock` dùng monotonic clock. Chỉ tính khi màn ôn focus, app foreground, thẻ sẵn sàng; không tính lúc loading/save/background. Timer chỉ của phiên hiện tại, chưa lưu tổng thời gian học/streak vào DB; không cộng XP từ timer. Thời gian trả lời đã commit lưu theo review hiện có. Không gọi đây là chế độ3/5/10phút: **lựa chọn thời lượng, ước lượng dựa lịch sử, giới hạn theo phút vẫn chưa triển khai**.

5 test repository/clock PASS; artifact full suite trước importer `quick-session-tests.json` có **961tests PASS/174files**. Không dùng `numTotalTestSuites` của JSON reporter làm số file (bao gồm suites lồng nhau).

Web headless độc lập: `artifacts/v7-2026-10-10/learner-ui-quick-session/result.json` có3nhóm kiểm tra PASS/0pageerrors: future card không due, ôn5thẻ offline giữ2thẻ còn lại và đúng5log/50XP, phiên tiếp theo chỉ2thẻ/compact dark không document overflow. Có3ảnh cùng thư mục: `01-quick-five.png`, `02-quick-completed-offline.png`, `03-remainder-compact-dark.png`. Đã xem trực quan ảnh hoàn tất và compact dark: text không bị cắt ở viewport; chưa TalkBack/font200%/Android rotation. Timestamp giả trong script không giả timer/RAF; timer0giây trong ảnh không phải benchmark thời gian người học.

Web export `dist-v7-quick-session-web` PASS. Không dùng bằng chứng Web này thay kiểm thử máy ảo release APK. V7 vẫn PARTIAL; chưa cài điện thoại.
