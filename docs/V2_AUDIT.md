# V2 Audit — 4Chinese

Ngày audit: 2026-09-28  
Nguồn sự thật: source tại `e4831a7` trước khi bắt đầu V2; tài liệu cũ chỉ được dùng để đối chiếu, không dùng thay cho code.

## Baseline đã xác minh

- Expo SDK 57, React Native 0.86, Expo Router, SQLite local-first.
- App config: `0.1.16`, Android `versionCode=18`, package `com.tungnguyen2k5vp.fourchinese`.
- Schema trước V2: 20; đợt V2 bắt đầu ở schema 21 với migration cộng thêm.
- Kho bundled: 11.330 mục từ; data tiến độ/SRS/từ cá nhân nằm trong SQLite.
- Source có 5 tab và khoảng 42 route; 66 file test/259 test case là baseline báo cáo trước V2.

## Registry theo feature

| Feature | Trạng thái | Bằng chứng source | Nhận định V2 |
| --- | --- | --- | --- |
| Kho HSK, tìm Hanzi/pinyin/nghĩa, SRS | COMPLETE | `repository.ts`, `scheduler.ts`, `schema.ts` | Giữ nguyên ID và scheduler; chỉ nâng index/benchmark. |
| Bulk lookup | PARTIAL | `bulk-import.ts`, fast index HSK 1–4 | HSK 5–9 chưa có cùng chiến lược tối ưu; là Phase 22. |
| Bộ từ/từ cá nhân và backup local | COMPLETE | `backup-repository.ts`, deck routes | Đã có restore point và transaction; không thay thế bằng cloud. |
| Cloud backup + email auth | PARTIAL | `app/cloud`, `services/cloud/backup.ts` | Là snapshot ZIP thủ công, chưa phải multi-device sync. |
| Cloud sync queue/conflict policy | UNUSED | Không có `sync_queue` hoặc entity sync metadata | Phase 27, cần thiết kế riêng, không gọi Supabase từ UI cho dữ liệu học. |
| Content versioning | FOUNDATION_ONLY → IMPLEMENTED | `content_metadata` migration 21 | Tách schema/content version, manifest minh bạch trạng thái nội dung. |
| Sentence database dùng chung | FOUNDATION_ONLY | `sentences`, link vocabulary/grammar; 14 câu seed | Có graph nền tảng nhưng data/content engine còn nhỏ. |
| Ví dụ ngữ cảnh | PARTIAL | `contextual-example.ts`, `curated-examples.ts` | Có fallback; không được gắn fallback/AI là curated. |
| Word detail mở rộng | PARTIAL | word detail, related-word/character services | Có related lexical/context cơ bản; thiếu collocation/usage/mistake model chuẩn. |
| Learning Path | PARTIAL | `learning-path.ts`, `lesson_activity_progress` | Hoàn thành hiện dựa trên mở activity; cần result/completion rule thật. |
| Grammar | FOUNDATION_ONLY | `grammar.ts`, `grammar_progress` | 7 điểm seed, 14 câu shared; chưa có mastery/metadata đầy đủ. |
| Reader + TXT + OCR | PARTIAL | reader services/routes | Có segmentation/history/TXT/OCR native; giới hạn 2.000 ký tự, chưa chunk/lazy EPUB/PDF. |
| Stories | FOUNDATION_ONLY | `stories.ts` | Có 3 story seed + question/progress; chưa chia sẻ pipeline sentence/audio hoàn chỉnh. |
| Mistake Book + skill mastery | PARTIAL | `mistakes.ts`, `knowledge-map.ts` | Persisted và không đổi SRS; cần recommendation/leech/error analysis. |
| Tone trainer + shadowing | PARTIAL | `speaking.ts`, speaking routes | Có practice records; chưa là scoring acoustic/pitch chuẩn. |
| AI pronunciation | PARTIAL | `AiPronunciationPanel`, Edge Function | Optional backend/credit; phải có local fallback và cost guard. |
| Statistics, XP, goals | PARTIAL | `gamification.ts`, stats routes | Có daily/weekly/xp; thiếu analytics/weekly report mở rộng. |
| Handwriting/Digital Ink | PARTIAL | handwriting services/routes | Có 4.196 data nét và candidate recognition; native capability chưa được surface thống nhất. |

## Findings

### V2-001 — Version metadata bị drift — Fixed trong Phase 21

- Files: `package.json`, `package-lock.json`, `app.json`, Profile, Cloud backup.
- Trước V2: runtime Expo là `0.1.16` nhưng package, README và Account hiển thị `0.1.0`/`MVP 0.1.0`.
- Tác động: người dùng không biết bản APK/backup nào đang dùng; dễ nhầm khi support/restore.
- Hướng xử lý: `app-version` service dùng native binary version trước, Expo config sau; backup/Profile/Cloud dùng cùng nguồn.

### V2-002 — Tài liệu lịch sử không còn khớp source — Moderate

- Files: `BIG_UPDATE_AUDIT.md`, `BIG_UPDATE_REPORT.md`, `IMPLEMENTATION_PROGRESS.md`, `README.md`.
- Tài liệu cũ còn mô tả schema 11/18, cloud chưa có UI và test count cũ; source đang schema 20 trước V2, có archive backup, cloud snapshot, reader/stories/mistakes/speaking.
- Tác động: nếu implement theo tài liệu cũ sẽ dễ làm lại feature đã tồn tại hoặc đánh giá sai mức hoàn thiện.
- Hướng xử lý: V2 docs phải ghi rõ code là nguồn sự thật và cập nhật sau từng phase.

### V2-003 — Cloud snapshot không phải sync — Moderate

- Files: `src/app/cloud/index.tsx`, `src/services/cloud/backup.ts`.
- Tác động: hai thiết bị có thể backup/restore được, nhưng không merge progress, review history hay custom deck; khôi phục thay toàn bộ local state theo xác nhận của user.
- Hướng xử lý: Phase 27 thêm local repository → durable sync queue → Supabase, conflict policy và test hai thiết bị.

### V2-004 — Completion Learning Path chưa chứng minh kết quả học — Moderate

- Files: `src/app/path/lesson/[lessonId].tsx`, `src/db/learning-path.ts`.
- Tác động: mở activity có thể làm lesson đủ điều kiện hoàn tất dù chưa đạt quiz/grammar/writing objective.
- Hướng xử lý: `lesson_activity_results`, rule theo activity và tiến độ course lấy từ result thực.

### V2-005 — Content graph đã có schema nhưng content còn nhỏ — Moderate

- Files: `grammar.ts`, `stories.ts`, `contextual-example.ts`, `curated-examples.ts`.
- Tác động: app có shared sentence links nhưng chưa đủ ví dụ/collocation/context để dùng sâu ở Reader, SRS, Grammar và Speaking.
- Hướng xử lý: xây Sentence/Example pipeline + provenance/review status; không generate hàng loạt nội dung chưa kiểm duyệt.

## Kiểm tra safety và state assumptions

- Migration: `migrateDatabaseSchema` kiểm tra `PRAGMA quick_check`, chạy trong transaction, từ chối database version mới hơn và không có nhánh reset/delete database. Đã có test legacy; V2 thêm snapshot v20 bao gồm deck, progress, review, stats, lesson, grammar, story, mistakes, skill, speaking, XP và reader.
- Backup restore: có xác nhận, tạo restore point trước import và restore theo transaction. Đây là overwrite có chủ đích, không phải migration/sync.
- Content metadata: upsert idempotent theo `content_type`; lỗi khi seed metadata không nâng `user_version`, nên launch sau có thể retry.
- Đơn vị thời gian: `daily_stats.study_seconds` lưu giây, trong khi mục tiêu user lưu phút; các code paths dùng trường tên rõ ràng. Các phase analytics phải giữ conversion rõ ràng, không đổi representation cũ.

## Era kỹ thuật

| Era | Commit | Mẫu chính |
| --- | --- | --- |
| Foundation | `693246e` → `59e3be4` | HSK, SRS, vocabulary/deck, đổi brand 4Chinese. |
| Learning expansion | `41c8394` → `b0749e5` | bulk lookup, review, stats, writing, daily study time. |
| Big learning update | `a4927be` → `e4831a7` | grammar, reader, stories, mistakes, speaking, XP, cloud archive. |
| V2 | đang triển khai | Content version, performance, content graph, result engine, sync queue. |

## Ưu tiên sau audit

1. P0: version consistency, schema/content version, legacy snapshot và search HSK 5–9 benchmark/index.
2. P0: Sentence engine và Learning Path completion result.
3. P0: offline-first sync queue/conflict policy sau khi entity metadata rõ ràng.
4. P1: Grammar mastery, recommendation, Reader large document, Stories/audio, weekly analytics.
5. P2/P3: pitch experiment, AI Tutor/role-play, content packs, experimental SRS.

## Không làm trong V2 nếu chưa có nền tảng

- Không reset SQLite hoặc đổi ID HSK.
- Không coi AI pronunciation/local recognition là pronunciation score chuẩn.
- Không đưa cloud backup hiện tại ra như real-time sync.
- Không generate hàng chục nghìn câu AI rồi gắn nhãn curated.
- Không thêm community/social feature.
