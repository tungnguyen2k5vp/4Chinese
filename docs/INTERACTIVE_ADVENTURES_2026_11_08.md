# 4Chinese — bốn hoạt động tương tác bổ sung

Ngày: 08/11/2026. Tiếp nối `INTERACTIVE_LEARNING_2026_11_08.md`.

## Đường vào và nội dung

Tất cả nằm trong **Luyện tập → Chạm, chơi và khám phá**. Từ màn khám phá khung cảnh cũng có nút mở nhiệm vụ giao đồ của đúng cảnh đó.

| Hoạt động | Nội dung | Tương tác thực tế |
| --- | --- | --- |
| Nhiệm vụ trong cảnh | 4 cảnh × 3 nhiệm vụ; mỗi cảnh có 5 đồ vật và 2 nơi nhận | Nghe yêu cầu, kéo đồ đến nơi nhận hoặc chạm đồ rồi chạm đích. Phân biệt sai đồ với sai vị trí; thả ngoài đích không tính sai. Có pinyin/nghĩa, thử lại, kết quả tính theo lần đầu và chơi lại/đổi cảnh. |
| Truyện có lựa chọn | 4 truyện, 2 quyết định/truyện, tổng cộng 16 kết thúc khác nhau | Lời đáp thật sự đổi nhánh tiếp theo. Nghe lời thoại, bật/tắt nghĩa và pinyin, xem lại hội thoại đã chọn ở cuối truyện, chơi nhánh khác. Không chấm đúng/sai. |
| Ghép thành phần Hán tự | 12 chữ: 休 明 林 妈 河 晴 请 字 安 男 问 国 | Chọn nhóm trái–phải, trên–dưới hoặc khung bao; hoặc luyện cả bộ. Kéo vào từng ô hoặc chạm để ghép, chạm ô để lấy phần ra. Có mảnh nhiễu, kiểm tra, xếp lại và xem mẫu khi sai. Hai mảnh 木 của 林 có ID riêng. |
| Tìm thông tin thực tế | Thực đơn, vé tàu, tin nhắn; mỗi tư liệu có 4 câu hỏi | Chạm dòng để đánh dấu dữ kiện, bật bản dịch hỗ trợ, nghe toàn tư liệu, chọn đáp án. Sau khi trả lời, các dòng làm căn cứ được gắn nhãn riêng và có giải thích. |

Nội dung là bài luyện cơ bản tự biên soạn, không phải tuyên bố bao phủ HSK 1–9. Thực đơn, vé và tin nhắn đều là mẫu giả lập; không dùng làm thông tin đặt vé, giao dịch hay lịch trình thật.

## Cấu tạo chữ và nguồn

`adventure-content.ts` dùng lại `characterStructure` từ `src/services/memory/character-content.ts`, không suy đoán phân rã cho chữ ngoài inventory. Giữ liên kết mục từ Hán Điển (`zdic.net/hans/<chữ>`) của inventory để người học đối chiếu.

Phân biệt bộ thủ tra cứu với thành phần hình thể. Các ghi chú nhắc vị trí/liên tưởng được ghi là gợi nhớ khi luyện, không phải từ nguyên. Ghi rõ vai trò gợi âm trong 妈, 河, 晴, 请; không định nghĩa từ bằng cách ghép nghĩa mọi thành phần. Các ô là sơ đồ học cấu tạo; hình chữ hoàn chỉnh được hiện riêng sau khi kiểm tra/xem mẫu.

Hình ảnh dùng lại SVG gốc `PracticeArt`/`PracticeObject` trong dự án. Không thêm artwork, âm thanh hoặc nhân vật của ứng dụng tham khảo; không thêm dependency.

## Chuyển động, điều hướng và khả năng tiếp cận

- Mảnh kéo bám thao tác, trả về khi thả ra ngoài; có cách chạm tương đương.
- Đồ giao đúng hiện tại đích, nhân vật phản hồi và có pháo giấy ngắn; không chờ animation để mở nút tiếp theo.
- Truyện dùng chuyển lời thoại; ghép chữ dùng hiệu ứng đóng dấu chữ hoàn chỉnh; đáp án có phản hồi thành công hoặc rung nhẹ khi sai.
- Dùng hiệu ứng Animated/SVG đã có và cài đặt giảm/tắt chuyển động của app. Dừng giọng đọc khi đổi lượt, rời màn hình hoặc chuyển nền. Khi tắt âm thanh vẫn có gợi ý bằng chữ.
- Chống bấm liên tục bằng khóa đồng bộ tại thao tác chọn, kiểm tra và chuyển lượt. Không nhảy câu hoặc tính hai lần một lần gửi.
- Lượt mới tự cuộn về đầu; màn chọn và màn kết quả có đường quay lại. Header native tiếp tục quản lý vùng an toàn và nút Back; deep link mới quay về `/practice` qua fallback có sẵn.
- Nút có nhãn/trạng thái trợ năng; phản hồi dùng chữ/biểu tượng cùng màu. Các ô giữ bố cục đọc được khi chữ lớn.

## Bảo vệ dữ liệu

Các hoạt động bổ sung chỉ dùng nội dung offline và state trong bộ nhớ. Không truy cập repository, không ghi SRS, XP, lịch ôn, trạng thái đã học hoặc tài khoản. Không sửa schema/migration, dữ liệu trong `data` hay cấu hình build/dependency. Thoát lượt luyện sẽ bỏ kết quả tự do của lượt đó.

Đã đối chiếu SHA-256 của **162 file được bảo vệ** từ trước lượt triển khai, gồm `src/db`, `data`, `supabase`, khóa ký và các APK đã có: **0 file thay đổi**. Bằng chứng: `../../outputs/interactive-adventures-2026-11-08/protected-before.json` và `protected-after.json`.

## Kiểm thử đã thực hiện

- `npm run typecheck`: đạt.
- `npm run lint`: 0 lỗi; 8 cảnh báo có sẵn ở file ngoài thay đổi này.
- `npm test -- --maxWorkers=4`: **237 file / 1.336 test đạt**.
- `adventure-content.test.ts`: nhiệm vụ đều có đồ giao và nơi nhận hợp lệ; đi hết đồ thị truyện, đủ 16 kết thúc, không vòng lặp/ngõ cụt; phân rã đúng inventory, thứ tự/mảnh lặp/khung 囗; mọi câu đọc có dòng dữ kiện tồn tại.
- `node scripts/qa-interactive-learning.cjs`: **17 nhóm đạt, 0 lỗi runtime** trên component React Native Web thật, dùng fixture cho DB/audio/network. Đã chạy đủ nội dung mới và kiểm tra hồi quy hoạt động cũ/bài đố cộng đồng.
- UI đã thử sai/đúng, kéo/chạm, bấm hai lần liên tục, xếp lại/xem mẫu, chơi lại/đổi nhóm, mọi kết thúc và hội thoại, đánh dấu/dịch/đối chiếu dữ kiện, tự cuộn về câu mới. Kiểm tra sáng/tối ở 320/390/768 px, giảm chuyển động, tắt âm thanh, phóng chữ thêm 35% ở màn 320 px.

Ảnh và kết quả: `../../outputs/interactive-adventures-2026-11-08/`. Runner không mở database người học hoặc gọi backend thật; không đăng bài thử.

## APK đã đóng gói

- File: `artifacts/interactive-adventures-2026-11-08/4Chinese-0.1.57-build59-interactive-adventures.apk`.
- Dung lượng: **100.615.656 byte**, tăng 75.464 byte (khoảng 73,7 KiB) so với APK tương tác của đợt trước.
- SHA-256: `c7eebd04639711e93b362a8be423e8bf80ab7c5923a729e13fdb74a7c128795d`.
- Gradle release ARM64: **BUILD SUCCESSFUL**, 869 task. Dùng Java 21 đã cài, chỉ đặt biến môi trường cho tiến trình build. Log: `android-build-final.log` trong thư mục bằng chứng.
- `apksigner verify`: đạt, chữ ký v2; certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, khớp bản gốc.
- Giữ application ID `com.tungnguyen2k5vp.fourchinese`, versionName `0.1.57`, versionCode `59`; nhận diện artifact bằng đường dẫn và SHA-256. Không sửa cấu hình phiên bản.
- Đối chiếu **12 file nguồn** của hoạt động/điều hướng với `sourcesContent` trong sourcemap của build: trùng nội dung hiện tại. SHA-256 bundle trong APK trùng bundle Gradle vừa tạo. Kết quả: `apk-content-verification.json`.
- Giữ nguyên các APK cũ, bao gồm bản cộng đồng và bản tương tác trước. **Chưa cài APK lên điện thoại.**

## Giới hạn và bước kiểm tra trên thiết bị

Kiểm thử browser không xác minh được chất lượng giọng TTS, TalkBack, cỡ chữ Android thực hoặc độ mượt của gesture trên thiết bị. Phiên này chưa cài APK hoặc chạy lượt học trên điện thoại.

Khi cài bản mới theo yêu cầu riêng, kiểm tra: cả hai cách kéo/chạm ở cảnh và ghép chữ; thứ tự âm thanh khi đổi câu nhanh/chuyển nền; chữ lớn và thao tác Back; đủ 16 kết thúc và dòng dữ kiện đáp án. Chỉ thử trong bốn hoạt động tự do, không làm bài trong luồng lưu tiến độ của người học.
