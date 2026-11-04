# REA có thể áp dụng gì cho HocTiengTrungApp?

Ngày đánh giá: 22/10/2026. REA trong báo cáo là **Reverse Engineer Anything**, bản local `../Rea-HSK-Reference` khai báo phiên bản 6.7.0.

## Kết luận

**Có, phù hợp làm công cụ nghiên cứu sản phẩm tham khảo và kiểm chứng bản chạy/bản đóng gói. Không cần đưa REA vào dependency của ứng dụng.** Dự án đã có nền tảng học khá đầy đủ; giá trị nằm ở cải thiện một luồng cụ thể, không phải xây lại SRS, từ điển, Reader hay engine thi.

Hướng áp dụng có bằng chứng sẵn rõ nhất là **catalog bài luyện theo kiểu Migii**, dùng lại engine thi hiện tại. Hướng đáng khảo sát tiếp là **đọc → tra từ → lưu câu → ôn**. Hướng dùng nội bộ có ích ngay là thu thập bằng chứng Android/web cho những thay đổi gần đây.

## Phạm vi và độ chắc chắn

- Đã đọc cấu trúc thư mục, cấu hình, schema/migration, native module, các dịch vụ backend trong repository và các luồng nghiệp vụ chính.
- Đã dùng TypeScript parser đọc **614 tệp code trong `src`**, lập inventory import/export và các lời gọi đáng chú ý: khoảng **78.558 dòng**, gồm **212 tệp test**. Không có lỗi cú pháp từ parser. Inventory: [JSON](../.runtime/rea-source-inventory-2026-10-22.json).
- Đã đọc sâu đường đi từ route tới service/repository ở các mảng học/ôn, bộ từ, Reader, viết tay/OCR, thi, ngôn ngữ, backup và sync. Inventory toàn bộ tệp không đồng nghĩa đã chứng minh tính đúng đắn từng dòng.
- Đánh giá dựa trên **working tree hiện tại**, có cả thay đổi chưa commit và khu `memory` chưa được Git theo dõi ở thời điểm bắt đầu. Không chỉ dựa vào HEAD hoặc README cũ.
- Không phân tích từng mục từ, từng asset hoặc mã của thư viện trong `node_modules`. Không chạy lại APK, không gọi AI trả phí, không kiểm chứng Supabase đang triển khai, không khảo sát mới app bên ngoài trong lượt này.
- Đã đọc skill [reverse-engineer-anything](../../Rea-HSK-Reference/skills/reverse-engineer-anything/SKILL.md). Skill yêu cầu dùng công cụ repository thông thường khi đã có đủ source. Vì vậy lượt này không chạy REA provider/readiness/setup lên source, không thay cấu hình MCP.

## Bản đồ source hiện tại

Luồng chính: **Expo Router → component/hook → service nghiệp vụ → SQLite repository → dữ liệu bền vững**. Zustand giữ queue/cài đặt đang dùng; tiến độ chính nằm trong SQLite.

| Mảng | Source chính | Hiện trạng có thể xác nhận từ code |
|---|---|---|
| Khởi động, giao diện | `src/app/_layout.tsx`, `src/theme`, `src/components/ui` | Expo SDK 57, React Native 0.86, React 19; theme sáng/tối, reduced motion, phục hồi lỗi startup; cổng sở hữu DB cho web |
| Dữ liệu Trung | `src/db/database.ts`, `schema.ts`, `migrations.ts`, `hsk30*.ts` | DB `hanzi30.db`, schema **46**; seed dữ liệu, nâng cấp tăng dần, snapshot trước nâng cấp HSK; bản app cấu hình **0.1.51/code 53** |
| Từ điển, tìm kiếm, bộ từ | `src/db/repository.ts`, `unified-search.ts`, `services/vocabulary`, `services/pinyin-ime` | Hán tự/pinyin/nghĩa, đa âm, bulk lookup, chọn nghĩa, sửa từ, ảnh cá nhân, chia sẻ mã, xóa mềm/khôi phục; V46 tách membership bộ từ khỏi identity từ vựng |
| Học và SRS | `app/learn`, `app/review`, `services/srs/scheduler.ts`, `services/review` | Học Trung ba lượt; ôn xen kẽ ba lượt; sáu cấp nhớ và deep stages; xử lý hint/sai; chỉ ghi SRS cho từ đủ điều kiện đến hạn |
| Cá nhân hóa | `app/daily`, `app/mistakes`, `services/learning`, `db/mistakes.ts` | Kế hoạch hằng ngày theo ngân sách thời gian, từ yếu, lỗi theo kỹ năng, bài củng cố và gợi ý hành động tiếp theo |
| Nhớ chữ | `app/memory`, `services/memory`, `db/hanzi-memory.ts` | Truy hồi nhiều hướng, nhớ rồi viết, nhóm chữ dễ nhầm, mnemonic, ôn chữ cũ; luyện bổ trợ không tự dời lịch SRS |
| Lộ trình và nội dung | `db/learning-path.ts`, `grammar.ts`, `stories.ts`, `services/content` | Course/unit/lesson/activity, bằng chứng hoàn thành hoạt động, ngữ pháp, truyện, câu ngữ cảnh; có phân biệt draft/reviewed và cơ chế content pack |
| Đọc | `app/reader/index.tsx`, `services/reader`, `db/reading.ts`, `db/vocabulary-context.ts` | TXT/EPUB, OCR native, tra từ theo longest match offline, lưu câu sau xác nhận, liên kết bộ từ, resume; chia chunk 2.000 code point, trần 100.000 code point |
| Nghe/nói | `app/listening`, `app/speaking`, `services/audio`, `services/pronunciation`, `services/speaking` | Chọn giọng TTS, STT, shadowing, ghi âm tại máy, luyện thanh điệu/phân biệt âm, hội thoại Gemini và phản hồi nhận diện từ qua Edge Function |
| Viết tay | `HanziHandwritingPad.tsx`, `StrokeWriter.tsx`, `modules/digital-ink-recognition` | Native ML Kit nhận ứng viên chữ, nhiều trang viết, hint nét, phát lại mẫu, OCR ảnh; **chưa có engine xác minh thứ tự từng nét** |
| Thi và HSK | `app/exam`, `services/exam`, `db/exam.ts`, `services/hsk` | Mini test gốc, cấu hình thời gian, lưu snapshot/đáp án/đánh dấu, tiếp tục, nộp, kết quả; có hỗ trợ profile giới hạn điều hướng; câu draft bị chặn khỏi bài chơi |
| Tiếng Anh | `app/english`, `db/english`, `services/english`, `services/languages` | DB learner riêng, từ điển Skypedia riêng, bulk/chọn sense, bộ từ, học mới, review meaning/spelling/listening, Reader, profile; đổi ngôn ngữ có bảo vệ session/draft/recording |
| Thống kê | `db/gamification.ts`, `db/knowledge-map.ts`, `services/stats` | Streak, thời gian học, heatmap, kỹ năng, XP, achievement và hành trình XP từ dữ liệu học |
| Sao lưu/đồng bộ | `services/backup`, `db/backup-repository.ts`, `services/cloud`, `supabase` | Backup ZIP kèm ảnh, validation/restore point, cloud backup; manual sync hiện chỉ nối **SETTINGS/DECK**, không phải toàn bộ SRS |
| Vận hành | `scripts`, `.github/workflows/ci.yml`, `vitest.config.mts` | Test nghiệp vụ/SQLite, smoke web, script ADB/QA Android, audit nội dung, benchmark, build/export |

README và `FEATURE_AUDIT.md` không đủ để đánh giá hiện trạng: audit cũ vẫn ghi Reader, tone trainer, sổ lỗi và cloud/AI là chưa có, trong khi code hiện đã triển khai nhiều phần. Trạng thái backend production vẫn phải kiểm tra riêng.

## Các ứng dụng REA đáng làm

### 1. Catalog bài luyện HSK: bằng chứng có sẵn, dễ gắn với code nhất

**Mục tiêu:** giúp chọn đúng bài theo cấp, kỹ năng/dạng câu và trạng thái, trước khi bước vào phòng làm bài.

Code hiện có `ExamCenterContent`, `buildOriginalPractice`, `ExamProfile`, `ExamQuestion`, `ExamAttempt`, snapshot và kết quả. Không cần dựng engine thứ hai.

Trong workspace đã có [báo cáo REA–Migii của LuyenThiHSK](../../LuyenThiHSK/docs/REA_MIGII_APPLICATION.md): catalog công khai, bộ lọc, phân trang, metadata nhóm câu và dấu vết route/API. Đây là kết quả của **dự án khác**, không phải bằng chứng đã tích hợp vào HocTiengTrungApp. Báo cáo cũng nêu giới hạn: detail cần đăng nhập chưa được đọc, không biết database nội bộ.

Áp dụng phù hợp:

- Tổ chức catalog quanh metadata hiện có: cấp, loại bài, kỹ năng, thời lượng; tìm tên/trạng thái khi số bài đủ lớn.
- Chọn bài rồi gọi `createExamAttempt`; tiếp tục dùng snapshot/revision, save/submit/result hiện tại.
- Khi bổ sung ngân hàng câu, đi qua `assertExamQuestionValid` và release gates; dùng dữ liệu có nguồn và được duyệt.
- Không nhập trực tiếp dữ liệu hoặc backend của `LuyenThiHSK`: schema và hợp đồng câu hỏi của hai app khác nhau.

**Điều kiện tạo giá trị:** catalog phải có đủ bài thật. Nếu vẫn chỉ là ít mini test gốc, thêm nhiều filter/phân trang sẽ ít lợi ích. REA không tạo quyền sử dụng đề, đáp án chuẩn hay trạng thái “HSK Exam Ready”.

### 2. Reader: cải thiện chất lượng thao tác trên nền đã có

**Mục tiêu:** đọc liền mạch, mở nghĩa nhanh, chọn đúng nghĩa và lưu được câu để ôn về sau.

Đích khảo sát có thể là Pleco hoặc một graded reader có luồng truy cập được. Tên này là **ứng viên nghiên cứu**, chưa phải kết luận REA đã quan sát sản phẩm đó trong lượt này.

REA có thể ghi nhận các bước/ảnh/log hoặc quan sát web tương ứng: chọn từ/cụm từ, popup nghĩa, thêm bộ từ, quay lại văn bản, tiếp tục sau đóng/mở. Với web còn có thể quan sát DOM/script/network trong phạm vi đã ghi nhận.

Điểm gắn: `app/reader/index.tsx`, `segment.ts`, `chunk-analysis.ts`, `db/reading.ts`, `saveReaderWordContext`, `copyVocabularyBatchToDeck`.

Code hiện tách từ bằng longest match tối đa sáu chữ trên từ đã tìm được trong SQLite. Điều này không xử lý mọi nhập nhằng ngữ nghĩa/đa âm. Trước tiên nên đo các tình huống sai và học cách người dùng sửa lựa chọn; không cần vội thay tokenizer bằng AI.

**Nghiệm thu nhỏ:** chọn từ → chọn nghĩa → thêm bộ → lưu đúng câu gốc → mở ôn → đóng/mở Reader vẫn đúng vị trí. Không tạo bản sao từ hoặc history SRS mới chỉ để bắt chước UI.

### 3. Nhớ và viết chữ: khảo sát feedback, tách khỏi nhận diện chữ

Khu `memory` đã có nhiều ý tưởng thường thấy ở app chuyên dụng. Không nên đề xuất thêm lại “nhớ rồi viết”, hint hay nhóm dễ nhầm như tính năng hoàn toàn mới.

Ứng viên tham khảo: Skritter/Tofu Learn cho cách ẩn mẫu, bật hint, phản hồi sai nét và sửa lại. REA có thể giúp quan sát hành vi hoặc kiểm tra artifact cung cấp được; việc quan sát một app phản hồi đúng nét **không chứng minh đã khôi phục được thuật toán chấm nét**.

`recognizer.ts` và Kotlin module trả candidates; `assessRecallInk` luôn để `strokeOrderVerified: false`. Nếu muốn chấm hình dạng/thứ tự nét thật, cần đánh giá engine/dữ liệu chuyên dụng riêng. Điểm tích hợp tự nhiên là `HanziHandwritingPad`/`StrokeWriter`; không biến top candidate của ML Kit thành điểm nét đúng.

### 4. Kiểm chứng bản release của chính app

Đây là hướng dùng REA trực tiếp, độc lập với việc thêm tính năng:

- **ADB:** version/package, logcat, màn hình và artifact để đối chiếu lỗi viết tay, OCR, TTS, microphone, bàn phím, background/foreground. Dùng emulator/fixture khi thực thi bước học gây ghi dữ liệu.
- **Web:** `capture_browser_scenario`, `inspect_web_page`, so sánh capture/ảnh cho các thao tác xác định, gồm resume, popup, filter và điều hướng. Web QA không xác nhận hành vi native.
- **APK:** inventory/manifest/resource, JADX khi cần xác minh phần managed/native bridge của một bản đóng gói. Phân tích manifest không chứng minh hành vi runtime.
- **SQLite snapshot:** kiểm tra schema/bảng/index và hàng được chọn trước/sau migration khi cần hồ sơ bằng chứng. `snapshotHskDatabaseFile` và backup hiện có là nền để lấy bản nhất quán.

Dự án đã có nhiều `scripts/*native*.cjs`, smoke test và snapshot safety; nên dùng lại trước. Thêm REA khi cần provenance/hash/evidence thống nhất hoặc điều tra một lỗi cụ thể, không bọc lại mọi script ADB.

Các kịch bản ưu tiên: từ mới hoàn thành đúng một lần; ôn ba lượt không nhân đôi lịch; thêm cùng từ vào hai bộ; Reader lưu đúng câu; đổi Trung/Anh không lẫn queue; tắt/mở giữa bài thi; từ chối quyền mic; model ML Kit chưa tải.

### 5. Nghe/nói và tải nội dung: dùng để hiểu hợp đồng, không suy ra năng lực backend

REA có thể giúp khảo sát luồng shadowing, transcript, tốc độ nghe, hội thoại, tải/xóa nội dung và hành vi mất mạng của app tham khảo. Đích gắn là `listening-library`, `services/audio`, `roleplay-v5`, `content-delivery` và Reader Anh.

Giới hạn hiện tại có thể đọc được từ source:

- `pronunciation-score` phiên âm âm thanh rồi so chuỗi Hán tự để ra điểm rời rạc; **không phân tích cao độ hoặc chất lượng từng thanh điệu**. UI hiện đã giải thích đây là phản hồi nhận diện từ. REA không thay thế engine chấm âm học.
- Gemini yêu cầu session người dùng và chỉ gửi text/history; việc có source Edge Function không xác nhận function/secret đang được triển khai.
- Content packs có validation/version/checksum; không phải mọi loại pack đã có downloader, applier và nội dung hoàn chỉnh ngoài thực tế.
- Tham khảo cách trình bày catalog sách/video không cung cấp corpus, media hoặc quyền phát hành chúng. `V8_4ENGLISH_REFERENCE_AUDIT.md` đã ghi nhận nhiều khoảng trống content/backend; tránh triển khai lại các màn chỉ có nút vào.

## Những việc không cần hoặc REA không giải quyết được

| Việc | Cách phù hợp hiện tại |
|---|---|
| Đọc kiến trúc repo có đủ TS/TSX | TypeScript parser, `rg`, đọc code và test; không chạy decompiler |
| Kiểm tra SRS, lịch, idempotency, migration | Test nghiệp vụ/SQLite và fixture; REA chỉ bổ sung bằng chứng artifact/runtime khi cần |
| Thêm “sổ lỗi”, “daily plan”, “Reader”, “AI chat” | Các nền tảng đã có; xác định khoảng trống cụ thể trước |
| Sync toàn bộ tiến độ | Thiết kế entity, hợp nhất xung đột, identity và replay; manual sync hiện chỉ queue/apply settings/deck |
| Khôi phục toàn bộ app Expo từ APK | JADX không khôi phục mặc nhiên TSX, state React hoặc thuật toán JS; không có cơ sở hứa giải mã Hermes toàn phần |
| Xác nhận đề HSK chuẩn, đáp án đúng, nội dung được phép phát hành | Nguồn chuẩn, kiểm duyệt chuyên môn, quyền sử dụng và release gates |
| Chấm nét/thanh điệu bằng cách xem app khác | Cần engine, dữ liệu và kiểm định độc lập |

REA dùng như CLI/MCP của người phát triển. Chỉ chọn provider cần thiết: web cần browser phù hợp, Android managed cần JDK/JADX, ADB cần platform-tools. Không cần cài Hopper/Ghidra chỉ để xem luồng học hoặc catalog.

Riêng `inspect_sqlite_database` của bản REA local yêu cầu Node 24.x từ 24.15 hoặc 26+ với native SQLite limits. Runtime kiểm tra lượt này là **24.11.1**, chưa đáp ứng riêng khả năng đó. Đây là đối chiếu yêu cầu tài liệu, không phải kết quả chạy probe REA; không có nâng cấp môi trường trong lượt này.

## Kết quả kiểm tra source hiện tại

`npm run typecheck`: **PASS**.

`npm test -- --reporter=dot`: **207/212 file đạt; 1.160/1.165 test đạt; 5 test lỗi**. Chạy lại riêng năm file vẫn gặp năm lỗi; [JSON kết quả chạy riêng](../.runtime/rea-audit-focused-tests-2026-10-22.json).

| Test lỗi | Quan sát và phân loại ban đầu |
|---|---|
| `src/db/unified-search.test.ts` | Truy vấn dùng `bm25` cùng CTE/window function ném `unable to use function bm25 in the requested context` trên SQLite của Node hiện tại. Lỗi truy vấn tái hiện được; cần sửa và xác nhận native SQLite. REA không cần thiết để tìm lỗi này. |
| `src/db/home-review-scope.test.ts` | Fixture thêm từ có `deck_id` sau migration nhưng không thêm membership V46; query hiện dùng membership. Fixture còn tạo nhiều ID cùng một identity. Không thể coi số đếm kỳ vọng cũ là hợp đồng đúng mà chưa đối chiếu lại. |
| `src/db/review-pagination-and-size.test.ts` | Fixture tạo 125 từ nhưng một phần có `deck_id` không có membership; số hàng đủ điều kiện giảm, cả ba lần gọi đều bị clamp về trang cuối. Cần cập nhật fixture theo quan hệ hiện tại trước khi kết luận phân trang sai. |
| `src/services/reader/word-context.test.ts` | Test đòi bản sao `vocabulary` có `deck_id`; code mới liên kết từ canonical qua `personal_deck_vocabulary`. Thao tác lưu context đã chạy trước khi test đọc bản sao không tồn tại. Kỳ vọng test đang theo model cũ. |
| `src/services/learning/session-pinyin-ui.test.ts` | Regex yêu cầu audio size 27 đứng trước pinyin; source hiện hiển thị pinyin cạnh audio size 24. Đây là kiểm tra cấu trúc source cũ, chưa chứng minh pinyin bị mất khi chạy. |

Không tự sửa các thay đổi chức năng/test trong lượt đánh giá. Chưa chạy lint, content validation, export/build hoặc QA thiết bị trong lượt này; không dùng báo cáo PASS lịch sử làm kết quả hiện tại.

## Đề xuất thực hiện

1. **Ổn định baseline hiện tại:** xử lý lỗi FTS, cập nhật/xác nhận test theo membership V46 và UI đã thay đổi. Giữ hợp đồng identity, SRS và phân tách DB Anh/Trung.
2. **Pilot REA nhỏ:** dùng bằng chứng Migii có sẵn làm đầu vào, chốt catalog trên số bài thật của app; nếu cần hành vi chưa biết, khảo sát đúng luồng còn thiếu. Đầu ra gồm bằng chứng quan sát, khoảng chưa biết và mapping tới `ExamCenterContent`/engine hiện có.
3. **Ưu tiên nghiên cứu tiếp Reader:** một luồng từ popup đến ôn có kết quả đo được; chỉ mở rộng sang chấm nét hoặc phát âm khi đã có yêu cầu và nguồn engine/dữ liệu phù hợp.

Quyết định: **nên dùng REA theo từng cuộc điều tra cụ thể; chưa có lý do thêm dependency, đổi kiến trúc hoặc chạy REA quét lại toàn bộ repository này.**
