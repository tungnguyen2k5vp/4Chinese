# 4Chinese — hoàn thiện các luồng AI còn dở

Ngày 04/11/2026. Tiếp nối [báo cáo P0–P3](AI_PHASES_P0_P3.md). Lượt này hoàn thiện bước học tiếp sau phản hồi AI và công cụ kiểm tra bài nháp; không thêm backend, dependency hoặc database.

## Các phần đã bổ sung

| Phần còn thiếu | Hành vi hiện tại |
|---|---|
| P1: phân tích đáp án thực tế | Sau khi nộp quiz AI, chọn “Xem trước phân tích bài vừa làm”. Context chứa đúng câu hỏi, lựa chọn, đáp án tham khảo, giải thích và đáp án người học đã chọn của tối đa ba câu. Chưa nộp không có nút này. |
| P1: bài luyện thích ứng tiếp theo | “Xem trước bài luyện tiếp” dùng cùng bằng chứng lựa chọn vừa nộp, giữ mục tiêu HSK của lần tạo bài gốc. Prompt yêu cầu kiểm tra lại đáp án tham khảo, ưu tiên điểm cần luyện và tạo câu mới; không suy luận lỗi nếu mọi câu đều hợp lệ. |
| P2: luyện lại câu AI vừa sửa | Nút luyện nói ở ví dụ và câu sửa tiếng Trung mở màn nghe chậm → tự ghi âm → nghe lại đối chiếu. Dùng TTS và recorder tại máy đã có, tối đa 30 giây; không gọi thêm AI, upload âm thanh hoặc ghi điểm học. |
| P3: làm thử bài đã biên tập | Editor sau khi tự đối chiếu có “Làm thử bản nháp như người học”: chọn/đổi đáp án, chuyển câu, nộp và xem giải thích. Sửa bài bỏ trạng thái duyệt, đóng preview và làm mới lựa chọn ở lần preview sau. |
| P3: xuất tệp thực sự | JSON sau duyệt có nút “Lưu hoặc chia sẻ tệp JSON”. Web tải `.json` UTF-8 bằng Blob; Android/iOS dùng cache và bảng chia sẻ tệp đã cài. Không chỉ chia sẻ một đoạn text. JSON xem trước vẫn còn khi chia sẻ lỗi/hủy. |

Hai nút phân tích/luyện tiếp mở phiên Tutor mới để xem trước, **không tự gọi API**. Mặc định không gửi context hoặc lịch sử. Người học vẫn phải cho phép context trong Settings, bật gửi context ở Tutor rồi Gửi. Quay lại phiên trước giữ đáp án đã nộp và khóa thay đổi; làm lại bài không gọi thêm AI.

Task mới `practice_review` bắt buộc context `practice`. Client/server kiểm tra tối đa ba câu, lựa chọn 2–4 đáp án khác nhau, chỉ số đã chọn/đáp án tham khảo trong phạm vi, độ dài hữu hạn và không có field ngoài allowlist. Chỉ gửi các trường quiz cần thiết; không có ID, tiến độ, notes hoặc lịch sử ôn. Chế độ sửa câu Anh tiếp tục từ chối context này.

**Đáp án AI vẫn là tham khảo.** Prompt phân tích phải kiểm tra lại đáp án, chấp nhận lựa chọn khác hợp lệ và nêu câu mơ hồ/đáp án tham khảo sai. Số câu khớp chỉ là so với key hiện tại, không phải chấm năng lực hoặc điểm HSK. Không tạo hồ sơ AI lâu dài hay tự cập nhật Sổ lỗi/SRS từ vài câu.

Màn luyện nói không suy điểm phát âm/thanh điệu từ bản ghi hay transcript. Mở màn này dừng STT đang chạy; nghe mẫu và ghi âm được khóa tránh tranh micro/phát mẫu. Rời màn hình/background dùng cơ chế hủy audio hiện có. Bản ghi mặc định chỉ trong phiên; chức năng lưu bản sao riêng sẵn có vẫn cần người dùng chủ động chọn/xác nhận. Trên web hiện fallback ghi âm native rõ ràng.

Preview editor dùng đúng quiz đang biên tập, không gửi lại model và không hiện các nút phân tích/luyện tiếp của người học. Xuất vẫn giữ metadata của lần sinh bài gốc, `human-reviewed-draft`, `officialExam=false`; dấu tự duyệt không chứng minh chuyên gia đã kiểm tra kiến thức. File native nằm trong cache và được giữ để ứng dụng nhận chia sẻ đọc xong, không xóa ngay khi đóng bảng chia sẻ. Chưa có cơ chế dọn theo hạn riêng; hệ điều hành có thể thu hồi cache.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| AI unit/contract | **66/66 đạt**. Thêm kiểm tra projection lựa chọn đã nộp, consent và payload thực; context/role/giới hạn; đáp án tham khảo chưa kiểm chứng; xuất native/web và lỗi chia sẻ. |
| TypeScript | `npm run typecheck` đạt. |
| Lint | `npm run lint`: không lỗi, tám warnings cũ ngoài AI. |
| Toàn bộ suite | **226 file, 1.272 test: 1.270 đạt, hai lỗi cũ trùng baseline**. `hsk30.test.ts` và `v5-sense-schema.test.ts` mong version 46, source vẫn 47. Không sửa schema/test DB trong lượt này. |
| Web export | Đạt: `entry-44c63dfec380bc80ce3d0d88296b5bb3.js`. |
| Android Hermes export | Đạt: `entry-5753399fa0d06cfd283f50f1af02c931.hbc`. Đây là bundle, chưa phải APK/native runtime. |
| Browser QA | Context cô lập, database QA mới, auth/model mock và chặn mạng ngoài; không có runtime exception/request ngoài dự tính trong các luồng đã thử. |

Browser đã làm ba câu đạt 2/3 theo key mock, kiểm tra payload `selectedIndex=[1,0,0]`, bắt buộc opt-in, giữ HSK 3 và không kèm history; quay lại vẫn giữ kết quả; tạo bài luyện tiếp có context đúng. Thử output lỗi, dừng và bỏ kết quả muộn vẫn giữ bản nháp/bài cũ, không tự retry. Editor được làm thử, tải JSON thật rồi đọc lại kiểm tra quiz/nguồn; sửa bài bỏ dấu duyệt và reset preview, không thêm request. Màn nói lại được thử từ câu mẫu/câu sửa, fallback web, nút đóng và Escape. Có cuộn hết nội dung, kiểm bố cục 390px sáng và 320px tối/reduced motion.

Chạy lại kiểm tra AI:

```powershell
npx vitest run src/services/ai/client.test.ts src/services/ai/server-gateway.test.ts src/services/ai/export.test.ts
```

Artifact: `D:/ReactJS/4Chinese-Archive/ai-followup-2026-11-04/`. Có baseline, `tests-final.json`, `browser-qa.json`, `reviewed-qa-draft.json`, bundle, ảnh, manifest cuối và `safety-report.json`. Nội dung tải xuống trong QA là dữ liệu tổng hợp.

## Bảo toàn dữ liệu

Baseline gồm **726 file source** và khớp từng hash với source đã kiểm thử ở lượt trước; kết quả test trước được dùng làm baseline sau đối chiếu này. Lượt hiện tại thay đổi chín file AI có sẵn, thêm ba file (luyện nói, xuất tệp và test xuất tệp); 717 file khác giữ nguyên, không mất file hoặc thay đổi ngoài phạm vi.

Database/schema/migrations/data/assets/native modules, review/SRS, memory engine, backup, English, cấu hình/dependency/lockfile giữ nguyên. `DATABASE_VERSION=47`. Không mở database/backup hoặc cài app lên điện thoại thật. Bài nháp, phân tích và preview không gọi repository ghi XP, due date, mastery, Sổ lỗi hoặc kết quả bài học.

## Phần vẫn cần điều kiện bên ngoài source

| Phần | Trạng thái và điều kiện |
|---|---|
| AI online | Function đã có source nhưng chưa cấu hình provider secrets/free entitlement và chưa deploy. Đặc tả hiện hành yêu cầu không tự triển khai Cloud, không tự bật billing. Dùng [hướng dẫn server](AI_V1_SERVER_SETUP.md); chỉ status cấu hình không chứng minh model dùng được. |
| Chất lượng nội dung thật | Chưa gọi inference thật. Cần bộ câu QA Trung/Anh, đa nghĩa/đa âm, lỗi ngữ pháp, đáp án khác hợp lệ, HSK 1–9 và prompt injection để đối chiếu; mock không thay được đánh giá này. |
| Micro/OCR/chia sẻ native | Có code và bundle; chưa thử thiết bị thật. Cần APK QA được cho phép, model STT tiếng Trung và quyền phù hợp để xác minh các chức năng này. |
| Realtime audio/chấm âm học mới/Vision ảnh tổng quát | Chưa triển khai model mới cho các mục này vì registry/free-only hiện chưa có capability và entitlement đã xác minh. Giữ nghe/ghi âm đối chiếu, OCR chữ và endpoint chấm phát âm cũ; không giả transcript là chấm âm học hoặc OCR là hiểu toàn cảnh ảnh. |
| Production và xuất bản nội dung | Vẫn development allowlist/limiter RAM. Chưa mở production hoặc tự nhập/xuất bản kho bài. Cần limiter bền vững và quy trình duyệt nội dung phù hợp; không thêm bảng quota hoặc sửa database học trong lượt này. |

Không coi các điều kiện chưa xác minh ở trên là đã hoàn thành chỉ vì UI hoặc unit test đã chạy được.
