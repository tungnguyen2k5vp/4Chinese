# Motion UX V2 — Android native QA

**ANDROID_NATIVE_VISUAL_QA = VERIFIED_WITH_LIMITATIONS.** Đã chạy thao tác thật trên APK debug native trong AVD riêng và có ảnh/video trực tiếp. Chưa phải release validation; một ca mở lại development client cuối phiên bị splash trắng, làm TalkBack chưa kiểm được. Không đánh dấu toàn bộ test matrix PASS.

## Môi trường và artifact

- AVD mới `FourChineseMotionV2QA`, serial `emulator-5582`, ADB server port 5047; Android 16/API 36, x86_64, WHPX, SwiftShader, headless/no-audio. Không dùng userdata AVD khác hoặc điện thoại vật lý.
- Native debug/development-client APK 0.1.52/code54; **không Expo Go**, cần Metro `http://10.0.2.2:8093`. Chưa có APK standalone V2 để bàn giao cài điện thoại.
- [APK test riêng](../../4Chinese-Archive/motion-ux-v2-2026-10-26/4Chinese-motion-ux-v2-debug-x86_64.apk): 127.394.230 bytes; SHA-256 `a1b676716f84f02cce45f3cf50e7d44692357b6a51dd086cb65d82d83e41dfc2`; chữ ký APK v2 xác minh thành công. `apk-info.json`, `apk-badging.log`, `apk-signature.log` ghi chi tiết.
- Build debug lần đầu lỗi CMake vì Windows thiếu tài nguyên; retry giới hạn workers/CMake parallelism thành công, log `build-debug-retry.log`. Không sửa Gradle/config source hoặc ghi đè release cũ.

Helper `native-qa.cjs` kiểm serial, QEMU và tên AVD trước mọi lệnh. Fixture, screenshots, recordings và snapshot DB nằm ngoài project trong [artifact V2](../../4Chinese-Archive/motion-ux-v2-2026-10-26/). Không có lệnh install/clear data trên điện thoại.

## Kết quả theo luồng

PASS dưới đây chỉ áp dụng các bước nêu cụ thể; PARTIAL nghĩa là đã có kết quả native nhưng một phần chỉ được kiểm trên web/source hoặc chưa đo.

| Luồng | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| Home greeting, tap 1/2/3 | PASS | Wave, nod, high-five; ảnh `home-390-light`, `character-tap`; ba video/GIF native, không chỉ dịch chuyển ảnh nguyên khối |
| Nhân vật rapid taps, background/resume | PARTIAL | 8 lần tap và Home/background/resume đã thực hiện, `home-after-resume`; web đo trigger/no replay/focus/cleanup. Chưa có native timestamp audit mọi điểm lifecycle |
| Thinking / encouragement trong câu hỏi | NOT_AVAILABLE | Không thêm nhân vật vào câu hỏi/feedback; tránh che nội dung hoặc trùng stamp. Không tạo ảnh giả cho hạng mục này |
| Word flip / flip back / rapid / đổi từ | PASS | `word-front`, `word-back`, `word-rapid-flips`, `word-change`, `word-flip.mp4`; 8 lần flip, đổi 书→人 |
| Native Enter | PASS | Helper yêu cầu đúng control đang focus trước khi gửi Enter; `word-enter-front` |
| Audio controls | PARTIAL | Đã chạm loa riêng ngoài flip và loa sau đáp án đúng. Web kiểm playback/stop/no autoplay; **chưa nghe âm thanh Mandarin thực tế** trên AVD no-audio |
| Review hint / sai / đổi đáp án / đúng | PASS | Fixture hai từ, ba lượt; `review-hint`, `review-wrong`, `review-correct`, `review-correct-actions`; video phản hồi sai native |
| Review save / result thật | PASS | Hoàn tất sáu lượt, review_log thêm đúng hai bản ghi; result 2/2 xử lý, 1 đạt, 50%, 4 phút 5 giây. Không đưa số fixture này thành tiến độ người dùng |
| Result celebration / re-entry / CTA | PARTIAL | Chạm celebration được quay native, `result-after-blur` có sau quay lại. Web kiểm không tự ăn mừng khi entry/focus, counter và CTA trong animation; native chưa đo riêng tất cả thời điểm này |
| Learn selection / sai / đúng / hoàn thành | PASS | Deck fixture một từ 好, chọn sai 号 rồi sửa 好, xác nhận ba lượt. `learn-selection`, `learn-incorrect`, `learn-correct`, `learn-progress`, `learn-result` |
| Notes tabs / save | PASS | Giữ nội dung note gốc rồi thêm suffix thử; `notes-saved`, tab selected và success label có trong native hierarchy. Chỉ notes + updated_at đổi |
| Save failure / retry / double submit | PARTIAL | Web fixtures kiểm có chủ đích, logs PASS; native hoàn tất save thật nhưng chưa fault-inject lỗi hoặc stress duplicate submit |
| Reduced / Off / OS reduced | PASS có phạm vi | Native settings, video nhân vật và hình tĩnh; không suy ra mọi màn đều được quay ở mọi mode |
| Home / Practice / Library / Path / Stats / Profile | PASS smoke | Có screenshots native; không rewrite các màn này. Timeline Statistics reveal chỉ đo trong web fixture |
| Width / theme / font | PASS có phạm vi | Word 320/360/390/430dp, Home 390 light và 430 dark; Word 320 font 130/150%, cả mặt sau. Không phải Cartesian matrix đầy đủ |
| Chinese→English→Chinese | PASS smoke | English Home/Vocabulary với card/deck fixture riêng, quay lại Chinese. English schema và dữ liệu không đổi sau thao tác Chinese |
| TalkBack | NOT_VERIFIED | Package có cài; ca smoke dừng trước khi bật service vì splash trắng khi mở lại dev client |
| Release / điện thoại / iOS / hiệu năng phần cứng | NOT_VERIFIED | Không cài điện thoại, chưa có standalone V2 hoặc benchmark release tương đương |

## Bằng chứng thị giác

[Gallery offline](../../4Chinese-Archive/motion-ux-v2-2026-10-26/gallery.html), [preview 12 ảnh](../../4Chinese-Archive/motion-ux-v2-2026-10-26/preview-native.png), [contact sheet 38 ảnh](../../4Chinese-Archive/motion-ux-v2-2026-10-26/contact-sheet.png) và `screenshot-manifest.json` gồm 23 mục coverage yêu cầu, trạng thái thiếu và nguồn từng ảnh.

Chín clip/GIF: wave, nod, high-five, reduced, off, OS reduced, flip, đáp án sai, celebration. Android `screenrecord` tạo MP4; frame được giải mã rồi tạo GIF. `native-frame-manifest.json` ghi kích thước nguồn và timestamp; GIF có thể lặp để xem lại nhưng animation trong app hữu hạn. Không dùng playback FPS của GIF làm benchmark runtime.

`native-character-pixel-check.json` đo thay đổi pixel tại vùng nhân vật, tách full wave/nod/high-five khỏi reduced/off trong các captures này; đây không phải phép đo jank/FPS. `before-web/` và `after-web/` là before/after source trên **RN-web fixture**, ghi rõ trong gallery. Không có APK native baseline V2 trước sửa để so video tương đương.

## Trở ngại và chất lượng bằng chứng

Trong các lần đầu cold start/đổi font, dev client đôi khi mở `Unmatched Route`; đã mở lại route sau khi bundle sẵn sàng. Đổi Android font scale recreate Activity nên các ảnh font lớn được chụp lại tại đúng Word Detail. Không đưa ảnh Unmatched Route vào gallery hợp lệ.

Cuối phiên, dev-client deep link rồi launcher retry đều còn splash trắng; wait timeout, hierarchy không có root đọc được. TalkBack **chưa được bật**, nên không thể kết luận nó gây lỗi. `talkback.log`, `metrics/talkback-startup-status.json`, `native-shots/talkback-startup-blocker.png` và `metrics/startup-filtered-logcat.txt` lưu chẩn đoán. Nguyên nhân chưa xác định; đây là blocker của ca accessibility/cold-start bổ sung, không xóa bỏ captures thành công trước đó và cũng không được gọi cold start PASS. Log lỗi native lọc theo tag trước đó rỗng không loại trừ lỗi khởi động này.

Một lượt automation cũ swipe khi Gboard còn mở đã nhập nhầm ký tự thay vì cuộn; thao tác đã đổi sang Escape đóng bàn phím và swipe trong vùng nội dung. Loop cũ không fail-fast không được dùng làm bằng chứng PASS. Kết quả học cuối được xác minh lại qua UI và DB fixture.

## Bảo toàn dữ liệu

`before-motion`→`after-motion`: ba DB giữ schema và toàn bộ table-row hashes. Học/ôn và lưu note chủ động chỉ thay dữ liệu fixture theo nghiệp vụ sẵn có; chi tiết trong [Database Safety](MOTION_UX_V2_DATABASE_SAFETY.md). Source giữ 519 file được bảo vệ và 46 block handler/effect/memo/callback; APK release cũ không đổi. Không dùng animation callback để chấm/lưu/chuyển câu.
