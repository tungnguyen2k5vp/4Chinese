# Từ vựng tiếng Anh cá nhân — cập nhật và kiểm thử 11/10/2026

## Người dùng xem ảnh ở đâu?

- Bộ ảnh mới: [Gallery](../artifacts/english-personal-vocabulary-2026-10-11/index.html).
- 68 ảnh mới: 54 ảnh Web có cả trạng thái trên cùng và phần cuộn xuống, 7 contact sheet; 14 ảnh Android release trên máy ảo. Không tái dùng ảnh V7.2 cũ.
- [Tải bộ ảnh ZIP](../artifacts/english-personal-vocabulary-2026-10-11-review.zip). ZIP chỉ chứa ảnh thuộc manifest, bằng chứng và báo cáo; không chứa máy ảo, APK hay ảnh lỗi từ lần thử trước.
- Màn nhập nhiều từ, xem trước, chọn nhiều nghĩa, chọn nghĩa “quần sóoc” của shorts, tự nhập nghĩa, dấu ×/hoàn tác, lưu thành công, thẻ từ sau lưu, biểu đồ LV1, bỏ qua/khôi phục, nguồn dữ liệu, lỗi trùng với bộ hiện có, offline, màn 320×640, tối và stress chữ lớn đều được chụp.
- Manifest Web: `artifacts/english-personal-vocabulary-2026-10-11/manifest.json`. Kết quả và danh sách 14 ảnh native: `native-result.json` trong cùng thư mục. Gallery tách rõ Web và Android máy ảo; không phải ảnh điện thoại thật.

## Đã thay đổi

1. Nhập từ/cụm tiếng Anh mỗi dòng, tối đa 100; không bắt buộc người dùng gõ sẵn nghĩa. Có thể tạo bộ mới ngay trong form, hoặc chọn bộ đã có. Định dạng hai cột TAB cũ vẫn hỗ trợ.
2. Tra từ điển Skypedia gốc, hiển thị nghĩa tiếng Việt, loại từ, IPA và ví dụ nếu có. Từ nhiều nghĩa có danh sách chọn, không khẳng định nghĩa đầu tiên luôn phù hợp.
3. Sửa nghĩa thủ công, bỏ từng từ bằng ×, hoàn tác từng dòng; từ không tìm thấy/không hợp lệ/trùng phải được sửa hoặc bỏ trước khi lưu. Chỉ lưu các dòng còn được giữ.
4. Lưu toàn bộ danh sách và bộ mới atomically. Nếu lỗi hoặc trùng với bộ hiện có, rollback cả lô, không đổi lịch thẻ cũ. Bản nháp giữ cả nghĩa đã chọn và các dòng loại bỏ; xóa draft trong cùng transaction khi thành công.
5. Thống kê thật LV1–LV5/Nhớ sâu, số từ NEW và đến hạn; số lượng bộ không bị đếm sai do chỉ lấy trang 25 thẻ.
6. Thẻ từ có cấp nhớ, loại từ, IPA, nghĩa, ví dụ, US/UK TTS, lịch ôn, bắt đầu LV1 và bỏ qua/khôi phục. Tạm ngưng giữ tiến độ/lịch sử.
7. Trang ghi công nguồn, hướng dẫn tải lần đầu và danh sách từ đã bỏ qua. Touch target tối thiểu 44, form tránh bàn phím, dùng palette sáng/tối hiện có. Skills mobile UI/offline/device QA dẫn tới việc kiểm tra bản nháp, giao dịch, chữ lớn, bố cục và phân biệt bằng chứng Web/native.

## Nguồn dữ liệu và an toàn

Nguồn chính cho nhận diện từ cá nhân: [skypediacode/english-vietnamese-dictionary](https://github.com/skypediacode/english-vietnamese-dictionary), commit `388adc0826300912e5b0311c089e0e70494b065f`. SHA256 SQLite gốc: `2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a`.

App tải trực tiếp database nguồn khoảng 42 MB một lần vào `english-skypedia-388adc0.db`. Từ điển tách biệt khỏi `english-learner.db` và database tiếng Trung; chỉ đọc sau kiểm tra schema/quick_check. Cache nguồn hỏng được thay thế, không xóa dữ liệu học. Khi sửa nghĩa khác với nguồn, thẻ được đánh dấu USER, không nhận provenance/IPA/ví dụ của nghĩa nguồn.

Corpus không được nhúng vào APK/Web export. Gate xét quyền phân phối của pipeline cũ không bị bỏ qua hoặc đổi APPROVED. Trang nguồn ghi công upstream và dẫn LICENSE/ATTRIBUTION; việc phát hành corpus đóng gói vẫn cần rà soát theo `ENGLISH_DATA_LICENSE_AUDIT.md`.

SQLite nguồn có header WAL. Thao tác deserialize báo SQLITE_CANTOPEN trong lần Web QA đầu. Bản sửa chỉ đổi byte 18/19 của bản sao trong bộ nhớ trước deserialize theo [hướng dẫn chính thức SQLite](https://www.sqlite.org/c3ref/deserialize.html); không đổi nội dung từ vựng hay file upstream. Kiểm thử đối chiếu toàn bộ byte từ offset 20 trở đi và giữ nguyên input.

## Bằng chứng kiểm thử đã hoàn tất

| Nhóm | Kết quả |
|---|---|
| Full unit/repository suite | 182 file, 1.004 test PASS; `npx vitest run --maxWorkers=2 --testTimeout=60000` |
| TypeScript | `npm run typecheck` PASS |
| Lint vùng liên quan | 0 lỗi; 5 warning, gồm 3 import-order ở màn quản lý bộ cũ và 2 dependency phục vụ retry/refresh |
| Bản Web export cuối | PASS; `dist-english-personal-vocabulary` |
| Android JS/Hermes export | PASS; không đồng nghĩa native runtime PASS |
| APK release x86_64 | Gradle PASS, ứng viên 0.1.41/build43, 100.419.682 byte, SHA256 `b98aadcfe9ed6ff559d89f2fb27f61afcd8fbc31e06a9c533c0e541a4cc7be68` |
| Web E2E | PASS 4 nhóm chính, 54 ảnh, 0 pageerror trong lượt cuối |
| Android release runtime | PASS luồng chính trên máy ảo riêng: nhập nhiều dòng, tra nguồn, chọn nghĩa, loại dòng, lưu, LV1, cập nhật giữ dữ liệu, bỏ qua/khôi phục, cold-start offline tra và lưu; 14 ảnh cuối |
| SQLite nguồn thật | QA đối chiếu SHA256 trước khi đưa bytes gốc vào response tải của browser; không dùng fixture giả nghĩa |
| Offline nguồn sau reload | PASS; chỉ 1 lần tải nguồn trong toàn lượt, tra apple/book khi offline |

Unit/repository kiểm tra plain/TAB input, max100, lỗi dòng, loại dòng/hoàn tác, trùng, rollback cả bộ khi insert lỗi, giữ draft, count100 thẻ, NEW/LV1/due, suspend/restore giữ lịch, nguồn gốc thật, cache không fetch lại, tải lỗi/retry và cache hỏng chỉ thay đúng file từ điển.

Lượt full suite đầu thất bại vì một assertion so sánh trực tiếp 42 MB làm worker hết heap và chạy song song khiến test stroke timeout. Đã đổi kiểm tra bytes sang Buffer.compare và chạy lại ít worker: 1.004 test PASS. Không ghi đè lịch sử lỗi thành “luôn pass”.

Web QA đầu phát hiện audio container co về 0 làm nút US/UK chồng lên nghĩa; đã sửa flex flow và chụp lại toàn bộ. Nhãn bước ở màn hẹp không còn bị cắt 2 dòng. Một lượt offline trước đó gặp lỗi tải font icon khi Playwright routing làm tắt HTTP cache; lượt cuối chờ font của màn draft phục hồi tải xong trước offline, vẫn mở từ điển cache lần đầu trong runtime sau reload khi offline. Đây là kiểm lookup offline sau tải shell/fonts, không cam kết PWA cold-start toàn app không mạng.

## Giới hạn trung thực

- Tra khớp từ/cụm, không phải AI hiểu ngữ cảnh hay sửa chính tả tự động. Chưa có fuzzy/semantic match.
- Ví dụ/IPA theo nguồn, có phần tự động sinh; cần người học kiểm tra. IPA không bảo đảm phân biệt riêng UK/US hoặc từng nghĩa. Hai nút giọng là TTS của thiết bị, không phải audio ghi âm từ nguồn.
- Nguồn không cung cấp ảnh minh họa; không bịa ảnh/CEFR/bản dịch để lấp chỗ trống.
- Cấp nhớ dựa trên scheduler hiện có; thêm từ không tự cộng XP hoặc tăng cấp.
- Android font_scale 1.3 đã kiểm và chụp biểu đồ; chữ lớn có xuống dòng, nội dung vẫn cuộn được. Chưa kiểm TalkBack/VoiceOver hoặc iOS. Chưa xác minh giọng TTS trên điện thoại thật.
- Không cài lên điện thoại thật trong lần này. Không push GitHub, deploy Supabase, thay corpus tiếng Trung hoặc reset dữ liệu người dùng.

## Android native

Đã hoàn tất smoke trên AVD riêng `PersonalEnglishQA`, Android 16/API36, x86_64, 1080×1920, density420. Không dùng Expo Go/Metro. Máy ảo Pixel_2 cũ thiếu dung lượng (`INSTALL_FAILED_INSUFFICIENT_STORAGE`), dữ liệu cũ không bị xóa; AVD mới đặt trong artifact QA, kết nối qua ADB server riêng 5041. Fresh startup ban đầu kéo dài khi host thiếu tài nguyên; không tính lần khởi động chậm đó là PASS.

Nhập thực bằng bàn phím Android ba dòng hello/shorts/unknownzzzz, tải SQLite gốc qua mạng, chọn shorts danh từ “Quần sóoc”, loại unknown rồi lưu cả hai từ. Bắt đầu hello vào LV1. Cài lại APK ứng viên cuối bằng cập nhật giữ dữ liệu: vẫn hai từ và một LV1 (`final-01`). Bỏ qua hello rồi khôi phục giữ lịch (`final-03/04`).

Tắt cả Wi-Fi và mobile data, xác minh không có active default network, force-stop app rồi mở lại. Bản nháp apple phục hồi; nhận diện từ cache thật khi offline (`final-08`), lưu thành công vào bộ hiện có (`final-09`), tổng tăng thành ba từ, vẫn một LV1 (`final-10`). Sau đó bật lại mạng. Không thấy lỗi fatal trong bộ lọc logcat AndroidRuntime/ReactNativeJS/SQLite của lượt smoke.

`final-12/13` là chart/thẻ tối; `final-14` là chart với OS font scale 1.3. Đã xem trực tiếp ảnh và đối chiếu text UI dump, không suy luận runtime PASS từ build. Mạng, font scale và chế độ tối đã khôi phục sau kiểm thử. APK này chỉ build x86_64 cho máy ảo, không phải bản ARM64 để cài điện thoại; build43 là nhãn ứng viên hiện tại, không khẳng định điện thoại đã cập nhật.

Phạm vi hoàn tất là phần từ vựng cá nhân tiếng Anh theo yêu cầu này; không phải chứng nhận toàn bộ V7 hoặc toàn bộ app. Màn nhận diện nghĩa dài và nút audio đã được sửa sau phát hiện overflow/co chiều cao, rồi Web export/chụp lại và build APK cuối.
