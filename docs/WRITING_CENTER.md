# Writing / Translation Center

Lối vào: HSK → Ôn thi → Viết/dịch/nói; hoặc Luyện tập → Viết và dịch.
Routes /exam/skills và /exam/written.
14 bài gốc: mỗi band1–6/7–9 có một bài viết và một bài dịch. Source CURATED/UNREVIEWED.

## Luồng học

Mở bài → nhập → autosave sau 800ms ngừng gõ → tự đối chiếu → mẫu + checklist.
Bản nháp tồn tại qua reload; hiện lỗi lưu và nút retry; không tự bỏ input.
Rời màn khi dirty dùng xác nhận “Lưu và rời”; khi đang lưu không rời.
Bài REVIEWED bất biến; làm lại mở draft mới, không ghi đè bài trước.
Giới hạn input 12.000 ký tự. Không gửi nội dung lên AI.

## Lưu dữ liệu

written_practice (migration 34): immutable exercise snapshot, answer, DRAFT/REVIEWED, revision, updated_at.
CAS chặn stale; validate exercise/backup trước ghi; backup mới có writtenPractice.
Backup legacy thiếu trường mới không xóa bản nháp hiện có.
Kiểm thử SQLite round-trip/resume/stale/corrupt/empty/oversize và bảo toàn dữ liệu cũ.

## Feedback thực tế

Đếm Hán tự hoặc từ Việt, khoảng độ dài, từ yêu cầu xuất hiện, dấu kết câu.
Checklist và bài mẫu phục vụ tự học, không chứng minh đúng nghĩa/ngữ pháp/độ tự nhiên.
Khác mẫu không đồng nghĩa sai. Không score chính thức, rubric AI hoặc chấm handwriting tự luận.
Còn thiếu curriculum viết đầy đủ, ảnh/biểu đồ, semantic feedback và validated scoring rubric.
