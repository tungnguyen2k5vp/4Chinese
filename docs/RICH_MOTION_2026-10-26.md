# 4Chinese — tương tác học tập và nhân vật động

Ngày: 26/10/2026. Yêu cầu: thay cảnh 2D ít tương tác bằng chuyển động có ý nghĩa, giữ phong cách nhân vật 2D hiện đại, mềm mại; bảo toàn database và tiến độ học/ôn.

## Audit và lựa chọn

- Expo SDK 57.0.27, React Native 0.86.3, React 19.2.3, npm/package-lock, Expo Router. Đã đọc tài liệu SDK 57 đúng phiên bản và tài liệu SVG trước khi sửa.
- Giao diện dùng React Native styles và tokens sáng/tối trong `src/theme`, không có CSS DOM để nhập trực tiếp các component web. Đã có `MotionPressable`, `StudyTransition`, `FlashcardFlip`, `AnimatedProgressBar`, `PulseRing`, `AnimatedNumber` và audio state thật.
- Trang chủ/onboarding: điểm chào phù hợp cho nhân vật. Practice/Library: minh họa tĩnh theo ngữ cảnh. Chi tiết từ: placeholder cũ không có tương tác ghi nhớ. Học/ôn: đã có chuyển câu, lựa chọn, thanh tiến độ, nhập pinyin, gợi ý và loa; cần dấu phản hồi rõ ngay tại đáp án. Tổng kết/path: dùng kết quả và trạng thái mở khóa thật. Thống kê/hồ sơ/danh sách giữ các tương tác hiện có; không animate từng hàng danh sách lớn.
- Ưu tiên triển khai: (1) nhân vật nhiều lớp và ba phản ứng chạm, (2) thẻ ghi nhớ tại chi tiết từ, (3) dấu đúng/sai tại thẻ đáp án và feedback, (4) tăng nhịp ăn mừng và reveal số liệu thật. Không thêm luồng chấm điểm, XP, phần thưởng hoặc lịch ôn.

## Kết quả khảo sát 12 nguồn yêu cầu

Đã đọc component source, package/dependency và license khi tìm thấy, không chỉ README. Tám repo có bản source đã tải HTTP 200 lưu trong thư mục `research/`; `index.json` ghi URL, kích thước và trạng thái. Các trang catalog/asset được phân biệt với source thực, không coi việc đọc trang là đã xem animation demo/video.

| # | Nguồn | Bằng chứng đã đọc | Quyết định áp dụng |
| --- | --- | --- | --- |
| 1 | [React Bits repo](https://github.com/DavidHDev/react-bits) | `AnimatedContent.jsx`, `ClickSpark.jsx`, `TiltedCard.css`, package và `LICENSE.md` | Tham khảo reveal/burst hữu hạn. GSAP/DOM/canvas không phù hợp nhập thẳng vào native; license MIT kèm Commons Clause, không copy. |
| 2 | [reactbits.dev](https://reactbits.dev/) | Trang catalog/tài liệu component | Dùng làm bản đồ hiệu ứng; không coi ảnh/catalog là bằng chứng đã chạy demo. |
| 3 | [duolingo-clone](https://github.com/sanidhyy/duolingo-clone) | `app/lesson/card.tsx`, `quiz.tsx`, course card, package, MIT | Dấu chọn/đúng/sai gắn state thật; không lấy brand, nhân vật, điểm hay heart system. |
| 4 | [flashcard-learning](https://github.com/rapmons/flashcard-learning) | `FlashcardCard.tsx`, App/Dashboard, package Framer Motion | Tham khảo mặt thẻ. Không tìm thấy license; không copy. |
| 5 | [motion-primitives](https://github.com/ibelick/motion-primitives) | `animated-group`, `animated-number`, `morphing-dialog`, package và `LICENCE.md` MIT | Giữ nội dung/semantics và giá trị thật khi reveal; dùng primitive native hiện có. |
| 6 | [Magic UI](https://github.com/magicuidesign/magicui) | Source confetti, number-ticker, circular-progress, package, MIT | Pháo giấy hữu hạn tại hoàn thành, reveal thống kê thật. Không cài canvas-confetti. |
| 7 | [Motion](https://github.com/motiondivision/motion) | Ví dụ repeat-spring, sequence-spring, scroll-spring, package, MIT | Tham khảo nhịp tăng/giảm và settle; không thêm Motion cho app native. |
| 8 | [Rive community](https://rive.app/community/) | Chuyển sang marketplace; trang `My Avatar` của JcToon, CC BY, mô tả state machine/blink | Tách rig tay/đầu/mắt tự dựng; không nhúng hoặc chạy file Rive. |
| 9 | [Lottie language learning](https://lottiefiles.com/search?q=language%20learning) | Search không truy cập được; đọc trang Waving Character của LottieFiles và Lottie Simple License | Không tải/nhúng; giữ cùng một rig native có nhiều phản ứng. |
| 10 | [Lottie education](https://lottiefiles.com/search?q=education) | Search không truy cập được; đọc trang Joy in Education của Christian Abiel, Lottie Simple License | Trang công bố 11,8 MB dotLottie / 15,8 MB JSON; không chọn cho hình trang trí. Chưa chạy file/demo. |
| 11 | [AnimateKit UI](https://github.com/Chadi11/animatekit-ui) | CircularProgress, Aurora và `BouncePopButton.tsx`, package | Tham khảo pop ngắn; bỏ nền động liên tục. Không tìm thấy LICENSE, không copy. |
| 12 | [Flashcard-Quiz-App](https://github.com/sshnox/Flashcard-Quiz-App) | `Flashcard.jsx`, package, MIT | Mặt trước/sau rõ ràng; dùng `FlashcardFlip` đã có của app. |

Không thêm dependency, không đưa code/asset bên ngoài mới vào bundle. Nguồn và điều khoản chi tiết: [ASSET_CREDITS.md](../ASSET_CREDITS.md).

Khảo sát thêm asset cho các trạng thái: Rive `Loading to success and failure states` (khadsemayur, CC BY) cho loading/success/error và `Notification Animation` (VianMeno, CC BY) cho empty state. Chỉ đọc mô tả/metadata/license, chưa phát demo hoặc file runtime. App giữ spinner thật và thông điệp loading/error/retry/empty hiện có; check/cross và completion dùng SVG tự dựng. Không biến lỗi tải dữ liệu thành màn biểu diễn nhân vật.

## Những gì đã triển khai vào màn hình thật

| Màn hình / trigger | Chuyển động và thời lượng | Trạng thái và xử lý lặp |
| --- | --- | --- |
| Trang chủ/onboarding, mở màn hoặc chạm chào | Nhân vật nữ áo jade, sách lavender; tay vẫy, đầu nghiêng, hai lần chớp mắt, 1.600 ms | Chạm lần 1 chào, lần 2 gật đầu 900 ms, lần 3 đập tay 1.600 ms có tia sáng; chu kỳ tiếp tục. Hủy timeline cũ, không xếp hàng và không bật pháo hoa từ lời chào. |
| Hoàn thành học/ôn/bài học, hoặc chạm ăn mừng tại kết quả | Nhún người, tay vẫy, 20 mảnh pháo giấy xoay/tỏa/rơi và hai vòng nở, 1.600 ms | Chỉ mood hoàn thành nhận hiệu ứng. Mảnh/vòng về opacity 0; có thể chủ động chạm lại. Không tạo reward hoặc lưu dữ liệu. |
| Chi tiết từ không có ảnh thật, chạm/Enter | Thẻ lật Y với perspective 900, 320 ms; mặt trước chữ/pinyin, mặt sau nghĩa thật và câu ví dụ đầu nếu có | Một mặt được mount, không đảo chữ mặt sau. Đổi word reset thẻ; thao tác liên tiếp nhắm trạng thái mới nhất. Loa ngoài vùng lật, có play/stop theo audio state hiện có. |
| Học/ôn, nhận feedback | Dấu check/cross đóng dấu 360 ms, scale 0,45 → 1,18 → 0,96 → 1, xoay -18° → 4° → 0° | Đi theo `positiveFeedback` / `answerCorrect`; không gọi chấm/lưu/chuyển câu. Text phản hồi vẫn đủ nghĩa khi tắt motion. |
| Ôn trắc nghiệm, chọn thẻ | Dấu check trên đáp án đúng; cross trên lựa chọn sai, kết hợp pop/shake nhẹ sẵn có | Không lộ dấu trước khi chọn. Đổi đáp án cập nhật dấu theo state hiện tại; không lưu lượt ôn chỉ vì chạy animation. |
| Tổng kết ôn | Reveal số liệu thật bằng opacity/translateY, 280 ms | Không chế thêm XP, streak hay milestone. CTA vẫn thao tác ngay. |

Thanh tiến độ, press feedback, chuyển câu, audio pulse, lật thẻ ôn, disclosure, đường thanh điệu, thứ tự nét và path đã có được giữ lại. Không tự thêm thao tác đánh dấu khó/đã biết với quy tắc ghi mới; bookmark/rating/gợi ý hiện có giữ nghiệp vụ cũ. Không thêm drag/swipe bắt buộc, nên chạm và bàn phím vẫn là đường thao tác chính.

## Khả năng sử dụng và hiệu năng

- Chỉ animate transform/opacity với native driver cho phần mới. Một timeline mỗi nhân vật, không có idle loop, không tải animation từ mạng, không cài Lottie/Rive khi chưa có asset cần dùng.
- Chờ preference giảm chuyển động của OS trước khi nhân vật chạy. Chế độ `reduced`/`off` giữ hình và nội dung tĩnh; phản ứng chạm vẫn thay lời nhắn. Background/unmount dừng và settle; foreground không tự chạy lại nhân vật. Feedback và thẻ ghi nhớ settle khi mất focus.
- Dấu đúng/sai có hình và nội dung giải thích, không chỉ màu. Hình trang trí được ẩn khỏi accessibility tree; nút nhân vật/thẻ/loa có nhãn. Motion không delay thao tác, không giữ khóa lưu, không remount input ghi chú.
- Đây là kiểm tra cấu trúc và giao diện; chưa có số đo FPS, RAM, pin hoặc tốc độ trên điện thoại để tuyên bố cải thiện hiệu năng native.

## File thay đổi

- `src/components/visual/LearningGuide.tsx`: artwork/rig/tương tác hữu hạn.
- `src/components/ui/StudyTransition.tsx`: thêm effect stamp; `AnswerFeedbackIcon.tsx` mới dùng chung.
- `src/components/ui/FlashcardFlip.tsx`: prop `active` tùy chọn để settle theo focus.
- `src/app/word/[id].tsx`: thay placeholder bằng recall card; bỏ style placeholder không dùng.
- `src/app/learn/session.tsx`, `src/app/review/session.tsx`: thay/thêm icon phản hồi, không đổi handler nghiệp vụ.
- `src/app/review/result.tsx`: reveal thống kê.
- `scripts/qa-playful-ui.cjs`, `scripts/qa-motion-p4.cjs`: kiểm tra tương tác và bảo toàn state bằng fixture.
- `ASSET_CREDITS.md`, báo cáo này và `docs/MOTION_SYSTEM.md`: nguồn/bằng chứng/quy tắc cập nhật.

## Kiểm chứng

Bằng chứng được gom dưới `D:/ReactJS/4Chinese-Archive/rich-motion-2026-10-26/`, không tạo thêm thư mục rời ở workspace root.

| Kiểm tra đã chạy | Kết quả |
| --- | --- |
| `npm run typecheck` | Qua |
| `npm run lint` | 0 lỗi, 9 cảnh báo có sẵn ở các file ngoài phạm vi task |
| `npm test` | Lượt đầu 1.165/1.165 qua. Lượt chạy cùng Gradle có một timeout 30 giây ở kiểm tra source paths/shards nét chữ, không có assertion dữ liệu sai. |
| `npm test -- --maxWorkers=2` sau build | **212 file, 1.165/1.165 bài qua**, không đổi timeout hoặc mã test dữ liệu; log `tests-standalone.log` |
| `node scripts/qa-playful-ui.cjs` | Qua: đo arm/head/blink và stamp từ frame thực, ba phản ứng chạm, lật thẻ/audio/Enter/blur, pháo hoa hữu hạn, lifecycle/reduced/off/OS và layout |
| `node scripts/qa-motion-p4.cjs` | Qua: dấu đúng/sai trên option/feedback, chọn lại nhanh, blur, loa sau đáp án đúng, chống gửi lặp và lỗi lưu/thử lại bằng fixture |
| Gradle `:app:assembleRelease -PreactNativeArchitectures=arm64-v8a` | **BUILD SUCCESSFUL**, 4 phút 49 giây; không đổi cấu hình build |
| `apksigner verify --verbose` và kiểm tra ZIP | Qua chữ ký v2, có native library arm64-v8a và bundle Android nhúng |
| Hash so với worktree trước task | 1.014 file baseline: **1.004 không đổi, 10 sửa, 0 xóa**; thêm 3 file của task. **475 file được bảo vệ** gồm DB/services/data/stores/assets và cấu hình/dependency đã chụp không đổi. |
| So AST ở bốn màn học/ôn/kết quả/chi tiết từ | **46 khối handler/effect/memo/callback có sẵn không đổi**, ghi trong `behavior-preservation.json` |

Worktree đã có nhiều thay đổi từ trước. So sánh dùng snapshot trước task, không dùng Git HEAD; không reset các thay đổi cũ. `rich-motion-only.diff` chỉ chứa thay đổi của task này.

APK ứng viên: [4Chinese-rich-motion-0.1.52-arm64.apk](../../4Chinese-Archive/rich-motion-2026-10-26/4Chinese-rich-motion-0.1.52-arm64.apk), 96.980.070 byte (92,49 MiB), phiên bản **0.1.52 / code 54** giữ nguyên. SHA-256: `54c253d6beb7f7878db81ad688239079cd38975d0ae1b7ccda9c9da74aeec91e`. Đã build nhưng **chưa cài**; APK đầu ra có sẵn trước build được giữ tại `prior-app-release.apk`, không khẳng định nó khớp hoàn toàn với source baseline.

Xem [ảnh các màn hình](../../4Chinese-Archive/rich-motion-2026-10-26/preview.png) và [GIF chuyển động](../../4Chinese-Archive/rich-motion-2026-10-26/preview-motion.gif). GIF được ghép từ 18 frame animation thật của harness, phát lại để dễ xem, tốc độ gần đúng; app vẫn dùng timeline hữu hạn. Đây là bằng chứng RN-web với dữ liệu mẫu, chưa phải quay màn hình APK.

- `files-before.json` lưu hash trước task; `originals/` giữ file gốc để đối chiếu phần UI.
- `qa-playful/` có ảnh 320/390/430 px, sáng/tối, chữ 150% mô phỏng CSS và frame chuyển động thật của harness RN-web. Icon/TTS/DB là fixture, không phải bằng chứng thiết bị native.
- `qa-p4/` kiểm tra học/ôn ba lượt, loa sau đáp án đúng, lựa chọn đúng/sai, mất focus, lỗi lưu/thử lại và chống gửi hai lần; tất cả dùng DB/TTS mẫu.
- Không mở database người học, không kết nối/cài APK hoặc làm bài trên điện thoại trong task này.

Trước khi phát hành cần kiểm tra trên APK standalone: tap nhanh nhân vật/thẻ/đáp án, chuyển màn khi animation đang chạy, nền/quay lại, OS Remove animations, font-scale Android, TalkBack, safe area, tiếng TTS thật và frame pacing trên máy yếu. Các bước hoàn thành bài cần dùng dữ liệu thử riêng, tránh thay tiến độ thật. iOS chưa build/kiểm tra trong môi trường Windows này.
