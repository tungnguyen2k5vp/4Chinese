# Hanzii Premium → 4Chinese: phân tích và triển khai ngày 30/10/2026

Đã kết hợp REA/JADX, đọc tài nguyên Android và thao tác Hanzii Premium trên điện thoại. Đợt này triển khai lại **form làm bài, bảng câu và chữa bài** của 4Chinese. Các cải tiến tìm kiếm, ví dụ câu và trình diễn nét chữ thuộc đợt trước cũng nằm trong APK mới.

**Giới hạn quan trọng:** chưa khôi phục được mã chấm thi Hanzii; chưa tái tạo chấm AI viết/nói hay thang điểm HSK chính thức. Không coi số lượng ảnh chụp là số màn hình duy nhất hoặc bằng chứng đã kiểm tra 100% ứng dụng.

## 1. Phạm vi và bằng chứng

- Project: `D:/ReactJS/HocTiengTrungApp`, Expo SDK 57 / React Native 0.86.3.
- XAPK người dùng cung cấp: `C:/Users/Admin/Downloads/Hanzii Dict_6.24.0_1.xapk`.
- Hanzii trên điện thoại: package `com.eup.hanzii`, phiên bản 6.24.0, versionCode 811; trùng phiên bản của XAPK.
- Premium được đối chiếu qua giao diện tài khoản và khả năng mở phân tích đáp án/giải thích. Không tự thực hiện mua hàng.
- Được phép làm/nộp bài và thay đổi lịch sử Hanzii. Không gửi bình luận, chia sẻ hoặc tin nhắn.
- Không cài hay mở 4Chinese trên điện thoại trong đợt này. APK 4Chinese được thử trên máy ảo riêng, không qua Expo Go.

Kho bằng chứng hiện tại: [hanzii-premium-rea-2026-10-30](../../4Chinese-Archive/hanzii-premium-rea-2026-10-30/).
Kho khảo sát trước: [hanzii-research-2026-10-29](../../4Chinese-Archive/hanzii-research-2026-10-29/).

Kho trước có 583 cặp PNG/XML và `coverage-raw.json`; kho hiện tại có 45 lượt capture ghi trong `ui-coverage.jsonl`. Có lượt lặp cùng màn hình, cuộn và trạng thái tải. Tên file chỉ là nhãn thao tác; kết luận phải đối chiếu nội dung XML/ảnh. Ví dụ `037-hsk30-return-result` thực tế đã quay về danh mục, không phải màn kết quả.

Ảnh/XML Hanzii thô có thể chứa thông tin cá nhân và nội dung cộng đồng; báo cáo này không sao chép các thông tin đó.

## 2. Phân tích XAPK và giới hạn REA

| Thành phần | Kết quả xác minh | Bằng chứng / độ tin cậy |
|---|---|---|
| XAPK | 74.027.052 byte; chỉ có `base.apk`, không split APK hoặc OBB | `xapk-inventory.json`, cao |
| Base APK | 102.347.000 byte; minSdk 23, targetSdk 36; thư viện ARM64 | `rea-package.json`, manifest, ZIP inventory; cao |
| DEX / tài nguyên | 5 DEX; JADX báo 21.453 lớp và 8.595 tài nguyên | `rea-package.json`, `apk-entries.json`; cao trong phạm vi APK này |
| Giao diện | Có Android Views/XML: ConstraintLayout, NestedScrollView, CustomTextView | `layout-test-question.txt`, `layout-test-results.txt`, `layout-answer-sheet.txt`; cao |
| Layout liên quan bài/thi/kết quả | 67 file khớp bộ lọc tên; đây là inventory, không đồng nghĩa 67 màn thi hoạt động | `resource-structure.json`; cao |
| Hoạt họa | 24 Lottie JSON, có nhóm achievement | `resource-structure.json`; cao về tài nguyên, không suy ra mọi thời điểm phát |
| Font / âm thanh | 12 font; 3 MP3 đóng gói | `resource-structure.json`; cao. Không kết luận APK chứa toàn bộ audio đề thi |
| Dữ liệu đóng gói | 4 SQLite asset: achievements, mini_kanji, radical_v2, zhuyin | Header SQLite và inventory; chưa sử dụng nội dung trong 4Chinese |
| Runtime khác | Không tìm thấy bundle/runtime Flutter hoặc React Native trong inventory APK | Kết quả tìm kiếm có giới hạn; không phủ định mọi công nghệ có thể tải động |
| Lớp bảo vệ | Application là `com.jiiagu.q3rt9w.stub.ShellHostApp`, kèm `libjiiagu.so` | Manifest và REA class inventory; cao |
| Mã chấm thi | Các activity thi có trong manifest nhưng REA báo `Exact class not found` khi đọc các lớp tương ứng | `rea-TestQuestionActivity.json`, `rea-TestResultsActivity.json`, `rea-TestExplainActivity.json`, `rea-TestIntroActivity.json` |

Các lớp thi cần đọc gồm `com.eup.hanzii.activity.mock_test.TestQuestionActivity`, TestResultsActivity, TestExplainActivity và TestIntroActivity. Mã hiện thấy không đủ để lần theo hàm tính điểm. Suy luận hợp lý là phần ứng dụng thật được lớp bọc nạp theo cách không hiện trong inventory DEX đã phân tích; chưa xác minh cơ chế nạp cụ thể, phần nào chấm ở máy và phần nào chấm ở server. Không thực hiện trích xuất bộ nhớ hoặc vượt lớp bảo vệ.

REA đã đọc thành công inventory của ShellHostApp: constructor, `attachBaseContext`, `onCreate` và hai phương thức phụ. Đây không phải mã chấm bài.

Định danh bằng chứng REA:

- Package: `ev_1dbbe6d6517c97ce89b694b503d7db9bcac64f74c3d1b94e21808b937247051c`.
- Shell class: `ev_80918f7686ecc89f8d9e7b0e4abac78c43207aa27880ff5ff59fcd5557ed9b1b`.
- XAPK SHA-256: `14e9382dc7a68256b1475aabdc9589f9dd006d6ebfdbc372495f35d510c4b26e`.
- Base APK SHA-256: `0b77206650344195044338992264811a43d7681eade09e3ed46e8737027f5458`.

## 3. Form thi và cách chấm đã quan sát trực tiếp

Đề khảo sát Premium: **HSK 6 – Test 1 – 3.0**, 82 câu: 40 nghe, 40 đọc, 2 viết.

| Hành vi | Quan sát / bằng chứng | Kết luận và giới hạn |
|---|---|---|
| Thiết lập | `003-hsk30-setup`: bảng nội dung, số câu, thời gian và điểm từng nhóm | Có thể học cách trình bày. Danh mục ghi 125 phút nhưng bảng thiết lập cộng 115 phút; không sao chép thông số mâu thuẫn |
| Form câu nghe | `005`, `041`, `046`: đồng hồ và menu cố định, 4 đáp án A–D; chọn B ở câu 1 tự sang câu 2 | Hành vi đã thao tác; không suy ra mọi dạng câu đều tự chuyển |
| Bảng câu | `007–010`, `047`: chia kỹ năng/nhóm; cuộn từ đầu đến câu 82; chưa cho nhảy sang viết trong lúc nghe | Có giới hạn truy cập phần thi. Chưa xác minh đầy đủ quy tắc quay lại của mọi đề |
| Nộp và thành tích | `018–021`: nộp sớm, xuất hiện thành tích rồi kết quả | Đã quan sát popup thành tích. Chưa đo chính xác duration/easing từ video |
| Một câu sai | Lượt đầu chọn A ở câu 1, còn lại bỏ trống: 0/300, 0% | Xác minh ca cụ thể. Chưa đủ chứng minh quy tắc trừ điểm cho mọi dạng bài |
| Đáp án câu 1 | `035-hsk30-listening-answer-review`: A sai màu đỏ, B đúng màu xanh; có phụ đề/giải thích | Đáp án đúng B được xác minh từ màn chữa bài |
| Một câu đúng | `046` chọn riêng B câu 1; `048-hsk30-positive-submit`: 2,50 điểm, 1%, nghe 1/40 | Kết quả thực nghiệm; không phải công thức lấy từ source |
| Chi tiết nhóm | `049`: nhóm nghe đầu 1/8 và 12%; bảng thiết lập nhóm này có 20 điểm | `20/8 = 2,5` phù hợp ca đã thử. Chưa chứng minh công thức toàn bộ đề/HSK |
| Làm tròn | `056` danh mục hiển thị 3/300 trong khi kết quả chi tiết là 2,50 | Có khác biệt hiển thị/làm tròn. Không nhân tỷ lệ đúng chung với 300 để giả định điểm Hanzii |
| Chữa đọc | `022–024`: đoạn đục lỗ và lựa chọn có vùng cuộn; có đáp án/giải thích/dịch | Đã mở Premium. Không sao chép đoạn văn hoặc bộ câu hỏi |
| Chữa viết | `030`: câu 81 dạng trả lời mở, bộ đếm 0/150 và bài mẫu | Mới xác minh form/bài mẫu; chưa có bằng chứng chấm AI thành công hoặc rubric chi tiết |
| Cuộn kết quả | `050–054`: đi qua nghe, đọc, viết và khu vực cuối; hai lần cuộn cuối có bố cục ổn định | Đã đi hết màn kết quả này. Khu thảo luận báo lỗi tải; không gửi bình luận |

**Chấm điểm trong 4Chinese:** tiếp tục dùng đáp án và snapshot đã lưu của dự án: đúng 1, sai/bỏ trống 0; tỷ lệ đúng chia cho toàn bộ số câu. Màn kết quả đã ghi rõ đây là điểm bài luyện, không phải điểm HSK chính thức. Không đổi điểm hoặc lịch sử khi lọc/chữa bài. Không đưa công thức suy đoán của Hanzii vào engine hiện tại.

## 4. Đã áp dụng vào 4Chinese

| Phần | Thay đổi cụ thể | Độ khó / trạng thái |
|---|---|---|
| Thiết lập bài | Bảng nội dung–thời gian; số câu đọc lấy từ bank thực tế, từ vựng ghi số tối đa; giải thích cách làm và điểm | Thấp; đã làm |
| Làm bài | Header đồng hồ/tiến độ; vùng nội dung cuộn; đoạn đọc tách khỏi câu hỏi; đáp án A–D lớn; thanh trước/bảng câu/tiếp/nộp cố định | Vừa; đã làm và thử APK |
| Tự chuyển | Công tắc tự sang câu kế sau chọn đáp án; đáp án và vị trí được lưu trong cùng thao tác hiện có | Vừa; đã thử. Ẩn và vô hiệu cơ chế này với profile NO_BACK |
| Đánh dấu và bảng câu | Nhóm theo kỹ năng; trạng thái hiện tại/đã làm/chưa làm/đánh dấu/khóa; lọc chưa làm và đánh dấu | Vừa; đã làm và thử APK |
| Nộp | Báo số câu bỏ trống, số cờ, xác nhận rồi mới nộp; khóa thao tác trùng khi lưu/nộp | Vừa; đã thử cả hủy và xác nhận |
| Tổng kết | Tách đúng, sai và bỏ trống; thời gian thực; breakdown từng kỹ năng; bấm số liệu để mở đúng bộ lọc | Vừa; đã làm |
| Chữa từng câu | Tất cả/đúng/sai/bỏ trống/đánh dấu; phân biệt đáp án đã chọn sai và đáp án đúng; giải thích; trước/tiếp trong bộ lọc; bảng câu đầy đủ | Vừa; đã thử APK |
| Chuyển động | Chuyển câu 180ms bằng StudyTransition hiện có; phản hồi nhấn MotionPressable; modal bảng câu dùng chuyển động native và tôn trọng reduced motion | Không thêm thư viện; đã thử với OS animation off |
| Audio câu nghe | Card hiểu metadata SYSTEM_TTS và dùng AudioButton hiện có; transcript chỉ mở khi chữa. Nguồn audio khác báo chưa hỗ trợ | Có đường UI trong code; chưa có bank nghe playable để chứng nhận end-to-end trên APK |

File triển khai đợt này:

- `src/app/exam/setup.tsx`, `session.tsx`, `result.tsx`.
- `src/components/exam/ExamQuestionCard.tsx`, `ExamNavigator.tsx`.
- `src/services/exam/presentation.ts` và `presentation.test.ts`.

Giữ các API lưu/đọc/nộp hiện có, deadline, snapshot, revision lock và điều kiện khóa phần. Không sửa schema, engine tính điểm, bank nội dung hoặc quy tắc SRS trong đợt này. `task-source.diff` đối chiếu UI trước/sau, tách khỏi nhiều thay đổi đã có sẵn trong workspace.

### Ngoài thi thử

Các phần sau **đã làm trong đợt 29/10 và được giữ trong APK mới**, không tính là triển khai mới ngày 30/10:

- `src/app/search.tsx`: tab lọc loại kết quả, trạng thái trống theo nhóm, chuyển nhóm có hiệu ứng.
- `src/app/word/[id].tsx`: bật/tắt pinyin và nghĩa của ví dụ để tự nhớ trước khi xem.
- `src/components/StrokeWriter.tsx`: tốc độ diễn nét, ẩn/hiện chữ mẫu; dừng trình diễn khi rời/background; kiểm tra trong `StrokeWriter.test.ts`.

Đợt trước đã thử APK các nhóm tìm kiếm, ví dụ, viết và màn hẹp/chữ lớn. Bằng chứng nằm trong `hanzii-research-2026-10-29/native-check-results.jsonl`. Không tuyên bố các mục OCR, dịch, AI, sổ từ hoặc ngữ pháp đã được nâng cấp thêm chỉ vì đã mở chúng trong Hanzii.

## 5. Ma trận khảo sát ngoài thi và việc nên áp dụng

Các mã dưới đây thuộc kho 29/10; chúng là điểm kiểm tra đại diện, không phải danh sách mọi nội dung. Đợt Premium hiện tại chủ yếu bổ sung bằng chứng thi HSK 6–3.0.

| Nhóm | Đã khảo sát | Tình trạng trong 4Chinese / phần còn lại |
|---|---|---|
| Từ điển và chi tiết từ | Tra chữ/pinyin/nghĩa, loại kết quả, chi tiết, ví dụ; `007–020`, `366–388` | Đã áp dụng lọc tìm kiếm và che pinyin/nghĩa. Nên tiếp tục làm điều hướng mục trong trang từ dài bằng UI và truy vấn đọc sẵn có |
| Viết, bộ thủ, cấu tạo | Viết tay, ứng viên, bộ thủ, đồ thị từ ghép; `011–033`; tập viết có phản hồi `402–403` | Đã áp dụng tốc độ/ẩn mẫu. Chấm nét chi tiết, nhận dạng chữ viết hoặc đồ thị mới chưa triển khai |
| Voice/OCR/camera | Form quyền, camera/crop, kết quả rỗng, thử từ chối quyền; `021–032` | Mới nghiên cứu. Chưa chứng minh đầy đủ độ chính xác nhận dạng; cần engine/model và kiểm thử phần cứng trước khi thêm |
| Dịch và dịch màn hình | Ngôn ngữ, nhập/dịch, UI overlay/quyền; `033–040`, `078–126` | Mới nghiên cứu. Không giữ overlay hoặc xin quyền nền trong 4Chinese ở đợt này |
| Sổ từ / flashcard | Danh sách, cài đặt, thêm/hủy, tùy chọn ôn; `154–192` | Mới khảo sát UX. Có thể thêm bộ lọc và thao tác che đáp án; mọi thay đổi lịch ôn/SRS nằm ngoài đợt này |
| Ngữ pháp | Tra mẫu, mở chi tiết và mở rộng ví dụ; `378–384` | Đã xác nhận có nhiều ví dụ trong chi tiết. Chưa mở rộng nội dung hoặc thay form ngữ pháp 4Chinese trong đợt này |
| Kho từ và luyện tập | Kho HSK 7–9, tập viết, chọn đáp án/feedback/kết quả; `393–440` | Nguồn ý tưởng cho luyện theo mục và chữa lỗi; chưa sao chép bank hoặc thay tiến độ |
| Hồ sơ/thống kê/thành tích | Thống kê từ/chữ/ngữ pháp, các danh sách trống; `559–576`; thành tích `306–325` | Đã xem các trạng thái cụ thể. Chưa thực hiện thêm badge hoặc thay dữ liệu thống kê trong 4Chinese |
| Mẹo học / bảng xếp hạng / tải đề | Có các lượt mở và cuộn; `127–146`, `241–244`, `326–365` | Một số vùng chưa xác nhận được đáy hoặc phụ thuộc mạng. Không đánh dấu hoàn tất mọi màn con |
| Cộng đồng | Feed, filter, tìm kiếm, composer được mở/hủy; `246–286`, `441–474` | Không đăng/gửi gì. Không ưu tiên nhân bản mạng xã hội vào app học hiện tại |

Các bước ngoài thi đáng làm tiếp, theo khả năng giữ nguyên dữ liệu: (1) mục lục nhanh trong chi tiết từ; (2) ngữ pháp cô đọng có ví dụ mở rộng và tự che nghĩa; (3) từ ghép liên quan dùng nội dung sẵn có; (4) bộ lọc sổ từ. Đây là đề xuất, **chưa triển khai trong đợt này**.

Không thể chứng nhận “không sót màn nào”: feed/webview/nội dung mạng có thể vô hạn, một số màn lỗi tải hoặc không có dữ liệu, các đề và nhánh Premium chưa được làm hết. Các mục thiếu bằng chứng được giữ là chưa xác minh thay vì suy diễn từ tên file/layout.

## 6. Kiểm thử và bảo vệ dữ liệu

| Kiểm tra | Kết quả |
|---|---|
| Test tự động toàn dự án | 221 file, **1.200/1.200 test pass**; `tests-final.log` |
| Nhóm exam | 10 file, 76 test pass ở lượt kiểm tra riêng; `tests-exam.log` |
| TypeScript | Pass; `typecheck-reviewed.log` |
| ESLint các file thay đổi | Pass; `lint-reviewed.log` |
| APK release, Android API 36 x86_64 | Luồng 4 câu: bấm nhanh nhiều lần, 2 đúng/1 sai/1 trống = 50%; đánh dấu, bảng câu, auto-next, background/resume, hủy/xác nhận nộp, chữa đáp án; PASS |
| Màn hẹp và chữ lớn | 320dp, font 150%, OS animation 0; bảng câu, chữa bài, tổng quan cuộn, Android Back đóng modal; PASS |
| NO_BACK | Tự chuyển không xuất hiện; chuyển câu có xác nhận; câu trước/bảng câu bị khóa đúng; cảnh báo rời bài qua nút trong app; nộp và kết quả 1/4; PASS |
| Native error log | Không có lỗi AndroidRuntime/ReactNativeJS trong log lọc của lượt QA; `native-errors.log` |
| File bảo vệ | Hash **229/229 file không đổi**, `source-integrity-final.json` |
| Dữ liệu AVD trước/sau | Schema/user_version và mọi bảng học/ôn không đổi; chỉ `hanzi30.db.exam_attempts` từ 0 → 5 bản ghi QA; `database-integrity-final.json` |
| Đối chiếu từ đợt trước | Snapshot trước của đợt này trùng snapshot trước đợt Hanzii 29/10 |
| Điện thoại thật | Chỉ thao tác Hanzii; không cài/mở 4Chinese để test, không đọc/sửa database 4Chinese |

Điều kiện QA: máy ảo riêng `FourChineseMotionV2QA`, APK release không cần Metro/Expo Go; 360dp/font 100% là mặc định, 320dp/font 150% là ca bổ sung. Không lấy hiệu năng SwiftShader/máy ảo làm benchmark tốc độ điện thoại.

Đồng hồ cập nhật liên tục làm lệnh `uiautomator dump` mặc định không đạt trạng thái idle. Đã dùng runner UI Automator nhỏ chỉ đọc hierarchy với idle timeout 0; xóa file dump tạm trước mỗi lượt, không tái sử dụng XML cũ khi đọc lỗi. Các lỗi harness ban đầu được lưu riêng; không dùng chúng để suy ra app đã pass. Android Back ở root deep link có thể đưa về launcher; kiểm tra cảnh báo rời bài được thực hiện qua nút Quay lại trong app.

Để chụp DB AVD sau QA, chỉ thay APK sang fixture debug cùng package/chữ ký/version, không chạy fixture và không uninstall/clear-data. Các bản sao SQLite nằm ngoài source. Không thao tác tương tự trên điện thoại.

Ảnh 4Chinese để đối chiếu:

- [Thiết lập bài](../../4Chinese-Archive/hanzii-premium-rea-2026-10-30/native-shots/exam-setup.png).
- [Chọn đáp án](../../4Chinese-Archive/hanzii-premium-rea-2026-10-30/native-shots/exam-answer-selected.png).
- [Kết quả](../../4Chinese-Archive/hanzii-premium-rea-2026-10-30/native-shots/exam-result.png).
- [Chữa câu sai](../../4Chinese-Archive/hanzii-premium-rea-2026-10-30/native-shots/exam-review-wrong.png).
- [Bảng câu, chữ lớn](../../4Chinese-Archive/hanzii-premium-rea-2026-10-30/native-shots/exam-compact-navigator.png).

Ảnh luồng thường được chụp trước lần sửa nhãn CTA cuối: nhãn “Chữa 2 câu cần ôn” đã đổi thành “Chữa các câu sai” để đúng bộ lọc được mở. Hai thay đổi cuối chỉ là nhãn CTA này và nhãn accessibility của công tắc NO_BACK; lượt NO_BACK chạy trên APK cuối.

## 7. APK và giới hạn bàn giao

- [APK ARM64 mới](../../4Chinese-Archive/hanzii-premium-rea-2026-10-30/4Chinese-hanzii-premium-exam-arm64-v8a.apk): 97.128.174 byte; version 0.1.52/code 54.
- SHA-256 ARM64: `5e28784357fd9ac228d801a7c7602bb2441da19cc4bc79f04b5d4a841334b425`.
- Bản x86_64 đã dùng cho QA: 101.144.946 byte; SHA-256 `b915aa1afd6a634035004a7a6218c48bf41e5543bcba0cbe3e47ec92c302e462`.
- Hai APK có cùng hash bundle ứng dụng `e1db56f9201d3f4e8cdd0df1cb84811bc3e31d5ec2f98bd29d5f352f54adc819`; ZIP/ABI và chữ ký ARM64 đã kiểm tra. Chữ ký hiện có của bản nội bộ được giữ nguyên; đây là artifact QA, không phải bản phát hành Play Store.
- Chưa cài APK mới lên điện thoại; chưa xác minh ARM64/native UI trên điện thoại, iOS, TalkBack hoặc audio bài nghe end-to-end.

Bank bài đọc/ngữ cảnh hiện vẫn nhỏ (bank gốc có 4 câu/cấp, lọc trọng tâm có thể còn 2), chưa trở thành ngân hàng đề đầy đủ HSK 1–9. Không lấy việc thêm form làm bài để tuyên bố đã có đủ đề thi hoặc công thức chấm HSK. Viết/nói vẫn cần nội dung, rubric và hệ thống đánh giá có thể kiểm chứng.

Không đưa ảnh, Lottie, font, bản ghi âm, câu hỏi, bài mẫu hay mã độc quyền của Hanzii vào 4Chinese. Premium cho phép sử dụng dịch vụ, không tự tạo giấy phép phân phối lại tài nguyên. Các thay đổi là cách tổ chức UI/tương tác được tự viết bằng component/thư viện sẵn có của dự án.
