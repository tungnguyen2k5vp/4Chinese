# AI V1 — baseline 03/11/2026

Phạm vi nhận được kết thúc tại tiêu đề phần IX. Triển khai phần đã rõ; chưa coi đây là toàn bộ đặc tả AI V1.

- Workspace: `D:/ReactJS/HocTiengTrungApp`; Expo 57.0.27, RN 0.86.3, React 19.2.3, Expo Router 57.0.25, TypeScript 6, Supabase JS 2.117.2. Không nâng dependency.
- `git status --porcelain=v1 -uall` trước sửa có **279 entries**. Giữ toàn bộ thay đổi cũ; không reset/checkout/commit/push.
- Baseline ngoài repository: `D:/ReactJS/4Chinese-Archive/ai-v1-2026-11-03/baseline/git-status.txt` và `source-sha256.json`: **709 file** trong src/supabase/assets và cấu hình. Đây là manifest an toàn, không phải project phát triển thứ hai.
- **DATABASE_VERSION hiện tại là 47**, đọc trực tiếp `src/db/schema.ts:1`. Attachment nói V45, báo cáo 30/10 dùng phiên bản trước; không hạ/nâng version thực tế này.
- Không đọc/mở DB người học hay thiết bị thật. Không tự xác nhận số bảng/rows của DB hiện tại từ báo cáo cũ.
- Bảo vệ toàn bộ `src/db`, data/assets, SRS, backup, English, language/runtime, speaking/pronunciation cũ, package/lock/app config. AI preferences dùng kho cài đặt thiết bị riêng, không thêm SQLite table. Chat/ngữ cảnh chỉ trong RAM.
- Không inference live, không đọc secret server, không account/billing, không cloud deploy, không phát hành/cài APK.

Baseline test: kết quả máy đọc lưu trong thư mục baseline trên; kết quả cuối và phép so hash ghi trong `AI_V1_IMPLEMENTATION.md` sau kiểm thử.
