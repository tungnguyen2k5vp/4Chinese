# V7 — baseline trước mở rộng tiếng Anh

Ngày: 10/10/2026. Trạng thái: checkpoint kỹ thuật, chưa phát hành V7.

Source thực tế: Expo 57.0.27, React Native 0.86.3, React 19.2.3, TypeScript 6, Expo Router, Expo SQLite, Zustand, Vitest. App 0.1.35; schema **45**, không phải 44. Worktree có thay đổi của những đợt trước; không reset hoặc gom chúng vào commit V7.

Baseline chạy lại: **161 file, 889/889 test PASS**. File: `artifacts/v7-2026-10-10/baseline-tests.json`. Type-check và lint sau checkpoint được ghi ở báo cáo hiện trạng.

## Dữ liệu tiếng Trung

Raw vocabulary 11.828; bộ từ hiệu lực 11.877. Các cấp gốc: 1=509, 2=771, 3=963, 4=1.014, 5=1.461, 6=1.242, 7–9=5.917. Đây không phải số đếm bộ nguồn HSK 11/2025. Bộ 11/2025 nằm trong bảng source riêng với 11.000 mục. Không dùng hai cách đếm thay thế nhau.

Ngữ pháp seed 40, ngoài ra 24 draft V5. V6 report phân biệt học liệu draft và verified; không coi test pass là kiểm duyệt học thuật.

SHA256 raw vocabulary: `d12e9f23c4c50af154c2a56c5d63de230c1e69e44ac0fd1c4e644c05e2622d11`.

Snapshot kiểm thử: [chinese-v45-fixture.sqlite](../artifacts/v7-2026-10-10/baseline-c928d97b-7bd9-4622-a37d-5cc4f935d01f/chinese-v45-fixture.sqlite). [Baseline JSON](../artifacts/v7-2026-10-10/baseline-c928d97b-7bd9-4622-a37d-5cc4f935d01f/baseline.json) chứa count/hash 71 bảng và hash toàn bộ file trong `src` tại thời điểm audit. Fixture dùng learner data legacy có từ custom, SRS, ghi chú, deck và history; **không phải database điện thoại**, không phải toàn bộ dữ liệu người dùng thật.

## Capability audit và điểm phụ thuộc ngôn ngữ

| Thành phần | Source thực tế | Khả năng tái sử dụng / phần phải tách |
|---|---|---|
| Navigation/settings | `src/app/_layout.tsx`, `(tabs)/_layout.tsx`, `(tabs)/profile.tsx`, `stores/app-store.ts` | 5 tabs, hydrate settings SQLite; chưa có lựa chọn learningLanguage |
| Dictionary/search/bulk/decks | `db/repository.ts`, `decks/bulk-add.tsx`, `services/vocabulary/bulk-import.ts` | UI/transaction có thể dùng lại; shape Vocabulary và matcher Hán tự/Pinyin không dùng cho EN |
| SRS/review | `services/srs/scheduler.ts`, `db/repository.ts`, `review/session.tsx` | Scheduler dùng số liệu chung; review modes/queues/IDs hiện thuộc tiếng Trung |
| Daily/quick session | `daily/index.tsx`, `services/learning/next-best-action.ts` | Chia ưu tiên dùng lại; repository due phải có owner riêng |
| Mistake Book/context | `db/mistakes.ts`, `db/vocabulary-context.ts` | Infrastructure dùng lại; PINYIN/HANZI không được đổi tên thành EN |
| Path/grammar | `db/learning-path.ts`, `db/grammar.ts` | Curriculum và activity types có HSK/HANZI; không copy thành syllabus CEFR giả |
| Reader | `services/reader/segment.ts`, `db/reading.ts` | Import/chunks có thể dùng lại; Chinese longest-match không hợp tiếng Anh |
| Listening/speaking/writing | `db/listening-library.ts`, `services/audio/speech-voice.ts`, `db/speaking.ts`, `writing/*` | Voice selector Mandarin và tone/stroke tools phải giữ riêng |
| Statistics/XP | `db/repository.ts`, `db/gamification.ts` | `daily_stats`, `xp_events` đang là legacy Chinese; không dùng trực tiếp cho EN |
| Backup/restore | `db/backup-repository.ts`, `services/backup/format.ts` | Format 3; restore có DELETE/replace theo danh sách Chinese; chưa có bilingual atomic restore |
| Theme/flags | `theme/ThemeProvider.tsx`, `services/feature-flags/*` | Dùng lại tokens; không bật English runtime khi content/license chưa sẵn sàng |

Quyết định: giữ nguyên Chinese runtime/schema/migration/repositories. Dictionary tiếng Anh được xây vào file SQLite **staging riêng**, không mount vào provider chính, chưa kích hoạt Settings. Các checkpoint runtime tiếp theo vẫn phải triển khai và kiểm thử; không coi audit này là functional parity.
