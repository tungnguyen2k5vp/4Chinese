# 4Chinese — thống kê cập nhật V5 bổ sung

## Bản mới nhất — 0.1.30/code32/schema39: đã cài, native QA một phần

Ngày 02-10-2026: main báo build SUCCESS, xác minh chữ ký PASS, cài đặt `adb install -r` SUCCESS. APK đã ký: **215357568 byte**; SHA256 **80BDE32EF15A8A8CB2170776894ACF4EDFE77A3C400881BF16B1DCB473050D1B**. Xác minh chữ ký không có nghĩa đây là bản ký production cho store.

**Kiểm tra cuối:** typecheck/lint PASS; **146 tệp / 819 tests PASS** theo handoff cuối của main.

**Android IME thật: PASS có giới hạn cho khả năng nhìn thấy con trỏ.** Sau chuỗi xuống dòng kết thúc ở dòng 10, con trỏ vẫn nhìn thấy. Main đã xem và xác minh ảnh [bàn phím sau sửa](device-keyboard-v5-fixed.png) và [mười dòng](device-keyboard-v5-ten-lines.png). Screen đo phần giao thực tế giữa IME và root, chỉ thêm paddingBottom theo phần giao; ScrollView flex:1.

Native QA vẫn **PARTIAL**, giới hạn ở thiết bị Realme RMX3085/Android 13, font scale 1.0 và tương tác IME đã quan sát; không suy ra mọi IME, chữ lớn, accessibility, audio hoặc toàn bộ lifecycle đều PASS. Main quản lý V5_DEVICE_QA.md.

Main báo UID 10414 và dataDir không đổi trên 0.1.30, “Buổi 15” còn hiển thị; chưa phải đối chiếu mọi bản ghi học. Trên 0.1.29 trước đó, danh sách lọc cấp 3 có 39 từ, khớp biểu đồ 39: đây là kiểm tra nhất quán có giới hạn, không phải chứng cứ độ phủ học thuật.

**Giữ lịch sử:** bàn phím 0.1.29/code31 FAILED vì dòng 5 bị che; retest con trỏ 0.1.30 có chứng cứ riêng là PASS. V5 chưa hoàn chỉnh về kiểm duyệt học thuật/nguồn/licence, không tuyên bố “Exam Ready”.

## Mốc lịch sử đã cài — 0.1.29/code31 (bàn phím FAILED)

Trạng thái ngày 02-10-2026: phiên bản 0.1.29 · Android versionCode 31 · SQLite schema 39. Main đã báo **cài đặt SUCCESS bằng `adb install -r`** trên Realme RMX3085, serial FAJFPNTCPFGEKZB6, Android 13, font scale 1.0; nâng từ 0.1.26/code28. Main đã xác minh bản cài 0.1.29/code31, UID 10414, dataDir không đổi, tiến trình PID 16068 đang chạy và log lỗi đã kiểm tra trống. Không deploy Supabase, không push GitHub. Báo cáo tính năng cũ được giữ nguyên; phần này là cập nhật mới nhất. Điện thoại hiện đã mở khóa; main quan sát màn hình từ vựng với các số đếm 179 / 37 và Unicode tiếng Việt hiển thị đúng, gồm placeholder và dấu chấm giữa. Sau quan sát màn hình này, main kiểm tra bàn phím native: FAILED vì dòng 5 bị che. Kết quả retest 0.1.30 đang PENDING.

## 1. Tính năng và tương tác dùng được ngay

| Phần | Cập nhật | Cách dùng và giới hạn |
| --- | --- | --- |
| Nhập từ hàng loạt | Giữ ô nhập trong vùng nhìn thấy, tự cuộn khi xuống dòng hoặc đổi vị trí nhập | Ô khoảng 4 dòng, cuộn nội bộ theo con trỏ; chiều cao giới hạn bởi vùng thực sự còn trên bàn phím. Không ép con trỏ về cuối, không mất danh sách khi sửa dòng đầu hoặc dán 100 dòng. Bàn phím nổi không giao với ô không bị coi là che toàn màn hình. Vẫn cần QA bàn phím Android thật. |
| Đọc EPUB | Chọn tệp TXT / EPUB, tách nội dung theo thứ tự spine của sách | EPUB 2/3 reflowable UTF-8/XHTML thuộc tập con được hỗ trợ; tối đa 8 MiB ZIP, 100k ký tự. Không tải ảnh/script/URL ngoài. Từ chối DRM, fixed-layout, ZIP/XML không hợp lệ và tệp vượt giới hạn; không âm thầm cắt nội dung. Lưu/tiếp tục dùng cơ chế chia phần hiện có. PDF/URL chưa hỗ trợ. |
| Bản ghi tại máy | Chủ động lưu bản sao 7 ngày, 30 ngày hoặc đến khi tự xóa | Mặc định vẫn chỉ trong phiên. Phải chọn thời hạn và xác nhận Lưu; không tự tải lên mạng/DB/backup JSON. Thư viện nghe/xóa có xác nhận, bảo vệ tệp đang phát. Tối đa 50 bản/64 MiB, mỗi tệp 8 MiB/120 giây. Dọn hết hạn khi truy cập, không chạy nền. Web chỉ hiện giới hạn hỗ trợ; mic và lưu tệp thật chưa được QA bản mới. |
| Tìm kiếm chung | Tìm trong 5 nhóm: từ vựng, ngữ pháp, truyện, bài học, từ dễ nhầm | Vào Kho cá nhân và tra cứu → Tìm trong ứng dụng. Tối đa 8 kết quả/nhóm, chờ gõ 220 ms, tận dụng chỉ mục FTS Android; web có SQL fallback. Quay lại từ chi tiết giữ từ khóa. Bài học mở lộ trình để không vượt khóa. Nghĩa Việt không dấu áp dụng cho từ vựng/từ dễ nhầm; tên nhóm khác chưa có chỉ mục không dấu riêng. |
| Hội thoại | 13 tình huống, 42 bước trao đổi theo mục tiêu | Đời thường, nhà hàng, phỏng vấn, mua sắm, khách sạn, giao thông, sân bay, bác sĩ, trường học, công việc, du lịch, điện thoại, bạn bè. Dùng offline không cần Gemini; online cần đồng ý và cấu hình dịch vụ. |
| Quota AI | Hạn mức bền vững theo ngày UTC và phiên | Mặc định 20 lượt/ngày, 8 lượt AI/phiên; UI chọn 10/20/40 mỗi ngày và 4/8/12 mỗi phiên. Gửi thất bại/hủy sau giữ lượt vẫn tính; làm mới phiên/xóa lịch sử không xóa quota ngày. Đây là hạn mức cục bộ, không thay quota/billing máy chủ. |
| Lịch sử hội thoại | Tóm tắt tối giản, xóa từng bản, tối đa 100 bản | Không tự lưu nguyên hội thoại hay tệp thu âm. Ghi chú ngắn do người dùng viết là tùy chọn. Backup lưu tóm tắt tối giản và thiết lập hạn mức; không xuất quota đã dùng hoặc ghi chú riêng tùy chọn. |
| Phân biệt âm | 10 bài tự luyện mới | z/zh, c/ch, s/sh, j/q, q/x, an/ang, en/eng, in/ing, thanh 2/3, thanh 1/4. Nghe mẫu TTS, ghi âm tối đa 15 giây và nghe lại trên Android/iOS; web chỉ nghe mẫu. Không gọi đây là điểm phát âm AI. Nội dung tự biên soạn, chưa kiểm duyệt độc lập. |
| Nghe hiểu | 12 bài đối chiếu hiểu câu nguồn cụ thể | Chọn đáp án rồi mới hiện kết quả/giải thích. Bản chép lời và nghĩa chỉ hiện khi người dùng mở. TTS hệ thống, không phải giọng người bản xứ hay đề thi chính thức. Không phát sinh điểm thi hoặc tự gắn trạng thái đã biết từ. |
| Truyện | Đọc theo câu, tốc độ TTS, dừng phát, ẩn/hiện pinyin và nghĩa | Giữ 18 truyện và ID cũ. Nộp bài hiểu truyện cần đủ đáp án; xem trước bản nháp tách riêng, không ghi tiến độ học. |
| Kết quả tự kiểm tra | Thống kê theo kỹ năng, khuyến nghị bài tiếp | Kỹ năng chưa được đo hiện thiếu dữ liệu, không coi là 0 điểm. 28 câu chơi được cũ giữ nguyên. Không suy ra đỗ HSK từ mẫu nhỏ. |
| Từ dễ nhầm | Tăng từ 6 lên 15 nhóm | 9 nhóm mới có cách dùng, ví dụ, giải thích theo ngữ cảnh. Giữ ID/tiến độ 6 nhóm cũ; nhãn chưa kiểm duyệt vẫn rõ ràng. |
| Chi tiết từ | Chặn phản hồi tải cũ, lỗi tải có thử lại; lưu ghi chú có thông báo | Khi đổi từ không hiển thị dữ liệu của từ trước. Lưu lỗi không xóa ghi chú đang nhập; nút lưu chặn gửi trùng khi đang lưu. Sửa nhãn tiếng Việt nút thêm vào bộ từ. |

## 2. Nội dung mới đang chờ biên tập

| Nội dung | Số lượng bổ sung | Trạng thái |
| --- | ---: | --- |
| Ngữ pháp HSK nội bộ 1–6 | 24 cấu trúc, 48 ví dụ | 4 cấu trúc/cấp, giải thích Việt, đối chiếu Việt–Trung, lỗi sai/sửa lỗi và bài luyện. PENDING, 0 mới xuất bản. HSK 7–9 mới có kế hoạch tham chiếu, chưa có danh mục đã xác minh. |
| Ngữ pháp nâng cao 7–9 | 4 cấu trúc, 8 ví dụ | Hàng chờ biên tập nguồn-local: ngoại lệ/quy tắc, suy luận tăng cấp, cơ chế–hệ quả và tiêu chí quyết định. DRAFT/UNVERIFIED, không seed DB, không tìm kiếm, không ghi XP/tiến độ và không được gọi là phạm vi HSK chính thức. |
| Nghĩa theo cách đọc | 35 bản nháp nghĩa | Có định nghĩa Việt, cách dùng, phân biệt các chữ đa âm như 为/会/行/得/长/乐. Không ghi đè nghĩa hay cách đọc do người dùng đã lưu. |
| Cụm từ/ví dụ theo nghĩa | 71 cụm, 35 câu ví dụ | DRAFT/PENDING; đã sửa cách đọc của 还是 và 知道, giảm từ 11 xuống 9 bản chưa khớp kho gốc. Staging khớp 26 nghĩa/53 cụm/26 ví dụ, không tự ghép 9 bản còn lại. Số lượng là nguồn đóng gói, không phải số hàng trên điện thoại. |
| Truyện bổ sung | 14 truyện, 69 câu, 42 câu hỏi | 2 truyện mỗi nhóm nội bộ 1–6 và 7–9. Có Chinese/pinyin/Việt, nhân vật lặp lại, từ/cấu trúc mục tiêu. Có nút xem trước rõ nhãn; 0 mới xuất bản. |
| Ngân hàng câu hỏi | 84 ứng viên câu hỏi | Tách khỏi 28 câu cũ chơi được. Bao gồm 24 bản chép TTS nghe, không cộng thành câu mới thêm lần nữa. Kiểm tra hình dạng, tham chiếu, trạng thái review trước nhập; không tự xuất bản khi test pass. |

6 bài học ngữ cảnh nháp, 21 bài viết, 21 bài dịch, 21 bài nói có thời gian của phần V5 trước vẫn được giữ. Kho chuẩn hóa vẫn 11.379 mục; cập nhật này không phải thêm 35 từ mới vào tổng kho.

## 3. An toàn dữ liệu và hiệu năng

- Migration 38 thêm bảng lịch sử/hạn mức AI; giữ từ riêng, SRS, review log, thống kê ngày và thiết lập. Test database cũ, chạy lại idempotent, rollback và backup khứ hồi đã qua. Không reset dữ liệu.
- Migration 39 thử staging lại hai cách đọc đã sửa; giữ tiến độ và các hàng học của người dùng, không ghi đè nghĩa do người dùng sửa. So khớp toàn bộ âm tiết/thanh điệu, hỗ trợ cách đọc có dấu hoặc số, âm nhẹ 0/5 và ü/u:/v; không bỏ thanh điệu để ghép gần đúng.
- Ngữ pháp/ví dụ nháp được lưu inactive. Tìm kiếm, luyện nói theo mẫu, hiển thị ví dụ và sinh lộ trình lọc nội dung chưa được phát hành. Gửi trực tiếp lượt luyện nói với câu nháp bị từ chối trước ghi XP/tiến độ.
- Staging nghĩa/ngữ pháp chỉ chạy một lần khi nâng schema; tìm kiếm và lịch sử có giới hạn kết quả. Không tải toàn kho cho mỗi lần gõ.
- Sáu chữ chưa có nét hợp lệ (搾、獃、秊、薙、颿、骽) hiển thị fallback bằng font và mô tả trợ năng rằng chưa có dữ liệu offline; không thay thế bằng nét của chữ khác hoặc gợi ý nét giả.
- Không thêm model AI hoặc thư viện animation nặng. APK universal vẫn lớn vì dữ liệu offline và 4 ABI; bản này không được mô tả là đã tối ưu dung lượng triệt để.

## 4. Kiểm tra và bản build

- Lint và TypeScript: PASS. Bộ test toàn dự án: **146 file / 819 test PASS** sau sửa chiều cao ô nhập, lifecycle bản ghi, fallback nét và hàng chờ ngữ pháp nâng cao.
- Mốc lịch sử 0.1.29: export Android và web PASS. **20 ca/hành trình web PASS thuộc checkpoint lịch sử 0.1.28**, không phải lượt QA trình duyệt chạy lại trên 0.1.29. Không lỗi JavaScript được thu trong các hành trình này: 9 luồng cũ, 4 luồng V5 bổ sung, 3 ca ô nhập, 3 ca EPUB và 1 fallback thư viện bản ghi. Kiểm tra bàn phím dùng viewport web thu nhỏ, không phải IME Android thật.
- APK lịch sử 0.1.29 release nội bộ: **BUILD SUCCESSFUL**, version 0.1.29/code31, 215.358.332 byte (~205,38 MiB), chữ ký v2 xác minh được. Đang dùng chữ ký debug nội bộ, không phải bản ký production để đưa lên store.
- SHA-256 APK: `60EF1790AD9367ED91BD1A20D27748179E4BAF4AD170E4DA2A0F978A11B926CF`.
- **Cài đặt 0.1.29/code31 SUCCESS theo handoff của main**: `adb install -r` trên Realme RMX3085 (FAJFPNTCPFGEKZB6), Android 13, font scale 1.0; bản trước là 0.1.26/code28. Main đã xác minh version/code đã cài, UID 10414 và dataDir không đổi, PID 16068 đang chạy; log lỗi đã kiểm tra trống. Đây là chứng cứ gói cài/tiến trình/sandbox tại thời điểm kiểm tra, không chứng minh mọi bản ghi học đã giữ nguyên hoặc ứng dụng luôn không có lỗi. Thiết bị đã mở khóa; main đã quan sát màn hình từ vựng, các số đếm 179 / 37 và tiếng Việt Unicode đúng, gồm placeholder/dấu chấm giữa. Đây là quan sát một phần, chưa phải đối chiếu toàn bộ dữ liệu học. Kiểm tra bàn phím native sau đó FAILED: dòng 5 bị che. Retest 0.1.30 PENDING; mic, TTS, TalkBack, lifecycle và hiệu năng thiết bị của bản mới chưa được xác nhận. Chi tiết QA thiết bị do main quản lý trong V5_DEVICE_QA.md.

## 5. Phần chưa thể gọi là hoàn tất toàn bộ V5

Chưa có kiểm duyệt học thuật độc lập cho nội dung mới; chưa có nguồn syllabus/licence/version đã xác minh để kết luận “đủ HSK” hoặc “Exam Ready”. Đề mock đầy đủ vẫn khóa theo gate. Gemini xác thực trực tiếp không chạy được vì thiếu phiên QA hợp lệ; mic/TTS/native lifecycle chưa được kiểm tra đầy đủ; bàn phím 0.1.29 FAILED, retest 0.1.30 PENDING. 9 bản nháp nghĩa không có danh tính cách đọc tương ứng trong kho chuẩn: kan-look, kan-read, ting, wei-be, xing-okay, de-complement, dei-must, zhang-grow, yue-music; chúng được chặn khỏi staging. Sáu Hán tự thiếu dữ liệu thứ tự nét hợp lệ có fallback nhưng vẫn thiếu nét thật: 搾、獃、秊、薙、颿、骽. HSK 7–9 hiện có 4 nháp source-only, chưa phải danh mục/độ phủ ngữ pháp hoàn chỉnh. PDF/URL reader và audio người bản xứ chưa hoàn tất. EPUB và thư viện audio 7/30 ngày đã có triển khai kỹ thuật nhưng không được coi là đã kiểm chứng trên thiết bị. Không tự bịa chứng cứ review hoặc dữ liệu nét để lấp các khoảng trống này.

Vì vậy, đây là bản hoàn thiện thêm các nhánh kỹ thuật và thống kê trung thực trạng thái; **không phải tuyên bố tất cả yêu cầu V5 đã đạt**. Báo cáo audit và handoff từng nhánh giữ chi tiết để tiếp tục đúng chỗ.
