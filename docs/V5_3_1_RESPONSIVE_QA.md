# 4Chinese V5.3.1 — Responsive & accessibility QA

## Source safeguards

- `Screen` giới hạn content/header bằng `width: 100%` và `minWidth: 0`, giữ giới hạn chiều rộng web sẵn có.
- Speaking AI đặt `minWidth: 0` ở vùng hội thoại, composer, transcript và input để text có thể co-wrap; không ép `maxFontSizeMultiplier`.
- Sheet chi tiết lộ trình có chiều cao tối đa và ScrollView riêng; CTA vẫn nằm ngoài vùng cuộn.
- Bộ chip HSK ở HSK và Listening cuộn ngang, không bẻ thành hai hàng.
- Theme tiếp tục lấy token light/dark; entrance của `Screen` và các component motion dùng cơ chế reduced-motion hiện có.
- Dialog xóa ở Reader và hội thoại AI là modal trong app; dialog có nội dung cuộn, nhãn/nút rõ và nút xóa dùng variant danger.

## Ma trận xác nhận

| Kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| `npm run typecheck` | PASS | Toàn bộ app |
| `npm test` | PASS | 157 files / 863 tests |
| `npm run lint` | PASS | Exit 0, 0 lỗi; còn 5 warning import-order có từ baseline. Không kết luận từ lint rằng layout runtime không tràn. |
| Android bundle export | PASS | JS/Hermes bundle; không phải APK |
| Emulator native / ADB | NOT RUN | `adb` không có trong PATH; Android SDK env không được cấu hình |
| Capture bằng browser QA | NOT RUN | CUA thất bại khi tạo process do ACL `apply deny-read` |
| 360 dp / 412 dp | NOT RUN | Không có runtime capture hậu update |
| Android font scale 1.6–2.0 | NOT RUN | Cần emulator/device settings và capture lại |
| Theme tối + reduced motion | SOURCE-ONLY | Token/logic có sẵn; chưa chụp runtime |
| TalkBack / VoiceOver | NOT RUN | Không có session screen reader |
| Bản preview/release không có dev gear | NOT RUN | Chưa build/chạy profile `developmentClient:false` |
| Điện thoại vật lý | NOT CÀI | Theo yêu cầu giữ bước cài đặt lại sau |

Không dùng “typecheck/export pass” để suy ra mọi kích thước hoặc trợ năng đã đạt. Checklist capture cụ thể ở [V5_3_1_VISUAL_QA.md](V5_3_1_VISUAL_QA.md).
