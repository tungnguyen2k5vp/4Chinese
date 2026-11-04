# Kiến trúc đa ngôn ngữ — quyết định V7

## Đã có trong source

`services/languages/config.ts`: LearningLanguage (`zh`,`en`), UiLocale (`vi`), PronunciationVariant (`zh-CN`,`en-US`,`en-GB`), LanguageConfig, LearningSessionContext và kiểm tra session/accent. Capability EN không có Hanzi/tones; ZH không bị thay đổi. Chuẩn hóa headword riêng giữ apostrophe/hyphen và cụm từ.

`db/english/schema.ts` và `dictionary.ts`: schema content độc lập, repository lookup exact/form/FTS, nhiều nghĩa và bulk tối đa 100 dòng. LanguageProvider/controller/preferences đã có, chưa mount vào root hoặc bật Settings. Route `/english` có bộ từ cá nhân/SRS/stats riêng; chưa phải chuyển toàn bộ app sang EN.

## Ranh giới sở hữu

- `hanzi30.db`: dữ liệu ZH và learner data hiện tại, giữ nguyên schema 45.
- `english-dictionary.sqlite`: content pack read-only dự kiến; file hiện tại chỉ ở artifacts và bị chặn phân phối.
- `english-learner.db`: schema1, `en_decks`, `en_cards`, `en_reviews`, `en_drafts` trong runtime; không thay migration ZH. `learning-preferences.db` giữ lựa chọn và accent. Single-file bilingual/atomic restore chưa hoàn tất; Settings nêu rõ hai backup riêng.
- Không lồng hai Expo SQLite Suspense providers: source SDK57 hiện dùng single-instance cache và có thể đóng handle trước. `LanguageRuntime` hiện sở hữu riêng một English handle trong context riêng, dùng chung giữa tabs và routes, không đóng khi đổi ngôn ngữ. Chinese SQLite context giữ nguyên. Không tạo provider khác theo mỗi tab.
- UI locale không đổi khi đổi learningLanguage. Accent riêng theo ngôn ngữ. Scheduler numerical không sửa; exercise selector chuyên biệt.
- Content checksum/version/attribution không đồng nghĩa academic review. IPA có thể word-level hoặc sense-level; khi không biết, sense_id=NULL.

## Các gate trước nghiệm thu/phát hành V7 đầy đủ

1. Corpus được phép phân phối, attribution/share-alike theo từng nguồn; benchmark pack/core subset phù hợp APK.
2. Provider hydrate/persist có session lock và xác nhận draft/recording; state chỉ đổi sau write thành công. Không reset navigation root.
3. Home/levels/vocabulary/stats và routes theo ngôn ngữ; không đưa từ EN vào queue ZH.
4. English learner schema có additive migration, old backup compatibility và transaction/rollback.
5. Offline learner flow có dữ liệu thật; không bật một chế độ có các module rỗng chỉ để đủ danh sách tính năng.

Mở rộng theo interface thật sự cần dùng, không tạo mọi abstraction trong prompt dưới dạng class rỗng. Không thêm cloud sync V7.

Settings và năm tab đã nối cho phạm vi English personal learning, có thông báo V7 chưa hoàn thiện. Đây không phải bằng chứng các gate dictionary/học liệu/bilingual backup/native QA đã đạt. Tab CEFR báo chưa có học liệu thay vì trình bày cấp độ giả. Các route Chinese chuyên biệt vẫn là Chinese; không quảng bá chúng như tính năng English.
