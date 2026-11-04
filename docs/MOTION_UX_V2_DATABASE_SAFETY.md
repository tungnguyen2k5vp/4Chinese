# Motion UX V2 — bảo toàn dữ liệu

Không mở/chỉnh DB người học trên host hoặc điện thoại. Không cài APK vật lý, clear data, import lại corpus, thêm migration, đổi ID/SRS/grading/scheduling hoặc persistence của animation.

## Bảo toàn source và APK

Snapshot V2 mới trước sửa: 1.037 file, `files-before.json` + `originals/` trong [artifact](../../4Chinese-Archive/motion-ux-v2-2026-10-26/). `verify-v2.cjs` so byte hash với snapshot này: **519 file được bảo vệ không đổi**, gồm DB/data/services/stores/theme/types, English screens, assets, Android source và dependency/config đã chụp. Không dùng snapshot rich-motion cũ làm baseline V2.

`behavior-preservation.json`: **46 block có sẵn** trong learn/session (15), review/session (22), review/result (3), word detail (6) giữ nguyên AST: handler, effect, memo/callback ở thân component. Các thay đổi V2 nằm tại presentation và vòng đời rig; không có animation callback gọi chấm, save, rate hoặc advance.

`release-before.json` và kiểm tra cuối xác nhận `android/app/build/outputs/apk/release/app-release.apk` giữ SHA-256 `54c253d6beb7f7878db81ad688239079cd38975d0ae1b7ccda9c9da74aeec91e`. APK debug test có output/tên riêng. Không reset/stash/commit/push worktree có thay đổi từ trước.

## Fixture Android cô lập

AVD mới `FourChineseMotionV2QA`, serial `emulator-5582`, ADB port 5047; không copy userdata của AVD/người học khác. Guard helper kiểm tra cả serial, QEMU và tên AVD trước mọi lệnh. `seed-native-fixture.cjs` chỉ chạy trên AVD này, giữ snapshot fresh và tạo fixture riêng: hai từ đến hạn (书/人) có ghi chú, một deck chứa từ mới 好, XP/mục tiêu thử và một English deck/card có notes. Không sửa vocabulary/corpus khi seed. Đây là dữ liệu giả để QA, không phải phần thưởng tự thêm trong ứng dụng.

Ba DB fixture: `hanzi30.db` user_version 46, 72 bảng; `english-learner.db` version 1, 4 bảng; `learning-preferences.db` version 1, 1 bảng. Corpus Chinese có **11.870 từ**. Snapshot force-stop riêng app trên AVD, copy DB/WAL, đọc bản copy bằng node:sqlite; so schema và hash canonical toàn bộ rows của từng bảng, gồm notes (không bỏ cột notes khỏi hash).

## Kết quả runtime

| Khoảng kiểm tra | Kết quả / phân loại |
| --- | --- |
| `before-motion` → `after-motion` | **Schema và toàn bộ bảng của cả ba DB giống hệt**. Các thao tác: flip/tap/Enter/audio/đổi từ, mở Practice/Library/Path/Stats. Không có ghi SRS, notes, deck, XP hoặc English do chuyển động. `database/motion-comparison.json` có `changed: []`. |
| `after-motion` → `after-study` | Schema và corpus giữ nguyên. Sau UI ôn hai từ ba lượt + học một từ ba lượt: review_log thêm đúng 2 rows; progress 2→3; daily_stats, mistake_records, practice_attempt_daily, vocabulary_skill_mastery và xp_events thay đổi theo nghiệp vụ sẵn có. Đây là thao tác học fixture chủ động, không được gọi là “DB hoàn toàn không thay đổi”. Chi tiết `database/study-comparison.json`. |
| `after-study` → `final` | Chỉ `user_settings` (theme/motion chủ động) và `user_vocabulary_progress` đổi. Đối chiếu từng cột progress chỉ có `notes` + `updated_at` của từ 书; mọi cột SRS, due date, memory level khác giữ nguyên. English DB giống hệt; schema/corpus/deck giữ nguyên. `database/final-comparison.json` và `database/final-progress-columns.json` lưu kết quả. |

Các kiểm tra web dùng DB/TTS trong RAM để chủ động gây lỗi lưu, retry và double submission. Không mở learner DB. Chúng bổ sung native QA; không thể thay thế kiểm tra corruption/restore trên thiết bị thật. Không test restore hay thay migration trong vòng này.
