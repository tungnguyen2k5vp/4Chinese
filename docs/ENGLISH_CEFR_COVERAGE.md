# CEFR coverage — source audit, chưa mapping

Đã tải profile tại commit `d4e45b75b38f27b30dfc5c44d8c571aec7e7092f` và parse CSV thực tế:

| Profile | A1 | A2 | B1 | B2 | C1 | C2 | Tổng |
|---|---:|---:|---:|---:|---:|---:|---:|
| CEFR-J vocabulary1.5 | 1.164 | 1.411 | 2.446 | 2.778 | 0 | 0 | 7.799 |
| Octanove C1/C2 1.0 | 0 | 0 | 0 | 0 | 1.111 | 1.025 | 2.136 |

Đây là source records, không phải từ app đã phân cấp. Đã tải grammar20180315 nhưng chưa import hoặc xác minh syllabus đầy đủ. Hai profile có license khác nhau.

Staging: **mapped words0, mapped senses0, unclassified104.829**. Mapping conflicts chưa đo, không ghi thành0. Profile có POS trống và typo `vern`; không tự sửa để ép match. Source profile headword/POS không xác định nghĩa tương ứng nên không gán mọi nghĩa của một từ vào cùng CEFR.

Script `npx tsx scripts/audit-english-cefr.ts` tạo audit và SHA256 ở artifacts. [Kết quả](../artifacts/v7-2026-10-10/cefr-source-audit.json). Sau này chỉ map exact lemma/POS có chứng cứ, giữ conflict/unclassified và level_source. Frequency hoặc một nghĩa nâng cao không đủ căn cứ gán toàn headword là C1. UI CEFR và learning path chưa kích hoạt.
