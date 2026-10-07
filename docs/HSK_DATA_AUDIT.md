# Kiểm toán dữ liệu HSK

Script: scripts/audit-hsk-coverage.ts. Kết quả máy đọc: HSK_DATA_AUDIT.json.

EXACT và NORMALIZED_MATCH được tính matched; LEVEL_CONFLICT và NEEDS_REVIEW
không được tính độ phủ. Không bỏ thanh điệu pinyin, không tự chuyển phồn thể
thành giản thể. Một official entry không được đếm hai lần do lexical duplicate.

Khi reference chưa nhập: matched/missing/extra/conflicts/coverage là null.
MISSING_REFERENCE trên một row lúc này có nghĩa chưa thể đối chiếu, không phải
kết luận từ đó thiếu trong syllabus.

Giới hạn hiện tại: lexical + level alignment, chưa xác nhận sense, nghĩa Việt,
quyền phân phối, grammar/Hanzi/syllable coverage hoặc cấu trúc đề thi.
Không được dùng báo cáo này để quảng cáo đảm bảo đỗ HSK.
