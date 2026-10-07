# Cập nhật Kho từ, luyện thi, mục tiêu học và syllabus

## Những thay đổi đã triển khai

- Kho từ có dropdown chọn tất cả/HSK 1–6/7–9 ngay dưới ô tìm kiếm. Chọn cấp
  cập nhật danh sách và thống kê nhớ; giữ nguyên bộ lọc trạng thái, tìm kiếm,
  yêu thích, chi tiết từ và luồng quay lại bài học. Bài từ vựng của lộ trình
  giữ phạm vi đã giao, không cho đổi cấp gây sai mục tiêu bài.
- Danh sách tải 100 từ mỗi trang và tải tiếp khi cuộn, thay giới hạn 2.000 từ.
  Chặn kết quả truy vấn cũ khi đổi cấp/bộ lọc, có trạng thái tải và thử lại.
- Trung tâm luyện thi chọn một cấp, một dạng và thời lượng trước khi bắt đầu.
  Có một nút chính, bài đang làm để tiếp tục, lịch sử và bốn lối vào kỹ năng.
  Tùy chọn nâng cao được thu gọn thay vì hiển thị dày đặc ngay khi mở.
- Dạng từ vựng mới tạo 10 câu (5 phút) hoặc tối đa 20 câu (10/15 phút), có
  đáp án xáo trộn và giải thích Việt từ kho từ. Loại nghĩa chính trùng hoặc
  placeholder rõ ràng; lưu snapshot và dùng luồng nộp/chấm/lịch sử hiện có.
- Mục tiêu từ mới mỗi ngày và giới hạn từ mỗi buổi có các lựa chọn
  5, 10, 15, 20, 30, 50, 75, 100. Không tự thay mục tiêu người dùng đã lưu.
- Syllabus có dữ liệu tra cứu offline 11.000 mục từ theo tài liệu chính thức,
  cùng nhiệm vụ giao tiếp/chủ đề/Hán tự/ngữ pháp theo cấp. Đối chiếu với DB
  đang dùng nhưng giữ cấp CSV; xem chi tiết trong HSK_SYLLABUS_ALIGNMENT.md.
- Sửa lỗi trang Cài đặt web gọi API tệp native khi kiểm tra điểm khôi phục.
  Điểm khôi phục native trên Android/iOS giữ nguyên.

## Phạm vi và điều chưa khẳng định

Đây là cập nhật mã nguồn, chưa cài APK lên điện thoại. Bộ skill mobile UI/UX
và offline-data được áp dụng để giữ lựa chọn rõ ràng, luồng có thể thử lại,
tải danh sách theo trang và đối chiếu chỉ đọc, không ghi đè dữ liệu học.

Bài ngữ cảnh hiện có vẫn là bài luyện ngắn, không phải bộ đề thi đầy đủ.
Bài từ vựng mới không phải đề HSK chính thức và không dự đoán đỗ. Ngữ pháp
syllabus nguyên văn chưa đồng nghĩa toàn bộ mục đã có bài dạy Việt/bài luyện.
Các khác biệt nguồn, đọc và quyền tái phân phối cần thẩm định trước phát hành.

## Kiểm chứng

- TypeScript và lint các phần sửa: đạt.
- Vitest toàn dự án: 153 files, 837 tests đạt.
- Expo export web và Android: đạt; export Android không phải build/cài APK.
- Có kịch bản `scripts/smoke-hsk-update.cjs` và ảnh kiểm tra giao diện 390px
  tại `docs/hsk-update-*.png`. Cần kiểm thử trên điện thoại trước phát hành.
- Smoke web cuối: đạt chọn HSK 3, tạo/lưu/tải lại/nộp bài từ vựng 10 câu,
  mở kết quả, tra syllabus/ngữ pháp, không tràn ngang, lưu lại cả mục tiêu
  ngày và buổi học 100 từ sau reload; không có pageerror.
