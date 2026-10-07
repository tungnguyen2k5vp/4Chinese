# Personal Context Memory V5.1

## Trạng thái triển khai

Schema SQLite 41 bổ sung bảng `word_contexts` bằng migration additive. Bảng lưu ngữ cảnh tùy chọn gắn với từ đã học:

- `vocabulary_id`
- `source_type`: `READER`, `STORY`, `OCR`, `LESSON`, `LISTENING`, `AI`
- `source_id`, `source_title`
- câu tiếng Trung, pinyin và bản dịch nếu có
- `position_metadata` dạng JSON object
- thời điểm tạo

Các context có khóa ổn định và UPSERT idempotent. Dữ liệu cũ trong `personal_vocabulary_context` vẫn được giữ nguyên; khi ghi context qua luồng cũ, bản ghi được mirror sang graph mới để không tạo breaking change.

## Riêng tư và backup

- Context của Reader/OCR ở local-first.
- Không gửi context sang AI và không ghi vào analytics trong V5.1.
- Backup local có trường `wordContexts` tùy chọn; backup cũ không có trường này vẫn import được và không xóa context mới đang có.
- Import backup có trường này sẽ validate trước, sau đó thay thế tập context trong cùng transaction; lỗi sẽ rollback.

## Ưu tiên khi ôn

Graph đã lưu source để sau này chọn context theo thứ tự: context cá nhân phù hợp, ví dụ đã review, rồi ví dụ generic. V5.1 mới hoàn thiện nền lưu trữ/backup; không thay đổi scheduler SRS và chưa tự động đưa mọi context vào câu hỏi ôn.

## Deferred

Cloud sync context và gửi dữ liệu context lên máy chủ thuộc backlog V6, chưa triển khai trong phase này.

