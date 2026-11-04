# Motion UX V2 — tương tác nhìn thấy rõ

Ngày bàn giao: 27/10/2026. Đây là phần tiếp theo của V2, so với source ngay trước vòng này, không so với Git HEAD. [Mở gallery trước/sau](../../4Chinese-Archive/motion-ux-v2-interactions/gallery.html).

## Đã thay đổi

| Tương tác | Trước → sau | Kích hoạt, thời gian và thao tác liên tiếp |
| --- | --- | --- |
| Tab chi tiết từ | Gạch chân đổi vị trí tức thời → một capsule jade trượt và co giãn giữa bốn tab | Chọn tab; 320 ms, scale X 1 → 1,12 → 1. Nội dung/selected đổi ngay; chạm tiếp dừng chuyển động cũ và đi tới tab mới. Đo lại khi đổi chiều rộng; giữ nguyên nội dung ghi chú. |
| Gợi ý ôn tập và các mục thu gọn Chinese | Nội dung bật/tắt → cùng thẻ nở/thu theo chiều cao thật, mũi tên xoay | Gợi ý: chỉ gọi handler `requestHint` cũ; 280 ms. Nội dung được đo khi mở, giữ tới hết lúc đóng rồi unmount; ẩn khỏi accessibility và tắt tương tác ngay khi đóng. Chạm liên tục hủy animation trước. |
| Biểu tượng đúng/sai | Stamp có nét hoàn chỉnh từ đầu → vẽ vòng trước rồi nét check hoặc hai nét cross, kèm nhún nhẹ | Đổi trạng thái đáp án; 360 ms, scale 0,85 → 1,06 → 1. Theo `turnKey`/đúng-sai hiện có; không tự phát lại khi focus hoặc chế độ motion đổi. Không chấm điểm hoặc chuyển câu trong callback. |

`Disclosure` hiện được dùng tại thống kê, củng cố trí nhớ, sổ lỗi, bộ từ, ngữ pháp và luyện thanh điệu Chinese; các vị trí này thừa hưởng chuyển động nở/thu. Feedback dùng lại component trong học/ôn; thông báo lưu ghi chú vẫn đặt `active={false}`. Không thêm nhân vật vào câu hỏi, không thay artwork hoặc viết lại các hiệu ứng đã có.

## Nguồn tham khảo và cách chuyển thể

- [UI Motion Loop Design — @flxrnc](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/flxrnc-251921.md): giữ cùng một đối tượng qua các trạng thái, stretch/spring và check draw-on → capsule tab, thẻ gợi ý và nét feedback. Áp dụng theo thao tác thật, không chạy vòng video 14 giây.
- [Animated Story — @N01ennn](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/n01ennn-597182.md): phản ứng có nguyên nhân → feedback theo trạng thái đáp án. Không sửa rig nhân vật trong phần tiếp theo này.

Đã đọc prompt và tài liệu repository; **chưa xem video nguồn**, không tuyên bố chuyển động khớp video. Chỉ tham khảo nguyên tắc; không sao chép code, video, artwork hay âm thanh, không thêm dependency/asset. Xem [nghiên cứu V2](MOTION_UX_V2_RESEARCH.md) về MIT của repository và giới hạn quyền đối với tác phẩm liên kết.

## Triển khai và giới hạn hiệu năng

Bốn file ứng dụng: `AnswerFeedbackIcon.tsx`, `Disclosure.tsx`, `review/session.tsx`, `word/[id].tsx`. Dùng `Animated` và SVG đã cài. Tab translate/scale và chevron chạy native driver. Chiều cao Disclosure và `strokeDashoffset` SVG dùng JS driver; chỉ animate nội dung mục đang mở/biểu tượng nhỏ, có comment `ponytail:` về giới hạn. Chưa đo hiệu năng trên máy thật.

Reduced/Off, mất focus, background và cleanup đưa UI về đúng trạng thái cuối; không giữ hàng đợi animation. Feedback kiểm tra thêm OS Reduced Motion trước khi phát nét. Giữ nhãn, role/selected/expanded, vùng chạm tối thiểu và chữ hiển thị ngay; animation không trì hoãn hành động học tập.

## Bằng chứng kiểm tra

Thư mục riêng: [motion-ux-v2-interactions](../../4Chinese-Archive/motion-ux-v2-interactions/).

| Kiểm tra | Kết quả và phạm vi |
| --- | --- |
| Typecheck | PASS — `typecheck-final.log` |
| Lint | 0 lỗi, 9 cảnh báo hiện có — `lint-final.log` |
| Unit/integration | 212 file, **1.165 test PASS** — `tests.log` |
| Hai harness giao diện | PASS — `qa-playful-final.log`, `qa-p4-final.log`. RN-web, DB/TTS/icon stubs; không phải bằng chứng native. |
| Lấy mẫu animation | Tab có vị trí/scale trung gian, hint có nhiều chiều cao trung gian, nét SVG thay đổi offset rồi về 0. JSON trong `qa-playful/` và `qa-p4/`. Kiểm rapid taps, reduced/off, focus, resize 320/360/390/430 và giữ ghi chú trong harness. |
| So sánh trước/sau | Sáu WEBM trong `comparison/`: cùng fixture và viewport 390×844. Bản trước nạp source từ `originals/` qua bundler trong bộ nhớ; không sửa lùi source trong repo. |
| Android standalone | APK `assembleRelease`, bundle nhúng, không Metro/Expo Go; API 36, x86_64, SwiftShader, AVD riêng `FourChineseMotionV2QA`. Đã mở chi tiết từ và ôn Hán tự → nghĩa; quay tab, hint, chọn sai và chọn đúng. MP4 trong `native-video/`; GIF trích từ frame runtime, lặp để quan sát. |
| Chữ lớn/màn nhỏ native | Ảnh `native-shots/word-320-font150.png`: tab Ghi chú ở 320 dp, font hệ thống 150%. Tab không cắt nhãn; chữ xuống dòng. Đã chụp trạng thái cuối khi tắt motion OS rồi khôi phục cấu hình QA. Không suy ra toàn app đã đạt kiểm thử chữ lớn. |
| Log native | Không có dòng lỗi trong bộ lọc AndroidRuntime/ReactNative của `native-errors.log` cho lần chạy này. |

[Contact sheet native](../../4Chinese-Archive/motion-ux-v2-interactions/native-contact-sheet.jpg), [manifest hình/GIF](../../4Chinese-Archive/motion-ux-v2-interactions/screenshot-manifest.json) và [thông tin APK](../../4Chinese-Archive/motion-ux-v2-interactions/apk-info.json). APK là **x86_64 dùng QA emulator**, ký bằng cấu hình debug signing hiện có, giữ version 0.1.52/code 54; không phải bản phát hành cho điện thoại ARM. Chữ ký v2 và ZIP integrity đã kiểm tra. Build lần đầu gặp lỗi công cụ với JDK 25; build lại bằng JDK 19 thành công, không đổi cấu hình dự án.

## Bảo toàn dữ liệu và source

[Đối chiếu source](../../4Chinese-Archive/motion-ux-v2-interactions/preservation.json): 1.045 file baseline, **519 file được bảo vệ không đổi**, không xóa file. Package/config/dependencies, Android source, artwork, DB/schema/migrations/corpus/SRS/stores/services/theme và English giữ nguyên. 28 khối callback/memo/effect có sẵn trong hai màn chỉnh UI được so sánh AST và không đổi. Đây là bằng chứng phạm vi cụ thể, không thay thế mọi kiểm tra nghiệp vụ.

[Đối chiếu fixture native](../../4Chinese-Archive/motion-ux-v2-interactions/database/interactions-comparison.json): schema/user_version của cả ba DB không đổi; mọi bảng trừ `daily_stats` giữ nguyên hash/nội dung. `user_vocabulary_progress`, lịch ôn, review log, notes/decks và English không đổi. Không bấm đánh giá/lưu kết quả hoặc chuyển câu để ghi grade.

**Ngoại lệ có giải thích trong DB thử nghiệm:** vào phiên ôn bằng UI kích hoạt bộ đếm thời gian sẵn có (`useStudySession`/`recordStudyTime`), tạo `daily_stats` ngày 27/10 với 126 giây, số reviewed/correct/new_words đều 0. Không phải callback animation ghi dữ liệu. Chỉ thao tác AVD chứa fixture tổng hợp; không truy cập DB người dùng hoặc cài điện thoại. Sau quay chỉ cài lại APK debug đã biết trên AVD để đọc snapshot bằng `run-as`, không khởi chạy bản debug đó.

APK release cũ giữ nguyên SHA-256 `54c253d6beb7f7878db81ad688239079cd38975d0ae1b7ccda9c9da74aeec91e`. Diff của vòng này lấy từ snapshot riêng: [motion-interactions-only.diff](../../4Chinese-Archive/motion-ux-v2-interactions/motion-interactions-only.diff), [change manifest](../../4Chinese-Archive/motion-ux-v2-interactions/change-manifest.json).

## Chưa xác minh

Chưa cài điện thoại, chưa kiểm tra iOS, TalkBack thực tế, nghe âm thanh hoặc FPS/bộ nhớ trên phần cứng thật. QA native tập trung ba tương tác mới, không chứng nhận lại mọi màn/chức năng V2. Video trước/sau là RN-web; video Android là bản sau trên emulator. Không trộn hai loại bằng chứng này.
