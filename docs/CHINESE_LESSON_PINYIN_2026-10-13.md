# Pinyin dưới loa trong Buổi học

Yêu cầu bổ sung trực tiếp của người dùng ngày 13/10/2026, sau brief V8.1 English-only.

Thẻ Buổi học dùng `PinyinText` hiện có và `word.pinyin` đã lưu trong kho từ. Pinyin nằm ngay dưới loa, trước loại từ/HSK, căn giữa và tự xuống dòng. Hiện ở cả ba lượt. Chữ Hán vẫn chỉ hiện ở lượt 1; hướng dẫn lượt 2–3 được sửa để nói đúng rằng người học có thể dùng nghĩa và pinyin.

Đây là ngoại lệ tiếng Trung duy nhất được người dùng cho phép. Không đổi từ vựng, cấp HSK, cơ sở dữ liệu, thuật toán SRS, cách hoàn tất buổi học, hay cài đặt pinyin toàn ứng dụng. Không cài lên điện thoại trong đợt này.

Skill Minimal Change Engineer giữ thay đổi trong màn học này; không refactor luồng học hoặc ôn tập. Kiểm tra source adjacency bổ sung trong `session-pinyin-ui.test.ts`; kiểm thử native/hình ảnh được ghi riêng trong báo cáo QA, không suy ra từ test source.

Các việc không thực hiện: thêm pinyin vào màn Ôn tập, đổi cách chấm chữ Hán, sửa nội dung pinyin gốc.
