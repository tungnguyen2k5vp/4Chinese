# 4Chinese BIG UPDATE — audit trước triển khai

Ngày kiểm tra: 2026-09-27. Phạm vi: mã nguồn hiện có trong `HocTiengTrungApp`; **không** giả định rằng mọi tính năng dự kiến đã có trên bản APK của người dùng.

## 1. Kiến trúc và chức năng đang có

- Expo 57 / React Native 0.86, Expo Router. Năm tab hiện tại: Trang chủ, HSK, Kho từ, Thống kê, Tài khoản. Zustand chỉ giữ trạng thái phiên/UI; SQLite (`hanzi30.db`) giữ dữ liệu học tập.
- Kho HSK đóng gói JSON ~11.330 mục, cộng từ mở rộng; tra cứu Hanzi/pinyin/nghĩa offline. ID HSK phải giữ nguyên. Có bộ từ cá nhân, từ tự tạo, ghi chú, yêu thích, trạng thái học, lịch SRS, lịch sử ôn, thống kê theo ngày.
- Có học từ, ôn tập nhiều kiểu bài, nghe/phát âm cơ bản và chấm AI tùy chọn qua Supabase Edge Function, luyện viết, Reader MVP dán văn bản/tra từ, kế hoạch học hôm nay, thống kê kỹ năng suy ra từ `review_log`.
- Sao lưu hiện tại là JSON do người dùng tự xuất/nhập. Ảnh chọn bằng picker đã được chép vào `Paths.document/word-images`, nhưng backup chỉ lưu URI nên **chưa** chuyển ảnh giữa thiết bị. Thiết kế cloud backup mới ở mức tài liệu, chưa có xác thực/cloud sync thực tế.
- Supabase hiện dùng cho chia sẻ bộ từ và Edge Function chấm phát âm; không phải nguồn dữ liệu học tập chính. Cấu hình Android giữ `applicationId=com.tungnguyen2k5vp.fourchinese`, versionCode 15 và ký release bằng debug keystore của dự án — không đổi chữ ký khi cập nhật cùng một app.

## 2. Schema hiện tại và quan hệ

`DATABASE_VERSION=11`, theo `PRAGMA user_version`. Bảng hiện có:

| Bảng | Vai trò và liên kết |
| --- | --- |
| `personal_deck` | Bộ từ, soft delete bằng `deleted_at` |
| `vocabulary` | HSK và từ cá nhân; `deck_id → personal_deck.id`, `is_custom` phân biệt |
| `example_sentence` | Ví dụ, `vocabulary_id → vocabulary.id` |
| `vocabulary_character_index` | Chỉ mục Hanzi suy ra từ `vocabulary`, có thể dựng lại |
| `user_vocabulary_progress` | Một dòng/từ, FK tới `vocabulary`; SRS, ghi chú, yêu thích, known/skipped, ngày đến hạn |
| `review_log` | Lịch sử trả lời, FK tới `vocabulary` |
| `daily_stats` | Thống kê theo ngày |
| `user_settings` | Cấu hình JSON một dòng |

Đường dữ liệu chính: `vocabulary → progress/review_log/example_sentence`; `personal_deck → vocabulary`; JSON HSK chỉ là nguồn seed/tra cứu offline, **không được cấp ID mới** trong migration. Đã có chỉ mục pinyin, cấp HSK, lịch ôn, bộ từ, từ liên quan.

## 3. Đã hoàn thành / còn thiếu

- Đã có: HSK/offline lookup, SRS, bộ từ riêng, lịch ôn, thống kê, Reader MVP, luyện nghe/viết/phát âm, backup JSON thủ công, lesson/review cơ bản.
- Chưa có hoặc chỉ một phần: migration nguyên tử và regression test database release cũ; backup ảnh/restore point; auth & sync queue; Learning Path data-driven; kho câu/ngữ pháp dùng chung; Reader lưu tiến độ/stories; mistake book và skill mastery lưu bền; adaptive plan; tone trainer/shadowing; OCR/import; achievements/knowledge map; AI tutor. Không coi UI hoặc bảng trống là tính năng hoàn chỉnh.

## 4. Technical debt và nguy cơ mất dữ liệu

1. `initializeDatabase` chạy `migrationSql` ngay đầu, bao gồm index trên các cột chỉ có ở schema mới. `CREATE TABLE IF NOT EXISTS` không thêm cột vào bảng cũ: nâng cấp từ một số bản cũ có thể lỗi trước khi migration chạy.
2. Các bước `ALTER`/seed/cập nhật phiên bản không nằm trong cùng một transaction. Nếu thoát app giữa chừng, có thể để lại schema nửa vời. Kiểm tra v2 chỉ dựa vào một cột `memory_level`, có thể bỏ qua những cột v2 khác khi migration bị gián đoạn.
3. `user_version` chưa chặn database từ bản app mới hơn; một bản APK cũ có thể thử ghi vào schema tương lai.
4. `refreshVocabularyQuality` có thể cập nhật nội dung từ HSK trong các lần nâng cấp. ID và progress không đổi, nhưng nội dung cần test cố định, tránh ghi đè mục `is_custom=1` của người dùng.
5. `importLocalBackup` chủ động `DELETE` nhiều bảng dữ liệu người dùng trong transaction sau khi parse JSON. Đây là luồng restore có xác nhận, không phải migration; cần validate FK/đủ cột/ảnh và tạo restore point trước khi cho dùng rộng rãi. Hiện chưa sao lưu ảnh thật.
6. `removeVocabularyFromDeck` xóa một mục từ tự tạo theo thao tác người dùng; index và ví dụ bị xóa theo FK. Không tìm thấy nhánh khởi động tự động `DROP TABLE`/`deleteDatabase`/reset SQLite trong `src`. `scripts/reset-project.js` là script thủ công, không gọi khi app chạy.
7. Chưa có kiểm thử mở database thật của release cũ rồi so sánh toàn bộ dữ liệu trước/sau. Test schema hiện tại chỉ dò chuỗi SQL.

## 5. Kế hoạch migration và triển khai

1. Giữ nguyên tên database, package Android, ID từ HSK và các cột/SRS cũ. Tách tạo bảng khỏi tạo index; kiểm tra `user_version`, tính toàn vẹn trước/sau, chạy mọi thay đổi schema trong transaction và chỉ tăng phiên bản sau khi thành công. Không bao giờ xử lý lỗi bằng xóa database.
2. Thêm regression fixture SQLite legacy chứa HSK, custom word/deck, progress, notes/favorite, review log, daily stats, settings. Kiểm tra bất biến `assertNoUserDataLoss`, chạy lại migration lần hai để chứng minh idempotent và thử rollback khi có lỗi.
3. Mỗi chức năng mới dùng bảng/link additive; không thay bảng `vocabulary`/`user_vocabulary_progress` để “làm đẹp” kiến trúc. Backfill được giới hạn và không ghi đè dữ liệu người dùng. Backup/restore nâng cấp trước cloud sync; cloud chỉ opt-in và SQLite vẫn là nguồn chính.
4. Theo checkpoint trong yêu cầu: (1) audit + DB safety/test, (2) migration framework + backup, (3) cloud sync, (4) Learning Path, (5) Grammar/Sentence, (6) Reader/Stories, (7) Mistake/Skill, (8) Daily/Adaptive, (9) Speaking/Tone/Shadowing, (10) Hanzi, (11) OCR/import, (12) Gamification/Knowledge Map; AI tutor sau nền tảng dữ liệu. Sau mỗi checkpoint chạy test, lint, typecheck; chỉ build/cài APK sau khi kiểm tra nâng cấp dữ liệu và chữ ký.

## 6. Tiêu chí release

Không giảm số từ HSK; không mất custom word/deck, ghi chú, favorite, SRS, lịch sử ôn, thống kê/cài đặt. Database cũ mở được; nâng cấp lại không đổi dữ liệu; lỗi migration rollback và hiện lỗi an toàn, không reset. Kiểm tra thật trên Android bản release trước khi ghi nhận đã cài cho người dùng.
