# V7 — báo cáo hiện trạng triển khai

## Hiện trạng mới nhất — 11/10/2026

**Cập nhật cài điện thoại:** theo yêu cầu mới của user, APK release **0.1.40/build42** đã cài private upgrade trên Realme Android13 ARM64, không Expo Go/Metro, không uninstall/clear/reset. 987 test PASS, typecheck PASS/lint0 lỗi5warning; máy ảo giữ Reader/nghĩa sau nâng cấp; phone hai cold launch Reader và quay lại home PASS. Build41 trước đó FAIL native SQLite startup; đã sửa đường snapshot và kiểm lại, không che lịch sử lỗi. Xem [Build42 QA](NATIVE_RELEASE_BUILD42_QA.md). **V7 vẫn PARTIAL; được cài để user kiểm tra, không phải nghiệm thu toàn bộ V7.** Các dòng “chưa cài”/build40 bên dưới là checkpoint lịch sử, không còn phản ánh phiên bản điện thoại hiện tại.

Checkpoint Reader: đã nối màn đọc văn bản tiếng Anh cá nhân vào Activity, tokenizer riêng, lưu vị trí có revision/transaction, tra đúng dạng thẻ cá nhân bằng cửa sổ riêng và thêm USER card không tăng SRS/XP. Full suite mới nhất **178 file/985 test PASS**; 10 test Reader bao gồm SQLite file reopen, rollback, cạnh tranh và dữ liệu hỏng. Đây **không phải Reader/dictionary V7 đã nghiệm thu đầy đủ**. Xem [English Reader](ENGLISH_READER.md); APK build40 chưa chứa thay đổi này, điện thoại chưa được cài.

Tiếp nối: đã thêm repository đọc đủ nghĩa theo headword qua mọi POS/keyset, IPA có phân trang/scope, resolve đúng sense và gate nguồn/IPA trước lưu. Tối ưu ranked FTS trước JOIN; pack thật `book` trả đủ8nghĩa noun+verb; tìm `sách` mẫuWindows khoảng3,26ms (lượt trước320ms), không phải benchmark Android. Full suite mới nhất **176files/975tests PASS**, typecheck PASS, lint0errors/5warnings cũ; artifact `artifacts/v7-2026-10-11/dictionary-detail-tests.json`. Đây **chưa phải dictionary UI đã hoàn tất**. Xem [Dictionary selection QA](ENGLISH_DICTIONARY_SELECTION_QA.md). License review phát hiện raw export thiếu citation upstream như FVDP ở `book`; không tự approve corpus hoặc coi URL lineage là đủ attribution.

**V7 vẫn PARTIAL, chưa cài máy thật.** Source đã có ôn nhanh tối đa5thẻ và đồng hồ chủ động (Web QA PASS; chưa trong APK build40). Đã bổ sung importer raw viwiktionary streaming/transaction/lineage và tải snapshot thật: **119.013headwords /190.572senses /21.043pronunciations /8.088forms** trong staging. Không sửa vocabulary/schema tiếng Trung trong phần này; checksum raw Chinese vẫn nguyên. Pack mới có LICENSE_REVIEW_REQUIRED, chưa nằm trong runtime/APK và còn thiếu cụm từ/IPA, không tuyên bố đã đủ từ điển hay đã review học thuật. Chi tiết: [Raw import QA](ENGLISH_KAIKKI_RAW_IMPORT_QA.md), [Quick Session QA](ENGLISH_QUICK_SESSION_QA.md).

APK gần nhất vẫn build40/0.1.38 đã kiểm máy ảo ở checkpoint trước, **không chứa mọi thay đổi source sau đó**. Không dùng các đoạn checkpoint lịch sử bên dưới làm kết luận phát hành hiện tại. Dictionary runtime/sense-picker, CEFR/grammar/path, speaking/reader/stories/writing, bilingual restore và native QA toàn diện còn phải làm.

Kiểm tra source hiện tại: **175files/971tests PASS**, typecheck PASS, lint0errors/5warnings cũ, content validator PASS (cấu trúc, không phải academic review). Benchmark pack mới đã chạy Windows/Node: bulk10/50/100 không tự chọn nghĩa; tìm nghĩa Việt mẫu `sách`320ms cần tối ưu, không cam kết tốc độ điện thoại. Báo cáo có raw lineage và cảnh báo dữ liệu thật, theo skill data-engineer; dữ liệu chưa đạt gate tiếp tục tách khỏi runtime theo skill offline-data-engineer.

Ngày 10/10/2026. **PARTIAL — CHƯA NGHIỆM THU V7, CHƯA PHÁT HÀNH/CÀI ĐIỆN THOẠI.**

**Mới nhất: build40 / 0.1.38.** Đã bổ sung chỉnh sửa thẻ cá nhân/ghi chú, bản nháp theo thẻ, optimistic revision + rollback và phân trang25thẻ/keyset. 172files/956tests PASS; Web151thẻ/7trang PASS; APK release build40 Gradle PASS và native máy ảo kiểm draft/cold reopen/offline/save/schedule không đổi. 8ảnh native riêng, không phải toàn app. Người dùng đã xác nhận **chờ hoàn tất toàn bộ V7 rồi mới cài**; phone vẫn0.1.35/code37. Chi tiết/giới hạn: [Card editor QA](ENGLISH_CARD_EDITOR_QA.md). Corpus/license/curriculum/module nâng cao/bilingual restore vẫn chưa hoàn tất. Các trạng thái checkpoint dưới đây là lịch sử, không dùng chúng để kết luận cài được V7.

Đã triển khai pipeline, Settings chuyển ngôn ngữ có persistence, năm tab theo ngôn ngữ, bộ từ/thẻ cá nhân, nhập nhiều thẻ, quản lý/thùng rác/khôi phục bộ từ, tạm ngưng thẻ, ôn nghĩa/chính tả, kế hoạch ngày/sổ lỗi/stats riêng, English-only backup repository và TTS US/GB. V7 vẫn chưa hoàn tất: dictionary được phép phát hành, học liệu/lộ trình nâng cao, bilingual backup và native QA còn thiếu. Không đánh đồng staging dictionary với app tiếng Anh đầy đủ.

## Checkpoint

| Checkpoint | Trạng thái thực tế |
|---|---|
| 1 Source audit/safety | Baseline889, sau thêm tests899. Snapshot/hash71 bảng fixture, source inventory, Chinese regression; chưa audit phone DB |
| 2 Language foundation | Provider/controller/persistence và Settings đã nối; năm tab theo ngôn ngữ, English session/pending draft guard; Chinese form/recording guard toàn diện chưa xác minh |
| 3 Dictionary | Source A thực tế tải/pin/checksum; staging SQLite +7 CSV +FTS +quality audit PASS; distribution BLOCKED; morphology/CEFR và multi-source merge PARTIAL |
| 4 Vocabulary/bulk UI | Nhập cặp từ/nghĩa USER qua UI 10/50/100 đã kiểm thử; nhiều nghĩa giữ riêng, kiểm tra lỗi/draft/rollback. Đổi tên/thùng rác/khôi phục/suspend có; dictionary/sense-selection UI với corpus được phép chưa có |
| 5 English SRS/daily/stats/mistakes | Due/meaning/spelling, logs/revision/idempotency/stats/XP riêng; daily local-day và sổ lỗi từ review logs có. Quick/timer/framework bài tập đầy đủ chưa có. Scheduler Chinese không sửa |
| 6 CEFR/path/grammar | Profile nguồn đã tải/audit, chưa map; chưa có English lessons/grammar học được |
| 7 Listening/IPA/speaking | TTS US/GB trong review có; native playback chưa verified. IPA trainer/recording/speaking chưa có |
| 8 Reader/stories/writing | Chưa triển khai; không tái dùng nhầm tokenizer/stroke order Chinese |
| 9 Bilingual backup/device QA | English-only backup/rollback test PASS, bilingual chưa có. Web E2E PASS; release-variant x86_64 build PASS; ADB unauthorized |

## Đối chiếu 40 mục của yêu cầu

| Mục | Kết quả |
|---|---|
| 1 Baseline | Schema45, app0.1.35, Expo57;161 files/889tests PASS |
| 2 Schema trước/sau | Chinese45→45; separate content schema1 trong artifacts, learner runtime schema1 trong english-learner.db |
| 3 Safety migration | Không thêm V7 Chinese migration; English tách DB, fixture/hash test PASS |
| 4 Chinese vocabulary | Raw11.828/effective11.877 trước và sau, raw checksum không đổi |
| 5 Chinese SRS | Regression suite PASS; scheduler/repository không sửa bởi V7 |
| 6 Headwords | Staging104.829; production English corpus0 |
| 7 Senses | Staging175.735 source links, không phải158.307 shared definitions |
| 8 POS | Linked senses0 thiếu POS; raw POS retained, chưa chuẩn hóa mọi tag |
| 9 IPA US/UK | Records2.721/42.852; unspecified63.203; sense-specific0; không nói đủ mọi cách đọc |
| 10 VI coverage | Source linked senses100% nonempty; independently reviewed0 |
| 11 Examples | 175.735 nonempty source links, generated_unreviewed; VI translation thiếu |
| 12 Phrasal verbs | Chưa phân loại xác minh; PHRASE được bảo toàn |
| 13 Irregular forms | Corpus0; synthetic model/lookup test có |
| 14 CEFR A1–C2 | App mapping0, source counts ở CEFR coverage |
| 15 Unclassified |104.829 words trong staging chưa có CEFR mapping |
| 16 Source/license | A đã tải; upstream GPL/CC BY-SA cần review; không bundle |
| 17 Dictionary size | Source44.212.224; normalized160.399.360 bytes |
| 18 APK size before/after | Latest QA x86_64 APK100.235.934 bytes; earlier runtime checkpoint100.174.142 cùng ABI/debug signer, nhưng không phải V6 paired baseline; không cài phone |
| 19 Search latency | PC mẫu exact0,06–0,70ms; VI FTS7,05ms; chưa đo Android/cold stats |
| 20 Bulk10/50/100 | Analyzer/repository và UI personal-pair bulk PASS; autoSelected0; không tự đoán IPA/CEFR; dictionary sense-picker chưa có |
| 21 SRS | Independent due/review/log/stat transaction; tự đánh giá nghĩa và typed spelling UI; scheduler giữ nguyên |
| 22 Daily | Gợi ý học từ counts NEW/due và reviews theo ngày địa phương; không phải kế hoạch CEFR/timer hoàn chỉnh |
| 23–24 Grammar/path | Chưa có học liệu English runtime được review |
| 25–27 Listening/speaking/IPA trainer | TTS US/GB code/test có; speaking/IPA trainer chưa có; không fake acoustic score |
| 28–31 Reader/context/stories/writing | Chưa tích hợp; không đưa nội dung AI giả thành reviewed |
| 32 Statistics | English total/studied/due/reviews/correct/response-time/XP riêng; CEFR/streak/error metrics chưa có |
| 33 Backup | Chinese format3 giữ nguyên; English-only export/replacement/rollback có; bilingual chưa có |
| 34 Offline | Local repository/tests + Web persistence E2E PASS; native airplane-mode/TTS chưa verified |
| 35 Migration | Existing Chinese suite PASS; learner fresh init/handle refusal/transaction tests PASS |
| 36 Checks |170 files/944tests PASS; typecheck PASS; lint0errors/5preexistingwarnings; content validator PASS. Artifact language-activity-spelling-tests.json |
| 37 Android | Latest Gradle x86_64 release-variant APK PASS1m16s/exit0, JDK19, signed Android Debug; SHA/file ở QA; không phải production release |
| 38 Device QA | Latest Web20 journeys/17 captures PASS, zero page errors; emulator unauthorized; chưa native QA/không cài máy thật |
| 39 Academic gaps | Unreviewed senses/examples/IPA, homographs thiếu, forms/CEFR/curriculum chưa đủ |
| 40 Feature status | Nền móng/pipeline PASS; V7 toàn app PARTIAL, không nghiệm thu |

PC benchmark chỉ là mẫu chạy Node/Windows, không cam kết độ trễ hoặc RAM trên Android. Artifact tests/Android export đều ở `artifacts/v7-2026-10-10/`; corpus không vào JS bundle.

## Những file đã triển khai

`src/services/languages/config.ts`, `src/db/english/{schema,dictionary,dictionary.test}.ts`, `scripts/lib/english-pack.ts`, `scripts/{fetch-english-source,import-english,benchmark-english,audit-english-baseline,audit-english-cefr}.ts` và tài liệu checkpoint. Không thêm dependency, không commit/push, không thêm cloud sync.

Test mới bao gồm nhiều nghĩa/POS/IPA, quoted/multiline CSV, exact phrase/VI FTS/malicious input, morphology candidate, batch10/50/100/limit, no auto sense selection, cross-language context, license gate, rerun no-overwrite và transaction rollback. Fixture test không phải học liệu production.

## Blocker phát hành và công việc tiếp tục

Corpus A/B có provenance upstream chưa đủ rõ để phê duyệt APK, UK IPA có GPL riêng. Xem license audit; cần xác nhận quyền/provenance hoặc corpus khác được phép phân phối. Không có xác nhận đó thì corpus này vẫn chỉ staging; tiếp tục kỹ thuật với synthetic fixture, không đưa fixture vào app như từ điển thật.

Update tiếp nối 2026-10-10: đã thêm controller, SQLite preference repository độc lập và React LanguageProvider. 11 test mới, full suite 163 files/910 tests PASS; typecheck PASS. Provider chưa mount và chưa bật Settings/ngôn ngữ học trên UI. Xem [Language foundation](ENGLISH_LANGUAGE_FOUNDATION.md). Các số liệu 899 tests ở bảng phía trên là checkpoint pipeline trước đó.

Update runtime tiếp nối: learner namespace + meaning SRS/stats, English-only backup, custom draft persistence và TTS đã triển khai; 929 tests và Web E2E PASS. Các con số 899/910 trong đoạn lịch sử là checkpoint trước. Xem [SRS](ENGLISH_SRS.md), [Backup](ENGLISH_BACKUP.md), [QA](ENGLISH_OFFLINE_QA.md).

Còn lại: dictionary/sense-picker với corpus được phép; hoàn thiện guard và navigation sâu cho mọi module Chinese/English; Quick Session/timer; CEFR+reviewed grammar/path; speaking/IPA/reader/stories/writing đầy đủ; bilingual atomic backup; pagination/edit card nâng cao; native QA và production signing. Không phải tất cả các phần này bị license chặn; nhiều phần kỹ thuật vẫn chưa triển khai/kiểm chứng. Nghiệm thu/phát hành không thể vượt gate license và Android QA. Không bỏ qua hai gate đó để báo hoàn tất.

Update tiếp nối: 944 tests đã đạt; Settings/five-tab switch/draft guard có bằng chứng Web E2E, không reset root navigator. 15 journeys bulk/activity trước đó được giữ riêng tại `learner-ui-activity-bulk`; lượt language-switch ban đầu 18 journeys tại `learner-ui-language-switch`. Lượt kiểm thử cuối bổ sung quản lý bộ từ/chính tả ghi trong QA. APK trước bổ sung chính tả đã build Gradle thành công; không dùng thành công build đó để tuyên bố native QA hoặc mọi thay đổi sau build đã có trong APK. Xem [Nhập nhiều thẻ](ENGLISH_BULK_ADD.md) và [Ngôn ngữ](ENGLISH_LANGUAGE_FOUNDATION.md).

Lượt cuối source có recovery boundary: Web20 journeys PASS/17 PNG/zero page errors, manifest có SHA256 và nhãn WEB; đã kiểm tra hình HSK sau loaded state, thùng rác và chính tả. Latest APK build1m16s/exit0, archived riêng, SHA256 và chữ ký kiểm tra ở QA. Không cài máy thật. Dữ liệu raw Chinese SHA256 vẫn `d12e9f23c4c50af154c2a56c5d63de230c1e69e44ac0fd1c4e644c05e2622d11`.

### Phân loại phần chưa hoàn tất

| Phần còn lại | Vì sao chưa đạt |
|---|---|
| Dictionary/sense-picker/content installation | Chưa hoàn thiện runtime UI/install flow và chưa có corpus đủ điều kiện phân phối; không phải chỉ thiếu một API key |
| Quick Session/timer, card editing/pagination, English Reader/context, writing/speaking/IPA | Còn việc triển khai kỹ thuật độc lập; không được quy hết cho license blocker |
| CEFR, grammar/path, graded stories/placement | Thiếu mapping/nội dung được review và luồng runtime tương ứng; không dùng seed AI như nội dung verified |
| Bilingual backup | Chưa có validate/restore atomic xuyên các database và lựa chọn ngôn ngữ; hai export riêng không thay thế yêu cầu này |
| Guards trên mọi form/session/recording và native accessibility/lifecycle | Coverage chưa đủ; Web/controller tests không chứng minh toàn bộ Android/iOS |
| Nghiệm thu phát hành | Emulator unauthorized, chưa kiểm thử artifact trên thiết bị; ký Android Debug/x86_64 chỉ cho QA, chưa production signing |

Do đó chưa thể nói “đã làm xong toàn bộ yêu cầu V7”. Phần triển khai được và phần thiếu được tách rõ để lượt tiếp nối không bắt đầu lại hoặc bỏ sót.

Đợt này chưa tạo các tài liệu feature-specific cho module chưa triển khai; không tạo file rỗng để đủ19 tên. Những tài liệu đó phải bổ sung cùng checkpoint tương ứng trước nghiệm thu cuối.

## Native checkpoint39 tiếp nối

ADB đã kết nối bằng cùng tài khoản Windows; native QA phát hiện/sửa trạng thái accessibility của PrimaryButton. APK0.1.37/code39, ARM64+x86_64, release variant/chữ ký cài riêng hiện có, Gradle PASS2m24s. 171files/949tests PASS/typecheck PASS/lint0errors5warnings. Máy ảo riêng nâng cấp37→39 giữ dữ liệu;18state assertions đạt,19ảnh native đúng ngữ cảnh/2diagnostic riêng. Offline cold reopen, language/draft guard, native spelling→1review/10EnglishXP, namespace Chinese, Activity200%/dark đã kiểm tra trong phạm vi giới hạn. Toàn bộ V7 vẫn PARTIAL; dictionary/license/curriculum/modules/bilingual restore và native audio/clipboard bulk còn thiếu. Chưa cài điện thoại, đang chờ người dùng chọn xem trước hay chờ V7 đầy đủ. Chi tiết và giới hạn ở [Native QA39](NATIVE_RELEASE_BUILD39_QA.md), không lấy bảng lịch sử “emulator unauthorized” làm trạng thái hiện tại.

[Baseline](ENGLISH_EXPANSION_BASELINE.md) · [Kiến trúc](MULTILANGUAGE_ARCHITECTURE.md) · [Safety](CHINESE_DATA_SAFETY.md) · [License](ENGLISH_DATA_LICENSE_AUDIT.md) · [Schema](ENGLISH_DICTIONARY_SCHEMA.md) · [Pipeline](ENGLISH_IMPORT_PIPELINE.md) · [Quality](ENGLISH_DATA_QUALITY.md) · [CEFR](ENGLISH_CEFR_COVERAGE.md).
