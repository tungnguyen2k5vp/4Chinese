# 4Chinese V5.3.1 — Listening screen

## Luồng màn hình

1. Người học thấy scene tai nghe, mục tiêu nghe trước khi mở lời thoại và thông tin rõ rằng âm thanh là TTS trên thiết bị.
2. Chọn HSK từ một hàng cuộn ngang, rồi chọn câu.
3. Chọn tốc độ 0.65 / 0.82 / 1, phát hoặc dừng, tự nghe lại.
4. Có thể tự trả lời câu hỏi đồng hành; sau đó mở transcript/pinyin/nghĩa để đối chiếu.

## Tính trung thực của UI

- Bỏ dải cột cao thấp giả waveform. Thay bằng icon và trạng thái chữ `SẴN SÀNG PHÁT · TTS` / `ĐANG PHÁT`; hình này không giả làm tín hiệu âm thanh.
- Không thêm nút Pause vì wrapper hiện có cung cấp phát/dừng, không có thao tác pause/resume dùng ở màn này.
- Disclosure TTS, nguồn câu, nội dung `DRAFT` của câu hỏi AI và empty state dữ liệu chưa kiểm duyệt được giữ rõ. Không thêm audio hoặc câu mẫu chỉ để lấp danh sách.
- `play`, `stop`, giới hạn request, xử lý app background, rate, transcript và logic đối chiếu vẫn dùng service hiện tại.

## Chưa kiểm tra

Chưa phát audio trên Android thật/emulator, chưa xác minh giọng zh-CN đã cài, tốc độ TTS, TalkBack hay visual capture ở 360/412 dp. Các ảnh listening trong `screens-v5-3-runtime-final` là baseline trước V5.3.1.
