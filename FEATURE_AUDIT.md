# 4Chinese — Feature Audit

Ngày audit: 2026-09-21
Phạm vi: mã nguồn hiện có, không thay đổi chức năng trong giai đoạn audit.

## 1. Kiến trúc hiện tại

| Khu vực | Hiện trạng |
| --- | --- |
| Ứng dụng | Expo SDK 57, React Native 0.86, Expo Router, TypeScript strict |
| Lưu trữ chính | Expo SQLite, WAL và foreign keys; dữ liệu học là local-first |
| State tạm thời | Zustand chỉ giữ queue/thiết lập phiên; SQLite là nguồn dữ liệu bền vững duy nhất |
| Chia sẻ bộ từ | Supabase RPC với mã 8 ký tự; không thay thế dữ liệu học local |
| Native Android | ML Kit Digital Ink cho nhận diện viết tay; Expo Go có fallback nhập chữ |
| Kiểm thử | Vitest cho SRS, tìm kiếm, pinyin, import, nét viết, chia sẻ và thống kê |

Migrations SQLite đang ở phiên bản 7, được áp dụng tăng dần và có kiểm tra cột trước khi `ALTER`. Không có migration nào cần thiết cho phần P0 đề xuất bên dưới.

## 2. Inventory tính năng

### Từ vựng và bộ từ

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Kho từ HSK, Hanzi, pinyin có/không dấu, nghĩa Việt/Anh | Hoàn chỉnh | `src/app/(tabs)/vocabulary.tsx`, `src/services/search/*`, `src/services/pinyin/*` |
| Bộ từ riêng, thêm/sửa/xóa/khôi phục/đổi tên | Hoàn chỉnh | `src/app/decks/*`, `src/db/repository.ts` |
| Nhập hàng loạt và chọn phương án nghĩa | Hoàn chỉnh | `src/app/decks/bulk-add.tsx`, `src/services/vocabulary/bulk-import.ts` |
| Chia sẻ/thêm bộ từ bằng mã ngắn | Hoàn chỉnh, phụ thuộc cấu hình Supabase | `src/services/decks/short-share.ts`, `supabase/shared-decks.sql` |
| Ảnh minh hoạ, ví dụ ngữ cảnh, TTS | Hoàn chỉnh ở mức dữ liệu hiện có | `src/services/media/*`, `src/services/audio/chinese-speech.ts` |
| Tag/chủ đề, word family, confusing pairs | Chưa có | Không có model/repository/UI tương ứng |

### Học, ôn và SRS

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Học từ mới 3 lượt, lượt đầu hiện đáp án | Hoàn chỉnh | `src/app/learn/session.tsx` |
| Ôn lặp 3 lượt, xen kẽ từ để tránh lặp liền | Hoàn chỉnh | `src/services/review/interleaved-session.ts`, `src/app/review/session.tsx` |
| Lịch cấp nhớ, Again/Hard/Good/Easy, tụt cấp khi sai | Hoàn chỉnh | `src/services/srs/scheduler.ts`, `src/db/repository.ts` |
| Ưu tiên từ khó/quá hạn trong hàng đợi đến hạn | Hoàn chỉnh | `getDueVocabulary()` trong `src/db/repository.ts` |
| Nhiều dạng câu hỏi (viết, pinyin, nghe, cloze...) | Hạ tầng có, luồng ôn hiện chỉ ép `meaning-hanzi` | `ReviewMode` và nhánh UI trong `src/app/review/session.tsx` |
| Daily smart session gộp từ mới + đến hạn + yếu | Chưa có | Màn Home/Review khởi tạo riêng từng queue |
| Sổ lỗi / danh sách từ yếu có thể xem lại | Chưa có UI; dữ liệu nền đã có | `wrong_count`, `lapse_count`, `consecutive_wrong`, `hint_used_count` trong `user_vocabulary_progress` |

### Trung ngữ chuyên sâu

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Viết tay nhiều chữ theo từng trang, tẩy nét, chọn kết quả | Hoàn chỉnh | `src/components/HanziHandwritingPad.tsx` |
| Gợi ý từng nét mờ và xem thứ tự nét | Hoàn chỉnh cho dữ liệu HSK 1–2 đóng gói | `HanziHandwritingPad.tsx`, `StrokeWriter.tsx`, `hsk12-strokes.json` |
| 50 bộ thủ, nghĩa/cách dùng/từ gợi ý | Hoàn chỉnh | `src/app/writing/*`, `src/data/common-radicals.ts` |
| Pinyin IME/candidate, nhận giọng nói trong development build | Hoàn chỉnh có điều kiện thiết bị | `src/services/pinyin-ime/*`, `src/services/speech/*` |
| Hán–Việt, phân rã thành phần, tone trainer | Chưa có | Không có dữ liệu/model/UI tương ứng |

### Thống kê và sản phẩm

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Mức nhớ, HSK progress, số lượt đúng, streak, phút học | Hoàn chỉnh | `src/app/(tabs)/stats.tsx`, `src/services/stats/daily.ts` |
| Phân tích lỗi theo kỹ năng (nghe/viết/pinyin/nghĩa) | Chưa có | `review_log.mode` có lưu, nhưng chưa có aggregate/UI theo mode |
| Reader, mining từ trong đoạn đọc | Chưa có | Không có route/model |
| AI tutor/generator | Chưa có, không có backend/quota/consent | Không nên thêm vội |

## 3. Rủi ro và nợ kỹ thuật cần giữ nguyên trong lần này

1. Không đổi sang FSRS. Scheduler hiện tại có lịch cấp nhớ, tín hiệu hint/sai, log review và migration dữ liệu đã vận hành. Di chuyển thuật toán sẽ làm thay đổi lịch cũ và là rủi ro cao.
2. `review/session.tsx` đã có cấu trúc cho nhiều `ReviewMode` nhưng hiện cố định `meaning-hanzi` để khớp luồng học hiện hành. Kích hoạt hàng loạt mode ngay lúc này dễ làm đổi UX đã chốt.
3. Nhận diện viết tay phụ thuộc native ML Kit Android; Expo Go chỉ có fallback. Đây là giới hạn runtime, không phải dữ liệu từ vựng.
4. Chia sẻ mã ngắn cần SQL Supabase đã được chạy; không được nhúng secret hoặc sửa `.env` trong thay đổi tính năng.
5. `hanzi-writer-data` đang là dependency phát triển nhưng UI sử dụng dữ liệu nét đóng gói; không xóa hay thay thế trong đợt thay đổi tối thiểu.
6. Dữ liệu HSK JSON lớn được seed local; bổ sung dictionary 100k+ hoặc ảnh hàng loạt cần đánh giá bundle, license, cache và quyền sử dụng riêng.

## 4. Tham khảo bên ngoài (chỉ lấy ý tưởng, không sao chép code)

| Nguồn | Ý tưởng phù hợp | Quyết định |
| --- | --- | --- |
| [Princeton Chinese Learning App](https://github.com/lillianwang112/chinese-learning-app) | Trouble words, nhiều mode, thống kê/streak | Dùng ý tưởng “từ cần củng cố”; không sao chép UI/logic |
| [HanziNote](https://github.com/seon-wooju/HanziNote) | Offline-first, tìm pinyin/nghĩa, writing/TTS | Xác nhận hướng local-first hiện tại là phù hợp |
| [Hanzi LevelUp](https://github.com/patarapolw/HanziLevelUp) | Decomposition và học theo level | Đưa decomposition vào P1/P2, cần data source trước |
| [Hanzi Writer](https://github.com/chanind/hanzi-writer) | Animation và quiz thứ tự nét | Đã có dữ liệu/animation nội bộ; cần kiểm tra license trước khi mở rộng |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | Scheduler FSRS TypeScript | Không migrate ở hiện tại vì rủi ro dữ liệu/lịch |
| [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) | Dữ liệu nét cho hơn 9.000 chữ | Có thể nghiên cứu P1; phải tuân thủ license từng tệp dữ liệu |

## 5. Kết luận audit

4Chinese đã có vòng lặp học nền tảng: **thêm từ → học 3 lượt → vào Cấp 1 → đến hạn → ôn 3 lượt xen kẽ → cập nhật lịch**. Khoảng trống giá trị cao, rủi ro thấp là làm lộ dữ liệu sai/lapse đã có thành một “sổ từ cần củng cố”, nhưng không cho phép ôn ngoài hạn làm phá SRS. Đây là P0 phù hợp để triển khai tự động.
