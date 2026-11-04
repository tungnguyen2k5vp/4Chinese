# Motion UX V2 — thiết kế

Giữ màu jade/lavender, artwork, typography, navigation và layout hiện tại. Chuyển động chỉ phản ánh state đã có; không giữ thao tác học để chờ animation.

| Tương tác | Trước → sau V2 | Timeline và trạng thái cuối | Thao tác liên tục / lifecycle |
| --- | --- | --- | --- |
| Nhân vật trang chủ | Focus trở lại có thể vẫy lại → trigger theo mood/tap | Wave/high-five 1.600 ms; nod 900 ms, giữ nguyên rig | Hủy timeline cũ; settle khi blur/background/unmount; không replay do focus hoặc đổi full/reduced |
| Mở kết quả | Tự chạy celebration → hình tĩnh với lời mời chạm | Chạm mới chạy celebration hiện có 1.600 ms; 20 mảnh + 2 vòng về opacity 0 | CTA dùng ngay; mở lại màn không tạo event hoàn thành; chạm lại là event chủ động |
| Hint ôn tập | Mount tức thì → reveal gọn | Fade + translateY 10→0, 180 ms | Key theo turn; theme rerender không replay; nội dung/logic dùng hint giữ nguyên |
| Feedback học/ôn | Pop/shake cả khối cùng stamp → reveal khối chữ, stamp tại điểm chính | Khối 200 ms; stamp 360 ms hiện có | MCQ giữ stamp trên option; icon trong khối tĩnh. Các dạng khác giữ stamp chính; không đợi animation để tiếp tục |
| Option ôn sai | Rung/chuyển động chồng → chỉ nhãn được chọn sai rung | Shake tối đa 5 px, 220 ms; check/cross theo answer state | Retarget state mới, không xếp hàng, không tự submit |
| Tabs chi tiết từ | Pressable tĩnh → MotionPressable hiện có | Press 100 ms, scale 0,98; reveal nội dung giữ nguyên | Selected state cập nhật ngay; không key/remount input ghi chú |
| Lưu ghi chú | Thông báo chữ → check/cross cùng reveal nhẹ | 180 ms sau kết quả handler; icon tĩnh | Lỗi hiển thị cross, giữ text và retry; thành công chỉ khi handler trả thông báo thành công |
| Thống kê kết quả | Reveal thiếu focus gate → active theo screen focus | 280 ms hiện có, opacity/translateY | Blur settle; focus lại không thay key nên không chạy lại |

Không thêm token khi những primitives hiện có đã đủ. Không đổi shared defaults: `LearningGuide.autoPlay` mặc định `true`; chỉ result truyền `false`. Lesson completion vẫn dựa vào `completeLesson` thành công; không sửa handler đó. Audio pulse vẫn dựa vào trạng thái TTS thật; không tạo waveform giả, không đổi tự phát/giọng đọc. Reader, Statistics/Profile/list không rewrite.

Reduced/Off/OS giữ toàn bộ nội dung, hình và dấu đúng/sai ở trạng thái tĩnh. Không tạo animation loop mới, haptic mới, global store hay persistence mới. Font lớn được kiểm tra bằng Android font scale thật; giới hạn kiểm tra ghi tại [Accessibility](MOTION_UX_V2_ACCESSIBILITY.md).
