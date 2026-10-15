# Quiz điền từ và ghép âm thanh — 13/10/2026

## Thay đổi

- Quiz cung cấp nghĩa câu (hoặc nghĩa từ nếu ví dụ chưa có bản dịch) trước khi chọn, để phân biệt các từ có thể cùng phù hợp về ngữ pháp nhưng khác ý nghĩa.
- Sau khi trả lời, hiển thị câu ví dụ hoàn chỉnh, pinyin/bản dịch có sẵn, giải thích từ đúng và nghĩa của từng đáp án nhiễu. Đáp án sai đã chọn được đánh dấu riêng.
- Giải thích dùng dữ liệu ví dụ hiện có, không kết luận rằng mọi đáp án nhiễu đều sai ngữ pháp trong mọi ngữ cảnh. Với `对不起，我来晚了。`, giải thích quan hệ giữa việc đến muộn và lời xin lỗi.
- Sửa lỗi cột nghĩa dùng trạng thái chọn loa: bấm loa chỉ chọn ô âm thanh để phát, không tô màu hoặc đánh dấu nghĩa tương ứng.
- Chọn nghĩa sai không tăng tiến trình. Chọn đúng mới đánh dấu cặp và tăng số cặp hoàn thành. Chọn loa khác xóa thông báo tô sai cũ.

## Kiểm thử

- Typecheck và ESLint các tệp thay đổi: đạt.
- `npx vitest run src/services/decks/cloze-quiz.test.ts src/services/listening/deck-listening.test.ts`: 2 tệp, 9 test đạt.
- `scripts/smoke-chinese-quiz-listening-fixes.cjs`: dựng hai screen thật bằng React Native Web, giả lập các ranh giới SQLite/router/TTS. Kiểm tra bấm loa không làm thay đổi kiểu hiển thị bất kỳ ô nghĩa nào và không tăng điểm; chọn sai/đúng; hoàn thành toàn bộ các cặp; phản hồi quiz đúng/sai; tổng điểm cuối. Không có lỗi JavaScript.
- Ảnh đã kiểm tra: [gallery 5 ảnh](../artifacts/chinese-quiz-listening-fixes-2026-10-13/verified/index.html), [kết quả kiểm thử](../artifacts/chinese-quiz-listening-fixes-2026-10-13/verified/result.json).
- Đóng gói bundle Android bằng `npx expo export --platform android --output-dir artifacts/chinese-quiz-listening-fixes-2026-10-13/android-export`: đạt (2.388 module).

Đây là kiểm thử tương tác component web với TTS giả lập và kiểm tra bundle Android. Chưa kiểm chứng âm thanh native trên thiết bị, chưa tạo/cài APK cho thay đổi này, không ghi dữ liệu học của người dùng.
