# 4CHINESE V7.1 — CHI TIẾT AUDIT TỪNG MÀN HÌNH TIẾNG ANH

## 1. Màn hình English Home (`src/app/english/activity.tsx`)

### Hiện trạng
- Tiêu đề tĩnh: "Kế hoạch học tiếng Anh".
- Nút "Đọc văn bản tiếng Anh cá nhân" đặt lạc lõng phía trên.
- Một khung lớn hiển thị: "0 thẻ đến hạn · 0 thẻ chưa học", "Hôm nay: 0 lượt ôn · 0 đúng".
- 3 nút bấm xanh lá full-width xếp chồng: Ôn tiếng Anh đến hạn (disabled), Mở bộ từ để học thẻ mới, Ôn nhanh tiếng Anh (disabled).
- Phần Sổ lỗi hiển thị đoạn văn bản giải thích dài và text "Chưa có câu trả lời sai được lưu."

### Kế hoạch Redesign
- **Header:** Lời chào cá nhân hóa, huy hiệu "English Mode" năng động, thanh trạng thái học tập.
- **Hero Banner:** Minh họa hành trình tiếng Anh (English Journey Vector), thông điệp truyền cảm hứng học tập, CTA nổi bật theo trạng thái thực tế ("Bắt đầu bộ từ đầu tiên" khi trống, "Tiếp tục ôn tập" khi có thẻ).
- **Today's Progress:** Bộ thẻ metric trực quan: Từ đến hạn, Từ đã học, Thời gian phản hồi, Tỷ lệ chính xác.
- **Quick Learning Chips:** Các phiên học nhanh (3 phút, 5 phút, 10 phút) có biểu tượng sinh động.
- **Daily Missions:** Danh sách nhiệm vụ hằng ngày gắn liền với hoạt động thực tế (Ôn từ, Học từ mới, Luyện chính tả, Đọc văn bản).
- **Explore Skills:** Lưới kỹ năng trực quan (Kho từ vựng, Ôn tập Flashcard, Đọc tiếng Anh cá nhân, Lộ trình CEFR).
- **Mistake Book:** Danh sách thẻ sai dạng card trực quan với badge độ sai, thời gian và trạng thái lịch ôn.
- **Empty State người mới:** Minh họa tươi sáng, hướng dẫn 2 bước khởi tạo bộ từ đầu tiên.

---

## 2. Màn hình Cấp độ CEFR (`src/components/EnglishOverview.tsx`)

### Hiện trạng
- Tiêu đề: "Cấp độ tiếng Anh · CEFR".
- Hai đoạn text thô sơ giải thích "Chưa có dữ liệu phân cấp CEFR...".
- Một nút bấm "Mở bộ từ tiếng Anh".

### Kế hoạch Redesign
- **Level Explorer Journey:** Giới thiệu trực quan 6 bậc khung tham chiếu CEFR châu Âu: A1 (Căn bản), A2 (Sơ cấp), B1 (Trung cấp), B2 (Trung cao), C1 (Cao cấp), C2 (Thành thạo).
- Mỗi cấp độ có mã màu nhận diện riêng (A1 Emerald, A2 Teal, B1 Blue, B2 Indigo, C1 Purple, C2 Rose), số từ vựng tiêu chuẩn ước tính, mục tiêu kỹ năng.
- Trạng thái trung thực: Huy hiệu "Đang xây dựng giáo trình" / "Sắp ra mắt" không che giấu giới hạn dữ liệu.
- Useful Fallbacks: Các nút hành động dẫn tới chức năng thực tế có thể dùng ngay: "Học bộ từ cá nhân", "Đọc văn bản tiếng Anh", "Luyện viết chính tả".

---

## 3. Màn hình Kho từ vựng tiếng Anh (`src/app/english/index.tsx`)

### Hiện trạng
- Hàng loạt text cảnh báo bản quyền và kỹ thuật ở đầu trang.
- Một card thống kê số 0.
- 6 nút xanh liên tiếp xếp dọc: Quản lý bộ từ, Thêm nhiều thẻ, Kế hoạch ngày, Ôn đến hạn, Ôn chính tả, Ôn nhanh.
- Form "Tạo bộ từ" và "Thêm một nghĩa" hiển thị trần trụi ngay giữa màn hình.

### Kế hoạch Redesign
- **Vocabulary Hub Header:** Tiêu đề hiện đại, thống kê tổng số từ, số từ đang học, số từ cần ôn dạng thẻ số liệu (Stats Pill Grid).
- **Primary Action Buttons:** 2 nút hành động lớn nổi bật: "Tạo bộ từ mới" (kèm icon và viền gradient nhẹ), "Thêm nhiều từ (Bulk Add)".
- **My Decks Cards:** Danh sách bộ từ dạng Card hiện đại: Tên bộ, số lượng từ, số thẻ đến hạn, nút "Học ngay" và menu tùy chọn.
- **Quick Actions Grid:** Lưới các tiện ích: Quản lý & Thùng rác, Kế hoạch học, Đọc văn bản.
- **Creation Flow:** Form thêm thẻ thủ công và tạo bộ từ được chuyển vào modal / sheet thu gọn hoặc card chuyên dụng có animation mượt mà.
- **Empty Deck State:** Minh họa Flashcards / Sách học, lời mời tạo bộ từ đầu tiên ấm áp, thân thiện.

---

## 4. Màn hình Nhập nhiều từ tiếng Anh (`src/app/english/bulk.tsx`)

### Hiện trạng
- Textarea lớn và khối văn bản giải thích định dạng TAB dài.
- Người dùng không có cảm giác tiến trình (progress indicator).

### Kế hoạch Redesign
- **Step Flow (4 bước rõ ràng):**
  - Bước 1: Nhập danh sách (Textarea hiện đại, bộ đếm số dòng, nút xem định dạng mẫu).
  - Bước 2: Kiểm tra định dạng (Tự động phân tích các dòng hợp lệ / lỗi).
  - Bước 3: Xem trước thẻ (Hiển thị thẻ xem trước với badge trạng thái "Hợp lệ", "Lỗi cú pháp").
  - Bước 4: Xác nhận lưu (Nút lưu nổi bật với số lượng thẻ thực tế).
- Thông báo thành công với micro-animation chúc mừng.

---

## 5. Màn hình Ôn tập Flashcard tiếng Anh (`src/app/english/review.tsx`)

### Hiện trạng
- Khi queue trống: chỉ có một dòng chữ "Không còn thẻ đến hạn...".
- Khi có thẻ: hiển thị cơ bản, không có hiệu ứng chuyển thẻ (flip animation), không có phân cấp nút nhớ / quên.

### Kế hoạch Redesign
- **Flashcard Surface:** Thẻ từ vựng lớn, hiệu ứng đổ bóng và viền sang trọng, hiển thị headword kích thước lớn, IPA rõ ràng, nút phát âm âm thanh giọng US/UK.
- **Meaning Review Flow:** Mặt trước (Từ tiếng Anh) -> Nút "Hiện nghĩa" -> Mặt sau (Nghĩa tiếng Việt, ghi chú) -> 2 nút đánh giá: "Chưa nhớ" (Coral/Red) và "Đã nhớ" (Emerald/Green).
- **Spelling Review Flow:** Hiển thị nghĩa tiếng Việt làm đề bài -> Ô nhập từ tiếng Anh -> Kiểm tra chính tả -> Phản hồi tức thì với màu sắc và âm thanh haptic.
- **Quick Review:** Header nhỏ gọn, thanh tiến trình đếm ngược 5 thẻ, nhịp ôn nhanh.
- **Empty State:** Minh họa chuông nghỉ ngơi / vương miện hoàn thành, thông báo rõ ràng "Bạn đã hoàn thành phiên ôn tập!", nút quay về Trang chủ hoặc Thư viện từ.

---

## 6. Màn hình Đọc tiếng Anh cá nhân (`src/app/english/reader.tsx`)

### Hiện trạng
- Form nhập tiêu đề và văn bản 100k ký tự đập ngay vào mắt khi mở màn hình, không giống một ứng dụng đọc sách.

### Kế hoạch Redesign
- **Reader Landing:**
  - Nếu đã có bài đọc: Hiển thị Thẻ bài đọc hiện tại (Tiêu đề, tiến độ %, vị trí đọc), nút "Tiếp tục đọc" lớn.
  - Thẻ "Dán & Thêm văn bản mới" mở giao diện nhập văn bản riêng biệt, tập trung.
- **Reading Surface:** Giao diện đọc tối giản (calm reading mode), điều chỉnh cỡ chữ, khoảng cách dòng, phân tách từ tiếng Anh có thể chạm để tra cứu nhanh.
- **Word Lookup Bottom Sheet:** Khi chạm vào từ, hiển thị bottom sheet tra cứu trong bộ từ cá nhân, hiển thị IPA, nghĩa tiếng Việt, và nút "Lưu nhanh vào bộ từ".

---

## 7. Màn hình Thống kê tiếng Anh (`src/components/EnglishOverview.tsx`)

### Hiện trạng
- Một card duy nhất chứa 5 dòng text số liệu, không có biểu đồ hay phân tích.

### Kế hoạch Redesign
- **Progressive Dashboard:**
  - Empty State: Minh họa mầm cây / sự tăng trưởng, lời khích lệ hoàn thành buổi học đầu tiên để thấy dữ liệu ghi nhớ.
  - Populated State: Lưới thẻ chỉ số (Thời gian học, Số từ đã học, Lượt ôn, Tỷ lệ nhớ, Điểm XP tiếng Anh, Chuỗi ngày học Streak).
  - Biểu đồ phân bổ tiến độ học tập.
  - Phân tách tuyệt đối dữ liệu tiếng Anh, không cộng gộp với tiếng Trung.

---

## 8. Màn hình Cài đặt & Chọn ngôn ngữ (`src/app/(tabs)/profile.tsx`)

### Hiện trạng
- Trong chế độ tiếng Anh vẫn hiển thị tùy chọn: "Hiện Pinyin", "Màu thanh điệu".

### Kế hoạch Redesign
- **Language Mode Context:** Ẩn hoặc nhóm riêng các thiết lập chuyên biệt cho tiếng Trung vào phần "Cài đặt tiếng Trung" khi đang học tiếng Anh.
- Giữ nguyên 100% giá trị lưu trong CSDL của các thiết lập này.
- Hiển thị nổi bật cài đặt dành riêng cho tiếng Anh: Chọn giọng phát âm Anh-Mỹ (US) / Anh-Anh (GB), tốc độ phát âm, âm thanh, rung phản hồi.
- Bộ chọn ngôn ngữ (Language Selector) dạng Segmented Pill sang trọng, có biểu tượng lá cờ / ký hiệu đặc trưng.
