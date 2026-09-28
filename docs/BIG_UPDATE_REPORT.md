# BIG UPDATE — báo cáo triển khai theo checkpoint

Ngày: 2026-09-27. Bản cập nhật lớn **chưa hoàn tất**; không cài bản thử nghiệm này đè lên dữ liệu thật trước khi kiểm tra Android release và toàn bộ acceptance criteria.

## Checkpoint 1: Audit + an toàn database — hoàn thành ở mức mã nguồn/test

- Audit kiến trúc và rủi ro tại [BIG_UPDATE_AUDIT.md](./BIG_UPDATE_AUDIT.md).
- Tách tạo bảng và tạo index; schema cũ được bổ sung cột trước khi index mới chạy. Đọc/chặn `PRAGMA user_version` không hỗ trợ, `quick_check` trước/sau, transaction rollback nếu lỗi. Không có code xóa SQLite khi migration thất bại.
- Backfill chỉ những cột vừa thêm, giữ nguyên `memory_level` và dữ liệu học nếu một migration cũ từng bị ngắt. Phiên bản DB chỉ được đánh dấu hoàn tất sau khi các bước refresh dữ liệu cũ thành công.
- Fixture SQLite thật mô phỏng schema v1 và v9 (v9 khớp chênh lệch schema với commit release hiện tại), có HSK/custom/deck/progress/SRS/notes/favorite/review history/stats/settings. Test upgrade, chạy lại, lỗi giữa transaction, DB phiên bản mới hơn và số lượng/ID HSK. Đây là fixture mô phỏng, chưa phải bản dump lấy từ điện thoại người dùng.
- Sửa việc refresh toàn bộ 11.330 từ HSK khi chuyển **bất cứ** version nào; refresh từ v9 chỉ chạy khi nâng từ trước v9.

## Checkpoint 2: Backup 2.0 — hoàn thành ở mức mã nguồn/test, chưa xác minh trên thiết bị

- Trước khi người dùng xác nhận nhập backup, app xuất trạng thái hiện tại thành điểm khôi phục riêng trong `Paths.document`; lỗi ghi/xác minh file sẽ dừng import. UI có hành động hoàn tác lần restore gần nhất. Import vẫn thực hiện trong transaction và rollback khi hỏng.
- Test trực tiếp SQLite: backup/restore giữ HSK ID, khôi phục ghi chú/hồ sơ học; backup có bản ghi trùng khiến import lỗi nhưng không xóa trạng thái cũ.
- Test tích hợp gọi toàn bộ `initializeDatabase` trên fixture release v9, rồi khởi động lần nữa: ID, ghi chú, SRS, lịch sử, thống kê và cài đặt không đổi.
- Bản sao lưu ZIP v2 chứa `metadata.json`, `version.json`, `data.json` và ảnh người dùng. Ảnh có checksum CRC-32 để phát hiện lỗi vô ý (không phải chữ ký chống sửa ác ý). Import giới hạn dung lượng, số ảnh, kích thước từng mục, chặn đường dẫn ZIP lạ/trùng và thiếu ảnh. Tệp JSON v1 vẫn đọc được trên cùng thiết bị nếu ảnh cũ còn tồn tại.
- Migration v12 thêm `image_assets` và backfill ảnh cũ trong transaction; sửa từ HSK và ảnh cá nhân được đưa vào ZIP, không đổi ID từ. Ảnh restore được ghi sang vùng lưu trữ riêng của app. Điểm khôi phục trước khi nhập cũng là ZIP có ảnh và được đọc lại để kiểm chứng sau khi ghi.
- Xuất snapshot trong transaction; restore kiểm tra `quick_check` và foreign key trước commit. Chưa chứng minh quy trình này trên thiết bị Android thật hoặc tình huống hết bộ nhớ/tắt máy giữa restore. Cloud backup chủ động có ở checkpoint 3; sync chưa có.

## Checkpoint 3: Cloud — đang triển khai

- Có màn hình đăng nhập email và sao lưu ZIP lên/xuống/xóa theo thao tác chủ động; phiên native dùng SecureStore. Đã thêm SQL tạo bucket private và policy RLS theo `auth.uid()` tại `supabase/cloud-backups.sql`, cùng test lọc đường dẫn và kiểm tra ZIP trước upload.
- **Chưa deploy SQL lên Supabase, chưa test hai tài khoản trên backend thật. Chưa có sync_queue, đồng bộ hai chiều, xử lý xung đột, xóa tài khoản.** Vì vậy Cloud Sync chưa hoàn thành và không được quảng bá là sẵn sàng production.

## Checkpoint 4: Learning Path — khung chức năng và dữ liệu mẫu

- Migration v13 thêm `courses`, `units`, `lessons`, `lesson_activities`, `lesson_progress`; seed khóa HSK 1–7-9 với ID ổn định và `INSERT OR IGNORE`, không đổi vocabulary/SRS. Màn hình lộ trình có thứ tự khóa/mở, tiến độ, XP và tiếp tục bài; trạng thái lesson được đưa vào Backup 2.0.
- Hoạt động hiện liên kết đến màn hình từ HSK/Grammar/Reader/Luyện viết/Ôn tập sẵn có. Bài học chỉ được người dùng tự đánh dấu đã học sau khi mở các hoạt động, **chưa xác thực kết quả bài tập**; listening/speaking course activities và curriculum nội dung sâu chưa hoàn thành.

## Checkpoint 5: Grammar + Sentence DB — khung chức năng và nội dung mẫu

- Migration v14 thêm `grammar_points`, `sentences`, các bảng liên kết grammar–sentence–vocabulary và `grammar_progress`; câu chỉ lưu một lần rồi liên kết nhiều nội dung. Seed 7 cấu trúc HSK 1–2 với 14 ví dụ song ngữ; có danh sách, chi tiết, phát âm và bài chọn từ còn thiếu. Tiến độ thử/đúng được sao lưu.
- Chưa có bộ grammar HSK 1–9 đầy đủ, các dạng bài reorder/translation/error correction, hay dùng chung sentence DB trên toàn bộ reader/listening/speaking. Không coi checkpoint này đã hoàn thành.

## Các checkpoint chưa hoàn thành

3 Cloud Sync; 4 Learning Path hoàn chỉnh; 5 Grammar + kho câu hoàn chỉnh; 6 Reader/Stories nâng cao; 7 kết nối đầy đủ mọi loại bài và điểm kỹ năng; 8 daily/adaptive đầy đủ; 9 chấm âm học và QA thiết bị; 10 guided tracing/kiểm tra nét đáng tin cậy; 11 EPUB/PDF và QA OCR/import; 12 achievements/weekly goal và map đầy đủ. Tone/Shadowing/TXT đã có luồng thực thi được bổ sung bên dưới; AI tutor sau cùng. Không coi các chức năng mẫu là hoàn thành toàn bộ yêu cầu.

## Checkpoint 6: Reader + Stories — đã có luồng offline cơ bản

- Migration v15/v16 thêm bài đọc, vị trí đọc, liên kết từ, truyện, câu hỏi và tiến độ; được sao lưu/khôi phục. Reader tra batch đầy đủ thay vì cắt 280 mục, phân trang hiển thị token, pinyin/nghĩa từng từ, phân loại từ và độ phủ/HSK ước tính; lưu và mở lại lịch sử. Ba truyện gốc HSK 1–3 có câu hỏi đọc hiểu và tiến độ lưu bền.
- Chặn kết quả phân tích cũ ghi đè bài mới, bấm lưu liên tiếp và xử lý lỗi ghi vị trí/xóa/thêm từ. Mở lịch sử từ màn hình truyện chuyển về chế độ bài đọc riêng.
- Chưa có dịch toàn câu, thư viện truyện rộng, quiz nhiều câu hoàn chỉnh, audio truyện hoặc benchmark tokenizer trên điện thoại thật.

## Checkpoint 7: Sổ lỗi + điểm kỹ năng — nền tảng lưu bền và luyện lại

- Migration v17 thêm `mistake_records` và `vocabulary_skill_mastery`, cùng backup/restore. Ôn SRS và bài ngữ pháp lưu kết quả kỹ năng trong cùng transaction với kết quả chính. Lỗi được khắc phục sau 3 lần đúng liên tiếp không gợi ý; sai lại mở lại lỗi.
- Sổ lỗi có bộ lọc, liên kết ngữ pháp và bài luyện lại riêng cho nghĩa/pinyin/nghe/Hán tự/viết. Test SQLite chứng minh luyện lại không đổi bảng progress/SRS/review_log, và rollback chuỗi khắc phục nếu ghi điểm lỗi.
- Điểm 0–100 là chỉ số deterministic (+10 đúng, +2 có gợi ý, -12 sai), không phải chứng nhận trình độ. Chưa tính tốc độ trả lời/độ gần đây, chưa ghi đủ từng lượt thành phần, chưa backfill lịch sử cũ và chưa có bài speaking trong sổ lỗi.

## Checkpoint 8: Daily Plan — phân bổ thời lượng và gợi ý rule-based

- Trừ thời gian đã học hôm nay khỏi mục tiêu phút; phân bổ thẻ đến hạn trước, sau đó từ mới trong giới hạn mục tiêu/ngưỡng phiên, sổ lỗi, viết và đọc. Ước lượng 45 giây/thẻ ôn và 90 giây/từ mới, không đổi lịch SRS và không ngăn người dùng học thêm ngoài phiên gợi ý.
- Gợi ý khi có nhiều thẻ đến hạn, kỹ năng nghe kém hơn hiểu nghĩa trên 20 điểm và lỗi chưa khắc phục. Có test thời lượng đã hết, dedupe, ưu tiên thẻ đến hạn và tổng ước lượng không vượt ngân sách.
- Chưa có trình điều phối tự chuyển toàn bộ hoạt động, phân bổ đủ speaking/listening độc lập, hay recommendation dùng toàn bộ điểm kỹ năng lưu bền/streak.

## Checkpoint 9: Speaking + Tone Trainer + Shadowing — có luồng luyện, cần QA thiết bị

- Skill mobile audio/speech dẫn tới giới hạn 20 giây, hủy khi vào nền/rời màn hình, abort upload và chặn kết quả cũ. Hết thời lượng hủy bản ghi, không tự upload; chỉ bấm Dừng và gửi mới gửi. Tệp tạm được dọn best-effort, upload giới hạn 5 MB và timeout 20 giây; lỗi hạn mức và payload sai được kiểm tra.
- UI phân biệt rõ độ khớp bản chép lời với điểm chất lượng âm thanh/thanh điệu. Không tuyên bố STT chấm phát âm âm học. Chưa kiểm thử micro/Bluetooth/interruption trên máy thật; cloud evaluator hiện có vẫn cần nâng auth/rate limit phía server.
- Thêm `/speaking`, Tone Trainer từ vocabulary thật: đủ 5 thanh/16 cặp, bài đọc pinyin/nghe rồi chọn/đối chiếu mẫu/ghi âm nghe lại. Numeric pinyin thiếu hoặc đa biến thể bị loại, không đoán thanh. Bài nghe loại 3–3, 一/不 và các chữ đa âm thường gặp; bài từ điển vẫn có với giải thích biến điệu. TTS thiết bị không phải corpus audio được chứng nhận.
- `ShadowingPlayer` dùng shared sentence DB (hiện 14 câu), có tốc độ 0.6/0.82/1×, loop, auto-next, nghỉ 1/3/5 giây, ẩn/hiện Hanzi/pinyin/nghĩa. Giới hạn 30 lượt phát liên tục; dừng cuối danh sách, vào nền/rời màn hình.
- Local recorder không upload, tối đa 30 giây; phát lại và xóa bản ghi khi ghi mới/vào nền/rời màn hình. Native operations được tuần tự hóa, chặn permission/prepare trả về muộn; không chồng mẫu và bản ghi. Web nghe mẫu nhưng ghi âm đối chiếu chưa hỗ trợ.
- Migration v18 lưu `speaking_practice`, attempt ID chống tính trùng, backup/restore lịch sử. Tone choices nối sổ lỗi/skill có bằng chứng; Shadowing chỉ ghi lượt đối chiếu, không tăng điểm nói giả hoặc thay lịch SRS. Chưa có acoustic grading/per-character tone và chưa có device QA audio đầy đủ.

## Checkpoint 10: Kho nét — mở rộng và xác minh nguồn

- Tạo 4.196/4.202 chữ HSK 1–9 và bổ sung từ nguồn `hanzi-writer-data`, giữ giấy phép. Chia 8 shard nạp theo chữ để tránh đọc toàn bộ corpus lúc khởi động. Test so sánh mọi path với nguồn và kiểm tra shard không bỏ sót/trùng.
- Sáu chữ nguồn chưa có: 搾、獃、秊、薙、颿、骽. Có manifest, fallback tự viết; không còn giả nét giản thể là nét của chữ phồn thể khác.
- Chưa có thuật toán xác minh thứ tự/hướng nét đáng tin cậy hay guided tracing nâng cao. Không chấm sai giả và không tuyên bố mọi chữ đều đã có mẫu.

## Checkpoint 11: OCR + nhập TXT vào Reader — chưa EPUB/PDF

- Skill native module dẫn tới adapter typed kiểm tra khả năng runtime; thêm ML Kit Chinese bundled trong mô-đun Android hiện có, theo [hướng dẫn Google](https://developers.google.com/ml-kit/vision/text-recognition/v2/android). Không upload ảnh. Native chỉ nhận ảnh file trong cache app, giới hạn 15 MB, downsample cạnh dài còn tối đa 2.048 px, xoay EXIF cơ bản và giải phóng bitmap/recognizer.
- Kết quả tối đa 2.000 ký tự được đưa vào ô sửa văn bản; người dùng phải kiểm tra rồi tra từ/lưu theo luồng Reader. Không tự tạo từ hay thay đổi dữ liệu học. Timeout 15 giây, cancel/late-result guard, dừng khi rời màn hình/vào nền; runtime thiếu mô-đun vẫn cho paste thủ công.
- Native build với thư viện OCR đạt; chưa thử ảnh/nghiêng/mờ/EXIF mirror/permission trên điện thoại thật. Chưa có PDF/DOCX import, chưa có benchmark độ chính xác OCR hay hỗ trợ OCR native iOS/web.
- Thêm `expo-document-picker` đúng SDK (57.0.2) và adapter TXT: UTF-8/UTF-16 BOM, kiểm tra extension, mã hóa, binary, 256 KB trước đọc vào JS; preview tối đa 2.000 code points. Timeout đọc 10 giây, hủy nhập và chặn late results, chỉ xóa bản copy trong cache, không xóa file gốc. Browser File được xử lý riêng, không gọi native filesystem.
- TXT không upload/auto-save; dùng cùng Reader segmentation và lưu bài hiện có. Picker native có thể copy file trước khi trả metadata nên giới hạn 256 KB chưa giới hạn I/O của chính picker. Chưa test Android/iOS picker/cloud-provider thật, chưa EPUB/PDF/website extract.

## Checkpoint 12: Knowledge Map — thống kê điểm có bằng chứng

- Trang Thống kê giữ các phần cũ, thêm 6 điểm kỹ năng từ bảng lưu bền và tỷ lệ đúng ngữ pháp. Chỉ tính cột có điểm dương hoặc lỗi đã ghi nhận cho kỹ năng đó; không suy diễn cột mặc định 0 hay review lịch sử chưa backfill thành điểm yếu.
- Test phân biệt chưa có dữ liệu với điểm 0 sau trả lời sai. Chưa có achievements lưu bền, weekly goal, XP cho mọi hoạt động hay map liên kết toàn bộ curriculum.

## Quyết định tương thích

- Giữ `hanzi30.db`, Android package/signing, các bảng/tên cột/SRS, bộ từ và ID HSK cũ. `DATABASE_VERSION` đã tăng 11 → 18 qua migration cộng thêm cho ảnh/lộ trình/ngữ pháp/reader/truyện/lỗi/điểm kỹ năng/lịch sử speaking; có test nâng cấp từ v1/v9 và chạy lại.
- Không biến SQLite thành network-first. Không upload dữ liệu học tập khi chưa có xác thực, RLS, đồng thuận người dùng và test xung đột.
- APK kiểm thử native đã build, chưa cài lên điện thoại; chưa đủ bằng chứng nâng cấp dữ liệu thật để gọi là release hoàn chỉnh.

## Kiểm tra hiện tại

- `npm test`: 60 file, 239 test đạt ở lần chạy sau bổ sung Tone/Shadowing/TXT; không bỏ test cũ.
- `npm run lint`: đạt.
- `npm run typecheck`: đạt.
- `npx expo export --platform android`: đạt (bundle JS, chưa phải APK).
- `npx expo export --platform web`: đạt sau chỉnh sửa cuối cùng, 45 route gồm speaking/tones/shadowing; chưa browser E2E. Bundle entry web khoảng 23 MB, chưa tối ưu tải/parse trên thiết bị yếu.
- Native `assembleRelease` arm64: candidate 0.1.14 (versionCode 16) thêm Tone/Shadowing/TXT build thành công bằng JDK 22 sau chỉnh sửa cuối cùng. `aapt` xác minh versionCode 16/versionName 0.1.14/package cũ/arm64; `apksigner verify` đạt, certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, khớp bản kiểm thử trước. JDK 25 gây cảnh báo native access mà AGP Prefab xử lý thành lỗi; không thay đổi Java toàn hệ thống. Chưa device QA/cài APK. Tăng số bản để phân biệt candidate, không coi BIG UPDATE đã hoàn tất.
- Bản kiểm thử riêng tại `artifacts/4Chinese-big-update-test-20260927-arm64.apk`; không ghi đè/xóa các APK cũ. Không dùng bản này làm bằng chứng BIG UPDATE đã hoàn tất.
- Candidate mới: `artifacts/4Chinese-v0.1.14-big-update-test-arm64.apk`, 90.280.570 byte; SHA-256 `d6bb24fbcebd7df4ea9c02600f29516ca8c31f0d7d6cabaa4856a3d83c5f8bd3`. Bản cũ vẫn giữ nguyên. Lint/typecheck cuối cùng sạch; `git diff --check` đạt (cảnh báo chuyển LF/CRLF, không có lỗi whitespace).
- Bổ sung tài liệu architecture/migration/cloud/learning/release checklist đúng yêu cầu. npm install báo 16 advisory moderate trong dependency tree; chưa thực hiện audit khắc phục sâu và không chạy `audit fix --force` làm lệch SDK.

## Còn phải kiểm tra trước khi release

- Chạy upgrade test trên bản sao SQLite từ **APK release đã cài thật**, bao gồm ảnh/tệp trong app; thử restore lỗi/mất điện/thiếu dung lượng.
- Build APK release cùng chữ ký cũ, kiểm tra `applicationId`/`versionCode`, cài đè không gỡ app, xác nhận dữ liệu/SRS/bộ từ còn nguyên và test offline.
- Hoàn thành hoặc gắn feature flag các checkpoint còn lại, sau đó chạy lại toàn bộ test/build/device smoke test. Chỉ đánh dấu BIG UPDATE hoàn tất khi tiêu chí trong yêu cầu gốc đều đạt.

## Tiếp tục ngày 27/09/2026 — candidate 0.1.15 (17), schema 19

- Ngữ pháp có đủ năm dạng: chọn đáp án, điền từ, xếp câu, chọn bản dịch và sửa lỗi. Hiện 35 bài cho 7 cấu trúc đã biên soạn; không tuyên bố là corpus HSK 1–9 đầy đủ. Lưu từng attempt chống gửi trùng, lỗi ghi không hiển thị thành công giả, không thay SRS.
- Thành tích và mục tiêu tuần: 8 mốc lưu bền, chuỗi hiện tại/tốt nhất, phút học tuần theo giờ địa phương; XP cho học từ mới/ôn/ngữ pháp/tone/shadowing/truyện có giới hạn tính trùng. XP mới không backfill lịch sử giả; XP lộ trình cũ vẫn là hệ thống riêng.
- Theo dõi thời lượng chỉ chạy khi màn hình học có focus và app ở foreground. Tạm dừng khi rời màn hình/vào nền; chia đúng ngày khi qua nửa đêm, ghi lỗi có hàng đợi thử lại trong vòng đời tracker. Không đảm bảo giữ phần thời gian chưa flush nếu hệ điều hành giết app đột ngột.
- Canvas có tự viết/tô theo nét với mẫu đúng theo chữ và nút tiến/lùi nét. Đây là mẫu tham khảo, không chấm thứ tự/hướng nét tự động; chữ thiếu dữ liệu vẫn tự viết, không giả nét chữ khác.
- Lint sạch, typecheck đạt, 63 file / 249 test đạt. Kiểm tra bản xuất dữ liệu thật từ điện thoại schema 11 lên 19 đạt; APK cũ đã sao lưu và certificate được xác minh. Cài và đối chiếu dữ liệu sau cập nhật sẽ được ghi riêng sau khi thực hiện, không suy ra từ unit test.
- Cloud Sync hai chiều/RLS hai tài khoản, xác thực hoàn thành curriculum, placement, acoustic grading và AI Tutor vẫn chưa hoàn tất. Các giới hạn checkpoint trước còn hiệu lực trừ những phần được bổ sung rõ ở mục này.

### Kết quả cài thật

- Artifact `artifacts/4Chinese-v0.1.15-big-update-arm64.apk`: 90.317.954 byte, SHA-256 `1b46f76ff437ddbb6f1b44b69d0bdf45077a525dc2c07d5e0ff3e6719c704ebb`. Package giữ nguyên, arm64; certificate khớp APK 0.1.13 kéo trực tiếp từ máy.
- `adb install -r` trả `Success`; RMX3085 xác nhận 0.1.15 (17), lastUpdateTime 2026-09-27 22:19:13. App mở màn hình chính và ôn tập, không quay về onboarding hoặc reset database. Lint/typecheck cuối cùng đạt.
- Chưa đối chiếu được ZIP sau cài: máy đang chuyển sang phiên ôn của người dùng; dừng thao tác UI để không hủy phiên đó. Chỉ xác nhận bản xuất trước cài đã qua kiểm tra migration, không tuyên bố đã chứng minh bảo toàn toàn bộ dữ liệu trên máy sau cập nhật.
- BIG UPDATE chưa được đánh dấu hoàn tất; các phần backend cần triển khai và kiểm thử độc lập trước khi bật đồng bộ tự động.
