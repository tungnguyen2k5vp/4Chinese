# HSK syllabus alignment

Versioned-standard schema 32 gồm chuẩn, reference vocabulary/Hanzi/grammar/syllables và crosswalk.
Không đổi vocabulary IDs hoặc nhân bản từ chỉ để đổi version HSK.

Importer bất biến theo version, validate counts/FK/duplicate rồi commit; lỗi rollback.
Nguồn nhập UNVERIFIED, không tự gắn VERIFIED vì JSON hợp lệ.
Vocabulary auditor giữ thanh điệu; EXACT/NORMALIZED_MATCH được tính matched;
LEVEL_CONFLICT/NEEDS_REVIEW không tính matched và duplicate không đếm hai lần.

## Cập nhật 2026-10-03

Đã trích xuất PDF chính thức từ trang ChineseTest thành dữ liệu tra cứu offline:
`src/data/hsk-syllabus-official.json`. PDF công bố tháng 11/2025, áp dụng từ
tháng 7/2026; 11.000 mục từ và các phần nhiệm vụ giao tiếp, chủ đề, Hán tự,
ngữ pháp theo HSK 1–6 và nhóm 7–9. Mỗi mục có số thứ tự và trang PDF nguồn.
Số mục mới theo cấp: 300 / 200 / 500 / 1000 / 1600 / 1800 / 5600.
Đây không phải số tích lũy của các cấp trước.

UI HSK > Syllabus và `/hsk/syllabus` cho chọn cấp, tìm từ, mở chi tiết từ
đang có, đọc nguyên văn các phần chương trình và xem mục cần đối chiếu.
`getSyllabusAlignment` so chữ + pinyin có thanh điệu + cấp bằng truy vấn đọc;
phân loại khớp, khác cấp, cần xem cách đọc và thiếu chữ. Không ghi lại SQLite,
không thay vocabulary ID, cấp CSV, bộ từ riêng hay tiến độ SRS.

PDF mới và CSV người dùng không cùng phân cấp. Kho từ tiếp tục theo CSV như
yêu cầu trước đó; không âm thầm chuyển theo PDF hoặc tính khác cấp là khớp.
Chênh lệch cách đọc/biến điệu được giữ để rà soát, không bỏ thanh điệu để tăng
con số bao phủ. Crosswalk chạy từ DB hiện tại, chưa đưa thành bản chuẩn VERIFIED
trong schema 32 hay bật completeness/readiness gate.

Giới hạn: các trang chương trình là nguyên văn tiếng Trung, không phải mọi
mục ngữ pháp đã có bài giảng tiếng Việt và bài luyện tương ứng. Chưa chứng nhận
đủ kiến thức thi, chưa independent review toàn bộ nội dung, chưa xác nhận quyền
tái phân phối PDF/corpus cho bản phát hành công khai. Coverage học thuật bốn
chiều vẫn cần thẩm định; tra cứu syllabus không đồng nghĩa hoàn thành giáo trình.

Nguồn PDF: https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf
SHA-256: ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941
Tái tạo bằng `scripts/extract-hsk-syllabus.py` với pypdf.
Source page đã kiểm tra trong baseline: https://www.chinesetest.cn/syllabus.
Đọc được trang không có nghĩa đã tải/đối chiếu PDF hoặc có quyền phân phối corpus.

Bước còn lại: xác nhận license, independent review, chuẩn hóa reading/sense và crosswalk,
báo matched/missing/extra/sense/level conflicts, kiểm tra bốn chiều trước bật completeness gate.
Không dùng LLM tự tạo “official” list, scoring rules hoặc sample exams.
