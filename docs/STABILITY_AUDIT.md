# 4Chinese — Stability Audit

Ngày audit: 2026-09-25

Phạm vi: source hiện tại trong repository `4Chinese`, không dùng tài liệu cũ làm nguồn chân lý.

## Baseline

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | Pass — 28 files, 120 tests |
| `npx expo export --platform android` | Pass — Android bundle được export |

Không có thay đổi chưa commit tại thời điểm bắt đầu audit. Local branch đang đi trước `origin/main` 5 commit; audit và các thay đổi sau không reset/rebase/ghi đè lịch sử đó.

## Architecture

| Khu vực | Hiện trạng từ source |
| --- | --- |
| Framework/router | Expo SDK 57, React Native 0.86, Expo Router file-based tại `src/app` |
| State | Zustand cho queue/cài đặt đang hoạt động; SQLite là nguồn dữ liệu bền vững |
| Database | Expo SQLite, WAL + foreign keys; schema version 9; migration dạng additive/repair cột |
| Repository | `src/db/repository.ts` là boundary chính cho từ vựng, SRS, settings, deck, bulk lookup và thống kê |
| Dataset | Dictionary bundle HSK 1–6/7–9, starter + supplemental data; database seed local-first |
| Native | Android Expo Module ML Kit Digital Ink tại `modules/digital-ink-recognition` |
| Speech/audio | `expo-speech`, `expo-speech-recognition`, `expo-audio`; AI pronunciation gọi Supabase Edge Function |
| Cloud | Supabase chỉ phục vụ chia sẻ deck và AI pronunciation; tiến độ học không phụ thuộc cloud |
| Tests | Vitest cho scheduler, repository/schema, import/search, handwriting, speech/audio, statistics, deck features |

### Platform matrix

| Runtime | Hỗ trợ hiện có | Lưu ý |
| --- | --- | --- |
| Android development/release build | SQLite, TTS, native speech, microphone, ML Kit handwriting | Cần build native thực tế để xác nhận quyền/thiết bị |
| Expo Go | UI và các phần JS/SQLite phù hợp Expo Go | Không có custom ML Kit/native speech workflow của app |
| iOS | Expo/SQLite/TTS có nền tảng chung | Chưa có native ML Kit iOS trong source; cần kiểm thử riêng |
| Web | Static Expo export | Mọi native-only feature cần fallback rõ ràng |

## Existing features verified from source

- Kho từ local, tìm Hanzi/Pinyin/nghĩa Việt-Anh, từ HSK và từ cá nhân.
- Deck: tạo, đổi tên, xóa mềm/khôi phục, copy/import, bulk add, chia sẻ qua Supabase.
- Học từ mới 3 lượt, viết tay/pinyin composition, đánh dấu known/skipped, SRS sau khi hoàn tất.
- SRS 6 cấp, due queue, review log, lapse/hint telemetry, countdown upcoming, weak words.
- Handwriting nhiều trang, gợi ý nét, native Digital Ink Android và fallback candidates.
- TTS Mandarin, speech input cho pinyin, listening deck quiz, cloze quiz và pronunciation AI.
- Daily stats, thời gian foreground học/ôn, streak, HSK progress, mastery chart.

## Settings audit

| Setting | Nơi lưu | Nơi đọc/thực thi | Kết luận |
| --- | --- | --- | --- |
| `dailyNewWordGoal` | `user_settings` JSON qua repository | Home, learn setup, study settings | Có lưu/đọc, nhưng đang bị dùng lẫn với giới hạn mỗi phiên |
| `dailyStudyMinutes` | như trên | Home, Stats, StudySettingsSheet | Hoạt động |
| `dailyReviewGoal` | như trên | Không có call site ngoài model/default | Dead setting — cần ẩn hoặc triển khai giới hạn có nghĩa |
| `desiredRetention` | như trên | Không có call site ngoài model/default | Dead setting — cần ẩn hoặc bỏ khỏi dữ liệu mới; không xóa field cũ |
| `selectedHskBands` | như trên | Home, learn/review/upcoming queries | Hoạt động |
| `simplifiedOrTraditional` | như trên | Learn/review response composition | Hoạt động một phần: prompt/display vẫn chủ yếu simplified |
| `pinyinVisibility` | như trên | Chỉ Profile | Chưa có source of truth ở component hiển thị |
| `toneColorEnabled` | như trên | Chỉ Profile | `PinyinText` đang hard-code tone color mặc định |
| `soundEnabled` | như trên | Chỉ Profile | AudioButton/autoplay không tôn trọng setting |
| `autoPlayAudio` | như trên | Review | Learn setup/session luôn autoplay; chưa nhất quán |
| `speechRate` | như trên | TTS của learn/review/listening/AudioButton | Hoạt động, nhưng Profile chưa có UI chỉnh |
| `practiceWritingEarly` | như trên | Scheduler helper | Chưa được truyền nhất quán từ settings vào learning/review flow |
| `hapticEnabled`, `reviewStyle`, `reviewSessionSize` | như trên | Learn/review UI | Có call site |

## Partial features / confirmed Phase 1 defects

1. Home link `Luyện nghe` trỏ tới `/review?mode=audio`, nhưng `review/index.tsx` không đọc query parameter và review session hard-code `meaning-hanzi`. Shortcut hiện không vào listening exercise.
2. Heatmap 28 ngày ở Stats đặt `opacity` theo index, không đọc `daily_stats`.
3. Daily word ở Home gọi `listVocabulary({ limit: 1 })`, nên luôn chọn row đầu tiên thay vì chọn deterministically theo ngày/cấp HSK.
4. Onboarding `HSK 4+` map trực tiếp thành HSK 4, làm mất lựa chọn HSK 5/6/7–9.
5. Learn setup dùng `dailyNewWordGoal` rồi clamp tối đa 10; UI gọi nó là “mỗi lần”. Daily target và per-session limit không tách biệt.
6. `getVocabulary()` và bulk list helpers chỉ attach một ví dụ; detail chưa có API nhiều ví dụ.
7. Bulk index chỉ preload HSK 1–4. HSK 5–9 có SQLite fallback ở một số luồng nhưng cần benchmark/thiết kế lazy index trước khi mở rộng.
8. Stroke JSON được import trực tiếp vào writing components; chỉ có chứng cứ coverage test HSK 1–4. Không nên nạp thêm HSK 5–9 toàn bundle trước khi đo kích thước/khởi động.
9. Pronunciation AI vẫn là cloud OpenAI path bắt buộc cho màn chấm AI; native speech exists nhưng chưa là provider fallback cho pronunciation.
10. `ReviewMode` và UI branches cho nhiều bài đã tồn tại, nhưng scheduler session hiện hard-code `meaning-hanzi`; đây là nền tảng cần chuẩn hóa sau stabilization, không nên rewrite SRS trước.

## Dead / unused items

- `dailyReviewGoal` và `desiredRetention` có trong persisted model/default nhưng không có nơi đọc để thay đổi behavior.
- `pinyinVisibility`, `toneColorEnabled`, `soundEnabled` có control Profile nhưng không được áp dụng end-to-end.

Không xóa fields persisted trong đợt stabilization để tránh làm hỏng database/settings cũ.

`practiceWritingEarly` đã được ẩn khỏi Profile trong Phase 1 vì không có luồng học/ôn nào truyền setting đó vào scheduler. Field cũ vẫn được giữ trong JSON tương thích ngược.

## Risks

- **Data/migration:** seed/quality refresh chạy trên database cũ; mọi field mới phải default/additive và migration cần test upgrade.
- **Performance:** dictionary lớn; không preload 11k entries hoặc stroke assets ở startup. Bulk import phải benchmark theo input và HSK band.
- **Platform/native:** handwriting/speech recognition là development/release native paths; Expo Go và Web phải có fallback.
- **Networking/cost:** Supabase/OpenAI pronunciation có quota/401/429/timeout; không được là prerequisite của practice cơ bản.
- **Settings consistency:** toggles không có effect làm UX sai; nên sửa source of truth trước khi thêm setting mới.
- **Audio:** autoplay/manual playback phải tôn trọng sound setting nhưng listening started deliberately vẫn cần manual Play.

## Phase 1 implementation order

1. Chuẩn hóa settings nguồn duy nhất và test các behavior audio/pinyin.
2. Sửa listening route để dùng exercise `audio_to_meaning` hiện có, không tạo engine mới.
3. Sửa Stats heatmap và daily word deterministic bằng dữ liệu local/timezone local.
4. Tách daily target khỏi learn session limit; sửa onboarding HSK 4+ theo model hiện có.
5. Thêm API multiple examples tương thích ngược.
6. Đo và document bulk/stroke behaviour trước bất kỳ mở rộng HSK 5–9 nào.

## Kết quả đo dữ liệu trước khi mở rộng index/stroke

Đo trên Node của môi trường phát triển, chỉ gồm đọc + `JSON.parse` (không phải số liệu thiết bị):

| Dataset | Kích thước | Số entry | JSON parse |
| --- | ---: | ---: | ---: |
| `hsk-vocabulary.json` | 9,196,834 bytes | 11,330 | 48.6 ms |
| `hsk12-strokes.json` | 3,669,330 bytes | 1,721 | 12.4 ms |

Kho từ phân bố: HSK 1: 507, HSK 2: 750, HSK 3: 955, HSK 4: 979, HSK 5: 1,078, HSK 6: 1,154, HSK 7–9: 5,907. Vì vậy không preload HSK 5–9 hoặc stroke data mới trong Phase 1. Chiến lược hiện có HSK 1–4 fast index + SQLite fallback được giữ nguyên; benchmark RAM/latency trên Android release vẫn là điều kiện trước khi lazy-index HSK 5–9.

## Phase 2 - pronunciation provider and fallback

- Standard practice uses the device Mandarin recognizer (`zh-CN`) first and compares final transcripts with simplified/traditional Hanzi and normalized pinyin locally.
- Native output is labelled as recognition only: `Máy nhận được`, `Nhận đúng từ`, or `Chưa khớp từ mục tiêu`; it is never shown as a made-up pronunciation/tone score.
- Cloud recording is isolated in an optional `Phản hồi AI nâng cao` panel. Missing configuration, quota, or network errors leave standard practice usable and show a short fallback message.
- Expo Go and devices without the optional native speech module render the screen safely with the microphone disabled and a concise explanation.
- Recognition listeners are removed after final result/error/timeout. Leaving a word cancels its request, so a late response cannot appear on the next word.

Verification: `npm run lint`, `npm run typecheck`, full `npm test` (34 files / 132 tests), `npx expo export --platform android`, and `git diff --check` passed. ADB is installed in the Android SDK, but its device query did not return in this session, so native-device smoke testing remains pending.

## Documentation discrepancies

- `README.md` nói kho HSK 1–2 mở rộng, trong khi source/dataset và app flows hiện có HSK 1–6/7–9.
- `README.md` ghi version phát hành `0.1.0`, trong khi `app.json` là `0.1.12` / Android versionCode 14.
- Audit cũ nói schema version 7; source hiện là version 9.

Các tài liệu này cần được cập nhật sau khi Phase 1 ổn định, để tránh trộn thay đổi tài liệu với baseline audit.
