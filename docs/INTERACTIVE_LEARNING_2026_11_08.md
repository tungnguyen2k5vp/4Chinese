# 4Chinese — tương tác học tập, mục 2–6

Ngày: 08/11/2026. Phạm vi: hoạt động học, bài đố cộng đồng và hình ảnh đi kèm.

## Những phần đã triển khai

| Mục | Đường vào | Hành vi |
| --- | --- | --- |
| 2. Khung cảnh tương tác | Trang chủ → Tiếng Trung quanh mình; hoặc Luyện tập → Tiếng Trung quanh mình | Quán cà phê, nhà ga, chợ trái cây, lớp học. Mỗi cảnh có 5 đồ vật chạm được, phát âm, pinyin, nghĩa, câu ví dụ và hội thoại 3 lượt có lời giải. |
| 3. Ghép câu | Luyện tập → Ghép câu; hoặc mở từ khung cảnh | 20 câu gốc theo 4 cảnh. Kéo thẻ lên khung hoặc chạm để thêm/bỏ. Kiểm tra, gợi ý pinyin, nghe mẫu, xem câu mẫu khi sai, kết quả và luyện lại câu cần nhớ. |
| 4. Thử thách ngắn | Luyện tập → Thử thách ngắn; hoặc nút ở cuối màn Ôn tập | Nghe & đoán, tìm đôi, đáp lời, thám tử câu. Chọn 5/10 câu; số thực tế theo nội dung hiện có. Nghe/tìm đôi dùng từ trong cảnh hoặc từ đã học, có phân trang. Đáp lời có 12 tình huống; sửa lỗi có 8 câu. |
| 5. Bài đố cộng đồng | Cộng đồng → Viết bài → Tạo bài đố tương tác | Ba mẫu: đố từ, chọn câu đúng, nghe và đoán. Sửa câu hỏi, 2–4 lựa chọn, đáp án đúng và lời giải. Chơi thử trước khi đăng. Bảng tin có thẻ mời chơi; màn chi tiết cho chọn đáp án, nghe, xem giải thích và thử lại. Bình luận, tim, lượt xem và tệp đính kèm tiếp tục dùng luồng hiện có. |
| 6. Hình ảnh thống nhất | Trang chủ, Luyện tập và các hoạt động mới | SVG vẽ trong dự án: nhân vật, 4 cảnh, 20 hình đồ vật. Xanh lá, kem, cam đào, tím nhạt; có bảng màu tối. Phản hồi khi chạm, thêm thẻ, ghép đúng, trả lời sai và pháo giấy ngắn khi hoàn thành. |

Nội dung cảnh/ghép câu là luyện cơ bản do dự án biên soạn, không phải tuyên bố bao phủ toàn bộ giáo trình HSK 1–9. Câu ghép được đối chiếu với câu mẫu của từng hoạt động; màn hình ghi rõ một ý có thể có cách diễn đạt khác.

## Bảo vệ dữ liệu

- Không sửa schema, migration, repository hoặc dữ liệu học. Các hoạt động mới không gọi API chấm SRS, không đánh dấu đã học, không cộng XP, không đổi lịch ôn.
- Nguồn “Từ tôi đã học” chỉ gọi hàm đọc `getLearnedReviewPage`. Kết quả luyện được giữ trong bộ nhớ của lượt chơi.
- Loại từ trùng chữ/nghĩa khi tạo cặp. Bài nghe loại từ có cùng pinyin không dấu khỏi lựa chọn nhiễu; bỏ câu nếu không đủ lựa chọn. Nội dung thiếu giọng đọc có hướng dẫn, không chặn luồng khám phá.
- Bài đố dùng trường nội dung bài viết hiện có, với định dạng có phiên bản và Zod validation. Không cần migration/backend mới. Máy khách cũ vẫn đọc được phần văn bản câu hỏi và lựa chọn; tương tác cần bản app mới.
- Đây là bài đố do tác giả cung cấp đáp án, không phải kỳ thi. Điểm, số người chọn từng đáp án và lịch sử chơi không được lưu.
- Đã lưu và so sánh SHA-256 cho 156 file gồm `src/db`, `data`, `supabase`, khóa ký và APK build 59 gốc: không thay đổi. Bằng chứng ở `../outputs/interactive-learning-2026-11-08/protected-before.json` và `protected-after.json`.
- Không đăng bài thử lên cộng đồng thật; không mở database của người học khi kiểm thử UI; không cài APK lên điện thoại.

## Chuyển động và khả năng tiếp cận

- Dùng thư viện sẵn có: React Native Animated, SVG, phát âm và phản hồi âm thanh/rung của app. Không thêm dependency hay tải artwork ngoài.
- Không có vòng lặp trang trí liên tục mới. Chuyển động ngắn theo thao tác và dừng khi app chuyển nền; pháo giấy chỉ xuất hiện sau khi hoàn thành lượt.
- Tôn trọng cài đặt giảm/tắt chuyển động và âm thanh. Có tùy chọn tắt riêng việc tự phát âm khi chạm đồ vật.
- Mảnh từ có thể kéo hoặc chạm; nút có nhãn và trạng thái cho trình đọc màn hình. Phản hồi có chữ và biểu tượng, không chỉ màu sắc.
- Giữ nút Quay lại của ứng dụng; thêm Đổi khung cảnh/Đổi thử thách/Về Luyện tập trong các luồng mới.

## Kiểm thử

1. `npm run typecheck`.
2. `npm run lint`: không có lỗi; 8 cảnh báo có sẵn ngoài phạm vi thay đổi.
3. `npm test -- --maxWorkers=4`: 236 file test, 1.332 test đạt, không có test lỗi.
4. `npx vitest run src/services/learning/interactive-learning.test.ts`: cấu trúc nội dung, ghép câu, đáp án, trùng dữ liệu, homophone, serialization và dữ liệu bài đố không hợp lệ.
5. `node scripts/qa-interactive-learning.cjs`: chạy component React Native Web thật với DB/audio/network thay bằng fixture. Đã kiểm tra đủ 4 cảnh/20 đồ vật/12 lượt hội thoại, bấm nhanh không nhảy lượt, kéo và chạm ghép câu, sai/xem mẫu, nguồn từ đã học và phân trang, bốn dạng luyện, trạng thái trống/lỗi/thử lại, tạo/sửa/chơi thử/đăng bài đố trong bộ nhớ, feed/detail, giao diện sáng/tối ở 320/390/768 px và giảm chuyển động. Kết quả: 10 nhóm kiểm tra đạt, 0 lỗi runtime.

Ảnh và log kiểm thử: `../outputs/interactive-learning-2026-11-08/`.

## Giới hạn xác minh

Kiểm thử UI dùng âm thanh giả lập và backend trong bộ nhớ; không thay cho kiểm tra chất lượng giọng TTS, TalkBack, cỡ chữ hệ thống hoặc thao tác kéo trên điện thoại thật. Phiên này chưa cài app lên thiết bị.

## Bản Android

Đóng gói ARM64 bằng Gradle release: **BUILD SUCCESSFUL**, 869 task. Lần đầu gặp lỗi công cụ CMake/worklets với Java 25; chạy lại bằng Java 21 đã cài sẵn, chỉ đặt biến môi trường cho lệnh build, không đổi cấu hình dự án.

- APK: `artifacts/interactive-learning-2026-11-08/4Chinese-0.1.57-build59-interactive-learning.apk`.
- Dung lượng: 100.540.192 byte, khoảng 95,9 MiB. Không tăng versionName/versionCode trong task này; nhận diện bản mới bằng tên thư mục và SHA-256.
- SHA-256: `da076ce6f897a882aa5d8adc5b59d0c3eada94dc204d1823231c47934fc9bfa2`.
- `apksigner verify`: đạt, chữ ký v2; certificate giống APK build 59 gốc. Application ID giữ nguyên.
- Đã đối chiếu nội dung 11 file nguồn của các hoạt động/bài đố với sourcemap của bản Android; bundle trong APK có SHA-256 khớp bundle được Gradle tạo. Các sửa cuối cho khóa bấm liên tục đã nằm trong artifact.
- Giữ nguyên APK gốc `artifacts/community-v3-2026-11-07/4Chinese-0.1.57-build59-community.apk`.
- Chưa cài hoặc chạy trên điện thoại. Không có thiết bị ADB sẵn sàng trong phiên xác minh.

## Cách thử nhanh khi mở bản mới

1. Trang chủ → **Tiếng Trung quanh mình** → chạm đủ 5 đồ vật trong một cảnh → chuyển **Thử hội thoại** và làm 3 lượt. Thử tắt tự phát âm.
2. Chọn **Ghép câu trong khung cảnh này** → kéo một từ lên khung, chạm các từ còn lại → kiểm tra. Thử sai một câu và dùng **Xem câu mẫu**; cuối lượt chọn luyện lại câu cần nhớ.
3. Luyện tập → **Thử thách ngắn** → thử đủ bốn dạng. Với Nghe & đoán/Tìm đôi, thử cả nguồn từ trong cảnh và từ đã học.
4. Cộng đồng → **Viết bài** → **Tạo bài đố tương tác** → chọn mẫu, sửa đáp án/lời giải → **Chơi thử trước khi đăng**. Chỉ đăng khi muốn chia sẻ thật; mở bài đã đăng để chơi cùng bình luận.
5. Cài đặt → giảm/tắt chuyển động hoặc âm thanh; quay lại các hoạt động để đối chiếu. Đổi giao diện sáng/tối và thử màn hình nhỏ.
