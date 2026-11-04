# English Reader — checkpoint 11/10/2026

Checkpoint mới sau cài: Reader đã nằm trong APK release **0.1.40/build42** trên máy thật. Emulator build41 kiểm offline/save/Back guard/cold reopen/lookup PASS; build42 giữ dữ liệu QA; phone build42 kiểm hai cold launch Reader và quay lại home PASS. Các giới hạn nội dung/backup/navigation/accessibility bên dưới vẫn áp dụng. Xem [Native QA](NATIVE_RELEASE_BUILD42_QA.md). Các đoạn “chưa cài/chưa kiểm runtime” bên dưới mô tả checkpoint trước cài, không phải kết quả mới nhất.

Trạng thái: **PARTIAL**, dùng được với văn bản và bộ từ cá nhân; chưa phải Reader tích hợp từ điển V7 đầy đủ. Chưa cài lên điện thoại.

## Chức năng đã nối vào app

Vào **Hoạt động tiếng Anh → Đọc văn bản tiếng Anh cá nhân**. Nhập tiêu đề và dán văn bản, chọn **Lưu và đọc**. Một tài liệu tối đa 100.000 ký tự được lưu trong `english-learner.db`, bằng khóa riêng trong `en_drafts`; không đổi schema và không chạm dữ liệu Chinese.

Tokenizer tiếng Anh giữ nguyên dấu câu, khoảng trắng, contractions, apostrophes, hyphenated words và offsets UTF-16. Cửa sổ đọc mặc định 1.800 ký tự, kéo dài đến hết từ tại ranh giới; chuỗi từ dài hơn 300 ký tự trở thành văn bản thường, không làm cửa sổ phình ra toàn tài liệu. Vị trí được lưu trước khi chuyển phần; mở lại khôi phục phần đang đọc. Sửa nội dung bắt đầu lại từ đầu.

Chạm từ mở cửa sổ tra riêng, không đẩy kết quả xuống cuối đoạn dài. Tra **đúng dạng trong thẻ cá nhân**, tối đa 20 kết quả từ các bộ chưa xóa; các nghĩa giữ riêng. Không tự suy đoán lemma, phrasal verb, nghĩa, IPA hay CEFR. Người dùng chọn bộ từ và tự nhập nghĩa để tạo thẻ nguồn USER. Thẻ vẫn NEW, không tự bắt đầu SRS và không cộng XP. Không tự lưu câu văn riêng tư vào thẻ.

Không đóng cửa sổ tra khi còn nghĩa chưa lưu hoặc đang ghi; người dùng phải lưu hoặc xóa phần nghĩa trước. Guard đổi ngôn ngữ bảo vệ nội dung đang sửa. Đây chưa phải guard toàn bộ navigation/back của trình soạn văn bản.

## An toàn và phục hồi

Ghi bản nháp trong transaction được tuần tự hóa, có revision: phiên chỉnh sửa cũ không ghi đè phiên mới. Lỗi ghi rollback, giữ bản nháp cũ và cho phép retry. Dữ liệu hỏng được báo lỗi, không tự reset. Tra cứu dùng tham số SQL; đọc/tra không sửa lịch ôn hoặc lịch sử. Nếu thêm thẻ thành công nhưng tải lại nghĩa lỗi, UI báo rõ thẻ đã lưu để tránh người dùng thêm lại.

Giới hạn: văn bản chỉ persist sau thao tác lưu thành công. Nghĩa đang nhập chỉ giữ trong màn hiện tại, chưa có draft riêng cho thẻ Reader; chưa kiểm fault “commit thành công nhưng caller nhận lỗi”. Bản nháp Reader **chưa nằm trong English-only backup** và UI cảnh báo điều này.

## Kiểm thử đã thực hiện

- 10 test tập trung: tokenizer, bounds, chuỗi quá dài; bản nháp/lookup; đóng và mở lại file SQLite thật; rollback bằng trigger gây lỗi; hai save cạnh tranh; dữ liệu JSON hỏng không bị ghi đè; SRS/cards/history không đổi khi đọc.
- Full suite: **178 file / 985 test PASS**, dữ liệu trong `artifacts/v7-2026-10-11/reader-tests.json`.
- Typecheck PASS; lint 0 lỗi, 5 cảnh báo import cũ ở các test Chinese.
- Web export và Android Hermes export PASS (`dist-v7-reader-web`, `dist-v7-reader-android`). Android export không phải APK Gradle build hoặc bằng chứng chạy máy ảo.
- Headless Web dùng profile QA riêng: kết quả chạy cuối cùng và ảnh ở `artifacts/v7-2026-10-11/learner-ui-reader/`. Các bước đọc/tra/thêm thẻ offline sau khi app đã tải, reload giữ offset, màn 320px/dark, không tăng XP/SRS. Không đồng nhất offline Web đã tải với offline cold launch Android.

5 ảnh checkpoint cuối: `01-reader-personal-lookup.png`, `02-reader-offline-new-card.png`, `02-reader-offline-next.png`, `03-reader-restored-compact-dark.png`, `04-reader-lookup-compact-dark.png`. Đã xem trực tiếp ảnh tra nghĩa sáng và tra nghĩa dark/320px. `failure.png` trong thư mục là ảnh lỗi runner ở lượt thử trước, không thuộc tập PASS; trạng thái lượt cuối ở `result.json` (`success: true`, 0 page errors).

## Còn thiếu để nghiệm thu Reader V7

TXT file picker, EPUB/PDF/OCR; nhiều tài liệu/thư viện; dictionary content pack được phép phân phối; morphology, phrase lookup, IPA/POS/forms từ nguồn; Personal Context Memory có consent; navigation/back draft protection và backup bản nháp. Native Android release/emulator, TalkBack/VoiceOver, font scale 200%, keyboard, low storage và lifecycle interruption chưa được xác minh cho Reader mới.

APK checkpoint build40 không chứa Reader này. Không sử dụng kết quả native build40 để tuyên bố Reader đã qua kiểm thử điện thoại.
