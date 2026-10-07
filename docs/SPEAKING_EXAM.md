# Luyện nói có thời gian

Route /exam/speaking có7 đề gốc, một đề/band 1–6 và7–9.
Loại hoạt động: đọc, kể sinh hoạt, chỉ đường, kể trải nghiệm, ý kiến, kể lại và lập luận.
Level là ước lượng; source CURATED/UNREVIEWED. Không phải HSK/HSKK mock chính thức.

## Luồng

Chọn đề → chuẩn bị 10–30 giây theo deadline → bấm ghi âm → tự dừng 30–120 giây
→ nghe hết bản ghi → checklist tự đối chiếu.
Không dùng speech-to-text để suy ra pronunciation score.
Permission chỉ yêu cầu khi ghi; bản ghi tạm local, không upload/backup.
Rời/background/re-record dọn audio; gián đoạn yêu cầu bắt đầu lại.
Không lưu speaking-exam attempt/history bền vững trong module này.

Web: hiển thị đề và checklist; không giả có microphone recording.
Controller tests bao gồm duration tùy chọn, invalid duration, stop/cleanup/lifecycle.
Browser xác nhận fallback/checklist; chưa xác nhận mic Android/iOS/TalkBack bằng thiết bị thật.

Còn thiếu profile nói chính thức, native listening prompts hợp lệ, bền vững self-review history,
AI feedback đã đánh giá và native permission/interruption/E2E verification.
