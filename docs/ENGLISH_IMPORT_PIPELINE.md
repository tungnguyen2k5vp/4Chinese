# Pipeline English — thực thi được, chưa phải production pack

Từ thư mục `HocTiengTrungApp`:

```powershell
npx tsx scripts/fetch-english-source.ts artifacts/v7-download-new
npx tsx scripts/import-english.ts --source artifacts/v7-download-new/dictionary_en_vi.db --out artifacts/v7-dry-new
npx tsx scripts/import-english.ts --source artifacts/v7-download-new/dictionary_en_vi.db --out artifacts/v7-pack-new --apply
npx tsx scripts/benchmark-english.ts artifacts/v7-pack-new/english-dictionary.sqlite artifacts/v7-benchmark-new.json
```

Chọn đường dẫn chưa tồn tại. Downloader pin commit A và SHA256 DB `2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a`; metadata/README/attribution/license được tải và checksum trong manifest. Network sandbox có thể cần quyền tải; lỗi network/checksum báo lỗi, không giả thành công. Có thể đặt file gốc và ATTRIBUTION/LICENSE cạnh nhau rồi chạy importer `--source`.

Dry-run: mở source read-only, quick_check, schema/foreign keys, coverage. Apply: **chỉ staging trong artifacts mới**, không kết nối user/phone/production; transaction tạo bảng và nhập qua iterator/prepared statement, stable IDs, FTS và CSV streaming. Không đọc toàn corpus vào array JS. Checksum nguồn trước/sau không đổi. Output thất bại được giữ để điều tra; không đè lên và không phát hành nó.

Xuất `english_words.csv`, `english_senses.csv`, `english_pronunciations.csv`, `english_examples.csv`, `english_forms.csv`, `english_cefr.csv`, `english_all_flat.csv`. UTF-8 BOM, quoting đúng dấu phẩy/nháy/newline; raw values không bị đổi để phù hợp lookup. Hai CSV forms/CEFR có header nhưng 0 record vì chưa có nguồn mapping nhập — không coi đây là dữ liệu morphology/CEFR hoàn chỉnh.

Apply lại target cũ bị từ chối, không thêm duplicate; CLI chạy lại tạo pack mới với cùng stable IDs. Checksum/schema thay đổi chặn. Chưa có incremental merge pack/learner migration. Rollback thất bại trong transaction; pack cũ không bị overwrite. Chưa có install/uninstall pack vào mobile.

Kết quả chạy thật: `artifacts/v7-2026-10-10/staging-pack-02/`, với SQLite, CSV, LICENSE/ATTRIBUTION và `pack-report.json`. Pack-01 giữ log trạng thái lần chạy thất bại trước sửa INSERT; chỉ pack-02 có report thành công. Corpus này bị chặn production vì license review, không được đưa vào assets hoặc commit công khai.
