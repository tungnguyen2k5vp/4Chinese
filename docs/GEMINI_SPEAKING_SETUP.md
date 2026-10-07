# Luyện hội thoại Gemini

Màn hình trong app gọi Supabase Edge Function `gemini-conversation`; Gemini API key không được đặt trong app, Expo config, `.env` phía client hay Git.

## Cấu hình production

1. Thu hồi khóa Gemini từng được gửi trong cuộc trò chuyện và tạo khóa mới trong Google AI Studio. Không gửi khóa mới qua chat hoặc commit vào repo.
2. Trong Supabase Dashboard của dự án, mở **Edge Functions → Secrets** và thêm `GEMINI_API_KEY` với khóa mới làm giá trị. Có thể thêm `GEMINI_MODEL` nếu muốn chọn model khác; mặc định hiện là `gemini-3.8-flash`.
3. Cài Supabase CLI, đăng nhập, liên kết repository với đúng project ref, rồi triển khai:

   ```powershell
   supabase login
   supabase link --project-ref <PROJECT_REF>
   supabase functions deploy gemini-conversation --project-ref <PROJECT_REF>
   ```

   `supabase/config.toml` giữ `verify_jwt = true`. Không tắt xác thực khi deploy.

4. Cấu hình app với URL và public/anon key của cùng Supabase project qua các biến Expo hiện có (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Người dùng cần đăng nhập Cloud trong app.
5. Dùng development/native build trên điện thoại để thử micro. Nếu dịch vụ nhận dạng giọng nói trên máy không khả dụng, có thể nhập câu tiếng Trung bằng bàn phím. Có thể thử kiểm tra kết nối text trước khi cấp quyền micro.

## Dữ liệu được gửi

Nhận dạng giọng nói chạy qua dịch vụ Android/iOS có sẵn trên thiết bị và có thể phụ thuộc mạng/cài đặt quyền riêng tư của hệ điều hành. App gửi transcript văn bản, cấp HSK, chủ đề và tối đa 12 lượt hội thoại gần nhất tới Edge Function; function mới gọi Gemini. App không gửi tệp ghi âm lên Gemini. Hội thoại chỉ giữ trong trạng thái màn hình hiện tại, không tự lưu vào kho từ hay lịch sử cá nhân.

Nếu API trả về 401/403, kiểm tra đăng nhập, quyền truy cập Gemini và secret ở Supabase. Lỗi 429 có thể là hạn mức Gemini hoặc giới hạn gọi function. Giới hạn request trong mã hiện là best-effort theo từng isolate; để triển khai nhiều instance với ngân sách nghiêm ngặt, cần rate limit dùng chung phía máy chủ.
