# BIG UPDATE — kiến trúc hiện tại

Expo SDK 57 / React Native / Expo Router / TypeScript. Giữ 5 tab chính, các module nâng cao dùng route phụ. Zustand hiện có giữ trạng thái UI/queue; SQLite giữ dữ liệu bền vững, Supabase chỉ là dịch vụ bổ sung.

Các lớp:

- `src/app`: màn hình và navigation; `src/components`: primitive UI, handwriting, audio, Shadowing Player dùng lại.
- `src/db`: schema/migration, repositories vocabulary/SRS/backup/reading/grammar/learning path/mistakes/speaking.
- `src/services`: thuật toán deterministic, adapter microphone/TTS/STT/OCR/import, backup ZIP và cloud backup.
- Native Android local module: ML Kit Digital Ink + OCR tiếng Trung. Web có fallback rõ ràng.

Kho câu `sentences` được grammar và Shadowing dùng chung, không sao chép nội dung vào player. Reader/Stories dùng chung engine tách từ. TEXT/TXT/IMAGE_OCR đưa nội dung vào cùng màn hình preview/tra từ; PDF/EPUB/WEB extract chưa triển khai.

TTS là đọc mẫu; native STT và phản hồi AI hiện đo nhận diện nội dung, **không phải chấm âm học/thanh điệu**. Tone Trainer có đáp án từ numeric pinyin; loại biến điệu và các chữ đa âm thường gặp khỏi bài nghe thanh gốc. Ghi âm Shadowing chỉ giữ tạm tại máy, xóa khi rời màn hình/vào nền hoặc ghi mới, không upload.

Giới hạn: cloud sync tự động chưa có; learning path chưa xác minh kết quả activity; curriculum/grammar/stories mới là nội dung mẫu. Backup nén đồng bộ và OCR/ghi âm cần QA trên thiết bị thật. Không coi khung schema/API là feature đã hoàn chỉnh.
