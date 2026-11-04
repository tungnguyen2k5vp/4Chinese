# Motion UX V2 — nghiên cứu

Ngày 26/10/2026. Baseline là source sau rich-motion, được chụp mới vào `../4Chinese-Archive/motion-ux-v2-2026-10-26/`, không dùng Git HEAD hoặc snapshot V1 để khôi phục source.

## Nguồn đã đọc

Repository [yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos): README, LICENSE, metadata video và ba prompt bên dưới. Bản đọc được lưu tại [research](../../4Chinese-Archive/motion-ux-v2-2026-10-26/research/). Đây là bộ sưu tập prompt/video, không phải thư viện React Native. **Chưa chạy demo hoặc xem video của repository**; nhận xét chỉ dựa trên văn bản/source metadata đã đọc.

| Nguồn / tác giả | Ý tưởng | Màn hình phù hợp | Chuyển thể / quyết định |
| --- | --- | --- | --- |
| [UI Motion Loop Design](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/flxrnc-251921.md), @flxrnc | Giữ cùng đối tượng khi đổi trạng thái; nhịp có đầu/cuối; kiểm tra quanh điểm chuyển | Đáp án, hint, tabs, lưu ghi chú | Dùng `MotionPressable`/`StudyTransition` sẵn có; reveal 180–200 ms, stamp tại option, không pop cả khối chữ. Kiểm tra rapid taps và thay trạng thái. Không nhập loop video 14 giây. |
| [Animated Story](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/n01ennn-597182.md), @N01ennn | Phản ứng nhân vật phải có nguyên nhân/ngữ cảnh | Trang chủ, màn kết quả | Giữ rig hiện có; consume trigger mood/tap, không replay khi chỉ focus/rerender; kết quả chỉ ăn mừng khi chạm. Không thêm nhân vật vào câu hỏi. |
| [Interactive Zen Garden](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/arixxbt-292438.md), @arixxbt | Tương tác trực tiếp trong cảnh 3D | Không chọn | Heightmap/grid, nhiều lá và cảnh WebGL không giúp nhận biết chữ Hán; không mang canvas/Three.js/shader vào native. |

LICENSE của repository: MIT, copyright 2026 yihui-dev. V2 chỉ tham khảo nguyên tắc; **không sao chép code, prompt code, video, artwork, nhân vật hoặc âm thanh**, không thêm asset ngoài. Giấy phép repo không tự chứng minh quyền phân phối mọi tác phẩm/video được liên kết. Giữ nguyên artwork 4Chinese và các ghi công trước trong [ASSET_CREDITS](../ASSET_CREDITS.md).

## Audit baseline và phạm vi

Đã có wave/nod/high-five, blink, celebration 1.600 ms, flip 320 ms, stamp 360 ms, progress, audio pulse, reveal và reduced/off. Không triển khai lại. Các thiếu sót xác định từ source/QA: nhân vật replay khi focus đổi; mở lại result cũng tự ăn mừng; pop/stamp/feedback trên cùng đáp án gây chồng; hint hiện đột ngột; tab chi tiết từ chưa dùng press primitive; thông báo lưu chưa có phân biệt thị giác rõ.

Giữ Reader với native Modal và selected state hiện có; thêm wrapper animation sẽ chồng transition. Giữ flashcard/audio/progress sau kiểm tra hồi quy. Focus/thinking/encouragement bằng mascot trong câu hỏi là tùy chọn của đề bài: không thêm vì làm vùng học chữ rối hơn. [Thiết kế](MOTION_UX_V2_DESIGN.md) và [bằng chứng QA](MOTION_UX_V2_NATIVE_QA.md) tách source, web fixture và native runtime.
