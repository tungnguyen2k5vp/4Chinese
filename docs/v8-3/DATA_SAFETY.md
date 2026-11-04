# V8.3 — database, SRS và English isolation

## Giới hạn bằng chứng

Không mở, sao chép hoặc cài app trên điện thoại thật. Không có snapshot mới của DB người dùng thật. Baseline trước viết mã là hash source/schema/data và bộ test cũ; kiểm tra SQL thực tế dùng fixtures riêng và máy ảo mới `FourChineseV83QA`, không sao chép userdata của máy thật hay AVD cũ.

`artifacts/v8-3-hanzi-memory/baseline.json`: schema45,608file source,207file test trước thay đổi. Bộ baseline chạy1134test đạt. Các thay đổi tab English đang có sẵn trong worktree được giữ nguyên, không quy thành thay đổi V8.3.

## Đối chiếu Android SQLite

`scripts/v8-3-evidence.cjs` so `database/baseline/report.json` với `database/after-supplemental/report.json`. Kết quả máy đọc: `artifacts/v8-3-hanzi-memory/database-safety.json`.

- Chinese schema vẫn45; dictionary11.877mục; ví dụ75; progress12từ giả lập.
- Hash toàn bộ dictionary rows/IDs/examples không đổi.
- Hash toàn bộ cột progress ngoài notes không đổi: due, next_review_at, mức nhớ, state, counts, learned_at, last_review, timestamps, favorites… đều giữ nguyên.
- review_log, daily_stats, XP, goals/settings, learning path giữ nguyên trong khoảng snapshot bài bổ trợ.
- Chỉ `mistake_records`, `practice_attempt_daily`, `vocabulary_skill_mastery` đổi do trả lời bài kiểm tra bổ trợ đã được xác minh bằng lựa chọn/chữ.
- Notes được kiểm tra **riêng**, không bỏ qua: đúng1mục 请 được nối block mnemonic với nội dung QA người kiểm thử đã nhập. Các notes còn lại không đổi. Ghi chú trước đó được bảo toàn trong test file-SQLite mở lại.
- English learner DB schema1,4bảng không đổi giữa hai snapshot. Fixture Android English lúc này rỗng; đây không phải chứng minh trên hồ sơ English thật có dữ liệu.

Sau snapshot này có smoke đổi ngôn ngữ bằng UI, mở Reader và lặp thêm bài bổ trợ. Thao tác đổi lựa chọn ngôn ngữ và mở bài đọc có ghi dữ liệu tương ứng bình thường; không gộp chúng vào khoảng đối chiếu “bài bổ trợ không đổi dữ liệu chính”.

## SRS regression report

Không sửa `services/srs`, `db/repository.ts`, schema, migrations, backup hoặc luồng học cũ. `recordMemoryChoice` chỉ gọi `recordPracticeResult` trong transaction hiện hữu; không gọi `reviewWord`, initial schedule, mark-known hay XP. Lượt tự đánh giá viết không được ghi thành kết quả chấm máy.

Các test real SQLite xác nhận toàn bộ bảng bảo vệ bằng deep equality sau đọc/ghi bổ trợ. Sau đó gọi **reviewWord gốc** trên fixture: review_log tăng từ1lên2, scheduler gốc thực thi bình thường. Bộ regression scheduler, progress lifecycle, session, review và từ điển cũ đều được giữ lại trong1149test cuối. Native smoke mở được màn ôn chính; chưa tuyên bố đã hoàn thành một phiên SRS đầy đủ bằng tay trên điện thoại thật.

Old recall được phép đọc thẻ chưa đến hạn nhưng không biến chúng thành due. Không có lịch SRS thứ hai. Mẹo nhớ cập nhật notes có sẵn và không tự tạo progress cho thẻ NEW.

## English isolation report

Hash source English/language/db/schema và tab liên quan trong source baseline không đổi. Hub memory chỉ được chèn vào nhánh Chinese Home/tool hubs. Các props mới của AudioButton và pad đều tùy chọn, giữ mặc định cũ.

Native QA chuyển sang English, mở `/memory`: chỉ thấy guard “Khu vực này dành cho tiếng Trung”, không mount nội dung truy vấn Chinese. Đã chuyển lại Chinese qua UI. Snapshot English learner không đổi trong phiên bổ trợ; bộ test English hiện hữu vẫn đạt trong full suite. Không nâng version English DB, không thay danh sách thẻ hay review English.

## Không thực hiện

Không production migration, reset, reimport từ điển, remap IDs, xóa notes, cloud sync, commit/push/release hoặc cài máy thật. Build APK dùng cấu hình debug signing sẵn có chỉ cho AVD thử nghiệm, không phải binary đã duyệt phát hành.
