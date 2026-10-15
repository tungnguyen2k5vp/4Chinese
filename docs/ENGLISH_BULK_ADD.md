# V7 — Nhập nhiều thẻ tiếng Anh

## Cập nhật ngày 11/10/2026 — danh sách từ được tự tra nghĩa

Luồng hiện tại: Kho từ tiếng Anh → Nhập danh sách từ → đặt tên bộ mới hoặc chọn bộ có sẵn → nhập tối đa 100 từ/cụm, mỗi dòng một từ → Nhận diện từ → xem/chọn/sửa nghĩa hoặc bấm × bỏ từng dòng → Thêm toàn bộ các từ đã chọn.

Nguồn chính của luồng này là SQLite gốc Skypedia tại commit `388adc0826300912e5b0311c089e0e70494b065f`. App tải trực tiếp khoảng 42 MB một lần, lưu vào database từ điển riêng và tra offline. Không nhúng corpus staging vào APK, không tự đổi gate quyền phân phối thành APPROVED. Trang Nguồn từ điển hiển thị ghi công và các giới hạn chất lượng. Hai cột TAB cũ vẫn dùng được mà không cần tải từ điển.

Màn xem trước có loại từ, IPA và ví dụ nếu nguồn cung cấp; từ nhiều nghĩa có danh sách chọn. Không tìm thấy thì người học tự nhập nghĩa hoặc bỏ từ, không tự sinh bản dịch giả. Khi sửa nghĩa khác nguồn, thẻ được lưu là nội dung USER, không gán nhầm provenance của từ điển.

Bộ mới và tất cả thẻ được ghi trong một giao dịch; lỗi/trùng với bộ hiện có rollback cả lô, giữ bản nháp. Bản nháp giữ cả nghĩa đã chọn và các dòng đã bỏ. Nhập không cộng XP hay thay lịch học cũ. Thẻ NEW cần bấm Bắt đầu học để vào LV1; tiếp tục dùng scheduler chung LV1–LV5 và Nhớ sâu.

Kho từ có biểu đồ cấp nhớ, số từ chưa học/đến hạn, số lượng bộ thực tế không giới hạn ở trang 25 thẻ, thẻ từ chi tiết, US/UK TTS và danh sách từ đã bỏ qua có thể khôi phục lịch cũ. Không tạo ảnh minh họa giả: nguồn SQLite này không cung cấp ảnh.

Bộ ảnh mới: `artifacts/english-personal-vocabulary-2026-10-11/index.html`. Chi tiết nghiệm thu: `docs/ENGLISH_PERSONAL_VOCABULARY_QA_2026-10-11.md`.

## Nội dung lịch sử trước lần cập nhật trên

Các giới hạn “không tự tra nghĩa” dưới đây mô tả phiên bản cũ, không còn mô tả luồng hiện tại.

## Luồng đang dùng được

Mở Kho từ khi đang học tiếng Anh → Thêm nhiều thẻ cá nhân tiếng Anh. Tạo bộ từ trước, chọn bộ nhận, dán hai cột từ bảng tính (từ/cụm tiếng Anh và một nghĩa tiếng Việt, phân cách TAB). Bấm kiểm tra để xem toàn bộ các cặp, sau đó xác nhận lưu.

- Tối đa 100 dòng không rỗng mỗi lô; từng từ tối đa 300 ký tự, nghĩa tối đa 2.000 ký tự.
- Thiếu nghĩa, thừa cột, cặp từ/nghĩa trùng trong lô hoặc vượt giới hạn sẽ chặn toàn bộ thao tác lưu. Không tự bỏ dòng lỗi để nhập một phần.
- Cùng từ với nghĩa khác là hai thẻ riêng. Cụm từ, dấu nháy và dấu gạch nối được giữ nguyên. Không tự gộp vào các thẻ đã có trong bộ; UI nêu rõ điều này trước khi xác nhận.
- Người học tự chọn nghĩa, nguồn `USER`; không giả là từ điển đã kiểm duyệt, không tự sinh IPA/CEFR.
- Bản nháp lưu cục bộ trong `en_drafts`, có trạng thái đang lưu/đã lưu/lỗi. Chỉ cam kết dữ liệu đã ghi thành công, không cam kết phần nhập bị tắt app trước khi commit.
- Thêm thẻ và xóa bản nháp của lô trong cùng transaction. Lỗi ở bất kỳ thẻ nào rollback cả lô, giữ bản nháp. Bản nháp thêm một thẻ riêng không bị xóa.
- Các thẻ mới vẫn NEW, không tự đến hạn, không cộng XP khi nhập.

## Quản lý bộ từ

Route `/english/decks` hỗ trợ đổi tên, xác nhận đưa vào thùng rác và khôi phục. Thùng rác không xóa thẻ, ID, lịch SRS, nghĩa, ghi chú hoặc lịch sử. Bộ không hoạt động bị loại khỏi kế hoạch/due queue; khôi phục dùng lịch cũ. Không có xóa vĩnh viễn. Thẻ có thể tạm ngưng/tiếp tục ôn trong bộ từ.

## Bằng chứng và giới hạn

Parser/repository kiểm thử 10/50/100, trùng cặp, nhiều nghĩa, thiếu cột, giới hạn, rollback và giữ draft. Web E2E đã kiểm thử ba kích thước lô qua UI. Chưa xác minh bàn phím/clipboard Android hoặc iOS.

Đây là **nhập cặp từ/nghĩa cá nhân**, không phải UI tra từ điển rồi chọn nhiều sense. Bộ phân tích dictionary đã có ở lớp dữ liệu nhưng corpus vẫn bị gate quyền phân phối. Không đưa corpus staging vào APK để hoàn thành giả luồng này.
