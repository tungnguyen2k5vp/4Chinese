# Sửa thiếu đáp án ôn tiếng Trung — build 48

## Kết quả

- APK độc lập 0.1.46 / build 48 đã cài cập nhật trên Realme 8, Android 13; không gỡ ứng dụng, không xóa dữ liệu.
- Nguyên nhân: bộ sinh đáp án đã có đủ ba đáp án nhiễu nhưng tiếp tục thêm từ danh mục. Tổng đáp án vượt bốn khiến thành phần giao diện từ chối hiển thị và báo nhầm thiếu dữ liệu.
- Đã giới hạn đúng ba đáp án nhiễu, loại trùng; dùng toàn bộ kho offline làm nguồn bổ sung cho bộ nhỏ và khi SQLite không trả dữ liệu. Áp dụng cả nghĩa và pinyin, không sửa nghĩa hay tiến độ người học.
- Kiểm tra toàn kho: 11.877 từ, 118.770 bộ đáp án ở kích thước phiên 1/5/10/15/20; không có bộ đáp án lỗi.
- Vitest: 204 file, 1.117 test đạt. Typecheck và lint phần sửa đạt.
- Kiểm tra thành phần thực tế: bốn tình huống đạt, gồm bộ nhỏ và lỗi SQLite.
- Trên điện thoại: 老板 hiện bốn nghĩa riêng biệt; chọn “sếp” hiện lǎo bǎn. Không bấm chấm cấp nhớ trong lần kiểm tra này.

## Bằng chứng

- `artifacts/review-four-answers-fix-2026-10-14/catalog-audit.json`
- `artifacts/review-four-answers-fix-2026-10-14/screens/index.html`
- `artifacts/chinese-device-ui-2026-10-14-build48/index.html`: ảnh giao diện trên điện thoại, đang bổ sung theo từng nhóm.
- APK: `artifacts/native-release-build48-2026-10-14/4Chinese-0.1.46-build48-arm64-release.apk`
- SHA256 APK: `492EA01980A267C364A0A9EB640BC1E638E32F27A0832D3C7137CC3A78422E50`

Đây là bản release sideload với chữ ký đang dùng để cập nhật tương thích; không phải xác nhận chữ ký phát hành cửa hàng. Ảnh chụp chỉ chứng minh giao diện/trạng thái được ghi nhận, không đồng nghĩa mọi chức năng, quyền micro hay API ngoài đã kiểm thử hoàn tất.
