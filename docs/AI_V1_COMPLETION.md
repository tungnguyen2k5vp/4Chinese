# 4Chinese AI V1 — hoàn thiện luồng luyện tập

Kết quả mới nhất ở [AI_FOLLOWUP_2026-11-04.md](AI_FOLLOWUP_2026-11-04.md); phạm vi các giai đoạn ở [AI_PHASES_P0_P3.md](AI_PHASES_P0_P3.md). Đã bổ sung sửa câu Anh, Study Coach, hội thoại/transcript, camera/OCR, editor, phân tích lựa chọn vừa nộp và luyện tiếp. Báo cáo dưới đây ghi nhận lượt hoàn thiện V1 trước đó; các mục “chưa mở rộng” và số liệu kiểm thử bên dưới thuộc thời điểm đó.

Ngày 03/11/2026. Người dùng giao tiếp tục tự xác định phần còn thiếu vì chat web bị đứng. Phạm vi triển khai là app 4Chinese hiện tại; không sửa website chat. Đặc tả đã nhận kết thúc ở tiêu đề phần IX, nên các mục dưới đây là phương án triển khai được đề xuất và thực hiện, không phải nội dung được suy đoán từ phần tài liệu chưa nhận.

## Hướng phát triển đã thực hiện

Ưu tiên ba luồng học có thao tác rõ ràng: tự viết rồi nhận góp ý, tự dịch trước khi xem bản tham khảo, và làm bài ngắn rồi mới xem đáp án. Tiếp tục dùng gateway Supabase/free-only đã có; không thêm dependency, backend thứ hai hoặc cơ chế lưu tiến độ AI.

| Luồng | Hành vi đã có |
|---|---|
| Sửa câu | Nhập câu tiếng Trung tối đa 1.000 ký tự và ý muốn diễn đạt tối đa 300 ký tự. Prompt yêu cầu giữ ý, phân biệt lỗi với cách nói khác hợp lệ và hỏi lại nếu chưa rõ. Có bản gốc/bản sửa/lý do; bản sửa tiếng Trung dùng nút loa hiện có. “Viết lại câu này” chỉ đưa câu vào form, không tự gửi. |
| Luyện dịch | Việt → Trung hoặc Trung → Việt; câu gốc và bản dịch thử mỗi phần tối đa 600 ký tự. “Gợi ý trước” không đòi bản dịch thử; “Góp ý bản dịch” cần người học nhập bản dịch. Giữ hai ô sau khi gửi để luyện tiếp. |
| Luyện HSK | Chọn mục tiêu HSK 1–9, chủ đề và dạng trắc nghiệm/câu đục lỗ/kết hợp. Mỗi request yêu cầu 3 câu; schema cho phép tối đa 3. Câu đục lỗ phải có chữ Hán và chỗ trống `____`; dạng kết hợp phải có cả câu có và không có chỗ trống. |
| Làm bài | Một câu mỗi lần, có nút số câu/trước/sau; được thay lựa chọn trước khi nộp. Chọn đủ mới nộp. Sau nộp khóa lựa chọn, hiện số câu khớp đáp án AI, lựa chọn của người học, đáp án AI và giải thích. Có làm lại trong RAM, không gọi thêm AI. |
| Reader | Thêm “Tóm tắt” và “Tự luyện dịch”. Luyện dịch lấy tối đa 600 ký tự từ đoạn đã chỉnh/chọn; tắt gửi ngữ cảnh kèm để không gửi trùng cả đoạn. Quick action không tự gọi API. |
| Nhóm lỗi | Thêm bài luyện theo kỹ năng trong số liệu gộp đã chọn. Prompt nói rõ đây không phải bản sao câu từng sai; không suy đoán lỗi/từ cá nhân từ số đếm. |
| Phiên và lỗi | Chọn chế độ, nút nhấn và câu trả lời dùng motion component sẵn có. Lỗi/hủy giữ bản nháp; `retryAfter` có đếm ngược và khóa gửi trong thời gian chờ, không tự retry. Bắt đầu phiên mới cần xác nhận. Đổi quyền/provider tạo phiên mới. |

Độ khó HSK do người học tự chọn, không đọc từ tiến độ. Đây là luyện nháp bằng AI, không phải đề thi HSK chính thức, xác nhận trình độ hoặc bài đã được kiểm duyệt đầy đủ theo HSK 3.0.

## Contract và giới hạn kiểm chứng nội dung

Các trường tùy chọn `hskLevel`, `exerciseKind`, `translation` được validate ở cả client và server, tương thích request cũ. Server từ chối cấp ngoài 1–9, dạng bài sai, bản dịch quá giới hạn, review thiếu bản dịch thử, field ngoài allowlist và câu trả lời sai cấu trúc của tác vụ. Provider chỉ nhận nội dung hữu hạn đã chọn; session ID/JWT không vào prompt.

Với gợi ý dịch, validator chặn trường ví dụ/bản sửa/quiz/mnemonic có nội dung. Với luyện HSK, UI ẩn summary/explanation/examples/corrections/mnemonic và chỉ trình bày bài làm; giải thích trong quiz chỉ hiện sau nộp. Những kiểm tra này không chứng minh model sẽ không lộ lời giải trong câu hỏi/gợi ý, không bảo đảm từng đáp án đúng duy nhất hoặc từ vựng đúng cấp. Cần đánh giá model thật trước khi dùng rộng rãi.

Repo [free-claude-code](https://github.com/Alishahryar1/free-claude-code) được áp dụng ở mức ý tưởng registry, adapter, phân loại lỗi và failover có giới hạn. Không sao chép mã AGPL hay chạy proxy. Xem [source audit](AI_V1_SOURCE_AUDIT.md) cho khảo sát ban đầu.

## Kiểm thử đã thực hiện

| Kiểm tra | Kết quả |
|---|---|
| AI unit/contract | **54/54 đạt**, gồm kiểm tra cũ và 9 test mới cho giới hạn HSK/dịch, privacy/payload, tương thích request, cấu trúc câu đục lỗ/kết hợp, hint không có solution fields, viết theo ý và tính kết quả nháp. |
| TypeScript | `npm run typecheck` đạt. |
| Lint | 0 errors; 8 warnings ở các file ngoài phần AI, không tự sửa. |
| Toàn bộ suite | **225 file, 1.260 test: 1.258 đạt, 2 lỗi cũ**. `src/db/hsk30.test.ts:182` và `src/db/v5-sense-schema.test.ts:21` mong version 46, source thực tế 47, trùng kết quả phiên trước. |
| Web export | Đạt: `entry-5991f21d543d8af7046d5c2e3063b9b1.js`. |
| Android Hermes export | Đạt: `entry-88d48d9e66fc9a6f1f7359e6d86c187b.hbc`. Đây là bundle, chưa phải APK hoặc bằng chứng chạy native. |
| Browser | Context cô lập `4chinese-ai-v1-completion-qa`; dữ liệu QA riêng; chặn mạng ngoài và mock auth/AI. Không dùng tài khoản hoặc database thật của người học. |

Browser đã thử cả hai hướng dịch, hint → review, bắt buộc bản dịch thử, HSK 9, preview và payload tối thiểu; output lỗi giữ bản nháp; nút viết lại không gửi; chuyển bản nháp 1.200 ký tự sang sửa câu vẫn giữ nội dung nhưng khóa gửi. Đã làm 3 câu, đổi đáp án, chuyển câu, nộp kết quả 2/3, xem giải thích, khóa đáp án sau nộp và làm lại không thêm request.

Đã thử 429 có đếm ngược, hết chờ không tự gửi, dừng/bỏ kết quả muộn, giữ draft, hủy/xác nhận tạo phiên mới; mở các chi tiết Settings, cuộn tới cuối, kiểm tra cấu hình không inference và thu hồi quyền. Reader chỉ gửi câu đã chỉnh `今天我去学校。`, không gửi nội dung khác. Có kiểm tra giới hạn ô dịch 600 ký tự, bố cục 390px và 320px, dark/reduced-motion, không tràn ngang ở các form đã kiểm. Không thấy runtime exception trong các luồng này; lỗi console 429 là mock có chủ đích.

Không có live inference, đánh giá chất lượng Trung–Việt/thiên kiến thực tế, Supabase đã deploy, Deno runtime, APK/native runtime, bàn phím native hoặc TalkBack trong vòng này. QA web không thay các kiểm thử đó.

## Bảo vệ dự án

Đối chiếu SHA-256 với **714 file trước lượt hoàn thiện**: không mất file. Chỉ 7 file cũ thuộc AI thay đổi: tutor, context, client gateway, 2 file test, shared contract và shared gateway. Thêm `ChineseAIPractice.tsx`, `learning.ts` và báo cáo này; cập nhật tài liệu AI. Mọi file trong manifest ngoài phạm vi này giữ nguyên, bao gồm database/schema/migrations, data/assets/dictionary, review/SRS/progress, English, backup, config và dependency/lockfile. `DATABASE_VERSION` vẫn **47**.

Không mở hoặc ghi database/backup/điện thoại thật. Bài nháp không gọi repository lưu kết quả, XP hoặc SRS. Chức năng lưu mnemonic đã có ở lượt trước vẫn cần preview/xác nhận rõ ràng, và chưa được thực hiện trên dữ liệu học thật.

Artifacts: `D:/ReactJS/4Chinese-Archive/ai-v1-completion-2026-11-03/`, gồm baseline, `tests-final.json`, `safety-report.json`, bundle, báo cáo browser và ảnh `translation-review-390.png`, `practice-submitted-390.png`, `translation-bottom-dark-320.png`, `practice-form-dark-320.png`, `settings-bottom-dark-320.png`, `reader-translation-dark-320.png`.

## Bước phát triển tiếp theo

Phần code của vòng này đã hoàn thành. Backend vẫn mặc định tắt, chưa cấu hình secret/evidence hoặc deploy, chưa gọi model thật; bật lựa chọn trong app chưa đủ để dùng AI online. Giữ nguyên free-only và development allowlist vì limiter hiện chỉ ở RAM. Hướng dẫn cấu hình nằm tại [AI_V1_SERVER_SETUP.md](AI_V1_SERVER_SETUP.md).

Vòng kế tiếp nên thử backend với tài khoản QA đã xác minh free plan, rồi duyệt chất lượng trước khi đóng gói APK: mỗi hướng dịch có câu nhiều cách dịch đúng, câu gốc mơ hồ và bản dịch sai ý; sửa câu có/không có lỗi; 不/没/了/过/把/被; câu đục lỗ có duy nhất một đáp án; mẫu độ khó HSK 1/3/6/7–9; prompt injection trong đoạn đọc. Kiểm tra pinyin, nghĩa, tính tự nhiên, không lộ đáp án trước nộp và giữ ý người học. Sau đó mới kiểm native keyboard/back/background/cancel, cỡ chữ lớn, TalkBack và mạng yếu bằng dữ liệu QA.

Chưa mở rộng sang AI chấm thi chính thức, tự ghi lịch ôn, sửa từ điển, OCR/Vision, realtime speaking hoặc tạo ảnh. Chỉ bổ sung khi có nhu cầu và tiêu chí chất lượng cụ thể; production cần durable limiter thích hợp, không thêm bảng quota vào database học.
