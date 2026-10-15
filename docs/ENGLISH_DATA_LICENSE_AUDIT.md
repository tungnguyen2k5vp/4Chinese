# Audit giấy phép English data

## Cập nhật 11/10/2026 — raw Vietnamese edition

**Phát hiện tiếp theo:** [Trang nguồn gốc Wiktionary](https://vi.wiktionary.org/wiki/Wiktionary:Ngu%E1%BB%93n_g%E1%BB%91c) liệt kê nguồn nhập/dịch bên ngoài, gồm FVDP và WordNet. [Mục book](https://vi.wiktionary.org/w/index.php?title=book&oldid=2536511) có attribution Hồ Ngọc Đức/FVDP ở phần tham khảo. Tuy nhiên hai JSON raw English của `book` trong pack không có trường tham khảo/FVDP (chỉ word/lang/POS/senses/categories/relations/forms/sounds). Vì vậy **raw JSON/URL lineage chưa đồng nghĩa đã giữ đầy đủ attribution upstream**. Không phê duyệt cả corpus chỉ dựa nhãn CC BY-SA footer. Cần khôi phục citation từ snapshot wikitext/templates hoặc nguồn metadata tương ứng và xử lý điều kiện upstream/phạm vi chuyển quyền; citation bên ngoài tự nó không chứng minh vi phạm, cũng không tự chứng minh đủ quyền. Đây là thiếu hụt provenance cụ thể, không kết luận tất cả Wiktionary không được dùng.

Đã tải nguồn C bổ sung từ **raw viwiktionary** (khác bản English-edition và post-processed), dump01/09/2026/extract03/10/2026, gzip SHA256 `106d8bd9d1161eef6c9097be4eb8c8c41c3cfd4c8747cf5f78aa541e0759895e`. [Quy định chính thức Wiktionary tiếng Việt](https://vi.wiktionary.org/w/index.php?title=Wiktionary:Quy%E1%BB%81n_t%C3%A1c_gi%E1%BA%A3&oldid=2210567) nêu văn bản CC BY-SA4.0 trừ ngoại lệ, attribution URL mục gốc và share-alike. Metadata/raw/policy đã lưu trong artifacts; mỗi entry staging có raw JSON/URL/số dòng. Đây là cơ sở để tiếp tục compliance, **không phải phê duyệt corpus tự động**. Chưa review ngoại lệ từng nguồn, chưa có attribution viewer/phân phối gói phái sinh đúng điều kiện; examples/audio/media không vào bảng học liệu chuẩn hóa, raw archive vẫn chưa được phép public mặc nhiên. Corpus mới tiếp tục LICENSE_REVIEW_REQUIRED; gate không bị bỏ qua. Không suy diễn CC BY-SA bắt toàn app public. Xem [kết quả importer và giới hạn](ENGLISH_KAIKKI_RAW_IMPORT_QA.md). Các hàng "chưa tải C" bên dưới là checkpoint10/10 trước snapshot này, vẫn đúng cho bản English-edition cũ.

Ngày xem/tải: 10/10/2026. Đây là đánh giá kỹ thuật phát hành, không phải xác nhận pháp lý. **Chưa nguồn nào được tự động phê duyệt để đưa vào APK trong checkpoint này.**

| Nguồn và phiên bản đã xem | Giấy phép / upstream | Trạng thái sử dụng |
|---|---|---|
| [A: Skypedia](https://github.com/skypediacode/english-vietnamese-dictionary/tree/388adc0826300912e5b0311c089e0e70494b065f), commit `388adc0` | CC BY-SA 4.0; derived MinhQND, OVDP GPLv2 reference và upstream khác | Đã tải SQLite + 6 tài liệu vào artifacts. `LICENSE_REVIEW_REQUIRED`; chưa bundle/commit corpus |
| [B: MinhQND](https://github.com/minhqnd/dictionary/tree/f11b18fcc12dc291eff91dbebbd1f7ffac17aa5b), `f11b18f` | Code MIT; data/API CC BY-SA 4.0; README liệt kê MIT, GPL, Wiktionary upstream | Đã xem repo, releases là nơi tải DB; chưa tải DB B. Cần giải quyết provenance upstream, không phải nguồn thay thế mặc nhiên sạch |
| [C: Kaikki raw](https://kaikki.org/dictionary/rawdata.html), [English](https://kaikki.org/dictionary/English/index.html) | Derived Wiktionary; phải kiểm tra license/attribution của snapshot cụ thể | Chưa tải corpus; chưa pin dump date/checksum. `LICENSE_REVIEW_REQUIRED` |
| [D: Open English WordNet](https://en-word.net/downloads) | CC BY 4.0; derived Princeton WordNet | Có điều kiện attribution; chưa tải/pin release. Không cung cấp nghĩa Việt; chưa đưa vào pack |
| [E: ipa-dict](https://github.com/open-dict-data/ipa-dict/tree/43c3570eb3553bdd19fccd2bd0091534889af023), `43c3570` | Repo MIT; en_US dựa cmudict-ipa MIT; **en_UK derived ipacards GPL3** | Không áp một nhãn MIT cho cả hai accent. Chưa tải dataset; UK cần review riêng |
| [F: CEFR-J](https://github.com/openlanguageprofiles/olp-en-cefrj/tree/d4e45b75b38f27b30dfc5c44d8c571aec7e7092f), `d4e45b7` | CEFR-J vocab1.5/grammar20180315: điều khoản dùng nghiên cứu/thương mại có citation; C1/C2 Octanove1.0: CC BY-SA4.0 | Đã tải 3 CSV và README vào artifacts. Chưa map/bundle; không suy diễn cùng license cho mọi file |
| [G: bonkey](https://github.com/bonkey/words-cefr-dataset/tree/c05858cf109efbc81775d86908a873ca54fa85ff), `c05858c` | Repo MIT; compiled CEFR-J, Google Ngrams và nguồn lexical khác | Chưa tải corpus; upstream obligations cần kiểm tra. Level có bước suy luận từ frequency, không phải chứng nhận CEFR |

## Quyền và điều kiện trước phát hành

Đối với phần dữ liệu được cấp CC BY-SA4.0 hợp lệ, license cho phép sao chép, sửa và dùng thương mại, kể cả định dạng SQLite/CSV/APK, với attribution, thông báo thay đổi và share-alike cho dữ liệu phái sinh. Không có hạn chế phi thương mại trong giấy phép này. Nhưng tên license của repo không tự giải quyết mọi upstream quyền chưa rõ.

CC BY4.0 yêu cầu attribution/thông báo thay đổi, không mặc định có share-alike. MIT yêu cầu giữ copyright/license notices. Điều khoản CEFR-J cho phép use thương mại có citation; quyền tái xuất CSV cụ thể cần kiểm tra điều khoản của từng file, không tự đổi thành CC0. GPL reference/data cần xác định phạm vi sao chép/phái sinh và nghĩa vụ tương thích, không suy đoán rằng chỉ “tham khảo” thì tự động hết nghĩa vụ.

Không kết luận toàn bộ app phải public vì một content pack share-alike; phạm vi source app và dữ liệu phải được đánh giá riêng. Chưa cho phép phân phối lại corpus A/B/C/G trong APK hoặc public GitHub của app. Artifacts được `.gitignore` bỏ qua, không phải biện pháp thay thế tuân thủ giấy phép.

## Blocker cụ thể

1. A/B nêu data CC BY-SA trong khi upstream có GPL; cần bảng provenance/phạm vi đóng góp hoặc xác nhận quyền từ maintainer. A dùng OVDP chỉnh headword và có enrichment “Oxford IPA”; không có chứng cứ quyền riêng cho từng phần enrichment để tự phê duyệt.
2. E en_UK không cùng điều kiện với en_US.
3. Snapshot C/D/G chưa tải, nên chưa thể đánh dấu đã kiểm tra checksum/license của bộ thực tế.
4. App chưa có attribution viewer và quy trình phân phối dữ liệu phái sinh kèm license.

Dữ liệu staging mang `LICENSE_REVIEW_REQUIRED`; `assertRedistributablePack()` chặn pack chưa được approve. Không có cờ CLI bỏ qua gate. Nếu người dùng có bộ dữ liệu được phép phân phối hoặc maintainer làm rõ quyền, cần lưu chứng cứ và review trước bước đóng gói. Không scrape Cambridge/Oxford hay tự tạo nghĩa để bù blocker.

Tài liệu nguồn A đã lưu kèm pack. [Attribution nguồn A](https://github.com/skypediacode/english-vietnamese-dictionary/blob/388adc0826300912e5b0311c089e0e70494b065f/ATTRIBUTION.md), [README nguồn B](https://github.com/minhqnd/dictionary/blob/f11b18fcc12dc291eff91dbebbd1f7ffac17aa5b/README.md), [điều khoản CEFR-J](https://github.com/openlanguageprofiles/olp-en-cefrj/blob/d4e45b75b38f27b30dfc5c44d8c571aec7e7092f/README.md).
