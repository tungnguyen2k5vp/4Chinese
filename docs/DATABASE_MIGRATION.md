# Database migration — BIG UPDATE

SQLite `hanzi30.db` vẫn là nguồn dữ liệu chính. Phiên bản schema mới nhất: **19**. Không thay ID hoặc tạo lại kho 11.330 từ.

`src/db/migrations.ts` đọc `PRAGMA user_version`, từ chối DB mới hơn app, kiểm tra `quick_check`, bổ sung cột thiếu trước index và thực thi schema trong transaction. Nếu lỗi, rollback; không xóa/reset DB. `initializeDatabase` chỉ đánh dấu version sau khi seed/refresh tương ứng hoàn tất.

Các phiên bản bổ sung: v11 chỉ mục Hán tự; v12 ảnh quản lý bởi app; v13 lộ trình; v14 grammar và kho câu dùng chung; v15 bài đọc; v16 truyện; v17 sổ lỗi/kỹ năng; v18 `speaking_practice`.

v18 chỉ tạo bảng mới, liên kết vocabulary/sentences, không ghi lại progress hoặc SRS. Attempt ID là khóa chính chống ghi trùng; kết quả chọn thanh điệu cập nhật sổ lỗi/điểm kỹ năng trong cùng transaction. Shadowing chỉ ghi nhận một lượt đối chiếu, `correct=NULL`, không tạo điểm phát âm.

Backup ZIP v2 có `speakingPractice` cùng các trạng thái học khác. Backup cũ thiếu trường này vẫn nhập được. Restore có transaction và kiểm tra integrity/foreign key; UI tạo điểm khôi phục trước khi nhập. Restore là thao tác thay trạng thái người dùng bằng bản backup, không phải merge cloud.

Test fixture v1/v9 dùng SQLite thật; kiểm tra bảo toàn notes/favorites/decks/custom words/SRS/review log/stats/settings, migration chạy lại và rollback. Chưa có dump database từ điện thoại production hoặc thử tắt máy trong migration. Không downgrade APK sau khi DB đã được nâng version; cần bản sửa tiến tiếp hoặc khôi phục backup tương thích.

v19 bổ sung `xp_events`, `achievements`, `user_achievements`, `learning_goals`, `grammar_attempts`; không ghi lại SRS/lịch ôn. XP có khóa chống tính trùng, thành tích đã mở giữ nguyên khi chuỗi học đứt, mục tiêu tuần lưu bền. Grammar attempt và kết quả chính ghi cùng transaction. Backup v1/v2 cũ thiếu các trường mới vẫn được nhập với mảng rỗng, không tự tạo lịch sử giả.

Đã xuất JSON từ APK 0.1.13 đang cài trên RMX3085 và kiểm tra trong SQLite dùng một lần: schema 11 → 19; 221 từ cá nhân, 15 bộ từ, 110 tiến độ, 169 lịch sử ôn giữ nguyên các cột xuất được. Đây là kiểm tra bản xuất dữ liệu người học, không phải dump toàn bộ SQLite điện thoại. Script `scripts/verify-device-backup.ts <before.json> [after.zip]` kiểm tra migration/foreign key/integrity và tùy chọn đối chiếu bản xuất sau cập nhật. Tệp riêng tư nằm trong `artifacts/` đã gitignore.
