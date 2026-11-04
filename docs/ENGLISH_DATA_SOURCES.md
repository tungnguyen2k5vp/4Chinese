# Nguồn English và vị trí dữ liệu thực tế

Ngày audit 10/10/2026. Corpus không được đưa vào `src/data` hoặc `assets`; không có download tại mobile startup.

## Trạng thái sau dọn dự án — 15/10/2026

Các bản QA/export lịch sử đã được dọn. Corpus Skypedia ở commit `388adc0` được giữ lại tại `artifacts/v7-2026-10-10/sources/skypedia-388adc0/` vì test đọc trực tiếp SQLite này; SHA256 đã kiểm tra lại là `2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a`. Corpus chỉ dùng cho kiểm thử cục bộ, chưa bundle vào APK và vẫn `LICENSE_REVIEW_REQUIRED`. Bản CEFR-J và các snapshot Kaikki/QA cũ không còn nằm trong workspace; những đường dẫn cũ bên dưới là ghi nhận lịch sử, không phải file đang có.

## Đã tải

**Skypedia / English–Vietnamese Offline Dictionary**: [commit388adc0](https://github.com/skypediacode/english-vietnamese-dictionary/tree/388adc0826300912e5b0311c089e0e70494b065f). Local: `artifacts/v7-2026-10-10/sources/skypedia-388adc0/`. Có SQLite thật và README.md, README.en.md, schema.sql, stats.md, ATTRIBUTION.md, LICENSE. DB44.212.224bytes; SHA256 `2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a`. Source derived MinhQND, không tính A/B là hai corpus độc lập để cộng số lượng. Staging normalized ở `staging-pack-02/`; chưa phân phối.

**Open Language Profiles / CEFR-J**: [commitd4e45b7](https://github.com/openlanguageprofiles/olp-en-cefrj/tree/d4e45b75b38f27b30dfc5c44d8c571aec7e7092f). Local: `artifacts/v7-2026-10-10/sources/cefrj-d4e45b7/`. Có vocabulary1.5, OctanoveC1/C2 1.0, grammar20180315, README. Hash/counts file vocab trong `cefr-source-audit.json`. Chưa mapping vào dictionary, grammar chưa import.

## Đã xem nguồn, chưa tải corpus

- [MinhQND](https://github.com/minhqnd/dictionary): upstream của A, DB ở releases; code và data khác license.
- [Kaikki English](https://kaikki.org/dictionary/English/index.html): nguồn lexical EN, không tự coi mọi sense có Vietnamese translation.
- [Open English WordNet](https://en-word.net/downloads): lexical senses/relations, không cung cấp nghĩa Việt.
- [ipa-dict](https://github.com/open-dict-data/ipa-dict): US/UK dataset license riêng, word-level IPA không tự ánh xạ sense.
- [bonkey](https://github.com/bonkey/words-cefr-dataset): profile/frequency tham khảo; levels có bước suy luận, không official certificate.

Chưa merge các nguồn này; không tuyên bố đã tải mọi nguồn. Mọi trường chưa rõ về quyền/phạm vi mapping giữ trạng thái review. Xem [license audit](ENGLISH_DATA_LICENSE_AUDIT.md), [quality](ENGLISH_DATA_QUALITY.md) và [pipeline](ENGLISH_IMPORT_PIPELINE.md) để chạy lại.
