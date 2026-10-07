# 4Chinese V4 — báo cáo trạng thái 2026-10-01

Bản này ghi chức năng có source và bằng chứng chạy thật. **Chưa hoàn tất toàn bộ V4**.
Không có cấp nào đủ bằng chứng HSK Exam Ready. Đã build APK thử; chưa cài hoặc push GitHub trong lượt này.

## Kết quả triển khai

Migration 32–35; versioned reference/crosswalk; 7 mini test gốc 28 câu với lưu/resume/deadline/cờ/kết quả;
14 bài viết/dịch có nháp/lịch sử/tự đối chiếu; 7 đề nói có thời gian; 40 ngữ pháp gồm 12 đối chiếu Việt;
micro lesson ngữ pháp; readiness nội bộ; nguồn audio/manifest foundation;
Home gọn hơn với Luyện tập/Thư viện; 6 cặp từ dễ nhầm / 12 câu có giải thích và Sổ lỗi.
Web có startup recovery, single-tab ownership và OPFS handle preflight để tránh lỗi khóa file khi mở lại.
Backups cũ/mới được kiểm thử; không reset IDs/SRS/decks.

Skills được áp dụng: Expo 57, Offline Data, UI/UX, Testing, Audio/Speech và Mobile Release.
Điểm ảnh hưởng chính: dữ liệu additive+CAS, nội dung mới chưa được tự chứng thực,
giao diện giữ theme/ngữ cảnh, dọn audio tạm và browser smoke thay vì chỉ kiểm tra build.

## 20 câu nghiệm thu

| # | Câu hỏi | Kết quả trung thực |
| --- | --- | --- |
| 1 | Tổng từ | 11.330 rows nội bộ; không cộng custom words của người dùng vào số corpus. |
| 2 | Match official | Chưa xác định: thiếu reference đã xác minh. |
| 3 | Missing | Chưa xác định, không phải 0. |
| 4 | Extra | Chưa xác định. |
| 5 | Level conflicts | Chưa xác định theo official. |
| 6 | Grammar từng cấp | Nội bộ:1=10,2=8,3=10,4=6,5=3,6=3,7–9=0. Official coverage unknown. |
| 7 | Hanzi | Nét 4.196/4.202 chữ đang cần là asset coverage nội bộ; official Hanzi/syllable unknown. |
| 8 | Examples | Independent reviewed/verified coverage theo 0/1/2/3+ chưa audit đủ; không suy từ số example rows. |
| 9 | Audio | TTS hệ thống và ghi âm cá nhân;0 native/licensed packs bundled. Manifest foundation, không có downloader. |
| 10 | Reading/story | 18 truyện gốc: 6 mỗi HSK1–3; chưa truyện 4–9. Reader long-text/chunks/TXT/OCR hiện có; chưa EPUB/PDF/article. |
| 11 | Profiles | 7 ORIGINAL_PRACTICE reading profiles, 4 câu/profile, 5–10 phút. Không official verified profile. |
| 12 | Full mock usable | Chưa cấp nào. Timer/section/navigation framework có tests, không đồng nghĩa bank/mock thật. |
| 13 | Thiếu kỹ năng | Nghe với audio hợp lệ, đọc dài, nói/viết/dịch có rubric, grammar/curriculum và official coverage chưa đủ. |
| 14 | Sync thật | Manual cloud: SETTINGS và DECK metadata. Custom words/membership/notes/SRS/history/path chưa sync đầy đủ; backup là luồng riêng. |
| 15 | Android verified | Lint/typecheck/SQLite/unit, Android export và Gradle APK build thử đạt. APK debug-signed, chưa cài/device smoke/mic/TalkBack. |
| 16 | Web verified | Web export + 11 Edge smoke scenarios đạt, có hai-tab/reload/durable progress. Không đồng nghĩa toàn bộ app/mic/AI web đã kiểm tra. |
| 17 | Gemini auth E2E | Chưa kiểm tra trong lượt này, không tuyên bố verified. |
| 18 | Test count | 111 files/377 tests đạt, cộng 11 browser journeys. |
| 19 | Known issues | Xem danh sách còn thiếu bên dưới và release checklist. |
| 20 | HSK Exam Ready | Chưa cấp nào được cấp nhãn này. |

Số liệu source: V4_CONTENT_COUNTS.json. Browser evidence: V4_WEB_SMOKE.json và ảnh v4-web-*.png.
Web thử local: http://localhost:8084/exam; Home mới http://localhost:8084.
Server chỉ bind localhost, không phải hosting công khai. Dữ liệu browser local tách với điện thoại.

## Trạng thái phase A–R

| Phase | Trạng thái |
| --- | --- |
| A | Baseline/SQLite protection có tests; device upgrade chưa kiểm tra. |
| B | Version/reference/import infrastructure; official dataset/license chưa xác minh. |
| C | Lexical auditor có; sense/examples/bốn chiều actual alignment còn thiếu. |
| D | HSK ba mode + Home/Practice/Library đã triển khai; global search/onboarding/exam personalization còn thiếu. |
| E–F | Exam center và original mini test usable; ngân hàng nhiều kỹ năng/cấu trúc official còn thiếu. |
| G | Session/section timer/CAS/resume/results framework; chưa full mock bank/profile. |
| H | Writing/translation drafts và timed speaking self-practice có; semantic AI/rubric/speaking history còn thiếu. |
| I | 40 curated grammar; chưa full syllabus và grammar 7–9. |
| J | Bảo toàn path, thêm 12 grammar lessons; chưa contextual 10–15 word curriculum. |
| K | Audio contract/manifest; chưa advanced stories/EPUB/PDF/native audio/listening library. |
| L | 12 Vietnamese contrasts và center 6 cặp/12 câu có; bank chưa thẩm định độc lập, minimal-pair ngữ âm còn thiếu. |
| M | Grammar-only micro lessons có; chưa multiskill/error-context cards. |
| N | Chưa full sync; không gắn nhãn multi-device full coverage. |
| O | Giữ Gemini 3 scenarios hiện có; chưa expanded goals/budget/durable review/E2E. |
| P | Theme/hubs/modal/ARIA và compact/dark smoke; chưa font-scale/TalkBack/native visual audit. |
| Q | 11 web smoke đạt; startup OPFS recovery được kiểm tra; native/Gemini/two-device còn thiếu. |
| R | Tests/exports/reports và debug-signed test APK có; device/production release nghiệm thu chưa đạt. |

## Còn phải triển khai — không chỉ phụ thuộc nguồn official

1. Full cloud-sync user data với event-aware SRS/history merge, tombstones, account isolation và two-device tests.
2. Contextual curriculum, reviewed meanings/senses/examples; grammar và advanced story/listening content.
3. Mở rộng/thẩm định confusable bank, personal context cards, global search, reader imports.
4. Data-driven AI scenarios/goals và durable quota, budget/history; deployment tương thích client/Edge.
5. Official/licensed references, exam structures/full bank/rubrics và independent academic review.
6. Native/device QA, permission/background/fontscale/accessibility/performance trước signed release.

Các mục 1–4 còn là công việc engineering/content thực sự, không được nói đã xong chỉ vì có interfaces.
Giới hạn nguồn official chỉ chặn tuyên bố alignment/completeness và cấu trúc thi, không chặn tất cả engineering.

Chi tiết APK thử: V4_ANDROID_BUILD.md. Web lifecycle và giới hạn browser: V4_WEB_RECOVERY.md.
