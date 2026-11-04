# Chất lượng nguồn English — 10/10/2026

Số liệu từ SQLite **đã tải và kiểm tra thực tế**, không chỉ từ README:

| Chỉ số | Source A / staging |
|---|---:|
| English headwords/expressions | 104.829 |
| Definitions dùng chung trong source | 158.307 |
| Word–definition links → senses trong staging | 175.735 |
| Pronunciations | 108.776 |
| Nonempty example links | 175.735 |
| Word thiếu linked sense / IPA | 0 / 0 |
| Linked senses thiếu nghĩa Việt / POS | 0 / 0 |
| Sense-specific pronunciation links | 0 |
| Independently reviewed entries | 0 |
| Forms / CEFR mappings đã nhập | 0 / 0 |

Source definitions có 6 POS NULL trong toàn bảng; điều này khác coverage của các linked English senses (0 thiếu POS). Không dùng số của toàn definitions làm số linked senses.

Staging IPA records: US2.721; UK42.852; unspecified63.203. Đây là **số record**, không phải số word có cả hai accent. Region gốc vẫn lưu; một vài region như Hà-Nội/Huế xuất hiện dù word.lang_code=en — cần review contamination, không tự gán là giọng Mỹ/Anh.

8 homographs `lead/read/wind/tear/bow/close/live/bass` mỗi từ chỉ có một IPA trong nguồn. Không đủ bằng chứng phát âm theo từng nghĩa; schema cho phép nhiều IPA/sense nhưng corpus hiện chưa đủ. 100% có chuỗi IPA không có nghĩa 100% phát âm đúng.

Examples nguồn có generation/enrichment; mọi example staging đánh dấu generated_unreviewed, không coi là native recording hay câu đã được người biên tập duyệt. Không có bản dịch Việt cho example từ nguồn này; translation_vi=NULL. Nghĩa được giữ nguyên, không AI dịch lại. `book` có8 source-link senses trong staging.

Phrasal verbs/idioms thực tế chưa được classifier xác minh: count **chưa xác định**, không dùng quảng cáo README làm count nghiệm thu. Multiword entries vẫn được giữ là PHRASE, không tách thành từ rời. Irregular corpus count0, dù model và synthetic tests hỗ trợ went→go. Không được báo morphology hoàn chỉnh.

DB nguồn44.212.224 bytes; DB staging160.399.360 bytes (~153 MiB). Index/long stable IDs và relational data làm pack lớn hơn source. Chưa benchmark điện thoại; chưa chọn core subset/optional pack. Đây là lý do không đưa nguyên file vào APK.

Chi tiết: [source audit](../artifacts/v7-2026-10-10/dry-run-01/source-audit.json), [pack report](../artifacts/v7-2026-10-10/staging-pack-02/pack-report.json), [PC benchmark](../artifacts/v7-2026-10-10/english-benchmark.json).
