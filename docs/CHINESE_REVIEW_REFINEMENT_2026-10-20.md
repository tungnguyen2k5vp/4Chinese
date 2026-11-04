# Ôn tập, nhập pinyin và Học hôm nay — 20/10/2026

## Chính sách gợi ý

- “Gợi ý” và “Chưa nhớ · xem đáp án” là hai hành động riêng. Gợi ý không nộp bài, không tự đánh dấu sai, không ẩn bốn đáp án trắc nghiệm.
- Gợi ý nhẹ hiện pinyin hoặc một phần chữ theo kiểu bài. Người học vẫn phải trả lời. Ghép Hán tự có thể xem pinyin nhưng vẫn phải tự chọn ứng viên.
- Sau ba lượt đúng, nếu có bất kỳ lượt nào dùng gợi ý, kết quả được lưu đúng có hỗ trợ: giữ cấp, không tăng cấp; bộ lập lịch hiện có hẹn xác nhận sớm hơn.
- Một câu sai thật hoặc tự chọn “Chưa nhớ” vẫn dùng chính sách ôn lại hiện có. Xem đáp án không được tính là tự nhớ.
- Sửa ở tổng kết ba lượt, không chỉ đổi thông báo. Lưu kết quả có khóa chống bấm lặp và cho phép thử lại khi lỗi. Không sửa bộ lập lịch chung hay dữ liệu tiếng Anh.
- Cấp nhớ chờ dữ liệu thật, không tạm hiển thị cấp 1 khi chưa tải xong.

## Giao diện

- Composer chung: câu trả lời nhỏ gọn, xóa bằng icon có nhãn trợ năng, ô nhập rộng và mic 48 px. Ứng viên chỉ xuất hiện khi có truy vấn; bỏ khối trống giãn chiều cao. Không tự chọn chữ Hán.
- Màn ôn ghép Hán tự: bỏ thẻ hướng dẫn rỗng riêng; gợi ý pinyin nằm ngay trong khối nhập. Có xử lý bàn phím.
- Màn học mới: chuyển giữa Viết tay / Nhập pinyin, chỉ hiện công cụ đang dùng; phát âm cạnh pinyin, ví dụ có thể mở thêm, hành động phụ đặt cùng hàng.
- Học hôm nay: một gợi ý ưu tiên và một nút bắt đầu. Công cụ luyện thêm là danh sách gọn; thông tin về lịch SRS, mục tiêu và lý do gợi ý nằm trong “Chi tiết kế hoạch”. Giữ nguyên cách chọn từ đến hạn và giới hạn thời gian.

## Kiểm chứng và giới hạn

- TypeScript và lint các tệp sửa: đạt.
- 17 tệp / 78 bài kiểm thử liên quan: đạt, gồm 1–3 lượt gợi ý vẫn giữ cấp 3, sai thật vẫn hạ cấp, và ba lượt tự nhớ được tăng cấp.
- Kiểm thử web với SQLite thật trong hồ sơ trình duyệt riêng: đạt. Đã học 用 qua ba lượt pinyin, ôn không gợi ý lên cấp 3, rồi dùng gợi ý ở một lượt và xác nhận kết quả vẫn cấp 3, số từ sai bằng 0. Kiểm tra thêm chọn/xóa ứng viên, màn 320 px tối và mở/đóng chi tiết kế hoạch.
- Toàn bộ bộ kiểm thử dự án: 1.155 đạt / 5 không đạt (211 tệp: 206 đạt / 5 không đạt). Các lỗi thuộc kỳ vọng phiên bản migration, phân trang từ đã học, FTS/bm25 và ngữ cảnh đọc. Những phần đó không được sửa trong yêu cầu này; không tuyên bố toàn dự án đã đạt.
- Export Android/Hermes: đạt, không phải APK đã kiểm thử trên điện thoại. Chưa cài bản sửa này lên thiết bị thật; bàn phím, micro và âm thanh native chưa được xác nhận.

Ảnh: `artifacts/chinese-review-refinement-2026-10-20/index.html`.
Chạy lại giao diện: `node scripts/qa-chinese-review-refinement.cjs` khi Expo web đang chạy ở cổng 8133. Script chỉ tạo dữ liệu trong trình duyệt riêng, không đọc hoặc thay đổi hồ sơ điện thoại; thời gian được mô phỏng để kiểm tra lịch ôn.
