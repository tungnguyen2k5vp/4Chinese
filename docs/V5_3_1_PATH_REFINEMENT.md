# 4Chinese V5.3.1 — Learning path refinement

## Đã chỉnh

- Scene của khóa học/bài học được tách khỏi scene HSK overview để phân biệt mục tiêu.
- Node giữ cách so le trái-phải và trạng thái hiện tại/đã xong/khóa; giảm `minHeight` từ 106 xuống 92 dp, giảm khoảng cách nhóm và giữ node co được khi tiêu đề dài. Chiều rộng node tăng nhẹ từ 84% lên 88% để cải thiện chỗ đọc, không giảm kích thước vùng chạm.
- Sheet giới hạn chiều cao, cuộn nội dung và giữ CTA ở dưới; tiêu đề không đẩy nút đóng khỏi viewport.
- Khi chọn node, sheet đọc activity hiện có bằng `listLessonActivities`; hiển thị chip kỹ năng từ `activity_type` thực tế, trạng thái loading/error/empty tách biệt. Không tạo danh mục dựa trên tên bài.

## Không thay đổi

`isLessonUnlocked`, trạng thái persisted, thứ tự khóa/bài, điều kiện completion, XP, thời lượng và hành động bắt đầu bài đều giữ nguyên. Mở/đóng sheet không ghi tiến độ. Khi không đọc được danh sách activity, UI báo lỗi nhưng không suy diễn activity; CTA vẫn tuân theo điều kiện mở khóa gốc.

## QA còn thiếu

TypeScript và regression suite qua. Chưa kiểm tra sheet trên thiết bị thấp, landscape, font 160%, TalkBack hoặc route có fixture activity thật sau build mới. Cần capture các trạng thái available/current/completed/locked và đối chiếu `path_course.png` baseline V5.3.
