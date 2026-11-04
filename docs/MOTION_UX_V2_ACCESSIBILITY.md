# Motion UX V2 — accessibility

Phạm vi: Chinese UI, các primitives hiện có và Android emulator riêng. **Chưa chứng nhận accessibility toàn ứng dụng**. Bằng chứng nằm trong [artifact V2](../../4Chinese-Archive/motion-ux-v2-2026-10-26/); phân biệt source, RN-web fixture và APK native bên dưới.

| Hạng mục | Kết quả và bằng chứng | Giới hạn |
| --- | --- | --- |
| Chuyển động Đầy đủ / Giảm / Tắt | PASS có phạm vi: web assertions kiểm tra settled state và giữ nội dung; native có `home-reduced`, `home-off`, settings và video tương ứng | Không đo mọi animation ở mọi màn trên native |
| Giảm chuyển động hệ điều hành | Native đặt cả ba Android animation scales về 0, có ảnh/video `home-os-reduced`; hình và thao tác chạm vẫn tồn tại. Web kiểm tra media reduced-motion | Đây là Android emulator, chưa kiểm iOS hay từng OEM |
| Hình trang trí / nhân vật | Source: SVG/rig có `accessible={false}`, `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`; nút chạm bên ngoài có label riêng. Không announce từng frame | Chưa nghe TalkBack đọc thực tế |
| Label / role / selected | Source giữ role tab, label và `accessibilityState.selected`; native hierarchy ghi nhận tab Ghi chú được chọn sau lưu. Thẻ có label đổi theo mặt trước/sau, expanded state | Chưa audit thứ tự đọc toàn màn |
| Đúng/sai, success/error | Check/cross cùng nội dung chữ; không chỉ dựa vào màu. Thông báo ghi chú và feedback giữ live region polite. Native đã chụp đáp án sai/đúng và lưu note thành công | Fault injection lỗi lưu/retry kiểm bằng web fixture; native chưa gây lỗi lưu |
| Bàn phím / Enter | Native Tab đưa focus tới thẻ, Enter lật về mặt trước (`word-enter-front.png`); web kiểm Enter và audio control độc lập | Chưa kiểm mọi phím, switch access hoặc bàn phím Bluetooth |
| Font Android | Native Word Detail ở 320dp, font scale thật 1.3 và 1.5. Mặt trước/sau, tabs xuống dòng và cuộn còn đọc được; `word-320-font130`, `word-320-font150`, `word-320-font150-back` | Không phải toàn bộ tổ hợp màn × font × theme |
| Kích thước vùng chạm | Giữ primitives và layout hiện có; native UI automation chạm được thẻ, tabs, loa, hint, đáp án, lưu và celebration | Chưa có audit đo 48dp cho toàn bộ controls; không tuyên bố mọi target đều đạt |
| Khả năng đọc | Kiểm trực quan light/dark, Word 320/360/390/430dp. Không thay theme tokens, typography hay artwork | Chưa đo toàn bộ contrast ratio hoặc chế độ high contrast |
| TalkBack | **NOT_VERIFIED / startup blocker**; package `com.google.android.marvin.talkback` có cài | Chưa bật được TalkBack trong ca này; không có spoken/focus-navigation audit |

## Trở ngại TalkBack

Script `qa-native-talkback.cjs` dừng **trước bước bật service**: lần mở lại development client chỉ có splash trắng, không có UI root; chờ route timeout. Thử launcher lại cũng timeout khi chờ Development Build. Ảnh `native-shots/talkback-startup-blocker.png`, hierarchy rỗng và `talkback.log` lưu bằng chứng; `metrics/talkback-startup-status.json` ghi trạng thái thực. Nguyên nhân chưa xác định, không quy lỗi cho TalkBack hoặc V2 khi chưa có đối chứng native trước sửa.

Sau ca này, `enabled_accessibility_services=null`, `accessibility_enabled=0`; không có thay đổi accessibility settings cần khôi phục. AVD chạy headless/no-audio nên ngay cả khi bật service cũng chưa đủ xác minh phát âm/thông báo nghe được. Không dùng ảnh web hay presence của package làm bằng chứng TalkBack PASS.

## Phần cần xác minh trước phát hành

Chạy build standalone riêng ở môi trường Android khởi động ổn định; bật TalkBack và kiểm swipe order, activate, mặt thẻ ẩn khỏi cây đọc, selected tab, thông báo đúng/sai/lưu và focus khi chuyển câu. Thử font lớn tại Learn/Review/Result và kiểm vùng chạm/contrast. Chỉ dùng fixture riêng; không cần thực hiện bài học trên dữ liệu thật của người dùng. Đây là phần kiểm thử còn thiếu, chưa triển khai phase mới hay cài điện thoại.
