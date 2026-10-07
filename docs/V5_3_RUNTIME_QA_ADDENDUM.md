# V5.3 — Bổ sung kết quả kiểm thử runtime

Ngày kiểm thử: 2026-10-06. Phạm vi chỉ gồm build debug hiện tại chạy trên Android emulator `emulator-5556`; không cài, cập nhật hoặc thao tác trên điện thoại thật.

## Kết quả

- Đã recapture đủ 60/60 route từ baseline trên nguồn V5.3 hiện tại. 57 ảnh được mở qua deep link và 3 luồng cần thao tác trong app; ảnh PNG 1080×1920, giao diện sáng, font scale 1.0.
- Bộ ảnh ở [`screens-v5-3-runtime-final`](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/) và danh sách route ở [`capture-manifest-v5.3-final.csv`](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.3-final.csv).
- Hai cặp ảnh giống hệt là kết quả hợp lệ của guard khi hàng đợi rỗng: `learn_session`/`learn_setup` và `review_index`/`review_session`.
- Đã chạy thử luồng thi HSK1: trả lời đúng 4/4, nộp bài, màn kết quả hiển thị 100%; không tái hiện lỗi crash màn kết quả trong lần thử này. Đây là xác nhận trên emulator, không thay thế kiểm thử trên thiết bị thật hoặc bản release.
- Chi tiết bộ từ QA hiện có mở được; màn truyện `Một ngày ở trường` đã tải đầy đủ nội dung và điều khiển đọc/TTS trong lần chụp cuối.
- Onboarding: đã cuộn danh sách để hiện HSK 5/6, chọn HSK 6 và xác nhận CTA mở bước mục tiêu. Không bấm `Bắt đầu học`; không ghi hoàn tất onboarding. Ảnh bổ sung: [`interaction-checks`](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/interaction-checks/).
- Thời gian mở Home khoảng 30 giây là quan sát một lần trên debug emulator khi khởi tạo dữ liệu offline, không phải benchmark. Con số khoảng 3 phút trong kế hoạch cũ không tái hiện ở lượt này; cần đo lại trên thiết bị/release để kết luận hiệu năng.

## Giới hạn còn lại

Ảnh được chụp từ dev client nên có nút nổi debug ở góc trên. Khi Metro được khởi động lại, một lần mở lại dev client đang chạy gặp lỗi `App react context shouldn't be created before`; force-stop rồi cold-start sạch đã vào Home bình thường. Ghi nhận đây là lỗi trên đường reload của dev client, chưa xác định là lỗi ứng dụng production. Chưa kiểm tra TalkBack, theme/font scale bổ sung, ma trận thiết bị thật, build release hay đồng bộ Supabase. Vì vậy đây là hoàn tất vòng source + runtime QA trên emulator, chưa phải nghiệm thu/release cuối cùng.
