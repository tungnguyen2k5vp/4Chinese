# V8.3 — audit tính năng và thay đổi

Ngày: 2026-10-15. Phạm vi: nâng cấp bổ trợ trong ứng dụng hiện tại; không làm lại giao diện toàn app.

## Những phần đã tồn tại và cách tận dụng

| Phần | Source hiện có được đối chiếu | Trước V8.3 / phần bổ sung |
| --- | --- | --- |
| Vocabulary / progress | `db/repository.ts`, `types/models.ts`, `app/word/[id].tsx`, `app/deck`, `app/learn` | Có ID ổn định, vòng đời NEW/LEARNING/KNOWN/SKIPPED, ghi chú, mức nhớ. Chỉ thêm lối vào cấu tạo và recall; không nhập lại dữ liệu. |
| Review / SRS | `app/review`, `services/review/exercise.ts`, `meaning-options.ts`, `contextual.ts`, `services/srs/scheduler.ts` | Đã có 9 mode chuẩn cùng mixed, session5/10/15/20 và lịch ôn chính. Không xây scheduler thứ hai. Phiên mới dùng một hướng/từ dựa trên bằng chứng hoặc xoay 7 hướng. |
| Error Intelligence | `services/learning/error-intelligence{,-v2}.ts`, `db/mistakes.ts` | Có cluster, mẫu số30 ngày, micro-lesson và thống kê skill. Reuse clusterV2, ngưỡng đủ mẫu; thêm taxonomy memory bảo thủ, UNKNOWN khi chưa rõ. Không chẩn đoán phát âm từ lỗi nghe. |
| Mistake Book / weak words | `app/mistakes`, `app/review/weak.tsx`, `services/review/weak-words.ts` | Có bài luyện sai và dấu hiệu quên. Hub mới đọc đúng lịch sử này, không tự gắn cặp nhầm cá nhân từ nhóm biên soạn. |
| Confusables | `data/confusable-words.ts`, `db/confusable-words.ts`, `app/confusables` | Có phân biệt từ theo ngữ cảnh. Bổ sung nhóm hình chữ 未末/土士/日目/己已巳/请情清晴, highlight, pinyin, quiz, nghe, viết lại; không thay bộ bài ngữ cảnh. |
| Decomposition / radicals | `services/vocabulary/character-analysis.ts`, `data/common-radicals.ts`, `app/radicals` | Có phân tích/mẹo nhớ nhưng có fallback suy diễn và vài decomposition không đáng tin. Bỏ thông tin sai rõ ràng, unknown không tự tham chiếu; khu mới chỉ có mô tả hình học đã kiểm tra, chưa hiện vai trò semantic/phonetic thiếu nguồn. |
| Writing / Digital Ink | `components/HanziHandwritingPad.tsx`, `WritingCanvas`, `StrokeWriter`, `services/handwriting/{recognizer,segmentation,stroke-data}.ts`, module `DigitalInkRecognition` | Có viết từng mặt, tẩy, ML Kit candidate và nét mẫu. Tận dụng pad, giữ bài vẽ khi đối chiếu, chống kết quả nhận diện trễ, phân biệt nhập tay và native evidence. Engine không chấm hình dạng/thứ tự từng nét. |
| Stroke data | 8 shard lazy hiện có / `StrokeWriter.tsx` | Có paths offline. Chữ 巳 thiếu trong test nhóm ba chữ; bổ sung đúng3paths từ dependency hiện có kèm license, không thay shards. Respect reduced/off motion, vẫn bước nét thủ công. |
| Personal context / Reader | `db/vocabulary-context.ts`, `services/reader/word-context.ts`, `app/reader/index.tsx` | Có lưu ngữ cảnh được người dùng xác nhận. Reuse cho cloze, che mọi lần xuất hiện Hanzi mục tiêu; Reader chỉ thêm lối vào recall, không tự lưu câu không được đồng ý. |
| Learning path | `db/learning-path.ts`, các route course/lesson | Giữ nguyên tiến độ. Không tạo lesson progression mới hoặc tự hoàn thành bài cũ. |
| Statistics / goals | `getDashboardStats`, `review_log`, `daily_stats`, `user_settings` và tab stats | Hub dùng số thực đang có; đề xuất thời lượng có nhãn ước lượng và giả định. Không sửa goals, XP, study_seconds hay due dates. |
| English | `services/english`, `db/english`, `app/english`, các tab và LanguageProvider | Không thêm entry memory vào English. Guard ở route ngăn truy vấn Chinese DB từ English. Hash baseline bảo vệ source English và tab đang chỉnh dở trước V8.3. |

## Source V8.3

- `services/memory/hanzi-memory.ts`: chính sách bằng chứng, câu hỏi, đánh giá evidence viết, plan.
- `services/memory/character-content.ts`: năm nhóm, 13 chữ, cấu trúc hữu hạn, guard chu kỳ/depth.
- `db/hanzi-memory.ts`: chỉ đọc dữ liệu chính; kết quả kiểm tra khách quan vào bảng luyện bổ trợ đã có; mnemonic vào block riêng của notes có sẵn, bảo toàn nội dung khác.
- `app/memory/{index,words,session,confusables,structure}.tsx`, `components/memory/MemoryPrimitives.tsx`: hub và bài bổ trợ. Card gọn, retry/loading/empty, kích cỡ phiên linh hoạt, audio không lộ Hanzi qua accessibility label.
- Integration tối thiểu: Chinese Home/tool hub, root route, chi tiết từ, Reader. Không thay tabs English.

## Giới hạn có chủ đích

Không có persistence mới cho điểm tự chấm viết hoặc mốc kiểm tra7/30 ngày. Kết quả viết hiện ở phiên, được ghi rõ tự đánh giá; không biến thành điểm stroke. Cấu trúc hữu hạn10chữ, các chữ khác hiển thị phần đã xác minh và tình trạng thiếu. Old-word candidate lấy tối đa50từ mỗi lần, thứ tự ưu tiên lịch sử quên và dấu thời gian có sẵn; chưa có timestamp bổ trợ theo từng skill nếu bảng cũ không cung cấp. Không tuyên bố cải thiện trí nhớ theo tỷ lệ.

## Kế hoạch đo hiệu quả, chưa phải kết quả nghiên cứu

Theo dõi trên bảng luyện hiện có: đúng không hint / tổng lượt không hint; đúng sau hint; lặp lỗi `memory_visual_choice`; số từ tiếp tục có lỗi sau cứu hộ. Tách dữ liệu bài luyện khỏi due-only review. Viết đúng mặt chữ từ native candidate chỉ là tín hiệu hạn chế, không phải viết đúng nét. Đánh giá tự viết phải được đối chiếu độc lập; không suy ra từ XP. Mốc7/30ngày có thể dùng lịch sử review có sẵn và thiết kế nghiên cứu opt-in riêng; không tự thêm schema trong vòng này.
