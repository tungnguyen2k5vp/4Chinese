# Motion UX V2 — triển khai

Expo 57.0.27 / RN 0.86.3 / React 19.2.3 / Expo Router. Đã đọc hướng dẫn SDK 57 theo `AGENTS.md`. Dùng React Native Animated + SVG đã cài; không có CSS DOM, package mới, đổi version hoặc build configuration trong source.

## Diff ứng dụng

Năm file source có thay đổi V2:

- `src/components/visual/LearningGuide.tsx`: optional `autoPlay`; ref nhận diện trigger mood/greeting. Consume trigger cả khi không animate; chờ OS preference trước khi chạy. Giữ StrictMode cleanup, timeline hữu hạn và reset về trạng thái cuối.
- `src/app/learn/session.tsx`: feedback khối dùng reveal 200 ms; stamp hiện có là phản hồi chính.
- `src/app/review/session.tsx`: reveal hai loại hint 180 ms; feedback 200 ms; chỉ label option sai shake 220 ms; tránh stamp lặp tại feedback khi option đã có stamp.
- `src/app/review/result.tsx`: `autoPlay={false}` cho celebration; statistics active theo focus. Không dùng route result để giả định vừa có completion mới.
- `src/app/word/[id].tsx`: MotionPressable cho tabs, giữ role/selected/callback; thông báo lưu dùng reveal 180 ms và icon đúng/sai tĩnh. Không sửa handler saveNotes.

`StudyTransition`, `FlashcardFlip`, `MotionPressable`, `AnswerFeedbackIcon`, audio/Reader, theme tokens, navigation và mọi dịch vụ dữ liệu giữ nguyên source so với snapshot V2. Không tạo component trùng chức năng.

## Kiểm tra kèm theo

Hai script `scripts/qa-playful-ui.cjs` và `scripts/qa-motion-p4.cjs` mở rộng fixture QA: result no-auto/tap/focus; nod no-replay; notes fail/retry; hint reveal giữ turn/state; rapid input, double submit, save retry và audio hồi quy. Fixture `saveNotes` chỉ giữ dữ liệu trong RAM, không mở DB người học. Ca result chủ động khôi phục `full` trước khi đo particles; sửa thiết lập test bị sót `off` từ vòng kiểm tra layout.

Native helper/build init/AVD/log/fixture nằm **ngoài project** tại [artifact V2](../../4Chinese-Archive/motion-ux-v2-2026-10-26/). Helper khóa cả serial `emulator-5582`, QEMU và AVD `FourChineseMotionV2QA`; không thể dùng nó cho điện thoại vật lý. Build init chỉ đổi output của lần debug test, không sửa Gradle source và không ghi đè APK release cũ.

Đối chiếu AST với originals mới: **46 block handler/effect/memo/callback trong bốn màn nghiệp vụ không đổi**. Đây là kiểm tra cấu trúc có phạm vi, bổ sung unit/integration/runtime QA, không phải chứng minh mọi hành vi có thể xảy ra. Chi tiết hash và runtime snapshots: [Database Safety](MOTION_UX_V2_DATABASE_SAFETY.md).
