# 4Chinese — Feature Roadmap

Roadmap này kế thừa cấu trúc Expo Router + SQLite + Zustand hiện có. Không có mục nào dưới đây được hiểu là cho phép thay framework, router, schema hoặc thuật toán SRS nếu chưa có ticket và migration riêng.

| Ưu tiên | Tính năng | Giá trị | Rủi ro | Quyết định |
| --- | --- | --- | --- | --- |
| P0 | Sổ “Từ cần củng cố” | Cao | Thấp | Triển khai ngay: chỉ đọc và bắt đầu ôn **các từ yếu đã đến hạn** |
| P0 | Smart Daily Review (mới + đến hạn + yếu) | Cao | Trung bình | Lên thiết kế trước; hiện luồng learn/review có ràng buộc persistence khác nhau |
| P0 | Per-skill error tracking | Cao | Trung bình | Thiết kế migration additive; `review_log.mode` đã là nền tảng |
| P0 | Đa dạng mode câu hỏi | Trung bình | Trung bình | Khôi phục dần từ hạ tầng `ReviewMode`, sau UX test; không bật đại trà |
| P1 | Listening/dictation mode riêng | Cao | Trung bình | Tái dùng TTS/speech hiện có, cần tiêu chí offline và dev-build rõ ràng |
| P1 | Tone trainer | Trung bình | Trung bình | Cần đánh giá engine chấm tone và privacy microphone |
| P1 | Hán–Việt | Trung bình | Thấp | Thêm dataset có license và field additive |
| P1 | Phân rã chữ Hán | Trung bình | Trung bình | Cần nguồn component/decomposition có license rõ ràng |
| P1 | Mở rộng nét/animation | Trung bình | Trung bình | Kiểm tra license và kích thước bundle/cache trước |
| P2 | Word family / confusing pairs | Trung bình | Trung bình | Cần model quan hệ và dữ liệu được curate |
| P2 | Reader + mining từ trong câu | Cao | Cao | Cần tokenizer, quyền nội dung, UI riêng |
| P2 | Export/import backup người dùng | Trung bình | Trung bình | Cần format versioned và test migration |
| P3 | AI Tutor / generated decks / AI feedback | Cao | Cao | Chỉ bắt đầu sau khi có backend, quota, consent, moderation, và chi phí vận hành |
| P3 | Cloud sync toàn bộ tiến trình/tài khoản | Cao | Cao | Thiết kế identity, conflict resolution, RLS và offline sync riêng |

## P0 được thực hiện trong đợt này

### Từ cần củng cố

- Xếp hạng từ đã học bằng các tín hiệu sẵn có: sai liên tiếp, số lần sai, lapse, tỉ lệ đúng và hint.
- Không tạo bảng mới, không đổi giá trị SRS, không thay đổi lịch nhắc.
- Hiển thị danh sách minh bạch để người học biết vì sao một từ cần củng cố.
- Nút “Ôn từ yếu đến hạn” chỉ đưa các từ vừa **yếu vừa đến hạn** vào `review/session`, nên `reviewWord()` vẫn chấp nhận ghi nhận kết quả và lịch không bị phá.
- Bổ sung một lối vào rõ ràng từ Home.

## Tiêu chí nghiệm thu P0

1. Không có migration/schema/env/dependency mới.
2. Khi chưa có dữ liệu yếu, màn hình hiển thị empty state, không lỗi.
3. Danh sách không gồm từ NEW, KNOWN, SKIPPED, suspended hoặc deck đã nằm trong thùng rác.
4. Từ yếu đã đến hạn có thể vào phiên ôn hiện có; từ chưa đến hạn chỉ được xem, không bị ghi review trái lịch.
5. Tất cả test hiện có, typecheck và lint tiếp tục chạy.
