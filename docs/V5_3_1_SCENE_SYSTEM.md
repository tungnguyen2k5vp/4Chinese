# 4Chinese V5.3.1 — Scene system

## Mục tiêu

Tạo khác biệt thị giác theo tác vụ, thay vì dùng một hình núi/đường giống nhau trên nhiều màn. Hệ thống nằm ở `src/components/visual/scene-registry.ts` và `LearningLandscape.tsx`; minh họa là SVG thuần, chỉ trang trí và luôn bị loại khỏi accessibility tree.

| Scene | Bố cục | Màu nhấn | Nhóm màn |
|---|---|---|---|
| `learn` | Sách mở và đường học | Từ vựng | Trang chủ, bài học, hub luyện tập |
| `read` | Sách mở trên mặt bàn | Đọc | Hub thư viện, Reader |
| `listen` | Tai nghe và nhịp âm | Nghe | Luyện nghe |
| `speak` | Micro và hai bong bóng thoại | Nói | Nghe-nói, hội thoại AI |
| `hsk` | Cổng mốc và lối đi | Thi | Chọn HSK, tổng quan lộ trình |
| `achievement` | Huy hiệu và dấu kiểm | Ôn tập | Thành tích |
| `stats` | Cột tiến độ và đường xu hướng | Thi | Thống kê |
| `welcome` | Cánh cửa mở | Từ vựng | Onboarding |

Các scene dùng token accent từ `theme.skillColors`, nền tối dùng token theme; các mood cũ vẫn ánh xạ qua `legacySceneByMood` để tránh làm gãy caller chưa được chuyển. Scene không chứa chữ mang ý nghĩa nghiệp vụ; nội dung/nhãn accessible phải đến từ UI lân cận.

## Bảo trì

- Thêm family mới trong registry, khai báo composition/accent, renderer SVG và test kiểm tra uniqueness.
- Không biểu diễn waveform, tiến độ hay nội dung dữ liệu bằng hình minh họa tĩnh.
- Giữ viewBox nhẹ, không nạp asset mạng; kiểm tra theme sáng/tối và kích thước nhỏ trước khi thêm chi tiết.
- Bằng chứng hiện có là typecheck/test và Android JS export; chưa có ảnh runtime hậu update để đánh giá sắc độ, crop hoặc hierarchy thực tế.
