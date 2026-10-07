# V4 information architecture

Giữ năm tab: Trang chủ, HSK, Kho từ, Thống kê, Tài khoản.
Không xóa hoặc đổi tên destination các công cụ đang có.

| Khu | Vai trò | Lối vào |
| --- | --- | --- |
| Home | Tiếp tục học, ôn đến hạn, phiên ngắn, daily plan | Tab Trang chủ |
| Luyện tập | Ôn/SRS, nghe/nói, viết/ngữ pháp, lỗi và bài luyện | Home → Luyện tập |
| Thư viện | Truyện, Reader/TXT/OCR, bộ riêng, kho từ và ngữ pháp tham khảo | Home → Thư viện |
| HSK | Học / Ôn thi / Syllabus | Tab HSK |
| Exam center | Mini test, lịch sử/resume, viết/dịch/nói, readiness | HSK Ôn thi hoặc Luyện tập |

Home hiện có 4 shortcut: Bộ từ riêng, Học từ mới, HSK, Lộ trình; 2 hub thay việc mở 8 tool buttons.
Dữ liệu từ vựng/decks/SRS và luồng học bộ tự tạo giữ nguyên.
ToolHub dùng router.push để back trở lại hub, không replace làm mất ngữ cảnh.

UI dùng semantic theme tokens, nút≥48px, text wrap, title/hint và chevron.
Exam yên tĩnh, không thêm confetti/mascot/XP popup khi trả lời.
Modal confirm native/web và ARIA selected/checked/disabled cho điều khiển mới.
Browser smoke: hub/back,360pxdark/reducedmotion,offline navigation đạt.
Chưa có native large-font/TalkBack/VoiceOver verification.

Còn thiếu global search, onboarding goals/exam date/plan và exam-goal Home personalization.
Không coi việc thêm hub là hoàn tất tất cả UX/accessibility yêu cầu.
