# Báo cáo kiểm kê tính năng và khoảng trống của 4Chinese

**Ngày kiểm kê:** 2026-10-07
**Phiên bản source cấu hình:** 0.1.34 · Android `versionCode` 36 · SQLite schema 43
**Phạm vi:** mã nguồn, cấu hình, dữ liệu và bằng chứng QA đã lưu trong repository `HocTiengTrungApp`.

> Đây là kiểm kê theo source, không phải cam kết rằng mọi tính năng đã được chạy end-to-end trên điện thoại. “Có trong source” nghĩa là có route/module/dữ liệu để triển khai; trạng thái backend đang chạy và độ ổn định từng luồng cần kiểm thử riêng. Báo cáo không đọc giá trị trong `.env` hoặc bí mật triển khai.

## 1. Tóm tắt cho người quyết định

4Chinese hiện là ứng dụng học tiếng Trung tương đối toàn diện, không còn chỉ là flashcard từ vựng: có HSK, từ điển, học mới và ôn lặp lại ngắt quãng, từ yếu/lỗi sai, bộ từ cá nhân, ngữ pháp, nghe/nói, nhận diện viết tay, đọc truyện/tài liệu, lộ trình bài học, thi thử, thống kê, thành tích, thông báo và các module đám mây/AI.

Kiểm kê source xác nhận **59 route hướng tới người học**, **2 route nội bộ** và 2 layout; **43 bảng SQLite cùng FTS5**, **11.828 mục từ vựng** trong snapshot dữ liệu, **31 miền service**, cùng các lớp native Android và Supabase. Vì vậy, điểm yếu trước mắt không phải thiếu thật nhiều màn hình mới. Giá trị cao hơn hiện nằm ở:

1. Làm mới tài liệu cũ để phản ánh đúng source hiện tại.
2. Hoàn tất kiểm thử end-to-end cho các route/trạng thái chưa chạy thực tế.
3. Xác minh vận hành thật của cloud/AI, quyền riêng tư, sao lưu và khôi phục.
4. Mở rộng QA trợ năng, iOS/web và kiểm tra nội dung/dữ liệu.

**Nhận định:** chưa nên ưu tiên thêm một loạt tính năng lớn trước khi chốt các mục trên. Đây là nhận định về thứ tự đầu tư, không phải kết luận app đã hoàn hảo.

## 2. Quy mô repository và sản phẩm

| Hạng mục | Số liệu trong source | Ý nghĩa |
|---|---:|---|
| File route Expo Router | 63 `.tsx` | 61 route không phải layout + 2 layout |
| Route hướng người học | 59 | Đã loại 2 route nội bộ/developer |
| Route nội bộ | 2 | `__qa` và công cụ `content-review`; cần giữ chặn khỏi luồng production |
| Components | 49 file | 43 TSX + 6 TS |
| Database layer | 77 file TS | Có mã production và test |
| Services | 226 file TS | 31 miền service; số file bao gồm test |
| Data | 32 file | Gồm TypeScript, JSON và test |
| Hooks / theme | 3 / 5 file | State/UI nền tảng |
| Scripts | 27 file | Import/audit/validate dữ liệu, benchmark và công cụ khác |
| Test suite gần nhất được báo cáo | 157 file / 863 test | Theo báo cáo V5.4.2; chưa chạy lại trong lần lập tài liệu này |

Có 31 thư mục miền trong `src/services`; 30 thư mục hiện có file TypeScript, còn `fsrs` trống. Các miền có mã gồm: analytics, app, audio, backup, cloud, content, data-import, decks, exam, feature-flags, feedback, handwriting, HSK, learning, listening, media, notifications, pinyin, pinyin-ime, pronunciation, reader, review, search, sound, speaking, speech, SRS, stats, UI và vocabulary.

## 3. Kiểm kê đầy đủ các màn hình / route

Danh sách dưới đây lấy từ `src/app`. Tên trong ngoặc như `(tabs)` là nhóm triển khai của Expo Router, không nhất thiết là một đoạn URL hiển thị cho người dùng.

| Nhóm | Số route | Các file route |
|---|---:|---|
| Điểm vào, onboarding và tab chính | 7 | `index.tsx`; `onboarding.tsx`; `(tabs)/index.tsx`; `(tabs)/hsk.tsx`; `(tabs)/vocabulary.tsx`; `(tabs)/stats.tsx`; `(tabs)/profile.tsx` |
| Học mới, luyện tập, ôn và lỗi sai | 11 | `daily/index.tsx`; `learn/setup.tsx`; `learn/session.tsx`; `practice/index.tsx`; `review/index.tsx`; `review/upcoming.tsx`; `review/session.tsx`; `review/result.tsx`; `review/weak.tsx`; `mistakes/index.tsx`; `mistakes/practice.tsx` |
| HSK, từ điển, nội dung và kỹ năng | 15 | `hsk/syllabus.tsx`; `library/index.tsx`; `search.tsx`; `word/[id].tsx`; `confusables/index.tsx`; `confusables/[id].tsx`; `grammar/index.tsx`; `grammar/focus.tsx`; `grammar/[id].tsx`; `listening/index.tsx`; `reader/index.tsx`; `stories/index.tsx`; `stories/[id].tsx`; `writing/index.tsx`; `writing/[character].tsx` |
| Bộ từ cá nhân | 8 | `decks/index.tsx`; `decks/[id].tsx`; `decks/word.tsx`; `decks/bulk-add.tsx`; `decks/trash.tsx`; `decks/listening.tsx`; `decks/pronunciation.tsx`; `decks/quiz.tsx` |
| Lộ trình và bài học | 3 | `path/index.tsx`; `path/[courseId].tsx`; `path/lesson/[lessonId].tsx` |
| Nói | 6 | `speaking/index.tsx`; `speaking/ai.tsx`; `speaking/tones.tsx`; `speaking/pairs.tsx`; `speaking/shadowing.tsx`; `speaking/recordings.tsx` |
| Thi thử | 7 | `exam/index.tsx`; `exam/readiness.tsx`; `exam/result.tsx`; `exam/session.tsx`; `exam/skills.tsx`; `exam/speaking.tsx`; `exam/written.tsx` |
| Thành tích và cloud | 2 | `achievements/index.tsx`; `cloud/index.tsx` |
| **Tổng dành cho người học** | **59** | **Đầy đủ các route không-layout, sau khi loại công cụ nội bộ** |

Hai route nội bộ được kiểm kê riêng: `__qa.tsx` và `content-review/index.tsx`. Hai layout là `_layout.tsx` và `(tabs)/_layout.tsx`. Danh sách đầy đủ và bằng chứng từng route nằm trong [PRODUCTION_ROUTE_AUDIT.md](PRODUCTION_ROUTE_AUDIT.md).

## 4. Những nhóm chức năng hiện có

| Nhóm chức năng | Những gì đã có trong source | Giới hạn cần lưu ý |
|---|---|---|
| Từ điển và HSK | Kho từ Hanzi, pinyin, nghĩa; tìm kiếm; tra chi tiết từ; HSK/syllabus; từ/cặp dễ nhầm; thư viện từ | Bộ dữ liệu phải được kiểm tra nguồn, giấy phép, chất lượng nghĩa/ví dụ và ngày cập nhật; số liệu dữ liệu bên dưới là snapshot cũ 5 ngày tại thời điểm báo cáo |
| Học từ và SRS | Học từ mới, phiên ôn, lịch ôn, phiên luyện đa dạng, theo dõi tiến độ, từ yếu, sổ lỗi, thống kê hằng ngày | Cần chạy các phiên thật và kiểm tra lịch/điểm sau khi đóng-mở app; báo cáo QA gần nhất không gửi hết mọi loại câu trả lời |
| Bộ từ cá nhân | Tạo/sửa/xóa/khôi phục bộ từ, sửa từ, nhập nhiều từ, nghe, luyện phát âm, quiz, thùng rác, chia sẻ | Chia sẻ có phụ thuộc backend; cần kiểm thử import/export và đồng bộ không mất dữ liệu |
| Học theo lộ trình | Khóa học, đơn vị, bài học, hoạt động và tiến độ bài học | Route động của khóa/bài học đã được source-audit nhưng không phải mọi nội dung đã được hoàn tất trên emulator |
| Ngữ pháp | Danh sách điểm ngữ pháp, chi tiết, ví dụ/liên kết từ và chế độ tập trung | Độ bao phủ theo cấp HSK và chất lượng ví dụ cần audit nội dung định kỳ |
| Nghe và phát âm | Phát âm/TTS, thư viện nghe, phát âm bộ từ, cặp âm, thanh điệu và shadowing | Nhận diện giọng nói phụ thuộc Android Speech Service/quyền mic; cần kiểm thử trên thiết bị và mạng/ngôn ngữ khác nhau |
| Nói và AI | Khu nói, hội thoại AI theo tình huống, bản ghi âm cục bộ và chấm phát âm qua dịch vụ | Hai Edge Function có trong repository; việc deploy, khóa nhà cung cấp, auth/quota và trạng thái production cần xác minh ở Supabase |
| Viết chữ | Luyện nét/viết Hán tự và nhận diện nét bằng native Digital Ink trên Android | Native module không tương đương chạy trong Expo Go; kiểm tra cấu hình/bản build native và fallback trên thiết bị thật |
| Đọc | Reader, tài liệu/đoạn đọc, đánh dấu/tiến độ và từ vựng trong ngữ cảnh; truyện và câu hỏi truyện | Cần kiểm tra import tài liệu, quyền nội dung, cỡ chữ, bàn phím và độ dài văn bản thực tế |
| Thi thử | Hub thi, mức sẵn sàng, chọn kỹ năng, phiên thi, kết quả, phần nói và viết có thời gian | Đây là nội dung luyện tập của app; không được quảng bá là đề HSK chính thức hay chứng nhận “đủ điều kiện thi” nếu chưa có thẩm định tương ứng |
| Tiến độ và tạo động lực | Thống kê, thành tích, mục tiêu, XP/sự kiện học tập, nhắc học/thông báo | Có màn hình và mô hình dữ liệu; cần xác minh zero-state, lịch thông báo và độ chính xác số liệu trên profile mới |
| Đám mây | Các module chia sẻ bộ từ, đồng bộ nhiều thiết bị và sao lưu/khôi phục; có SQL/RPC và Edge Functions liên quan | Source không chứng minh rằng từng migration/function đang triển khai đúng project hoặc luồng khôi phục đã được thử trên tài khoản thật |
| Giao diện nền tảng | Theme sáng/tối/theo hệ thống, điều hướng, responsive và các xử lý accessibility/UI | Bằng chứng QA hiện là một tập route/trạng thái đại diện; TalkBack và toàn bộ ma trận màn hình chưa được chứng nhận |

Các khả năng dữ liệu/mô hình SQLite bao gồm: vocabulary/examples và FTS, tiến độ/SRS/review log, decks, khóa học/bài học, ngữ pháp, truyện/reader, speaking/roleplay, thi, lỗi sai/skill mastery, thành tích/mục tiêu/XP, HSK alignment, senses/collocations/context, sync outbox/conflicts/cursor, content packs/metadata và cache ảnh.

## 5. Dữ liệu và lưu trữ

### Dữ liệu học

- `src/data/hsk-vocabulary.json`: **11.828 mục từ**, khoảng **8,60 MB**.
- Snapshot `data-validation-report.json` được sinh lúc **2026-10-02 05:22 UTC** ghi `valid: true`, `issues: []`.
- Phân bố snapshot: HSK 1: 508; HSK 2: 751; HSK 3: 963; HSK 4: 987; HSK 5: 1.461; HSK 6: 1.242; HSK 7–9: 5.916. Đây là phân bố của file dữ liệu tại ngày chạy validator, **không phải số mới được xác nhận lại hôm nay**.
- `hsk-syllabus-official.json`: khoảng 1,78 MB; có file đối chiếu syllabus/standard.
- Dữ liệu luyện nét: `hsk12-strokes.json` khoảng 9,83 MB và 8 shard `stroke-shard-0..7`; có `stroke-coverage.json` và `HANZI_STROKE_DATA_LICENSE.md`.
- Dữ liệu bổ sung trong `src/data`: radical, từ dễ nhầm, ngữ pháp mở rộng/bản nháp, từ vựng bản nháp/bổ sung, cặp phát âm, bài nói, truyện, đối chiếu Việt–Trung và bài luyện viết.

### Lưu trữ và backend

- SQLite local-first, `DATABASE_VERSION = 43`, **43 bảng được khai báo** và một virtual table FTS5 cho tìm kiếm từ.
- Supabase artifacts: 3 SQL scripts (shared decks, multi-device sync, cloud backups), cấu hình CLI và 2 Edge Functions (`gemini-conversation`, `pronunciation-score`).
- Biến cấu hình dự kiến nằm trong `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`; không đưa giá trị cấu hình hoặc khóa vào báo cáo.
- Đồng bộ/sao lưu/AI là chức năng tích hợp ngoài local DB. Cần xác nhận Auth/RLS, triển khai function, secret phía server, quota và backup/restore tại project thật; không suy ra “đang hoạt động” chỉ vì file tồn tại.

## 6. Công nghệ và build

- Expo SDK 57, React Native 0.86.3, React 19.2.3, TypeScript 6.0.3.
- Điều hướng: Expo Router; state UI: Zustand; persistence: Expo SQLite; cloud client: Supabase JS.
- Âm thanh/giọng nói: `expo-audio`, `expo-speech`, `expo-speech-recognition`; file/ảnh/chia sẻ: document picker, image picker, file system, sharing; thông báo: Expo Notifications; lưu an toàn: SecureStore.
- UI: React Native Reanimated, Gesture Handler, Safe Area Context, SVG và React Native Web.
- Native Android: module Kotlin cho ML Kit Digital Ink; quyền Android được khai báo cho ghi âm.
- Package: `com.tungnguyen2k5vp.fourchinese`; version `0.1.34`, Android code `36`; cấu hình có Android/iOS/web. Việc cấu hình không thay thế việc QA và phát hành riêng từng nền tảng.
- Script kiểm tra tổng hợp: `npm run check` chạy lint, typecheck, Vitest và export Android; APK local có thể tạo bằng `npm run android:release:apk`.

## 7. QA hiện có và những gì chưa thể kết luận

Báo cáo [V5_4_2_FINAL_REPORT.md](V5_4_2_FINAL_REPORT.md) ghi nhận lần kiểm tra gần nhất: lint 0 lỗi (còn 5 warning import/order cũ), typecheck pass, 157 test files/863 tests pass, Android export 2.301 modules pass, build Android và kiểm tra emulator pass ở các luồng/trạng thái được chọn. Có 34 ảnh/32 XML cho entry set và 67 ảnh/63 XML cho runtime/variant set; đây **không phải một ảnh cho từng route**.

Trong lượt cài APK riêng sau đó, bản local arm64 `0.1.34 (36)` đã được cài/mở trên điện thoại realme RMX3085 Android 13 theo phiên trao đổi trước. Điều đó chỉ xác nhận được lượt cài/mở bản build; không chứng minh từng luồng dưới đây đã được kiểm tra trên máy thật.

Theo route audit và QA report, các vùng vẫn chưa được xác nhận đầy đủ gồm:

- Mọi route động/chi tiết/session và mọi trạng thái rỗng/lỗi/đang tải; các phiên thi, ôn, học và nói hoàn chỉnh.
- Thống kê zero-state và kiểm chứng toàn bộ phép tính/giới hạn chỉ số.
- Từ chối quyền thông báo, thiếu/unavailable speech recognition hoặc Digital Ink, TalkBack thật.
- Ma trận toàn bộ route ở dark mode, chữ lớn, chiều rộng nhỏ, bàn phím, xoay/khôi phục app và độ dài dữ liệu thực.
- iOS và web end-to-end; source có cấu hình nhưng QA báo cáo gần nhất tập trung Android.
- Backup → xóa/cài lại hoặc thiết bị thứ hai → restore; xung đột đồng bộ và kiểm tra dữ liệu sau khôi phục.
- Gemini/pronunciation với tài khoản và backend production thật; không lấy unit test làm bằng chứng provider đang hoạt động.

Chi tiết route evidence và giới hạn nằm tại [PRODUCTION_ROUTE_AUDIT.md](PRODUCTION_ROUTE_AUDIT.md), [FINAL_UI_SCREEN_MATRIX.md](FINAL_UI_SCREEN_MATRIX.md) và [UI_FREEZE_V5_4_2.md](UI_FREEZE_V5_4_2.md). APK trong báo cáo V5.4.2 dùng local Android Debug key, phù hợp kiểm thử cục bộ, **không phải chữ ký phát hành Play Store**.

## 8. Tài liệu cũ đang gây hiểu nhầm

Đây là khoảng trống quản trị sản phẩm nổi bật nhất được phát hiện:

- `README.md` còn ghi version **0.1.25**, trong khi `package.json` và `app.json` ghi **0.1.34 / code 36**.
- `FEATURE_AUDIT.md` ghi ngày 2026-09-21 và migration/schema version 7, trong khi source hiện là schema 43. Tài liệu cũng đánh dấu một số mảng như reader, tone trainer, từ dễ nhầm và AI tutor là chưa có; source hiện đã có các route/module tương ứng cho reader, tone, confusables và AI role-play. Không nên diễn giải điều này thành mọi đề xuất roadmap (ví dụ tutor tổng quát/sinh nội dung) đã hoàn chỉnh.
- `FEATURE_ROADMAP.md` và `IMPLEMENTATION_REPORT.md` thuộc đợt 2026-09-21, còn chứa nhiều ý tưởng nay đã có phần triển khai. Cần đánh dấu rõ “đã có”, “đã có một phần”, “còn thiếu” thay vì giữ chúng như backlog hiện hành.
- Các tài liệu QA V5.4.2 lại ghi đúng giới hạn kiểm thử đại diện; nên giữ đây làm nguồn trạng thái QA cho tới khi có lần chạy mới.

Khuyến nghị: sau báo cáo này, cập nhật README và audit/roadmap cũ trong một thay đổi tài liệu riêng, giữ lịch sử phiên bản thay vì xóa báo cáo V5 cũ.

## 9. Khoảng trống và thứ tự nâng cấp đề xuất

| Ưu tiên | Việc cần làm | Vì sao / tiêu chí hoàn tất đề xuất |
|---|---|---|
| P0 | Đồng bộ tài liệu với source hiện tại | README thể hiện đúng 0.1.34, schema 43, route, điều kiện cloud/AI; roadmap gắn nhãn đã làm/một phần/chưa làm và link tới bằng chứng |
| P0 | Hoàn tất ma trận QA 59 route | Mỗi route có trạng thái pass/fail/blocked/not applicable, ảnh/log; kiểm tra cả empty/loading/error và luồng submit an toàn, không chỉ mở màn hình |
| P0 | Chốt cloud/AI production readiness | Kiểm tra live migration, RLS/Auth, Edge Functions, server secrets/quota, lỗi mạng và privacy; chạy một vòng sync/backup/restore thật có dữ liệu kiểm thử |
| P1 | Kiểm tra chất lượng và giấy phép dữ liệu | Chạy validator mới; đối chiếu số liệu, HSK standard version, nghĩa/ví dụ và license/provenance; chặn release nếu có lỗi chất lượng nghiêm trọng |
| P1 | Accessibility/device compatibility | TalkBack thật; Android nhỏ/lớn, quyền mic/thông báo, speech service thiếu; xác định rõ iOS/web hỗ trợ tính năng nào và mức QA |
| P1 | AI/giọng nói: quyền riêng tư và độ tin cậy | Hiển thị lúc nào audio/text rời thiết bị, retention, consent, giới hạn/quota, fallback không AI; kiểm thử latency và chất lượng theo thiết bị/mạng |
| P2 | Đo hiệu quả học trước khi thêm nhiều tính năng | Chọn KPI privacy-respecting/opt-in như hoàn tất onboarding, phiên ôn hoàn tất, quay lại học, lỗi theo kỹ năng; dùng số liệu thực để chọn backlog |
| P2 | Theo dõi dung lượng và hiệu năng | APK arm64 trong báo cáo gần nhất ~93 MB; đặt ngưỡng startup, truy vấn DB, kích thước data/asset và kiểm tra lại sau mỗi bản lớn |

## 10. Kết luận

App hiện đã có nền tảng và độ rộng chức năng đáng kể. Danh sách trên bao phủ toàn bộ **59 route người học** trong source hiện được kiểm kê, cùng các hệ thống dữ liệu, lưu trữ và backend tìm thấy. Tuy nhiên, đây là **bản đồ chức năng của codebase**, không phải chứng nhận rằng tất cả tính năng đều hoàn thiện, được cấu hình ở production hay đã QA trên mọi thiết bị.

Nếu mục tiêu là quyết định cần nâng cấp gì tiếp theo, thứ tự hợp lý là: **cập nhật tài liệu → hoàn tất kiểm thử route/luồng → xác minh backend/khôi phục dữ liệu và quyền riêng tư → rồi mới chọn tính năng mới theo phản hồi/số liệu người học**.

## Nguồn nội bộ đã đối chiếu

- [`package.json`](../package.json), [`app.json`](../app.json), [`src/app`](../src/app), [`src/db/schema.ts`](../src/db/schema.ts), [`src/data`](../src/data)
- [`PRODUCTION_ROUTE_AUDIT.md`](PRODUCTION_ROUTE_AUDIT.md), [`V5_4_2_FINAL_REPORT.md`](V5_4_2_FINAL_REPORT.md), [`FINAL_UI_SCREEN_MATRIX.md`](FINAL_UI_SCREEN_MATRIX.md)
- [`README.md`](../README.md), [`FEATURE_AUDIT.md`](../FEATURE_AUDIT.md), [`FEATURE_ROADMAP.md`](../FEATURE_ROADMAP.md), [`IMPLEMENTATION_REPORT.md`](../IMPLEMENTATION_REPORT.md)
- [`DATA_LICENSES.md`](../DATA_LICENSES.md), [`supabase`](../supabase)
