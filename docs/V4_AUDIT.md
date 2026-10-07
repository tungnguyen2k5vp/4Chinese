# V4 audit — 2026-10-01

## Baseline đã ghi nhận trước V4

Expo 57/RN0.86/React19; SQLite local-first; năm bottom tab.
11.330 từ nội bộ;28 điểm ngữ pháp; 18 truyện; 50 bộ thủ; 4.196 dữ liệu nét trên 4.202 Hán tự cần dùng.
Baseline lint/TypeScript/92 files / 324 tests đạt. Không reset database, đổi IDs hoặc xóa user data.
Cloud manual sync thật hiện chỉ settings và deck metadata, không phải toàn bộ dữ liệu học.

## Sau lượt tiếp tục

111 files / 377 tests đạt; Android/web export đạt.
40 điểm ngữ pháp (12 đối chiếu mới),7 mini test / 28 câu, 14 bài viết/dịch và 7 đề nói tự luyện.
Schema 32–35 additive, legacy upgrade/rollback, bất biến snapshot, CAS, backup tương thích.
6 cặp dễ nhầm / 12 câu gốc, bảng so sánh và Sổ lỗi, không đổi SRS.
HSK hub ba mode; Home bốn shortcut + Luyện tập/Thư viện; không tạo bottom tab mới.
Browser Edge 11 smoke scenarios đạt; xem V4_WEB_SMOKE.json và ảnh trong docs.
Đã tái hiện lỗi OPFS lock khi hard-navigation; xử lý startup recovery + single-tab lease + bounded preflight.
Unit kiểm tra không tạo/ghi/xóa file và đóng handle kể cả partial failure; browser kiểm tra chuyển owner mà giữ attempts.

## Giới hạn kiểm chứng

Không có reference official đã nhập và xác minh; matched/missing/extra/level-conflict/coverage = unknown.
Nguồn nội dung mới CURATED/UNREVIEWED; tests cấu trúc không thay independent academic review.
Không có full mock usable hoặc validated readiness. Ngữ pháp 7–9 chưa có.
TTS vẫn là nguồn nghe chính; chưa có pack native/license thực.
Cloud full-sync, expanded roleplay, EPUB/PDF, contextual curriculum và nhiều đầu việc V4 còn thiếu.
Android export không phải APK; Gradle build thử APK riêng đạt, debug signing xác minh hợp lệ.
Chưa cài APK; native/AI/cloud production E2E chưa kiểm tra trong lượt này.

## Nguồn sự thật và báo cáo

Source + SQLite tests là nguồn cho chức năng; V4_CONTENT_COUNTS.json đếm nội dung từ source.
HSK_DATA_AUDIT.json chỉ audit lexical nội bộ khi thiếu reference.
V4_FINAL_REPORT.md trả lời20 câu nghiệm thu và V4_IMPLEMENTATION_STATUS.md ghi phần còn thiếu.
