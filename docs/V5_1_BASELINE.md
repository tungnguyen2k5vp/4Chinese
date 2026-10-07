# 4Chinese V5.1 — Baseline

**Ngày kiểm tra:** 2026-10-02  
**Mục tiêu:** ghi nhận trạng thái thật trước khi tiếp tục triển khai V5.1.  
**Nguyên tắc:** không reset, xoá, drop hoặc recreate dữ liệu người dùng.

## Trạng thái ứng dụng

| Hạng mục | Giá trị baseline |
|---|---|
| App version | `0.1.31` |
| Android versionCode | `33` |
| SQLite schema | `40` |
| Expo / React Native | Expo `~57.0.23` / RN `0.86.3` |
| Reanimated / Worklets | `4.5.1` / `0.10.1` |
| New Architecture | Bật |
| Android ABI | `armeabi-v7a, arm64-v8a, x86, x86_64` |
| Route files | 60 (58 màn hình + 2 layout) |
| Tab chính | 5 |
| Raw vocabulary | 11,330 |
| Canonical vocabulary audit | 11,379 |
| Grammar active | 40 |
| Stories active | 18 (HSK 1–3, mỗi cấp 6 truyện) |
| Tests | 146 files / 820 tests |

## Kết quả lệnh kiểm tra

| Lệnh | Kết quả |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 146 files, 820 tests |
| `npm run data:audit:v5` | PASS — inventory SHA-256 `64519b340cefb1a6accd97e14487d658f3b1a612f8d7307b5a470b7c13420608` |
| `npx expo export --platform web` | PASS — Metro web 1,811 modules |
| `npx expo export --platform android` | PASS — Android bundle Hermes 22 MB, export `dist` |
| `app:assembleRelease` với JDK 25.0.3 | FAIL ở `:react-native-worklets:configureCMakeRelWithDebInfo[arm64-v8a]` |
| `app:assembleRelease` với JDK 19 | PASS |

## Dữ liệu và nội dung hiện có

- Phân bố canonical audit: HSK1 `508`, HSK2 `770`, HSK3 `955`, HSK4 `1006`, HSK5 `1078`, HSK6 `1154`, HSK7–9 `5908`.
- Grammar active: HSK1 `10`, HSK2 `8`, HSK3 `10`, HSK4 `6`, HSK5 `3`, HSK6 `3`; HSK7–9 chưa có grammar active.
- Kho draft đã có: stories `14`/`69` câu/`42` câu hỏi; grammar `24`/`48` ví dụ; advanced grammar `4`/`8`; lexical `35` senses/`71` collocations/`35` examples; roleplay `13` scenes/`42` goal exchanges; pronunciation pairs `10`; reading questions playable `28`; exam draft candidates `84` (trong đó `24` transcript TTS); contextual lessons `6`/`24` lines/`12` questions.
- Sáu Hán tự vẫn thiếu stroke data ngoại tuyến có kiểm chứng: `搾`, `獃`, `秊`, `薙`, `颿`, `骽`. Không tự tạo path giả.
- V40 đã có canonical overrides cho các mục đa âm `看`, `听`, `为`, `行`, `得`, `长`, `乐`; các lexical draft vẫn ở trạng thái DRAFT, chưa tự động publish.

## Giới hạn baseline

- Chưa có nguồn HSK chính thức được xác nhận trong repository; các tuyên bố coverage phải giữ trạng thái UNKNOWN cho tới khi có nguồn/phiên bản/range mapping.
- Gemini Edge Function có contract/test nhưng chưa chạy provider E2E với token triển khai đã xác thực.
- Chưa thực hiện device QA hoặc cài APK trong baseline này.
- Cloud sync mở rộng vẫn để backlog V6; V5.1 ưu tiên local/offline-first.
- APK release debug-signing hiện tại: `android/app/build/outputs/apk/release/app-release.apk`, kích thước `215,362,076` bytes, SHA-256 `A92689F3383DA047453D9DF8CBEC66BDD1C572D2FFBAC16C4FC612CBC1584EE6`. Đây là artifact kiểm tra, chưa được coi là production signing.

## Kết luận

JavaScript, type safety, test suite, data audit và Expo exports đang đạt. Native release build chỉ đạt khi dùng JDK 19; cần cố định/ghi rõ môi trường JDK trước khi coi pipeline Android là reproducible. Các bước tiếp theo là hoàn thiện tài liệu/fix native, tạo migration/context/error/content-review foundation, sau đó chạy lại toàn bộ release gates và native QA.
