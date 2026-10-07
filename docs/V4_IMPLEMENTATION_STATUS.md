# V4 — trạng thái triển khai 2026-10-01

Đây là bản tiếp tục trên repository hiện có, không phải rewrite hoặc thông báo hoàn tất V4.

## Đã triển khai và kiểm tra

- Schema V32: standard version, reference bốn chiều, vocabulary crosswalk; importer atomic và rollback.
- Schema V33: mini-test attempt với snapshot bất biến, deadline, revision/CAS, lưu đáp án/cờ/vị trí, resume và kết quả.
- Schema V34: bản nháp viết/dịch, tự đối chiếu và lịch sử. Backup đọc được dữ liệu mới; backup cũ không xóa bảng mới khi thiếu trường tương ứng.
- Schema V35: 6 cặp từ dễ nhầm / 12 câu ngữ cảnh, attempts offline/idempotent, nối Sổ lỗi và backup tương thích; không đổi lịch SRS.
- Trung tâm luyện thi: 7 mini test gốc / 28 câu; không phải full mock hoặc đề chính thức.
- Viết/dịch: 14 bài gốc, lưu nháp sau 800ms ngừng gõ, mở lại, kiểm tra độ dài/từ yêu cầu/dấu câu, xem bài mẫu.
- Nói: 7 đề gốc, chuẩn bị theo đồng hồ, ghi tối đa 30–120 giây trên Android/iOS, nghe lại và tự đối chiếu.
- Ngữ pháp: 40 mục, gồm 12 bài đối chiếu Việt–Trung. Nội dung mới CURATED/UNREVIEWED.
- Ôn lỗi ngữ pháp: cần nhiều lần sai và ít nhất hai dạng bài; không sửa lịch SRS.
- Readiness: chỉ số nội bộ và thông báo các chiều còn thiếu, không dự đoán điểm/đỗ.
- Audio-source union và manifest validator; UI phân biệt TTS. Chưa có audio pack thật/downloader.
- Home: bốn lối bắt đầu nhanh và hai hub Luyện tập/Thư viện; công cụ cũ vẫn truy cập được, giữ năm bottom tab.
- Xác nhận nộp/rời bài dùng modal trong app; trạng thái chọn radio/checkbox/tab có ARIA cho web.
- Web startup: màn hình loading/recovery, single-tab database lease và OPFS preflight; không reset dữ liệu khi file còn khóa.

## Bằng chứng

- `npm run check`: lint sạch, typecheck, 111 file / 377 tests đạt; Android export đạt.
- `npx expo export --platform web --output-dir dist-v4-web`: đạt.
- Edge isolated-profile: 11 kịch bản đạt, gồm hai tab/giữ tiến độ sau reload, không pageerror trong các luồng được kiểm tra; xem V4_WEB_SMOKE.json.
- Web localhost: http://localhost:8084. Đây không phải URL triển khai công khai.
- Kiểm thử SQLite bao gồm nâng cấp/rollback, dữ liệu cũ, CAS/stale, deadline, giả mạo snapshot, backup cũ/mới và dữ liệu hỏng.
- APK build thử bằng Gradle/JDK19 đạt, chữ ký debug hợp lệ; chưa cài, chưa smoke microphone/TalkBack/font-scale trên thiết bị. Chưa Gemini auth E2E hoặc sync hai thiết bị.

## Phần còn thiếu

Official reference + license và đối chiếu bốn chiều; sense/example audit; ngân hàng đề và full mock theo cấu trúc đã xác minh; curriculum tình huống; ngữ pháp nâng cao và truyện HSK4–9; EPUB/PDF/article import; native audio thật; mở rộng/thẩm định confusable-word bank; personal context cards; full cloud sync; AI roleplay mở rộng/budget bền vững; global search; device/performance/release verification.

Không chuyển các hợp đồng hoặc fixture thành nhãn feature hoàn tất. Chưa có cấp nào đủ bằng chứng “HSK Exam Ready”.

## Skills đã áp dụng

Expo React Native: đối chiếu SDK57; Mobile Offline Data: migration additive/transaction/snapshot/CAS/backup cũ; Mobile UI UX: giữ design tokens, hub nhóm công cụ và modal dùng được trên web; Mobile Testing: SQLite thật + hành trình browser; Mobile Audio Speech: ghi âm tạm, dọn tài nguyên theo lifecycle và không giả chấm phát âm; Mobile Release: phân biệt build thử/debug signing với bản phát hành đã nghiệm thu.
