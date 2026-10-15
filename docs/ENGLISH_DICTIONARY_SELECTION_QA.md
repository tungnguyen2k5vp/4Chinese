# V7 — đọc đủ nghĩa và lựa chọn nguồn chính xác

Ngày11/10/2026. **Repository đã kiểm thử; chưa tích hợp màn hình/runtime pack, chưa native QA hoặc APK mới. V7 vẫn PARTIAL.**

## Đã triển khai

`src/db/english/dictionary-detail.ts`:

- `englishHeadwordSensePage`: lấy mọi entry/POS của headword chuẩn hóa, phân trang keyset mặc định20/tối đa50. Không chỉ lấy senses của candidate đầu; không hard-cap tổng số nghĩa. Trả next cursor khi còn dữ liệu. Unknown word trả danh sách rỗng, cursor/page size sai bị từ chối.
- `englishPronunciationPage`: lấy IPA theo entry có phân trang, giữ nguyên `sense_id=null` khi nguồn chỉ cung cấp IPA cấp entry. Không tự gán cho mọi nghĩa.
- `resolveEnglishDictionarySelection`: chỉ resolve sense ID người dùng chọn, đọc lại dữ liệu gốc thay vì tin text do UI gửi; yêu cầu nguồn APPROVED. Không tự chọn IPA. IPA được chọn phải thuộc đúng entry/sense và `review_status=reviewed`; entry-wide/unreviewed bị từ chối flatten vào thẻ khi learner chưa lưu scope pronunciation. Không ghi DB; input resolved dùng `addEnglishCards` hiện có để lưu transaction.
- Card mới giữ source/sense/POS, trạng thái NEW, không lập lịch ôn trước khi bắt đầu học và không cộng review/XP.

`src/db/english/dictionary.ts`: FTS lấy12kết quả theo rank **trước JOIN**, tránh rank/join/sort toàn bộ tập match. Exact headword và forms vẫn ưu tiên trước FTS. Tại ranh giới12kết quả có cùng rank, tập gợi ý có thể khác cách sort toàn cục theo word ID trước đây; không phải fuzzy tự chọn nghĩa. Các kết quả đã lấy vẫn sắp rank/word ID, detail độc lập lấy đủ POS.

## Bằng chứng

4test mới PASS: fixture60senses/2POS qua nhiều trang không mất/trùng; scope IPA giữ nguyên và SQL injection được bind; staging bị gate từ chối; chọn đúng sense thứ17 của verb lưu NEW/no reviews; IPA unverified/sai sense bị từ chối, reviewed đúng sense được chấp nhận. Chỉ fixture mới được UPDATE APPROVED trong test; corpus thật vẫn LICENSE_REVIEW_REQUIRED. Dictionary suite liên quan14tests PASS.

Benchmark read-only pack thật `artifacts/v7-2026-10-11/kaikki-benchmark-detail.json`: `book` có **8nghĩa /noun+verb** qua API mới, thay vì3nghĩa của entry đầu. Exact mẫu0,07–0,70ms; `sách` khoảng3,26ms ở lượt này so với320,36ms lượt trước tối ưu. Đây là hai lượt **Windows/Node**, không paired benchmark Android/cold cache; không cam kết cải thiện100lần trên điện thoại. Bulk10/50/100 theo mẫu lặp có cache khoảng5,28/5,88/7,84ms, không tự chọn sense; chưa UI batch100từ khác nhau.

Typecheck PASS; lint0errors/5warnings cũ. Toàn suite **176files/975tests PASS**, gồm Chinese regression, được ghi trong `dictionary-detail-tests.json`. Không thay source Chinese/SRS/migrations; Chinese raw hash `d12e9f23c4c50af154c2a56c5d63de230c1e69e44ac0fd1c4e644c05e2622d11` giữ nguyên.

## Chưa hoàn tất

Runtime content install/licensing, search/detail/sense-picker UI, user-selected pronunciation provenance trong learner, UI bulk selection/draft và native QA chưa có. Các API này là phần nền tảng, không phải module người dùng đã sử dụng được. Không thay thế các API cũ tùy tiện để phá caller trước khi UI mới nối vào.
