# Chuyển bộ từ kèm tiến độ — 04/11/2026

APK nội bộ: **0.1.54 (56)**. Áp dụng cho bộ từ tiếng Trung.

- **Máy gửi:** Bộ từ → Công cụ bộ từ → Chia sẻ → bật “Kèm tiến độ học” → Tạo mã và chia sẻ. Mỗi mã tối đa 500 từ; bộ lớn bị báo lỗi, không tự cắt bớt. Mã lưu trạng thái tại lúc tạo, không đồng bộ liên tục. Muốn chuyển tiến độ mới nhất cần tạo mã mới.
- **Máy nhận:** Thêm bộ bạn bè → nhập mã → Xem trước → “Nhập kèm tiến độ”. Giữ trạng thái đã học/đã biết/bỏ qua, mức nhớ, số lần ôn, các bộ đếm SRS và thời điểm ôn gốc. Có thể tắt nhập tiến độ để giữ tiến độ hiện có. Khớp từ bằng chữ và cách đọc, không dùng ID từ máy gửi.
- **Reset:** nút “Reset tiến độ bộ từ” trong thẻ Tiến độ, cần xác nhận. Đưa các từ về NEW, xóa lịch sử ôn, Sổ lỗi và điểm kỹ năng của các từ đó. Giữ nội dung, ghi chú, yêu thích, XP, thống kê tổng và bảng tiến độ lộ trình. Tiến độ theo từ được dùng chung: từ có trong bộ khác cũng bị reset. Không có nút hoàn tác; sao lưu đầy đủ nếu cần giữ cả lịch sử.
- **Giới hạn chuyển:** không chuyển ghi chú, yêu thích, XP, lịch sử từng lượt ôn hoặc điểm kỹ năng riêng. Mã kèm tiến độ khôi phục trạng thái SRS và bộ đếm; bản sao lưu đầy đủ dùng để chuyển toàn bộ dữ liệu cá nhân. Mã cũ không chứa tiến độ thì không thể tự khôi phục tiến độ người gửi; cần chia sẻ lại bằng bản mới.

Chỉ tạo **mã 8 ký tự** bằng RPC hiện có; dữ liệu và tiến độ nằm trên máy chủ theo mã, không nằm trong một chuỗi dài gửi cho người nhận. v2 không cần sửa SQL backend. Khi mất mạng/dịch vụ lỗi, app báo lỗi để thử lại, không tạo mã dài dự phòng. Cần mạng khi tạo/nhập mã và bản app mới trên hai máy để chuyển tiến độ. Bộ giải mã vẫn đọc mã cũ để tương thích dữ liệu trước đây. Payload tiến độ sai/thiếu bị từ chối trước khi ghi; lỗi giữa chừng hoàn tác toàn bộ từ và tiến độ trong transaction.

## Kiểm chứng

- 15/15 kiểm tra chia sẻ/tiến độ đạt, gồm SQLite thực ở hai database, trạng thái NEW/KNOWN/SKIPPED, từ đa âm, ngày đến hạn, giữ tiến độ khi bỏ chọn nhập, reset đúng phạm vi và rollback khi ghi lỗi.
- Bộ test chung: 1.280/1.282 đạt. Hai lỗi kỳ vọng schema 46 thay vì 47 giống hoàn toàn lượt trước. Không sửa schema/migrations hoặc thư viện; chỉ tăng metadata phiên bản APK.
- Typecheck đạt; ESLint các file sửa không lỗi/cảnh báo. Bộ lint chung còn tám cảnh báo có sẵn.
- Browser QA: luồng thật với SQLite và hai context riêng; RPC/chia sẻ hệ điều hành được giả lập, chặn mạng ngoài. Kiểm tra xem trước/hủy, nhập tiến độ, reload, tạo mã, gửi lại cùng mã, chia sẻ không tiến độ, lỗi mạng/thử lại không tạo mã dài, reset/hủy và nhập mã gốc trên máy thứ hai sau reset máy gửi. Giao diện 390px sáng và 320px tối.
- APK universal bốn ABI, chữ ký v2 hợp lệ; build bằng JDK 19 và Gradle cache hiện có. Cài đè bằng `adb install -r`, không gỡ app hoặc xóa dữ liệu. Kết quả kiểm tra sau cài nằm trong artifact bên dưới.
- Đã cài **0.1.54 (56)** trên Realme RMX3085 và mở app thành công. Trước/sau vẫn 57 từ đến hạn; tên bộ từ và số liệu đang hiển thị khớp nhau. Đã mở rồi hủy hộp reset, mở rồi đóng hộp chia sẻ trên Android thật; không reset/nhập đè hoặc gửi tiến độ thật lên máy chủ khi kiểm tra.

Artifact: `D:/ReactJS/4Chinese-Archive/deck-progress-2026-11-04/` có APK, log build/cài, test JSON, ảnh QA, manifest source và đối chiếu trước/sau trên điện thoại. Không thử reset/nhập đè tiến độ thật của người học trên điện thoại.

Chạy lại kiểm tra chức năng:

```powershell
npx vitest run src/db/deck-progress.test.ts src/services/decks/share-code.test.ts src/services/decks/short-share.test.ts
```
