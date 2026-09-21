# Mã bộ từ 8 ký tự

1. Tạo một project miễn phí tại Supabase.
2. Mở **SQL Editor**, dán và chạy nội dung trong `supabase/shared-decks.sql`.
3. Vào **Project Settings → API**, lấy **Project URL** và `anon` / `publishable` key.
4. Sao chép `.env.example` thành `.env`, rồi điền hai giá trị đó.
5. Khởi động lại Metro bằng `npx expo start --clear`.

Sau đó nút **Chia sẻ bộ từ** tạo mã 8 ký tự như `K7M9X2QF`. Người nhận chỉ cần nhập đúng mã này vào **Thêm bộ từ của bạn bè**.

`anon` key được dùng trong ứng dụng di động và không phải service-role key. Không bao giờ đưa service-role key vào app hoặc file `.env` của người dùng. SQL đã khóa truy cập trực tiếp vào bảng; app chỉ có thể tạo hoặc lấy một bộ từ thông qua mã 8 ký tự.
