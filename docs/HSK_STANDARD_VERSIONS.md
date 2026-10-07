# Chuẩn HSK có phiên bản

Schema V32 bổ sung hsk_standard_versions, hsk_reference_entries,
hsk_vocabulary_alignment và hsk_content_alignment. Các bảng cũ giữ nguyên.

Không tự seed một chuẩn thành VERIFIED từ tên gọi HSK 3.0. Người nhập phải cung cấp
nguồn, phiên bản, ngày hiệu lực và căn cứ kiểm chứng. Chuẩn năng lực, syllabus thi
và lịch triển khai thi là ba thông tin khác nhau; không suy diễn từ cái này sang cái kia.

Nguồn chính thức để đối chiếu:
- https://www.chinesetest.cn/syllabus
- https://www.chinesetest.cn/HSK/1?type=syllabus

Chưa nhập danh mục chính thức được kiểm chứng tại thời điểm báo cáo.
Reference của các bài test chỉ là fixture, không được đưa vào dữ liệu sản phẩm.

## Hợp đồng import

File JSON: mảng identifier, simplified, pinyinNumeric, level, sourceRef.
Level: 1–6 hoặc 7-9. identifier và khóa chữ + pinyin phải duy nhất;
không gộp các cách đọc khác nhau. Nếu nguồn có nghĩa/định danh sense riêng,
cần mở rộng importer trước khi nhập thay vì làm mất sense.

Chạy `npx tsx scripts/audit-hsk-coverage.ts <reference.json>`.
Không truyền reference: báo cáo các số chính thức và coverage bằng null.
Không tự sửa cấp độ từ hiện có khi gặp conflict.

Importer SQLite: src/db/hsk-reference.ts. Mỗi version chỉ nhập một lần;
muốn thay nội dung phải tạo version mới. Toàn bộ import + crosswalk atomic,
kiểm tra số lượng và foreign keys trước commit. Custom words không bị đem
so sánh vào syllabus. Thiếu official entry được phản ánh trong báo cáo;
import không tự tuyên bố nội dung VERIFIED.
