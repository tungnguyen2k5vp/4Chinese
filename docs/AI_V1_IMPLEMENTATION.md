# AI V1 — phiên triển khai đầu, 03/11/2026

Kết quả mới nhất ở [AI_FOLLOWUP_2026-11-04.md](AI_FOLLOWUP_2026-11-04.md); các lượt trung gian ở [AI_PHASES_P0_P3.md](AI_PHASES_P0_P3.md) và [AI_V1_COMPLETION.md](AI_V1_COMPLETION.md). Báo cáo dưới đây ghi nhận phiên triển khai đầu. Phạm vi Chinese-only/English guard và những chức năng chưa mở rộng được mô tả bên dưới là lịch sử; hiện đã có sửa câu Anh, Study Coach, hội thoại/transcript, camera/OCR và editor nháp có kiểm quyền.

Đã triển khai trong repository 4Chinese hiện tại. Attachment kết thúc ở tiêu đề phần IX; báo cáo này không coi nội dung chưa nhận là đã hoàn thành. Backend chưa được cấu hình/deploy, chưa gọi model thật, chưa build hoặc cài APK.

## Những gì có trong source

| Khu vực | Hành vi |
|---|---|
| Chinese Home / Cài đặt | Entry AI nhỏ, hai route `/ai` và `/ai/settings`, không thêm bottom tab. English có guard và không có entry mới. |
| Tutor | Soạn câu, câu hỏi gợi ý, hỏi đáp/sửa câu/luyện nháp, trạng thái chờ/dừng/lỗi/thử lại; tối đa 8 câu trả lời/phiên. Hội thoại chỉ ở RAM. |
| Dictionary | Đọc local qua repository hiện có. Từ đa nghĩa phải chọn đúng một nghĩa; giữ riêng các dòng nghĩa trong cùng một record, không đoán cách tách từ dấu phẩy. Không gửi vocabulary/sense ID. |
| Hanzi Memory | Lấy cấu tạo từ source local đã có; thiếu thì ghi thiếu. Nội dung AI có nhãn “Mẹo liên tưởng do AI tạo — không phải từ nguyên học”. |
| Ngữ pháp / Confusables | Gửi cấu trúc, giải thích và ví dụ đang xem hoặc các từ của cặp so sánh; chỉ sau khi người học chọn gửi. |
| Sổ lỗi / Memory Coach | Chỉ summary theo kỹ năng, số mục và số lần sai của nhóm đang xem; không gửi danh sách lịch sử hay tự giải quyết lỗi. |
| Reader | Chọn/sửa đoạn tối đa 1.200 ký tự trước khi gửi; không kèm tên tài liệu, tài liệu khác, ghi âm hoặc toàn bộ thư viện. |
| Kết quả | JSON có giới hạn cho giải thích, ví dụ/loa TTS hiện có, sửa câu, mnemonic và tối đa 3 câu trắc nghiệm. Quiz ở trong phiên, không ghi XP/SRS/kết quả bài học. |
| Lưu mẹo | Chỉ xuất hiện khi câu trả lời gắn đúng ngữ cảnh chữ/từ của request. Có preview và xác nhận; gọi `saveMemoryMnemonic` hiện có, không tạo bảng. Thao tác này chưa được thực hiện trên dữ liệu người học. |

Ngữ cảnh và lịch sử mặc định không được gửi. Cho phép “ngữ cảnh đã chọn” trong Settings vẫn cần bật riêng ở màn hỏi; history là một lựa chọn khác, chỉ tối đa 3 cặp hỏi đáp gần nhất. Quick action chỉ điền câu hỏi, không gọi API.

Đổi provider/quyền hoặc thu hồi đồng ý sẽ tạo phiên mới, bỏ lịch sử cũ và hủy request hiện tại. Chuyển màn hình/background cũng hủy; kết quả đến muộn bị bỏ. AI preferences dùng SecureStore trên native và kho cài đặt riêng trên web, không dùng SQLite.

## Gateway và repo tham khảo

Luồng: **Chinese UI → Supabase `chinese-ai` xác thực Cloud hiện có → policy/registry → một provider**. JWT dừng tại Supabase; provider chỉ nhận prompt/ngữ cảnh hữu hạn. Không gửi SQL/tools/actions để AI điều khiển app.

Từ [free-claude-code](https://github.com/Alishahryar1/free-claude-code), áp dụng ý tưởng registry tập trung, adapter, phân loại lỗi và failover có giới hạn. Không sao chép mã AGPL, không cài/chạy proxy, không giả tên model thành Claude. Commit khảo sát và nhận xét nằm trong [source audit](AI_V1_SOURCE_AUDIT.md).

| Provider | Adapter/policy hiện tại |
|---|---|
| Gemini | Exact `gemini-3.8-flash`, structured JSON native; chỉ đủ điều kiện khi account/model/free plan/billing/vùng/điều khoản được operator xác minh. |
| Groq | Exact `openai/gpt-oss-120b` trên Groq, structured JSON strict; free plan phải được xác minh riêng. Đây không phải OpenAI direct. |
| OpenRouter | Có nhánh transport nhưng registry/UI khóa; chưa xác minh underlying endpoint và chính sách dữ liệu. Không có đường chọn model tùy ý. |
| OpenAI direct | Bị chặn, không có model hoặc zero-cost entitlement được đăng ký. Không tuyên bố đã tích hợp để dùng. |
| Mock | Fetch giả lập trong test và browser QA, không phải một provider có thể bật trong app phát hành. |

Mặc định `DISABLED`; `LOCAL_ONLY` dùng chức năng offline hiện có, chưa có model local. Cả hai chế độ chặn inference và kiểm tra cấu hình trước khi hỏi Cloud auth.

Server bắt buộc `FREE_ONLY`, paid/auto-billing đều false; evidence đúng exact model, còn hạn tối đa 7 ngày, tài liệu registry được kiểm tra trong 30 ngày. Thiếu key/cấu hình trả `AI_BACKEND_NOT_CONFIGURED`; thiếu/hết hạn bằng chứng miễn phí thì block. Public pricing không chứng minh entitlement của tài khoản cụ thể.

Chỉ cho allowlisted development vì chưa có durable limiter phù hợp. Có giới hạn user/session/task/provider/model/ngày/RPM, giới hạn body/output, một request đang chạy và timeout 15 giây/provider; client timeout 40 giây. Reservation lỗi không được hoàn lại. Các counter trong RAM có thể reset hoặc khác nhau giữa isolate, không phải bảo vệ production hay quota còn lại của provider.

Auto chỉ chuyển tuần tự tối đa một provider dự phòng miễn phí đã được đồng ý; không fan-out, không retry lỗi auth/input, không fallback trả phí. Config check không gọi model; status luôn phân biệt cấu hình với live health và để quota chưa biết là `null`.

Structured response được buffer rồi validate trước khi hiển thị; chưa stream từng token. Không cài thư viện mới, không thêm migrations, logging table, chat database hoặc vector database.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| TypeScript | `npm run typecheck` đạt. |
| ESLint | `npm run lint`: 0 errors; 8 warnings ở file ngoài phần AI, không tự sửa. |
| Unit/contract | 45 test AI mới đạt: 29 server, 16 client/context/preferences. Bao gồm free policy, keys/auth, consent, payload allowlist, output/schema, prompt injection, 429, failover, hủy/timeout/late output và limiter. |
| Toàn bộ suite | 225 file, 1.251 test: 1.249 đạt, 2 lỗi trùng baseline. `hsk30.test.ts` và `v5-sense-schema.test.ts` mong version 46, source thực tế 47. Không sửa test/schema này trong task AI. |
| Web export | Đạt. Bundle `entry-0dff9271d038b29f9537ed1c7e8afa16.js`. |
| Android Hermes export | Đạt. Bundle `entry-34222435ce3c3e6a012e13a362f9b24c.hbc`; đây là bundle, không phải APK hoặc kiểm thử native runtime. |
| Browser UI | Context cô lập `4chinese-ai-v1-qa`, database QA mới; mạng ngoài bị chặn, auth/backend được mock. Không chạm dữ liệu học thực. |

Browser đã kiểm tra tắt/local, cuộn Settings, consent, status cấu hình giả lập, gửi thành công, quiz nháp, mặc định không history/context, dừng bỏ kết quả muộn, 429 không tự retry, từ chối JSON lỗi và giữ draft. Đã kiểm tra chọn nghĩa động từ của 打算 không trộn nghĩa danh từ, preview cấu tạo 晴 và ngữ pháp 不, Reader chỉ gửi `今天我去学校。` sau lựa chọn. Thu hồi consent xóa hội thoại và khóa gửi. Không tràn ngang ở 390px và 320px; có kiểm tra dark/reduced-motion trên web. Một lỗi console 429 là phản hồi mock có chủ đích; không thấy runtime exception trong các luồng đã kiểm tra.

Test demographic chỉ xác minh cùng chính sách prompt cho các nhóm người lớn, không chứng minh model thật không thiên kiến. Không có live inference, đo latency/chất lượng model, E2E Supabase đã deploy, Deno runtime check (máy không có Deno), APK, Android/iOS runtime, bàn phím native hoặc screen reader thật trong vòng này.

## Bảo vệ source và dữ liệu

Đối chiếu SHA-256 với manifest 709 file trước task: không file nào mất; 273 file được phân loại bảo vệ (DB/data/assets, review/SRS, backup, language, speech cũ, English và config/dependency) không đổi. Danh sách mọi thay đổi trong manifest cũng xác nhận không đổi các file English khác. `DATABASE_VERSION` giữ 47. Không mở database/backup/điện thoại người học để kiểm thử.

10 file cũ thay đổi có chủ đích: 9 route cho entry/navigation và `supabase/config.toml` thêm verify-JWT cho function mới. Code AI mới nằm trong `src/services/ai`, `src/app/ai`, `src/components/ChineseAIEntry.tsx`, `supabase/functions/_shared` và `supabase/functions/chinese-ai`.

Có một thay đổi đồng thời ngoài task: hash `src/components/HanziHandwritingPad.tsx` khác baseline. Task AI không sửa file này, không xác định được nguồn thay đổi và không khôi phục/ghi đè. Đây không phải bằng chứng “mọi file ngoài AI đều không đổi”; được tách riêng trong `safety-report.json`.

Artifact nằm tại `D:/ReactJS/4Chinese-Archive/ai-v1-2026-11-03/`: baseline, `tests-final.json`, `safety-report.json`, bundle và ảnh UI `ai-disabled.png`, `settings-bottom.png`, `ai-success-mocked.png`, `ai-rate-limited.png`, `ai-sense-selected.png`, `ai-character-320.png`, `ai-reader-selected-320.png`.

## Phần tiếp theo

[Hướng dẫn server](AI_V1_SERVER_SETUP.md) mô tả cấu hình chuẩn bị cho vòng thử có kiểm soát. Hiện chưa cấu hình key/evidence hoặc deploy; không thể dùng live chỉ bằng bật nút trong app.

Phần luyện dịch/sửa câu/HSK/Reader bổ sung sau khi người dùng giao tự triển khai được ghi tại [AI_V1_COMPLETION.md](AI_V1_COMPLETION.md). Chưa triển khai chấm thi HSK chính thức bằng AI, realtime speaking, Vision/OCR AI hoặc image generation. Chức năng roleplay/pronunciation cũ được giữ nguyên; free-only của gateway mới không thay chính sách chi phí của endpoint cũ.
