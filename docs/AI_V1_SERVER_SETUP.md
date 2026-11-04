# AI V1 — cấu hình server cho vòng thử development

Backend `chinese-ai` đã deploy ngày 04/11/2026, giữ xác thực JWT và đã bật phiên khách. Runtime cuối lượt kiểm thử đang `DISABLED`; Gemini thật trả lỗi 503, chưa xác minh được câu trả lời thành công. Xem [kết quả cấu hình và kiểm thử](AI_BACKEND_2026-11-04.md). Không gửi API key qua chat, không đưa vào `EXPO_PUBLIC_*`, APK, SQLite, localStorage, Git hoặc báo cáo.

## 1. Điều kiện bật

1. Dùng backend Supabase/auth hiện tại; giữ `verify_jwt = true` cho `chinese-ai`. Phiên khách dùng Supabase Anonymous Auth với JWT thật, lưu riêng khỏi Cloud backup/sync. Không dùng anonymous bypass hoặc `--no-verify-jwt`.
2. Từ Dashboard của từng provider, xác minh tài khoản thực có free plan cho exact model, không billing/thanh toán/auto-recharge và vùng/độ tuổi/điều khoản phù hợp. Public docs và một key hợp lệ chưa đủ.
3. Chỉ thêm user ID của phiên Cloud hoặc phiên khách developer vào allowlist; không dùng email, không mở cho toàn bộ người học. Lấy mã phiên tại AI → Cài đặt → Kiểm tra cấu hình máy chủ. Backend xác thực ID này nhưng không chuyển ID/token tới model.
4. Đọc thông báo dữ liệu riêng của provider; Gemini unpaid có thể dùng nội dung để cải thiện sản phẩm. OpenRouter và OpenAI direct tiếp tục bị khóa.

Model và URL tài liệu lấy từ `supabase/functions/_shared/chinese-ai-registry.ts`. Không dùng alias `latest`, proxy đổi tên model, paid fallback, search/grounding/tools hoặc tên model từ client.

## 2. Biến môi trường

Mẫu an toàn: [`supabase/functions/chinese-ai/.env.example`](../supabase/functions/chinese-ai/.env.example). File mẫu không chứa key thật. Khi thử local, dùng file server-only nằm ngoài Git; khi đã được cho phép deploy, dùng Supabase server Secrets. Không sửa public Expo env để chứa provider key.

| Biến | Giá trị/hành vi |
|---|---|
| `AI_RUNTIME_MODE` | Mặc định `DISABLED`. Chỉ `DEVELOPMENT` được code hiện tại hỗ trợ. |
| `AI_BUDGET_MODE` | Bắt buộc `FREE_ONLY`. |
| `AI_ALLOW_PAID`, `AI_ALLOW_AUTO_BILLING` | Bắt buộc chuỗi `false`. |
| `AI_DEV_USER_IDS` | Danh sách user ID phiên Cloud/khách được phép thử, phân cách bằng dấu phẩy, tối đa 10. |
| `AI_ADMIN_USER_IDS` | Allowlist riêng cho sinh nội dung nháp, mặc định rỗng; ID phải đồng thời thuộc `AI_DEV_USER_IDS`. Tối đa 10, không dùng email hoặc cờ admin do client gửi. |
| `AI_FREE_VERIFICATIONS` | JSON array bằng chứng do operator tự xác minh, mặc định `[]`. |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | Chỉ đặt key của provider đã được xác minh; không đặt key còn lại nếu chưa dùng. `chinese-ai` nhận tên secret Gemini cũ `4Chinese_Key_Gemini` ở server; `GEMINI_API_KEY` ưu tiên khi cả hai có giá trị. |
| `AI_DEV_RPM` | Mặc định 4, cho phép 1–10. |
| `AI_DEV_DAILY_CAP` | Mặc định 20, cho phép 1–40. |
| `AI_DEV_SESSION_CAP` | Mặc định 8, cho phép 1–12; UI vẫn tối đa 8 câu trả lời/phiên. |

Supabase cung cấp `SUPABASE_URL` và `SUPABASE_ANON_KEY` phía Edge runtime để xác thực Cloud session. Function không cần service-role key để đọc/ghi dữ liệu học.

Mỗi record trong `AI_FREE_VERIFICATIONS` có cấu trúc sau. Placeholder cố ý không đủ điều kiện gọi; không đổi các boolean thành true trước khi kiểm tra thực tế.

```json
{
  "provider": "gemini",
  "model": "EXACT_MODEL_ID_FROM_REGISTRY",
  "checkedAt": "UTC_ISO_TIME_OF_ACTUAL_CHECK",
  "expiresAt": "UTC_ISO_TIME_WITHIN_7_DAYS",
  "freePlan": false,
  "billingDisabled": false,
  "regionAllowed": false,
  "termsAccepted": false,
  "dataPolicyReviewed": false,
  "adultAudience": false
}
```

Server kiểm tra từng lần gọi, kể cả failover. Evidence quá 7 ngày/hết hạn, registry docs quá 30 ngày, thiếu key, unknown pricing hoặc policy không phù hợp đều chặn. Chỉ cập nhật ngày kiểm tra registry sau khi đã đọc lại docs chính thức; không gia hạn bằng cách đổi ngày cho qua kiểm tra.

## 3. Thứ tự kiểm thử khi được phép kết nối backend

1. Khởi động local function bằng Supabase CLI có sẵn với file server env riêng; không chạy DB reset/migration. Không deploy nếu chưa được yêu cầu.
2. Dùng tài khoản developer QA và nội dung tổng hợp. Kiểm tra action `status`: `source=configuration`, `quotaRemaining=null`, `liveHealth=not-checked`. Status không chạy inference và không chứng minh provider đang khỏe.
3. Kiểm tra lỗi thiếu config, không nằm trong allowlist, chưa consent, LOCAL_ONLY/DISABLED trước khi cho gọi model. Chỉ thử inference khi bằng chứng miễn phí đã đầy đủ.
4. Duyệt đầu ra Trung–Việt: nghĩa riêng, pinyin/đa âm, cấu tạo và nhãn mnemonic, cấu trúc 不/没/了/过/把/被, câu sửa giữ ý, quiz đúng duy nhất và Reader chứa prompt injection. Thử cả hai hướng dịch, hint không lộ bản dịch đầy đủ, review chấp nhận cách dịch khác hợp lệ; câu đục lỗ phải là câu tiếng Trung, dạng kết hợp có hai loại, và đối chiếu độ khó HSK đã chọn. Thử thêm sửa câu Anh, Coach khi dữ liệu rỗng/ít, từ nhiều nghĩa, transcript tách cảnh và tổng kết chỉ lượt người học. Đánh giá phản hồi cho các nhóm người lớn khác nhau; unit mock không thay đánh giá này. Chi tiết hiện tại ở [AI_PHASES_P0_P3.md](AI_PHASES_P0_P3.md).
5. Trên APK QA sau khi được yêu cầu: kiểm tra keyboard, back/background/cancel, TalkBack, cỡ chữ lớn, dark/reduced-motion, 429/offline và đổi/thu hồi provider. Dùng dữ liệu QA hoặc bản sao được cho phép, không tiến độ thật.

Để tắt phía server: đặt `AI_RUNTIME_MODE=DISABLED`; trên app chọn “Tắt AI và thu hồi toàn bộ đồng ý”. Không thể thu hồi nội dung đã gửi khỏi provider bằng nút này.

Chưa đưa gateway ra production: limiter hiện ở RAM từng isolate. Cần durable limiter được phê duyệt, kiểm thử runtime/live và duyệt chất lượng trước khi mở rộng. Không thêm quota table vào SQLite/production database trong task này.

## 4. Contract và kiểm quyền P0–P3

`language` tùy chọn, mặc định tiếng Trung để tương thích client cũ. `language=en` chỉ cho `writing`, không context hoặc HSK; phản hồi không có examples/quiz/mnemonic. Không bật thêm provider cho tiếng Anh.

`coach` bắt buộc context `learner`: mục tiêu tối đa 300 ký tự, 1–60 phút, tối đa sáu từ và tám mục lỗi theo projection allowlist. UI chọn 5/10/15/20 phút. Chỉ có số lần sai/quên, không có đáp án cũ. `practice` và `memory` dùng được cùng context đã chọn. Không đọc dữ liệu học từ server hoặc ghi model memory vào database.

`conversation`/`speaking_review` bắt buộc context `conversation`, cảnh tối đa 150 ký tự, tối đa 12 lượt chữ mỗi lượt 500 ký tự. Review phải có lượt `user`. Client chỉ kèm tối đa ba cặp khi hội thoại, sáu cặp khi tổng kết và thuộc đúng cảnh; không gửi audio. Micro dùng STT ngoại tuyến đã cài, cần thử trên APK hỗ trợ; không gọi endpoint phát âm cũ thông qua gateway này.

Task `content` bị kiểm tra `AI_ADMIN_USER_IDS` trước provider dispatch; tài khoản chỉ thuộc development allowlist vẫn nhận `AI_ADMIN_REQUIRED`/403. `status.canEditContent` chỉ mô tả quyền cấu hình, không thay kiểm quyền từng request, free verification hoặc consent. Thử tài khoản thường, admin không thuộc development allowlist, thu hồi admin và request tự tạo từ bên ngoài UI. Không thêm quyền bằng SQLite/client flag.

Editor chỉ tạo tối đa ba câu nháp, sửa và tự duyệt rồi xuất JSON trong RAM. Không có publish/import endpoint. Kiểm đáp án trùng/rỗng, giữ nguồn lần sinh cũ, sửa làm mất dấu duyệt và lỗi/hủy giữ bài đang sửa. Trên APK QA kiểm thêm camera/OCR, micro/model `zh-CN`, back/background, bảng chia sẻ và khả năng cuộn/nhập liệu; web mock hoặc Hermes export không xác minh những phần này.

Lượt 04/11 bổ sung `practice_review`, bắt buộc context `practice` với 1–3 câu đã nộp: `question`, `choices`, `answerIndex`, `explanation`, `selectedIndex`. Mọi chỉ số phải nằm trong choices; không có ID/history của repository. Consent vẫn phải là `selected`. `practice` dùng context này để luyện tiếp. Đáp án tham khảo chưa kiểm chứng, prompt yêu cầu đối chiếu lại thay vì mặc định người học sai. Cần deploy cùng version client/contract khi được cho phép vì server cũ chưa nhận task/context mới.

Editor có preview làm bài không inference và xuất tệp `.json` thực sự sau khi tự duyệt. Native dùng cache/bảng chia sẻ; giữ cache cho ứng dụng nhận đọc xong, không ghi database. Chi tiết kiểm thử và phần còn cần xác minh tại [AI_FOLLOWUP_2026-11-04.md](AI_FOLLOWUP_2026-11-04.md).
