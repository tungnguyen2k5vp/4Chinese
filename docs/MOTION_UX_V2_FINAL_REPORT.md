# 4Chinese — bàn giao Motion UX V2

Đã triển khai phần tinh chỉnh motion trong source hiện tại và đóng gói bằng chứng native Android. **Chưa chứng nhận sẵn sàng phát hành**: TalkBack chưa kiểm được vì một lần mở lại development client bị splash trắng; chưa có release standalone V2 hay kiểm thử trên điện thoại. Không cài lên điện thoại và không thay dữ liệu/tiến độ người học.

## Những thay đổi người dùng nhận được

- Nhân vật giữ artwork và ba tương tác wave/nod/high-five; không tự diễn lại chỉ vì màn hình focus trở lại hoặc đổi chế độ chuyển động. Màn kết quả chờ người dùng chạm để ăn mừng, không tự phát celebration khi mở lại.
- Hint ôn tập hiện nhẹ trong 180 ms; khối phản hồi học/ôn reveal 200 ms. Stamp đúng/sai có một vị trí chính; chỉ nhãn đáp án sai rung nhẹ 220 ms, giảm các hiệu ứng chồng nhau.
- Tabs chi tiết từ có phản hồi nhấn; ghi chú hiện check/cross và thông báo trong 180 ms theo kết quả lưu thật. Nội dung đang nhập và handler lưu giữ nguyên.
- Thống kê kết quả dừng/settle theo focus. Flashcard flip 320 ms, loa độc lập, progress và audio/Reader đã có được giữ; không tạo component trùng hoặc hiệu ứng ngẫu nhiên trong câu hỏi.

Năm file ứng dụng thay đổi: `LearningGuide.tsx`, learn/session, review/session, review/result và word detail. Hai QA script được mở rộng. Không thêm dependency, token theme, artwork, navigation, persistence hoặc đổi version/build config trong source.

## Tham khảo và triển khai

Đã đọc README, LICENSE MIT và hai prompt bắt buộc UI Motion Loop Design (@flxrnc), Animated Story (@N01ennn), cùng Zen Garden để đánh giá ý tưởng không phù hợp từ [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos). Áp dụng tính liên tục giữa state và phản ứng có trigger bằng React Native Animated/SVG hiện có. **Chỉ nghiên cứu văn bản/metadata, chưa xem hoặc chạy demo/video nguồn**. Không copy code/video/artwork/asset và không đưa GSAP/WebGL/Canvas hay idle loop vào app.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Typecheck | PASS |
| Lint | 0 lỗi, 9 cảnh báo có sẵn |
| Unit/integration | 212 file; **1.165/1.165 PASS** |
| `qa-playful-ui.cjs`, `qa-motion-p4.cjs` | PASS, RN-web fixtures; bao gồm no-replay, notes failure/retry, hint, rapid input, audio regression và save/double-submit |
| Build APK native debug x86_64 | PASS sau retry giảm song song do Windows thiếu tài nguyên; chữ ký v2 xác minh thành công |
| Android native visual | Đã kiểm có giới hạn: Home, Word, Learn, Review, Result, các hub, English smoke; **38 ảnh + 9 clip/GIF** |
| TalkBack / release cold-start | NOT_VERIFIED; dev client splash trắng trong ca mở lại cuối phiên, chưa xác định nguyên nhân |
| Âm thanh nghe thực tế / iOS / điện thoại / FPS-RAM-pin release | NOT_VERIFIED |

Native test dùng AVD riêng Android 16/API 36. APK là debug/development-client thật, **không Expo Go**, nhưng cần Metro 8093 và chỉ có ABI x86_64. Không phải APK standalone để cài điện thoại. Không tuyên bố 60 FPS: raw emulator diagnostics có jank, không có before/after native benchmark tương đương.

## Bảo toàn dự án

Snapshot trước sửa V2 gồm 1.037 file; so với snapshot mới này, 519 file được bảo vệ không đổi, 46 block nghiệp vụ trong bốn màn giữ nguyên AST. Không sửa schema, migration, corpus, SRS, grading, scheduling, English data, package/config hoặc release APK cũ. Không reset/stash/commit/push thay đổi có sẵn.

Trên fixture Android riêng, `before-motion`→`after-motion` giữ nguyên schema và toàn bộ rows của cả ba DB. Học/ôn hai từ cũ và một từ mới là thao tác QA chủ động; đã phân loại các bản ghi phát sinh theo nghiệp vụ sẵn có. Sau học, test lưu ghi chú chỉ đổi `notes` và `updated_at` của một từ; theme/motion là thay đổi setting chủ động. English không đổi. Không chạm database/tiến độ người dùng thật.

## Mở bằng chứng và đối chiếu

- [Gallery offline — ảnh và chuyển động native](../../4Chinese-Archive/motion-ux-v2-2026-10-26/gallery.html), [preview](../../4Chinese-Archive/motion-ux-v2-2026-10-26/preview-native.png), [contact sheet](../../4Chinese-Archive/motion-ux-v2-2026-10-26/contact-sheet.png).
- [Wave](../../4Chinese-Archive/motion-ux-v2-2026-10-26/home-wave.gif), [nod](../../4Chinese-Archive/motion-ux-v2-2026-10-26/home-nod.gif), [high-five](../../4Chinese-Archive/motion-ux-v2-2026-10-26/home-highfive.gif), [celebration](../../4Chinese-Archive/motion-ux-v2-2026-10-26/review-celebration.gif), [flip](../../4Chinese-Archive/motion-ux-v2-2026-10-26/word-flip.gif).
- [Diff chỉ V2](../../4Chinese-Archive/motion-ux-v2-2026-10-26/motion-ux-v2-only.diff), [change manifest](../../4Chinese-Archive/motion-ux-v2-2026-10-26/change-manifest.json), [bảo toàn source](../../4Chinese-Archive/motion-ux-v2-2026-10-26/preservation.json).
- [APK debug test](../../4Chinese-Archive/motion-ux-v2-2026-10-26/4Chinese-motion-ux-v2-debug-x86_64.apk); hash trong `apk-info.json`. APK release cũ giữ SHA-256 `54c253d6beb7f7878db81ad688239079cd38975d0ae1b7ccda9c9da74aeec91e`.

Before/after tại gallery là RN-web fixture lấy từ source trước/sau V2; ảnh và GIF có nhãn native là screencap/screenrecord từ APK. Không có native baseline trước V2 và không thay bằng mock screenshot để báo hoàn thành.

Tài liệu chi tiết: [Research](MOTION_UX_V2_RESEARCH.md), [Design](MOTION_UX_V2_DESIGN.md), [Implementation](MOTION_UX_V2_IMPLEMENTATION.md), [Performance](MOTION_UX_V2_PERFORMANCE.md), [Accessibility](MOTION_UX_V2_ACCESSIBILITY.md), [Database Safety](MOTION_UX_V2_DATABASE_SAFETY.md), [Native QA](MOTION_UX_V2_NATIVE_QA.md). Dừng tại bàn giao V2; chỉ cài điện thoại khi người dùng yêu cầu tiếp.
