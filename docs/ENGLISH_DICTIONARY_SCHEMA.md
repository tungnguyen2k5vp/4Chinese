# English dictionary schema — staging v1

File riêng `english-dictionary.sqlite`, chưa mount trong mobile runtime. Không đổi Chinese schema45.

| Bảng | Khóa và dữ liệu |
|---|---|
| english_sources | Source ID, immutable revision/checksum, license, distribution_status, attribution |
| english_words | Word ID ổn định `en:sky:w:<source-id>`, raw headword, normalized lookup, lemma, entry type, source_entry_id |
| english_senses | `en:sky:s:<word_definition-link-id>`; nhiều nghĩa/POS cho cùng word; raw meaning_vi, normalized search, sense_order, review status |
| english_pronunciations | `en:sky:p:<id>`; word/sense nullable, IPA, accent, raw region, review status |
| english_examples | Source link ID; câu EN, translation_vi nullable, generated_unreviewed |
| english_forms | Surface/normalized form, lemma reference, morphology/tense/number/metadata/source; hiện corpus0 |
| english_cefr | Word/sense reference, level, source, evidence_pos/status; hiện corpus0 |
| english_search | FTS5 theo word ID/headword/normalized meanings; xây ở pipeline |

Index exact headword/lemma/forms, sense owner/POS, accent owner và CEFR; SQL tham số hóa, lookup bounded12 candidates, load senses theo một từ khi cần. Không preload 104.829 objects vào JS runtime.

Không giới hạn cứng số nghĩa trong schema. Không tách nghĩa bằng dấu phẩy. Giữ mỗi liên kết từ–định nghĩa của source để không mất POS/quan hệ. Source không có sense-specific IPA nên không gán IPA đầu tiên cho mọi nghĩa. Source không có dữ liệu morphology hoặc CEFR thì các bảng đó trống, không đoán.

Entry type hiện chỉ phân biệt SINGLE_WORD và PHRASE bằng khoảng trắng; schema hỗ trợ PHRASAL_VERB/IDIOM/COLLOCATION/COMPOUND nhưng chưa có classifier được xác minh. Lemma tạm bằng normalized headword; không phải lemmatization đã hoàn chỉnh. Frequency rank=NULL.
