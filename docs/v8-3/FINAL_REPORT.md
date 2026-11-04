# 4Chinese V8.3 — bàn giao

Đã triển khai khu **Củng cố trí nhớ** trong Chinese mode, kiểm thử bằng SQLite cô lập và Android emulator. Không cài máy thật, không publish, không push GitHub.

## Tính năng đã có

1. **Nhớ rồi viết**: che Hanzi/Pinyin, viết từng chữ, hint từng nét, giữ nét vừa viết khi mở mẫu, xem từng nét, che mẫu để viết lại. Nhãn không hint/sau hint/chưa nhớ tách biệt. Kết quả viết là tự đối chiếu; native candidate không bị biến thành điểm đúng nét.
2. **Phân biệt chữ**: đủ5nhóm yêu cầu/13chữ, highlight khác biệt, âm/meaning/source, quiz, chuyển sang viết lại. Có ví dụ khi từ điển đã có; không tạo ví dụ giả.
3. **Cứu hộ từ hay quên**: đọc lịch sử thật, dùng Error Intelligence hiện hữu; chưa đủ bằng chứng thì UNKNOWN. Không tự gắn nhãn “hay nhầm” từ nhóm biên soạn.
4. **Truy hồi7hướng**: Hanzi/nghĩa/pinyin/audio/cloze/viết từ nghĩa; một hướng cho mỗi từ, ưu tiên skill có bằng chứng. Chọn phiên5/10/15/20, tổng kết và tiếp tục nhóm còn lại.
5. **Cấu tạo và mnemonic**: mô tả hình học kiểm tra hữu hạn, guard vòng lặp, dữ liệu thiếu được thông báo. Mẹo của người học lưu vào notes có sẵn, không chép vào dictionary hay coi là từ nguyên.
6. **Ôn chữ cũ**: từ đã học≥30ngày, ưu tiên lịch sử quên và dấu thời gian cũ; không kéo due date về hiện tại.
7. **Gợi ý hôm nay**: dựa due, từ yếu, lỗi gần đây, mục tiêu và thời gian học hiện có; có nhãn ước lượng, không đổi goal.

Entry có ở Chinese Home/tool hub, chi tiết từ và Reader. Đã sửa đường Reader để mở bài câu ngữ cảnh; ưu tiên câu đã lưu được xác nhận, sau đó ví dụ sẵn có, thiếu câu thì fallback sang nghĩa. Không tự lưu câu Reader chưa được chấp thuận.

## Kiểm chứng

- **1149/1149test**,210file; baseline1134test được giữ nguyên.
- Typecheck đạt; lint0error,8warning hiện hữu ngoài thay đổi này.
- Android QA APK build thành công, chạy thật trong AVDx86_64;43PNG kèm UI tree/metadata,4contactsheet sau và1sheet tư liệu trước.
- Snapshot isolated: schema45,11.877mục từ,75ví dụ,12progressfixture giữ nguyên. Không đổi SRS, review history, XP, goals hoặc English learner data trong khoảng bổ trợ. Chỉ evidence bổ trợ và note được lưu chủ động đổi.
- Native đã kiểm tra: che/viết/hint/mẫu, quiz đúng/sai, evidence từ yếu, tổng kết5từ/nhóm tiếp, restart note, Reader→recall, offline, viewportnhỏ,font1.5,dark,reduced motion và English guard.

APK QA dùng versionName0.1.50/code52 sẵn có, không tăng version hoặc ký release mới. SHA256 bản QA cuối: `6DEB8364340C6FA5E8A941E69E2166B4136B8EF1D2A3A002EC12C29871A1B5F4`. Không dùng tên version để suy ra đây là bản đã phát hành; source và ảnh memory mới là bằng chứng triển khai vòng này.

## Tài liệu và ảnh

- [Feature audit / source changes](FEATURE_AUDIT.md)
- [Repo, license và quyết định reuse](THIRD_PARTY.md)
- [Test report20tình huống](TEST_REPORT.md)
- [Database safety / SRS regression / English isolation](DATA_SAFETY.md)
- [Gallery43ảnh](../../artifacts/v8-3-hanzi-memory/gallery/index.html)
- [Android PNG ZIP](../../artifacts/v8-3-hanzi-memory/android-screenshots.zip)
- [Before reference](../../artifacts/v8-3-hanzi-memory/gallery/before-archive.png), [after1](../../artifacts/v8-3-hanzi-memory/gallery/after-1.png), [after2](../../artifacts/v8-3-hanzi-memory/gallery/after-2.png), [after3](../../artifacts/v8-3-hanzi-memory/gallery/after-3.png), [after4](../../artifacts/v8-3-hanzi-memory/gallery/after-4.png)

Ảnh before từ gallery V8.2ngày14/10, khác fixture/thiết bị; không trình bày như pixel comparison cùng trạng thái. Ảnh mới chỉ chứa dữ liệu QA giả lập.

## Giới hạn / việc chưa khẳng định

- ML Kit Digital Ink hiện có trả candidate chữ, không có engine chấm hình dạng/thứ tự từng nét. Trên AVD mới, model chưa cho bằng chứng match thành công; app có luồng tự đối chiếu an toàn. Chưa đạt mức tự động chấm nét như sản phẩm chuyên dụng.
- Chưa kiểm chứng âm thanh nghe bằng loa điện thoại thật; voice/model lần đầu có thể cần mạng. Nội dung memory local vẫn dùng offline.
- Chưa đo kết quả nhớ sau7/30ngày; không có tuyên bố phần trăm cải thiện. Không thêm persistence/schema cho điểm tự viết hoặc một lịch SRS khác.
- Cấu trúc hữu hạn10chữ; phần chưa kiểm duyệt không được bịa semantic/phonetic. Candidate ưu tiên tối đa50từ/lần, không tự tạo bảng scheduling bổ trợ.
- Cập nhật điều hướng 16/10/2026 sau báo cáo: đã hiện tab cuối “Cài đặt” trong cả chế độ tiếng Trung và tiếng Anh để truy cập `LanguageSettings`; APK ARM64 đã build. Chưa cài bản điều hướng này lên Realme vì ADB không còn thấy thiết bị sau khi build (cần kết nối lại và bật USB debugging).

## Công cụ tái kiểm tra

`scripts/v8-3-safety.cjs`, `v8-3-repo-audit.cjs`, `v8-3-emulator.cjs`, `v8-3-native-qa.cjs`, `v8-3-evidence.cjs`, `v8-3-gallery.ps1`. Không có runtime dependency mới. Giữ log/hash/snapshot báo cáo; không dùng dữ liệu thử vào production.

Sau QA đã đóng và xóa riêng userdata AVD tạm `FourChineseV83QA.avd` (khoảng4,3GB kích thước logic), không xóa máy ảo hay dữ liệu của người dùng. Không khôi phục trực tiếp bản AVD tạm đã xóa; có thể tạo lại bằng script emulator và seed lại fixture. PNG, ZIP, log và snapshot SQLite dùng đối chiếu vẫn được giữ.
