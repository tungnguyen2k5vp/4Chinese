# AI Tutor — phiên khách và backend, 04/11/2026

Đã deploy `chinese-ai` vào Supabase `xxuxvcqkojevqerrpsyo` và bổ sung phiên khách tự động cho APK 0.1.55 (57). Chưa xác minh được câu trả lời AI thật: hai lượt thử inference trả HTTP 503 / `AI_BUSY`, một lần thử lại sau đó bị timeout. Trạng thái server cuối cùng là `DISABLED`, allowlist và quyền biên tập rỗng. Chưa cài APK lên điện thoại.

## Đã thực hiện

- Bật Supabase Anonymous Auth, giới hạn tạo phiên khách ở cấu hình Auth là 10. Giữ `verify_jwt=true`; request vẫn cần JWT hợp lệ.
- App tự tạo và dùng lại phiên khách khi kiểm tra máy chủ hoặc gửi câu hỏi; không cần email/mật khẩu. Nếu đã có phiên Cloud hợp lệ thì dùng phiên đó.
- Phiên khách lưu riêng bằng SecureStore trên native, khóa `4chinese.ai.guest-session`. Không đăng nhập vào Cloud backup/sync và không tự đồng bộ dữ liệu học.
- Gộp các yêu cầu tạo phiên đồng thời; hủy/timeout bỏ kết quả auth đến muộn trước khi gửi nội dung AI. Bổ sung thông báo lỗi và mã phiên trong Cài đặt AI.
- Edge Function nhận secret sẵn có `4Chinese_Key_Gemini`; `GEMINI_API_KEY` ưu tiên nếu đã được đặt. Khóa provider chỉ ở server.
- Chỉ dùng `FREE_ONLY`, không paid fallback, không bật billing. User đã xác nhận dự án Gemini là “Free tier / Set up billing”. Không dùng gói Google AI Plus làm quyền API.

Chỉ hai trường remote Auth được thay đổi: `enable_anonymous_sign_ins` và `rate_limit.anonymous_users`. `config diff` sau cấu hình có `update:0`; các trường remote không khai báo được giữ nguyên. Không chạy migration hoặc sửa schema.

## Kết quả kiểm thử

| Phạm vi | Kết quả |
|---|---|
| Unit AI và Cloud | 99/99 bài, 10 tệp đạt; auth/client/handler/provider dùng fixture hoặc mock |
| TypeScript và ESLint các tệp sửa | Đạt |
| Endpoint public thật | Preflight 200; thiếu/sai JWT bị từ chối 401 |
| Phiên khách thật | Tạo không email/mật khẩu, JWT được xác thực, status trả đúng mã phiên |
| Guard thật | Chặn ngoài allowlist, thiếu consent, body thừa/quá lớn, quyền biên tập và thiếu bằng chứng free |
| Inference Gemini thật | Chưa đạt: hai lần HTTP 503 / `AI_BUSY`, lần thử lại timeout; đều chưa qua câu đầu |
| APK release | Build thành công; `aapt` xác nhận 0.1.55 (57), chữ ký v2 hợp lệ và trùng bản APK trước |
| Dọn QA | Đã xóa đúng tài khoản QA vừa tạo và khôi phục runtime `DISABLED` |

`AI_BUSY` là mã đã chuẩn hóa của gateway; không có raw provider error để kết luận nguyên nhân gốc hoặc xác nhận khóa Gemini hợp lệ. Chưa kiểm thử thành công ngữ pháp, sửa câu Anh và quiz với model thật vì script dừng khi câu đầu lỗi. Không lấy unit mock hoặc status cấu hình làm bằng chứng model đang hoạt động.

Chứng cứ ở `D:/ReactJS/4Chinese-Archive/ai-backend-2026-11-04/`: `tests-final.json`, `live-public-smoke.json`, `live-auth-smoke.json`, `live-model-smoke.json`, `live-guest-initial.json`, `live-guest-smoke.json`, `qa-auth-ledger.json`, `source-safety.json`, `apk-verification.json` và `build-release.log`. Có thể chạy lại kiểm tra source bằng `node D:/ReactJS/4Chinese-Archive/ai-backend-2026-11-04/verify-source.cjs`.

APK nội bộ: [4Chinese-0.1.55-57-ai-guest.apk](../../4Chinese-Archive/ai-backend-2026-11-04/4Chinese-0.1.55-57-ai-guest.apk), ký bằng khóa debug hiện có để tương thích bản cài thử trước; chưa phải bản phát hành Play Store.

## Dùng thử trên máy thật

1. Cài APK 0.1.55 (57) khi user yêu cầu. APK cũ 0.1.54 chưa có client phiên khách.
2. Vào AI → Cài đặt, chọn Gemini Free, đọc thông báo dữ liệu và chọn đồng ý phù hợp; bấm “Kiểm tra cấu hình máy chủ”. Thao tác này chỉ kiểm tra cấu hình, không gọi model.
3. Lấy mã phiên trong “Mở quyền dùng thử AI”. Operator thêm đúng mã này vào `AI_DEV_USER_IDS`, kiểm tra lại free verification và đặt `AI_RUNTIME_MODE=DEVELOPMENT` khi sẵn sàng thử.
4. Kiểm thử bằng câu tổng hợp: từ 学习, phân biệt 不/没, sửa “She go to school every day.” và quiz câu đục lỗ. Chỉ báo hoạt động khi nhận và duyệt được đáp án thật.
5. Kiểm tra mở lại app giữ mã phiên, Cloud backup vẫn chưa đăng nhập; hủy, back, offline, giới hạn và thu hồi consent. Chưa thực hiện QA native hoặc các bước làm bài này trong lượt hiện tại.

Bằng chứng miễn phí dùng cho QA hết hạn `2026-11-05T10:52:00.615Z`; không tự gia hạn hoặc bật server. Phiên khách mới không tự được cấp quyền inference. Limiter còn ở RAM từng isolate, vì vậy chỉ mở nhóm thử theo allowlist; cần limiter bền vững trước khi mở đại trà. Không thêm bảng quota vào database học trong lượt này. Tắt lại bằng `AI_RUNTIME_MODE=DISABLED`.

Source database, SQL, SRS và tiến độ không được sửa trong task này. QA chỉ dùng nội dung tổng hợp và tài khoản Auth tạm; không đọc/ghi dữ liệu học thật.

## Tài liệu chính thức

- [Supabase Anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Edge Function Auth](https://supabase.com/docs/guides/functions/auth)
- [Gemini pricing](https://aistudio.google.com/docs/pricing#gemini-3.8-flash), [điều khoản](https://aistudio.google.com/docs/terms), [Google AI plans](https://aistudio.google.com/docs/google-ai-plans)
- [Gemini generateContent](https://aistudio.google.com/api-reference/generate-content), [Gemini 3.8 Flash](https://aistudio.google.com/docs/models/gemini-3.8-flash)
