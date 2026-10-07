# Kiểm kê tính năng, kế hoạch kiểm thử và ảnh màn hình — 4Chinese

Ngày rà soát: 2026-10-06  
Phiên bản mã nguồn: `0.1.33` · Android `versionCode 35` · package `com.tungnguyen2k5vp.fourchinese`  
Thiết bị chụp: AVD Pixel 2, Android API 36, 1080×1920, 420 dpi, font scale 1.0. Ảnh PNG được chụp từ app Android cài trên emulator; không thao tác trên điện thoại Realme thật.

## Kết quả ngắn

- Kiểm kê được **60 file màn hình/route** trong `src/app` (không tính 2 file `_layout.tsx`). Có 60 ảnh tương ứng trong `artifacts/ui-audit-2026-10-06/screens/` và bảng đối chiếu trong `capture-manifest.csv`.
- Có thêm ảnh onboarding bước 2 tại `screens/onboarding-goal-step.png` (ảnh luồng bổ sung, không tính là route thứ 61).
- Đã kiểm tra trực quan luồng màn chính và mở các route bằng deep link. Những route phụ thuộc dữ liệu phiên được chụp ở trạng thái phù hợp nhất có thể; trạng thái rỗng/route guard được ghi ở matrix bên dưới.
- Đã chạy thử bài luyện HSK 1 gồm 4 câu: đáp án được lưu sau thao tác, nộp được, lịch sử hiển thị `4/4`, và mở lại kết quả từ lịch sử được. Tuy nhiên, sau khi xác nhận nộp, app **crash trong chuyển route tự động sang kết quả**. Đây là lỗi ưu tiên cao cần sửa và kiểm thử hồi quy.
- Đã tạo bộ từ `QA demo` rỗng trong dữ liệu emulator để đại diện màn hình bộ từ. Dữ liệu QA không nằm trên điện thoại thật và không đồng bộ lên Supabase.
- Đây là kiểm thử UI/route trên một cấu hình Android; chưa phải chứng nhận toàn bộ hành vi, quyền thiết bị, iOS, hay dịch vụ online. Bộ test chức năng đầy đủ được lên kế hoạch ở dưới.

## Kiểm kê tính năng

1. **Khởi tạo và cá nhân hoá học tập:** onboarding chọn trình độ HSK, mục tiêu từ mới; cài đặt hồ sơ, giao diện, mục tiêu/ngày và thời lượng.
2. **Trang chủ và điều hướng:** tiến độ/ngày học, streak/XP, hành động nhanh, nhiệm vụ ngày; tab Trang chủ, HSK, Kho từ, Thống kê, Tài khoản.
3. **Từ vựng và HSK:** syllabus, kho từ theo cấp, tìm kiếm toàn app, trang chi tiết từ, pinyin/âm thanh, bộ lọc và tình trạng học.
4. **Học theo lộ trình và bài mới:** khóa học/cấp HSK, bài học có các hoạt động từ vựng–đọc–ngữ pháp–viết–ôn; chọn chủ đề/từ mới; phiên học nhiều lượt và tiến độ.
5. **Ôn tập và củng cố:** SRS, lựa chọn kiểu bài, phiên ôn/kết quả, lịch sắp tới, từ yếu, sổ lỗi và luyện lại lỗi.
6. **Ngữ pháp, từ dễ nhầm, truyện:** danh sách/chi tiết/ngữ cảnh, câu hỏi luyện tập, tiến độ và âm thanh.
7. **Viết Hán tự:** danh sách chữ/bộ thủ, thứ tự nét, vùng viết tay/nhận diện và chuyển chữ.
8. **Nghe và nói:** thư viện nghe theo cấp, thanh điệu, minimal pairs, shadowing, bản ghi, hội thoại AI/roleplay.
9. **Đọc:** thư viện và Reader; nhập TXT/EPUB, OCR/tra từ, ngữ cảnh và tiến độ đọc (cần cấp quyền/chọn tệp khi kiểm thử tương tác).
10. **Bộ từ cá nhân:** tạo/sửa/xóa mềm–khôi phục, thêm từ đơn/hàng loạt, chia sẻ/nhập mã, quiz, nghe và phát âm.
11. **Luyện thi:** luyện theo cấp/kỹ năng/thời lượng, phiên thi có lưu đáp án, nộp bài, kết quả/lịch sử, readiness. Màn kết quả hiện cảnh báo `UNVERIFIED` — nội dung luyện không được tuyên bố là đề thi/chấm điểm HSK chính thức.
12. **Thành tích, đồng bộ và kiểm duyệt nội dung:** streak/XP/thành tích, sao lưu/khôi phục qua cloud, dashboard rà nội dung.

## Kế hoạch kiểm thử chức năng

| ID | Ưu tiên | Luồng và thao tác | Kết quả mong đợi / tiêu chí đạt |
|---|---|---|---|
| QA-01 | P0 | Cài mới, mở lần đầu, chờ dữ liệu offline; đóng/mở lại app | Không crash/mất dữ liệu; tiến độ giữ nguyên; thời gian khởi tạo trong ngưỡng sản phẩm định ra. Đo riêng cold start và warm start. |
| QA-02 | P0 | Onboarding: thử mọi cấp HSK, chuyển bước, đổi mục tiêu, hoàn tất, mở lại app | Lựa chọn và mục tiêu được lưu; lựa chọn HSK ảnh hưởng đúng nội dung; footer không che lựa chọn trên màn nhỏ và font lớn. |
| QA-03 | P0 | Điều hướng 5 tab, back Android, deep link route tĩnh/động | Đến đúng màn; back không thoát bất ngờ; không crash/overlay cũ; route động không có ID thì hiển thị empty/error guard rõ ràng. |
| QA-04 | P0 | Home → chọn chủ đề → học từ mới → hoàn tất phiên | Mỗi từ đi đủ các lượt; câu trả lời sai/đúng cập nhật trạng thái đúng; giới hạn ngày/phiên được tôn trọng; tiến độ/XP cập nhật một lần. |
| QA-05 | P0 | Tạo lượt ôn có từ đến hạn; trả lời đúng/sai/skip; kết thúc; xem result/upcoming/weak | SRS xếp lịch đúng; câu sai không lặp vô hạn; queue/result và thống kê khớp; từ yếu/lịch sắp tới phản ánh cùng dữ liệu. |
| QA-06 | P0 | Thi HSK ngắn: lưu từng đáp án, rời app/khóa màn hình, quay lại, nộp, mở lịch sử | Đồng hồ và đáp án phục hồi đúng; không mất lượt; nộp một lần; điều hướng sang result không crash; kết quả/hạn chế được thể hiện chính xác. |
| QA-07 | P1 | Tìm từ bằng Hán tự, pinyin có dấu/không dấu, nghĩa Việt; mở chi tiết | Kết quả phù hợp, không treo; detail đúng ID, phát âm/TTS có fallback khi offline; trạng thái yêu thích/đã học được lưu. |
| QA-08 | P1 | Lộ trình HSK → khóa → bài; mở các hoạt động của bài và quay lại | Tiến độ khóa/bài và evidence tăng đúng một lần; màn khóa/bài không lỗi khi chưa có tiến độ. |
| QA-09 | P1 | Làm ngữ pháp, truyện và cặp từ dễ nhầm; cố tình sai rồi làm lại | Đáp án/giải thích đúng; lịch ôn gốc không bị thay đổi ngoài quy tắc; lịch sử lỗi dẫn đúng mục. |
| QA-10 | P1 | Viết chữ: chữ một/nhiều nét, nét sai/đúng, clear/undo/đổi chữ | Bút nhận touch/stylus, thứ tự nét và điểm nhận diện dễ hiểu; không mất nét khi cuộn/back. |
| QA-11 | P1 | Nghe/nói: TTS, tone, minimal pairs, shadowing, roleplay; từ chối/cấp quyền micro | Quyền được xin đúng lúc; từ chối vẫn có đường dùng thay thế; audio dừng khi rời màn; lỗi mạng/AI không làm mất tiến độ. |
| QA-12 | P1 | Reader mở TXT/EPUB hợp lệ, sai định dạng, tệp lớn; OCR ảnh; tra/lưu từ | Chọn tệp và quyền rõ ràng; giới hạn/kích thước được xử lý; nội dung/điểm đọc giữ sau khởi động lại; không làm app crash. |
| QA-13 | P1 | Tạo bộ từ, thêm từ cá nhân/từ có sẵn, sửa, bulk-add, quiz/listening/pronunciation, thùng rác/khôi phục | Dữ liệu gắn đúng deck, không trùng sai; xóa mềm giữ dữ liệu, khôi phục được; deck rỗng có empty state và không mở phiên sai. |
| QA-14 | P1 | Theme sáng/tối/tự động; font scale 1.0/1.3/1.5; bàn phím mở; màn nhỏ/lớn | Không clipping/chồng nút; status/navigation bar tương phản; vùng chạm/scroll hoạt động; nội dung dài không bị che. |
| QA-15 | P1 | Bật/tắt mạng, airplane mode, app background/foreground, xoay (nếu hỗ trợ) | Luồng offline học/ôn vẫn hoạt động; thao tác online báo lỗi có thể phục hồi; phiên học/thi không mất hoặc nhân đôi. |
| QA-16 | P2 | Cloud: đăng nhập, sao lưu, khôi phục/merge trên tài khoản test; xác minh RLS | Không lộ dữ liệu giữa người dùng; merge không ghi đè tiến độ mới hơn; lỗi mạng/token được xử lý. Chỉ thực hiện khi có credential và dự án Supabase test được chỉ định. |
| QA-17 | P2 | Content-review dashboard: mở, lọc, xem item; thử hành động được phép | Chỉ người có quyền mới sửa/publish; review không sửa nhầm nội dung người học. |
| QA-18 | P2 | Accessibility: TalkBack, nhãn nút, thứ tự focus, tương phản và reduce motion | Tên hành động đọc được; focus không kẹt; thông tin không chỉ dựa vào màu; chuyển động có thể giảm. |

## Danh sách 60 route và ảnh đối chiếu

Ảnh đường dẫn tương đối tính từ `artifacts/ui-audit-2026-10-06/`. Với màn động, ID mẫu chỉ nhằm hiển thị dữ liệu ổn định; ảnh trạng thái rỗng không được xem là bằng chứng luồng tương tác đã đạt.

| # | Route nguồn | Trạng thái/fixture trong ảnh | Ảnh |
|---:|---|---|---|
| 1 | `src/app/index.tsx` | Entry → Home | `screens/app_entry.png` |
| 2 | `src/app/onboarding.tsx` | Bước chọn trình độ | `screens/onboarding.png` |
| 3 | `src/app/search.tsx` | Tìm toàn app, chưa nhập truy vấn | `screens/search.png` |
| 4 | `src/app/(tabs)/index.tsx` | Home tab; cùng UI với entry | `screens/home.png` |
| 5 | `src/app/(tabs)/hsk.tsx` | Tab HSK | `screens/tabs_hsk.png` |
| 6 | `src/app/(tabs)/vocabulary.tsx` | Tab kho từ | `screens/tabs_vocabulary.png` |
| 7 | `src/app/(tabs)/stats.tsx` | Thống kê ban đầu | `screens/tabs_stats.png` |
| 8 | `src/app/(tabs)/profile.tsx` | Hồ sơ/cài đặt | `screens/tabs_profile.png` |
| 9 | `src/app/achievements/index.tsx` | Thành tích/mục tiêu | `screens/achievements.png` |
| 10 | `src/app/cloud/index.tsx` | Màn đăng nhập/sao lưu | `screens/cloud.png` |
| 11 | `src/app/confusables/index.tsx` | Danh sách từ dễ nhầm | `screens/confusables_index.png` |
| 12 | `src/app/confusables/[id].tsx` | Cặp `know` | `screens/confusables_detail.png` |
| 13 | `src/app/content-review/index.tsx` | Dashboard rà nội dung | `screens/content_review.png` |
| 14 | `src/app/daily/index.tsx` | Kế hoạch học hôm nay | `screens/daily.png` |
| 15 | `src/app/decks/index.tsx` | Danh sách có deck QA rỗng | `screens/decks_index.png` |
| 16 | `src/app/decks/[id].tsx` | Chi tiết deck `QA demo` rỗng | `screens/decks_detail.png` |
| 17 | `src/app/decks/word.tsx` | Form thêm/sửa từ | `screens/decks_word_editor.png` |
| 18 | `src/app/decks/bulk-add.tsx` | Nhập nhiều từ, chưa nhập | `screens/decks_bulk_add.png` |
| 19 | `src/app/decks/trash.tsx` | Thùng rác rỗng | `screens/decks_trash.png` |
| 20 | `src/app/decks/listening.tsx` | Deck chưa đủ từ để nghe | `screens/decks_listening.png` |
| 21 | `src/app/decks/pronunciation.tsx` | Deck rỗng | `screens/decks_pronunciation.png` |
| 22 | `src/app/decks/quiz.tsx` | Deck chưa đủ từ để quiz | `screens/decks_quiz.png` |
| 23 | `src/app/exam/index.tsx` | Trung tâm luyện thi HSK 1 | `screens/exam_index.png` |
| 24 | `src/app/exam/written.tsx` | Luyện viết & dịch | `screens/exam_written.png` |
| 25 | `src/app/exam/speaking.tsx` | Luyện nói có thời gian | `screens/exam_speaking.png` |
| 26 | `src/app/exam/skills.tsx` | Danh sách kỹ năng | `screens/exam_skills.png` |
| 27 | `src/app/exam/session.tsx` | Lượt luyện thật, câu 1/4, 1 câu đã trả lời | `screens/exam_session.png` |
| 28 | `src/app/exam/result.tsx` | Kết quả thật đã mở lại từ lịch sử: 4/4 | `screens/exam_result.png` |
| 29 | `src/app/exam/readiness.tsx` | Mức độ sẵn sàng HSK 1 | `screens/exam_readiness.png` |
| 30 | `src/app/grammar/index.tsx` | Danh sách ngữ pháp | `screens/grammar_index.png` |
| 31 | `src/app/grammar/[id].tsx` | Điểm ngữ pháp `gram-shi` | `screens/grammar_detail.png` |
| 32 | `src/app/grammar/focus.tsx` | Bài ôn theo lỗi lặp lại | `screens/grammar_focus.png` |
| 33 | `src/app/hsk/syllabus.tsx` | Syllabus HSK 1 | `screens/hsk_syllabus.png` |
| 34 | `src/app/learn/setup.tsx` | Chọn chủ đề học | `screens/learn_setup.png` |
| 35 | `src/app/learn/session.tsx` | Queue rỗng → guard quay về setup | `screens/learn_session.png` |
| 36 | `src/app/library/index.tsx` | Thư viện | `screens/library.png` |
| 37 | `src/app/listening/index.tsx` | Thư viện nghe theo cấp | `screens/listening.png` |
| 38 | `src/app/mistakes/index.tsx` | Sổ lỗi ban đầu rỗng | `screens/mistakes_index.png` |
| 39 | `src/app/mistakes/practice.tsx` | Negative case: ID lỗi/không tồn tại | `screens/mistakes_practice.png` |
| 40 | `src/app/path/index.tsx` | Danh sách lộ trình | `screens/path_index.png` |
| 41 | `src/app/path/[courseId].tsx` | Khóa `hsk-1-path` | `screens/path_course.png` |
| 42 | `src/app/path/lesson/[lessonId].tsx` | Bài `hsk-1-lesson-1` | `screens/path_lesson.png` |
| 43 | `src/app/practice/index.tsx` | Trung tâm luyện tập | `screens/practice.png` |
| 44 | `src/app/reader/index.tsx` | Reader chưa chọn tài liệu | `screens/reader.png` |
| 45 | `src/app/review/index.tsx` | Không có từ đến hạn | `screens/review_index.png` |
| 46 | `src/app/review/session.tsx` | Queue rỗng → guard về màn ôn | `screens/review_session.png` |
| 47 | `src/app/review/result.tsx` | Màn kết quả route độc lập ban đầu | `screens/review_result.png` |
| 48 | `src/app/review/upcoming.tsx` | Chưa có lịch ôn sắp tới | `screens/review_upcoming.png` |
| 49 | `src/app/review/weak.tsx` | Chưa có từ yếu | `screens/review_weak.png` |
| 50 | `src/app/speaking/index.tsx` | Nghe và nói | `screens/speaking_index.png` |
| 51 | `src/app/speaking/tones.tsx` | Luyện thanh điệu | `screens/speaking_tones.png` |
| 52 | `src/app/speaking/shadowing.tsx` | Shadowing | `screens/speaking_shadowing.png` |
| 53 | `src/app/speaking/recordings.tsx` | Bản ghi trên máy | `screens/speaking_recordings.png` |
| 54 | `src/app/speaking/pairs.tsx` | Cặp âm dễ nhầm | `screens/speaking_pairs.png` |
| 55 | `src/app/speaking/ai.tsx` | Luyện hội thoại AI | `screens/speaking_ai.png` |
| 56 | `src/app/stories/index.tsx` | Danh sách truyện | `screens/stories_index.png` |
| 57 | `src/app/stories/[id].tsx` | Truyện `story-school-1` | `screens/stories_detail.png` |
| 58 | `src/app/word/[id].tsx` | Detail một từ HSK 1 | `screens/word_detail.png` |
| 59 | `src/app/writing/index.tsx` | Trung tâm luyện viết | `screens/writing_index.png` |
| 60 | `src/app/writing/[character].tsx` | Luyện chữ `我` | `screens/writing_character.png` |

## Lỗi và giới hạn đã thấy

### P1 lịch sử — Crash khi nộp bài và chuyển sang kết quả

Repro trên app Android 0.1.33, AVD Pixel 2/API 36: mở Trung tâm luyện thi → HSK 1, chế độ Đọc & ngữ pháp, 5 phút → trả lời đủ 4 câu → Nộp bài → Xác nhận nộp. Ngay khi điều hướng tự động sang `/exam/result`, process kết thúc. `logcat` ghi `FATAL EXCEPTION: main` với `java.lang.IllegalStateException: ScreenStackFragment added into a non-stack container`, stack đi qua `ScreenStackFragment.canNavigateBack` và `ScreenStackHeaderConfig.onUpdate` của `react-native-screens`.

Đây là lỗi được tái hiện ở lượt QA trước. Trong lượt V5.3 ngày 2026-10-06, đã làm lại trọn luồng trên `emulator-5556`: trả lời 4 câu, nộp bài, màn kết quả tự mở và hiển thị 4/4 (100%); không tái hiện crash. Trạng thái hiện tại: pass trên emulator trong một lượt kiểm thử, chưa xác nhận trên thiết bị thật/API khác hoặc bản release.

### P2 — Khởi tạo dữ liệu offline lần cài mới lâu

Lượt quan sát V5.2 từng ước lượng khoảng 3 phút trước onboarding, chưa đo benchmark có kiểm soát. Ở lượt V5.3 hiện tại, Home hiện sau khoảng 30 giây trên debug emulator trong một lần khởi tạo offline; con số cũ không tái hiện. Cả hai đều là quan sát đơn lẻ, không phải benchmark; cần đo cold start trên máy mục tiêu.

### P2 lịch sử — Onboarding chọn cấp bị footer che một phần lựa chọn

Ở V5.2, vùng HSK 5/6 từng bị footer cố định che. V5.3 đặt footer trên lớp danh sách cuộn; trên emulator 1080×1920 đã cuộn tới HSK 5/6, chọn HSK 6 và nhấn `Tiếp tục` thành công sang bước mục tiêu. Không nhấn `Bắt đầu học`, nên không lưu hoàn tất onboarding. Còn kiểm tra màn nhỏ/font lớn trước release. Ảnh bổ sung: [`onboarding-hsk-levels-scrolled.png`](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/interaction-checks/onboarding-hsk-levels-scrolled.png), [`onboarding-hsk6-selected.png`](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/interaction-checks/onboarding-hsk6-selected.png), [`onboarding-goal-step.png`](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/interaction-checks/onboarding-goal-step.png).

### P3 lịch sử — Một số route để lộ tiêu đề kỹ thuật

Ở V5.2, màn truyện từng hiện `stories/[id]`; ảnh runtime V5.3 hiện dùng tiêu đề localized `Đọc truyện` và nội dung tải đủ. `content-review/index` vẫn là route nội bộ/dev, cần giữ giới hạn môi trường phát triển.

### Trạng thái chưa có fixture / dịch vụ

- `learn/session` và `review/session` khi queue rỗng quay về màn chọn/chỉ số; đây là guard phù hợp nhưng chưa thay thế kiểm thử phiên học/ôn có dữ liệu.
- Deck `QA demo` hiện rỗng; quiz/nghe/phát âm trong deck hiện empty state, chưa kiểm tra luồng với ≥2 từ.
- `mistakes/practice` được chụp bằng ID không tồn tại để xác minh negative guard. Route hiển thị hộp thoại “Không mở được bài”; chưa có unresolved mistake hợp lệ để kiểm thử giải quyết lỗi thật.
- Reader chưa được cấp tệp mẫu; chưa kiểm tra Document Picker, EPUB, TXT, OCR hay quyền truy cập tệp.
- Chưa đăng nhập Supabase/tài khoản test, chưa kiểm tra backup/restore online hoặc quyền RLS. Ảnh Cloud là trạng thái chưa đăng nhập.
- Chưa cấp quyền microphone, chưa xác minh nhận dạng tiếng nói/AI roleplay và lưu audio trên thiết bị thật.

## Kết quả rerun sau V5.2 — 2026-10-06

- Đã chụp đủ 60/60 mục manifest sau cập nhật trên `emulator-5556`; kiểm tra tên file có 0 thiếu, 0 thừa, 0 ảnh rỗng. 57 route dùng deep link, chi tiết bộ QA và hai màn Exam được chụp sau flow trong app.
- Đã duyệt 6 contact sheet. `speaking/shadowing` được chụp lại sau khi SQLite tải hết; ảnh cuối có câu 1/35 và điều khiển luyện tập.
- P1 điều hướng Exam: đã nộp bài 4 câu HSK 1, thấy kết quả 4/4 và mở lại từ lịch sử mà không gặp lỗi native ScreenStack.
- Footer onboarding HSK 5/6 và tiêu đề chi tiết truyện đã được sửa, có ảnh post-V5.2.
- `mistakes/practice?id=qa-missing` là ca negative test cố ý: ảnh có alert “Không mở được bài”. Deck QA hiện có nhưng rỗng; các route deck phản ánh empty state, không xác nhận thao tác cần từ thật.
- Ảnh được chụp từ development build, có nút nổi dev menu ở góc phải; không phải ảnh release. Không dùng điện thoại vật lý và không đăng nhập/kết nối Supabase.
- Bộ ảnh post-V5.2: `artifacts/ui-audit-2026-10-06/screens-v5-2-verified/`; manifest: `artifacts/ui-audit-2026-10-06/capture-manifest-v5.2.csv`; contact sheets: `screens-v5-2-verified/contact-sheets-final/`.

## Kết quả V5.3 runtime recapture — 2026-10-06

- Đã recapture đủ 60/60 route theo manifest trên nguồn V5.3 hiện tại: 57 route mở bằng deep link và 3 màn cần thao tác trong app; không thiếu/thừa ảnh, tất cả là PNG 1080×1920, density 420 dpi, theme sáng, font scale 1.0.
- Manifest: [`capture-manifest-v5.3-final.csv`](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.3-final.csv); ảnh: [`screens-v5-3-runtime-final`](../artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/).
- Hai cặp ảnh giống hệt là guard hợp lệ khi hàng đợi rỗng: `learn_session`/`learn_setup` và `review_index`/`review_session`; không tính là ảnh bỏ sót.
- Luồng Exam HSK 1 hoàn tất 4/4 và mở màn kết quả 100%, không crash trong lượt retest này. Chi tiết bộ QA rỗng và route luyện lỗi không có fixture thật được ghi rõ trong manifest.
- Onboarding đã kiểm tra tương tác cuộn: HSK 5/6 lộ đầy đủ, chọn HSK 6 và CTA đi tiếp tới bước mục tiêu; không hoàn tất/lưu thiết lập. Ảnh luồng bổ sung nằm trong thư mục `interaction-checks/` cạnh bộ 60 route.
- Ảnh từ dev client nên có nút debug nổi. Không cài lên điện thoại thật; không xác minh TalkBack, các mức font/theme khác, bản release hoặc đồng bộ Supabase.

## Checklist trước khi phát hành

- [x] Retest auto-navigation sau nộp bài trên emulator V5.3: kết quả 4/4 mở bình thường; chưa xác minh trên thiết bị thật/bản release.
- [ ] Đo cold-start/seed offline trên ít nhất một Android thật và giảm thời gian/hiển thị tiến độ nếu cần.
- [ ] Tạo fixture có từ cho deck; kiểm thử bulk import, edit, trash/restore, quiz, nghe, phát âm và backup/restore.
- [ ] Tạo fixture cho SRS (new → review → mistake), kiểm tra ngày đến hạn, queue, stats và restart persistence.
- [ ] Test Reader với TXT/EPUB/OCR, audio/TTS và permission microphone; chạy khi offline.
- [x] Cuộn/chọn HSK 6 và đi tiếp tới bước mục tiêu trên emulator; không lưu hoàn tất onboarding.
- [ ] Kiểm tra thêm onboarding ở màn nhỏ/font scale lớn và recapture bước mục tiêu.
- [x] Sửa chồng lấn footer ở bước chọn HSK và thay tiêu đề route thô trên màn truyện.
- [ ] Chạy TalkBack/contrast/theme sáng-tối; kiểm tra Android API thấp hơn và một thiết bị thật; kiểm tra iOS nếu còn hỗ trợ.
- [ ] Chỉ kiểm tra cloud/RLS với tài khoản/dự án test và credential được cung cấp an toàn; không dùng khóa service-role ở app.

## Tệp bằng chứng

- 60 PNG baseline route: `artifacts/ui-audit-2026-10-06/screens/`
- 60 PNG post-V5.2: `artifacts/ui-audit-2026-10-06/screens-v5-2-verified/`
- Manifest post-V5.2: `artifacts/ui-audit-2026-10-06/capture-manifest-v5.2.csv`
- 60 PNG runtime post-V5.3: `artifacts/ui-audit-2026-10-06/screens-v5-3-runtime-final/`
- Manifest runtime post-V5.3: `artifacts/ui-audit-2026-10-06/capture-manifest-v5.3-final.csv`
- Onboarding bước mục tiêu (ảnh luồng bổ sung): `artifacts/ui-audit-2026-10-06/screens/onboarding-goal-step.png`
- Route/URL/kích thước/trạng thái chụp: `artifacts/ui-audit-2026-10-06/capture-manifest.csv`
- Contact sheets để duyệt nhanh: `artifacts/ui-audit-2026-10-06/contact-sheet-01.png` … `contact-sheet-05.png`
- Build cài local từ source hiện tại; không phải bản phát hành Play Store. Các trạng thái/fixture do quá trình QA tạo chỉ tồn tại trên emulator.

## Hậu V5.3.1 — trạng thái capture ngày 2026-10-06

- Code refinement và automated checks được ghi tại [`V5_3_1_FINAL_REPORT.md`](V5_3_1_FINAL_REPORT.md).
- Chưa có capture hậu V5.3.1: environment không nhận `adb`, không có Android SDK env; CUA browser process bị ACL chặn. Không cài app lên điện thoại thật.
- Không dùng lại `screens-v5-3-runtime-final` để tuyên bố ảnh mới. Danh sách case cần chụp và status rõ ràng: [`capture-manifest-v5.3.1.csv`](../artifacts/ui-audit-2026-10-06/capture-manifest-v5.3.1.csv).
- Chỉ sau khi chạy preview/release trên emulator, chụp, mở/duyệt từng ảnh và tạo contact sheet mới thì mới có thể đánh dấu visual QA V5.3.1 hoàn tất.
