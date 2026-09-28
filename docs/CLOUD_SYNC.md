# Cloud — trạng thái thật

Hiện có đăng nhập email/password, lưu session native bằng SecureStore và sao lưu ZIP chủ động lên/xuống/xóa. SQLite vẫn hoạt động độc lập khi cloud lỗi. SQL bucket private/RLS nằm trong `supabase/cloud-backups.sql`.

**Chưa triển khai Cloud Sync tự động**: chưa có outbox, pull cursor, retry/backoff, merge thống kê/lịch sử, conflict resolver hoặc delete account. SQL chưa được xác minh deploy và chưa có test hai tài khoản trên backend thật. Không gọi backup ZIP thủ công là đồng bộ hai chiều.

Kế hoạch tiếp: outbox trong transaction cùng local writes; soft-delete và version cho entity syncable; namespace theo authenticated user; idempotency khi gửi lại; cập nhật mới nhất thắng với entity mutable, merge history theo event ID. Cần kiểm tra account-switch để không gửi dữ liệu của tài khoản trước sang tài khoản mới; local source không bị xóa khi sign out/offline.

Mọi deployment/policy/backend destructive action cần xác định đúng project và quyền truy cập. Không đưa service-role/OpenAI secret vào APK hay source client.
