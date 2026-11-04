# 4Chinese — chạm, vuốt và khám phá

Ngày 27/10/2026. [Xem video trước/sau](../../4Chinese-Archive/motion-learning-interactions-2026-10-27/gallery.html). Vòng này bổ sung hành động trực tiếp, tiếp nối [Motion V2](MOTION_UX_V2_INTERACTIONS.md).

## Những gì đã thêm

| Vị trí | Tương tác mới | Hành vi và giới hạn |
| --- | --- | --- |
| Chi tiết từ → Tổng quan → Thẻ ghi nhớ | Kéo thẻ bám tay, nghiêng nhẹ, thả để lật | Nhận kéo ngang sau 12 dp, ưu tiên hướng ngang hơn dọc 1,5 lần. Dịch tối đa 64 dp, nghiêng ±5°. Thả vượt `min(80 dp, 25% chiều rộng)` mới đổi mặt; spring trả thẻ về giữa và flip hiện có 320 ms. Kéo ngắn không lật; không chấm điểm, đổi từ hoặc lưu đã nhớ. |
| Các nút loa Chinese | Giữ để nghe chậm | Giữ 400 ms → gọi bộ đọc sẵn có ở rate 0,6. Chạm vẫn nghe theo tốc độ cài đặt hoặc dừng khi đang phát. Thả sau giữ không phát lần hai. Không lưu rate mới, không bật âm thanh chung, vẫn giữ `allowWhenSoundDisabled` tại các vị trí đã cho phép. |
| Nút loa đang phát | Ba vạch chuyển động + nút dừng, huy hiệu “Chậm” | Chu kỳ 800 ms chỉ khi speech báo đang phát và màn có focus. Đây là chỉ báo trạng thái trang trí, **không phải phổ âm thanh đo được hoặc điểm phát âm**. Dừng animation khi background/unmount; reduced/off giữ vạch tĩnh. |
| Mẫu thứ tự nét Chinese | Chọn trực tiếp từng nét qua hình thu nhỏ có số | Chạm nét N → hiện tới nét N, tô nổi nét hiện tại, dừng auto-play. Dải cuộn ngang, mỗi mục tối thiểu 48×64 dp. Giữ các nút trước/sau/phát lại; không đổi corpus hoặc tạo medians/nét giả. |

Giữ chạm/Enter để lật, nhãn và trạng thái accessible. Khi Reduced/Off, vuốt vẫn đổi mặt nhưng bỏ nghiêng/trượt và flip settle ngay. Blur/background/đổi chiều rộng hủy kéo đang làm. Không thêm mascot hoặc làm lại artwork. Không thêm dependency, schema, cấu hình, version hay hệ thống phần thưởng.

## Source và cách kiểm tra

Bốn file ứng dụng thay đổi: `word/[id].tsx`, `AudioButton.tsx`, `StrokeWriter.tsx`, `ui/MotionPressable.tsx`. `MotionPressable` chỉ thêm callback `onPressIn` tùy chọn để phân biệt kéo với chạm; các caller khác giữ mặc định cũ. `FlashcardFlip` dùng chung với English không đổi. Các thành phần Chinese khác dùng lại nút loa và mẫu nét nên nhận tương tác mới.

`PanResponder` là API native có sẵn, chỉ gắn ở thẻ chi tiết từ. Di chuyển theo tay dùng cập nhật JS, spring/rotate và vạch phát âm dùng native driver. Comment `ponytail:` chỉ rõ phạm vi. Một ngoại lệ lint có giải thích ngay tại `PanResponder.create`: hàm này lưu callback, refs chỉ được đọc trong sự kiện gesture, không đọc trong render. Không tắt kiểm tra toàn file.

Tiếp tục nguyên tắc đối tượng chuyển trạng thái liên tục và phản hồi theo hành động từ [UI Motion Loop Design](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/flxrnc-251921.md). Đã tham khảo văn bản, chưa xem video nguồn. Đây là thiết kế riêng phù hợp luồng học; không sao chép code/video/asset bên ngoài. Dùng skill `agency-mobile-ui-ux-engineer` cho vùng chạm, phương án chạm thay thế và chữ lớn; không tuyên bố đạt hiệu năng phần cứng từ cách viết code.

## Kết quả kiểm tra

- Typecheck PASS; lint 0 lỗi / 9 cảnh báo có sẵn.
- 212 file / **1.165 test PASS**. Test shim `StrokeWriter.test.ts` chỉ bổ sung ScrollView tương ứng UI mới.
- Hai harness giao diện PASS: `scripts/qa-playful-ui.cjs`, `scripts/qa-motion-p4.cjs`. Có thêm kiểm tra kéo ngắn/dài/hai hướng, blur giữa kéo, reduced/off, giữ loa phát một lần ở rate 0,6 và không lật thẻ, chọn nét bất kỳ dừng auto-play và không ghi dữ liệu. Bằng chứng harness là RN-web, TTS/DB giả lập; không thay bằng chứng Android.
- Sáu WEBM trước/sau trong `comparison/`, cùng viewport 390×844. Nạp source trước từ snapshot qua bundler trong bộ nhớ, không khôi phục lùi source dự án. Video phát âm chỉ kiểm tra giao diện/callback; không có bản thu âm TTS thật trong harness.

[Thư mục bằng chứng](../../4Chinese-Archive/motion-learning-interactions-2026-10-27/) chứa log cuối, APK QA, video native, screenshot manifest và [diff riêng](../../4Chinese-Archive/motion-learning-interactions-2026-10-27/motion-interactions-only.diff).

## Bảo toàn dữ liệu

Baseline mới gồm 1.046 file, khớp bản bàn giao ngay trước vòng này. [Đối chiếu source](../../4Chinese-Archive/motion-learning-interactions-2026-10-27/preservation.json): **519 file được bảo vệ không đổi**, không xóa file; 6 khối callback/memo/effect sẵn có của màn chi tiết từ không đổi. Màn học/ôn và toàn bộ code DB/SRS/chấm điểm/lưu kết quả không chỉnh sửa. Dependency/config/Android source/assets và các màn English giữ nguyên.

Chỉ dùng AVD tổng hợp `FourChineseMotionV2QA`, guard QEMU/name/serial trước mỗi thao tác; không truy cập database người dùng hay cài điện thoại. Chụp DB fixture trước/sau bằng bản debug đã biết, không chạy bản debug sau khi cài lại để đọc snapshot. [Đối chiếu DB](../../4Chinese-Archive/motion-learning-interactions-2026-10-27/database/interactions-comparison.json) ghi kết quả thực tế; không coi dữ liệu giả lập là tiến độ người dùng.

## Phạm vi native và phần chưa xác minh

Chi tiết native được ghi tại [native QA](../../4Chinese-Archive/motion-learning-interactions-2026-10-27/native-qa-summary.json). APK standalone x86_64 có bundle nhúng, không cần Metro/Expo Go; chỉ dùng emulator, giữ 0.1.52/code 54 và cấu hình ký debug hiện có. Không ghi đè APK release cũ.

Đã chạy vuốt ngắn 35 dp (giữ mặt trước), vuốt dài 110 dp (sang mặt sau), chọn nét 2 của 书 (hiện 2/4), giữ loa của từ và câu ví dụ. Frame native của câu ví dụ xác nhận vạch đang phát và huy hiệu “Chậm”. Có 5 MP4 từ screenrecord; không có video native bản trước. Bộ lọc log AndroidRuntime/ReactNative không có dòng lỗi trong lần chạy. Cả ba DB fixture **không đổi schema, user_version hoặc nội dung bất kỳ bảng nào**; native QA ở chi tiết từ, không vào phiên ôn hay lưu ghi chú/grade.

Chưa kiểm tra điện thoại vật lý, iOS, TalkBack/VoiceOver hoặc FPS/bộ nhớ trên phần cứng thật. Chất lượng nghe chậm phụ thuộc giọng Mandarin của hệ điều hành; thiếu giọng vẫn dùng thông báo lỗi hiện có. Không chứng nhận mọi màn toàn app từ các thao tác native tập trung trong vòng này.
