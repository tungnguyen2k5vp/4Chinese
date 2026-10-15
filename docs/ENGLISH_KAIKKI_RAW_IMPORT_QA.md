# V7 — nhập raw Wiktionary tiếng Việt (11/10/2026)

## Kết quả thực tế

Đã tải và xử lý **raw viwiktionary**, không dùng bản post-processed trộn nguồn khác. Đây là staging kiểm thử, **chưa cài vào runtime/APK, chưa phê duyệt phân phối**. Không sửa database hay vocabulary tiếng Trung.

Snapshot [Kaikki raw](https://kaikki.org/viwiktionary/rawdata.html): dump 01/09/2026, extraction 03/10/2026; metadata HTML và [quy định bản quyền Wiktionary, oldid2210567](https://vi.wiktionary.org/w/index.php?title=Wiktionary:Quy%E1%BB%81n_t%C3%A1c_gi%E1%BA%A3&oldid=2210567) được lưu cùng nguồn. Raw gzip 33.773.177 bytes, SHA256 `106d8bd9d1161eef6c9097be4eb8c8c41c3cfd4c8747cf5f78aa541e0759895e`. Đây là checksum **tự tính sau tải**, không phải checksum upstream ký/xác thực độc lập. URL dữ liệu có thể thay đổi; rerun importer kiểm checksum snapshot đã lưu, không mặc định download lần sau giống lần này.

Artifact nguồn: `artifacts/v7-2026-10-11/sources/kaikki-vi-raw-retry/`. Lần tải sandbox đầu tiên bị EACCES, thư mục `kaikki-vi-raw` chưa có manifest thành công; không coi là đã tải. Lần retry thành công có `download-manifest.json`.

Artifact chuẩn hóa: `artifacts/v7-2026-10-11/kaikki-vi-staging-02/`, gồm SQLite, bảy CSV và `pack-report.json`.

| Chỉ số | Đếm thực tế |
|---|---:|
| Dòng raw JSONL | 421.406 |
| Hard redirect không có ngôn ngữ, loại riêng | 3.237 |
| Mục ngôn ngữ khác, không nhập | 284.722 |
| Mục tiếng Anh raw | 133.447 |
| Mục raw giống hệt, gộp có lưu mọi số dòng | 102 |
| Entry tiếng Anh riêng theo record/POS | 133.345 |
| Headword chuẩn hóa khác nhau | 119.013 |
| Nghĩa có gloss nguồn | 190.572 |
| Sense trống, chỉ giữ trong raw provenance | 125 |
| Entry không có sense dùng được | 125 |
| Bản ghi phát âm | 21.043 |
| Accent US / UK / UNSPECIFIED | 11.515 / 849 / 8.679 |
| Dạng từ có bằng chứng nguồn | 8.088 |
| Example nguồn loại khỏi bảng học liệu chuẩn hóa | 27.399 |
| Example / CEFR mapping / independently reviewed được xuất | 0 / 0 / 0 |

SQLite staging **427.827.200 bytes**, SHA256 `43b916924573c57660496e15ebbf5fc71acb31dd80db2db63ab2dfe6a4f9fedc`. Kích thước bao gồm raw provenance, số dòng và ID dài; **không phải kích thước content pack mobile tối ưu**. Chưa đo Android RAM, search latency hay APK tăng kích thước. Không bundle file 428MB này vào app.

## Hợp đồng dữ liệu và an toàn

- Đọc streaming gzip, UTF-8 fatal, giới hạn giải nén 500MB và mỗi dòng 4 triệu ký tự. Không tải toàn corpus thành array JS.
- Chỉ nhận `lang_code=en`. Hard redirect có schema riêng; cấu trúc thiếu/sai trường bắt buộc, JSON hỏng, gzip/IO hỏng làm rollback toàn pack.
- Mỗi record giữ POS/sense riêng; các gloss cùng sense giữ chung bằng newline, không tách dấu phẩy hay gộp nghĩa giống nhau tùy ý.
- `kaikki_raw_records` lưu nguyên JSON và URL mục từ; `kaikki_record_lines` lưu mọi dòng entry tiếng Anh, kể cả duplicate. Trường nguồn chưa dùng được vẫn truy vết trong JSON; không giả đã tích hợp synonyms/relations/form_of.
- ID từ hash nội dung record trong snapshot. Reordering các dòng không đổi ID; thay nội dung/serialization record ở snapshot khác có thể đổi ID. **Chưa có cam kết cross-snapshot learner identity/update migration**.
- IPA giữ `source_unreviewed`; chỉ gán US/UK khi tag nguồn rõ và không mâu thuẫn. `raw_tags=Mỹ` chưa tự suy luận, giữ UNSPECIFIED. Không tự liên kết IPA vào từng sense. Trường mang tên IPA của nguồn có thể chứa respelling, cần quality review trước hiển thị như IPA đã xác minh.
- Không tải audio/media, không dịch gloss, không tạo example/IPA/CEFR. Loại examples khỏi bảng chuẩn hóa vì chưa review provenance/quotation, nhưng raw archive vẫn có nội dung nguồn và cũng **không được phân phối mặc nhiên**.
- `english_sources.distribution_status=LICENSE_REVIEW_REQUIRED`; gate phát hành hiện có tiếp tục từ chối. Không có cờ CLI bỏ qua.
- Bảy CSV là dữ liệu staging chưa phê duyệt; không public/commit/bundle chúng.

## Kiểm thử và phát hiện chất lượng

10 test mới PASS: multi-POS/senses, comma gloss, accent không suy đoán, FTS tiếng Việt, phrase nguyên vẹn, raw URL attribution, duplicate lineage, ID khi đổi thứ tự dòng, empty sense, schema drift/rollback/sentinel, metadata sai, corpus không có English, JSON/IO hỏng, gzip/UTF-8 hỏng. Fixture tự viết, không phải nội dung production. Typecheck PASS, lint 0 errors/5 cảnh báo cũ. Content validator PASS chỉ kiểm cấu trúc bundled Chinese, **không chứng nhận học thuật corpus này**.

Full suite cuối **175files/971tests PASS**, artifact `artifacts/v7-2026-10-11/kaikki-final-tests.json`; targeted importer/quick/clock **15tests PASS**, `kaikki-targeted-tests.json`. Không có thay đổi native dependency/schema Chinese; chưa build APK mới cho source ôn nhanh/timer.

Lần staging-01 dừng ở dòng7 (hard redirect) và rollback; sau khi kiểm raw dòng đó, bổ sung schema redirect rõ ràng và test, staging-02 hoàn tất. Không giảm yêu cầu trường English để che lỗi.

Truy vấn read-only trên pack thật: `book` 2entry/8senses, `run` 3/69, `go` 3/36; `take off` 0 entry. `lead`, `tear`, `bow`, `close`, `live` không có IPA; `read` có3 cách ghi IPA, `wind` có4. Đây là cảnh báo coverage, không phải xác nhận các IPA đã đúng/nghĩa đã review. Exact lookup dùng index `english_headword` theo EXPLAIN QUERY PLAN; chưa benchmark điện thoại.

Benchmark repository có sẵn chạy trên pack thật, read-only: `kaikki-benchmark.json` (**Windows/Node, không Android**). Exact mẫu0,42–1,52ms; tìm `sách` khoảng320,36ms ở lượt này, cần tối ưu/đo lại trước nghiệm thu mobile. Bulk10/50/100 cho đủ số dòng, autoSelected=0, khoảng14–18ms trên mẫu có cache/lặp từ; **không phải100từ khác nhau hay kiểm thử UI sense-picker**. `take off` trả6gợi ý FTS chứ không có exact entry; không được tự chọn coi là đúng cụm. `bookSenses=3` trong benchmark chỉ là entry đầu, trong khi tổng hai POS có8sense: runtime phải hiển thị/gom nhiều entry theo headword để không che POS khác.

## Cách chạy lại

Từ repository, dùng thư mục output mới; không overwrite nguồn/pack cũ:

```powershell
npx tsx scripts/fetch-kaikki-vietnamese.ts artifacts/v7-new-source
npx tsx scripts/import-kaikki-vietnamese.ts artifacts/v7-2026-10-11/sources/kaikki-vi-raw-retry/raw-wiktextract-data.jsonl.gz artifacts/v7-new-staging
npx vitest run src/db/english/kaikki-vietnamese.test.ts
```

File nguồn thủ công cần `download-manifest.json` và `rawdata.html` đã chụp cùng snapshot/checksum; importer không tự nhận mọi JSONL là bản viwiktionary được phép. File input không đổi sau nhập.

## Phần phải làm tiếp

Review ngoại lệ nguồn/citation; triển khai attribution/license viewer và gói phái sinh share-alike; loại respelling khỏi IPA đủ điều kiện; thiết kế runtime pack không chứa raw JSON khổng lồ; hoàn thiện forms/phrasal verbs và coverage thiếu; runtime dictionary/detail/sense picker/bulk selection; CEFR/content modules và native QA. Không thể dùng thành công importer để nghiệm thu toàn V7.
