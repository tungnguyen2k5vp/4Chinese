# 4Chinese — AI P0–P3: triển khai và kiểm chứng

Ngày 03/11/2026. Báo cáo lượt P0–P3, tiếp nối [AI V1](AI_V1_IMPLEMENTATION.md) và [luồng luyện tập V1](AI_V1_COMPLETION.md). Phần hoàn thiện ngày 04/11 và kết quả mới nhất ở [AI_FOLLOWUP_2026-11-04.md](AI_FOLLOWUP_2026-11-04.md): phân tích lựa chọn đã nộp/luyện tiếp, nghe–ghi âm lại câu AI, preview editor và xuất tệp JSON.

Đã bổ sung code cho các luồng còn thiếu bằng gateway hiện có. **Backend vẫn mặc định tắt, chưa cấu hình secret hoặc deploy, chưa gọi model thật.** Kết quả dưới đây phân biệt phần đã viết/kiểm thử với chất lượng AI và khả năng native chưa được xác minh. Bật lựa chọn provider trong app chưa đủ để dùng AI online.

## P0 — AI Tutor Core

| Yêu cầu | Trạng thái trong source hiện tại |
|---|---|
| Từ vựng theo ngữ cảnh | Giữ entry tại chi tiết từ, chọn riêng nghĩa muốn hỏi. Bổ sung entry từ trong Reader kèm trích đoạn quanh từ vào bản nháp; người học xem/sửa rồi mới gửi. Không gửi cả record, ID hoặc tiến độ. |
| Phân biệt từ dễ nhầm | Giữ entry từ Confusables; thêm quick action “Phân biệt từ” khi chọn một nghĩa. Nếu AI gợi ý từ thứ hai chưa có dữ liệu từ điển, prompt yêu cầu nói rõ cần đối chiếu. |
| Giải thích ngữ pháp | Dùng cấu trúc, giải thích và câu mẫu của điểm ngữ pháp đang xem. Quick actions giải thích, ví dụ và quiz đã có. |
| Ví dụ theo trình độ | Bộ chọn mục tiêu HSK 1–9 áp dụng vào request; ví dụ có chữ Hán, pinyin, dịch Việt và loa hiện có. Chưa chứng minh model tuân thủ chính xác danh mục từ HSK 3.0. |
| Sửa câu Trung và Anh | Giữ sửa câu Trung; bổ sung chế độ sửa câu Anh tại trang tiếng Anh và chi tiết từ tiếng Anh. Có ý muốn diễn đạt, bản gốc/bản sửa/lý do, nút nghe đúng ngôn ngữ và đưa bản sửa lại ô soạn. Giới hạn câu 1.000 ký tự, ý định 300; không tự gửi khi chọn bản sửa. |
| Mẹo nhớ Hán tự | Giữ cấu tạo đã kiểm tra ở local, thiếu thì báo thiếu. Nhãn AI phân biệt liên tưởng với từ nguyên. Luồng lưu ghi chú có preview/xác nhận đã có từ trước; không tự lưu và không thay SRS. |

Phiên tiếng Anh tách khỏi phiên tiếng Trung: chỉ nhận `writing`, không HSK, không context từ dữ liệu học tiếng Anh, không examples/quiz/mnemonic tiếng Trung. Đổi ngôn ngữ, provider hoặc quyền tạo phiên mới.

## P1 — Memory & Adaptive Learning

| Yêu cầu | Phần bổ sung |
|---|---|
| Phân tích lỗi cá nhân | Study Coach cho chọn mục lỗi đang mở. Chỉ gửi tiêu đề, kỹ năng, dạng bài và số lần sai đã chọn; AI phải nói rõ dữ liệu chỉ có số đếm. |
| Nhóm từ khó nhớ | Đọc các ứng viên từ khó qua repository hiện có, hiển thị số lần sai/quên để người học chọn. Không suy luận từ chưa học thành từ hay quên. |
| Bài bổ trợ | Quick action gợi ý hai bài ngắn theo các từ/kỹ năng đã chọn; kết quả là đề xuất, không đổi lịch ôn. |
| Quiz riêng | Tạo tối đa ba câu theo dữ liệu đã chọn. Dùng form làm bài nháp đã có: chọn/đổi đáp án, chuyển câu, nộp, xem giải thích và làm lại trong RAM. |
| Phân tích Reader | Giữ dịch/phân tích/tóm tắt/đọc hiểu; thêm “Sửa đoạn viết”. Đưa đúng đoạn đã chỉnh vào form sửa câu và tắt context kèm để tránh gửi trùng. Bản nháp quá dài được giữ, khóa gửi để người học tự rút gọn. |
| Study Coach theo mục tiêu | Màn `/ai/coach`: nhập mục tiêu tối đa 300 ký tự, chọn 5/10/15/20 phút, chọn dữ liệu rồi xem trước ở Tutor. Thêm entry tại Củng cố trí nhớ, Sổ lỗi, học hằng ngày và nhóm Công cụ AI khác. |

Study Coach đọc tối đa 12 ứng viên từ khó và hiển thị 16 trong tối đa 200 mục lỗi đang mở. Không chọn sẵn dữ liệu cá nhân. Mỗi request tối đa **6 từ, 8 mục lỗi**, mỗi từ tối đa ba nghĩa local. Không gửi ID, ngày tháng, ghi chú, câu cá nhân hoặc cả record. Vẫn phải cho phép context trong Settings và bật gửi context ở Tutor.

**Giới hạn:** repository không cung cấp câu trả lời gốc từng sai trong projection này. AI không được tuyên bố biết nguyên nhân sai cụ thể hoặc bịa đáp án của người học. Đây là thích ứng theo dữ liệu được chọn ở phiên hiện tại; chưa có bộ nhớ AI lâu dài, hồ sơ người học mới hoặc tự cập nhật lịch học. Tập rỗng được hướng dẫn xin bài khảo sát nháp.

## P2 — Speaking & Voice

| Yêu cầu | Trạng thái |
|---|---|
| Hội thoại tình huống | Thêm chế độ Luyện nói trong Tutor và entry từ màn Luyện nói. Chọn làm quen, gọi món, hỏi đường hoặc tự nhập tình huống. AI trả một lượt tiếng Trung có pinyin, nghĩa Việt và loa. |
| Nói chuyện tự do | Chọn Hội thoại tự do hoặc nhập chủ đề; tự soạn câu/nhập transcript trước khi gửi. |
| Luyện phản xạ | Đồng hồ 15 giây chạy thật khi bấm bắt đầu; hết giờ vẫn sửa câu được, không tự nộp hoặc trừ điểm. Rời màn hình/background dừng lượt. |
| Nhập giọng nói | Tái sử dụng module speech recognition đã cài, yêu cầu nhận dạng **trên thiết bị** với `zh-CN`. Transcript tối đa 500 ký tự; phải bấm đưa vào ô soạn rồi Gửi. Hủy micro/quyền đang chờ khi rời màn hình/background; giới hạn thu 20 giây. |
| Phân tích transcript | Mặc định không kèm transcript cũ. Opt-in gửi tối đa ba cặp hội thoại thuộc đúng tình huống; không gửi trùng trong `history`. Có fallback nhập/dán khi thiếu model ngoại tuyến hoặc trên web. |
| Tổng kết sau hội thoại | Xem trước tối đa sáu cặp thuộc đúng tình huống, sau đó chủ động gửi. Prompt chỉ phân tích lượt `user`, có dẫn câu/lý do và hai gợi ý luyện tiếp. |
| Luyện phát âm | Nối tới thanh điệu và nghe/ghi âm đối chiếu đã có. Luồng chấm âm thanh `pronunciation-score` cũ giữ nguyên, là endpoint riêng. Gateway text mới không nghe/chấm âm thanh. |

Phiên Tutor tối đa tám phản hồi; hội thoại dừng ở bảy để dành cơ hội yêu cầu tổng kết, vẫn chịu hạn mức server. Không stream âm thanh hai chiều hoặc tự gọi tiếp sau mỗi lượt nói. TTS dùng dịch vụ giọng nói hiện có, không phải giọng sinh mới của provider.

**Chưa xác minh:** micro/model `zh-CN` ngoại tuyến trên điện thoại, độ chính xác STT, chất lượng lời thoại/TTS, chấm âm thanh thực. Không dùng transcript để khẳng định điểm phát âm/thanh điệu. Chính sách free-only của gateway mới không thay chính sách chi phí của endpoint phát âm/roleplay cũ.

## P3 — Content & Vision

| Yêu cầu | Trạng thái |
|---|---|
| Chụp ảnh và tra nội dung | Thêm “Chụp ảnh để nhận chữ” tại Reader. Xin quyền camera, dùng bộ nhận chữ native đã có, cho người học kiểm tra/sửa rồi tách và tra từ. |
| OCR | Tái sử dụng OCR trên thiết bị; tối đa 2.000 ký tự nhận được. Web/thiếu module hiện fallback dán văn bản. Không gửi ảnh lên gateway. |
| Phân tích bài viết | Dùng Reader với đoạn tự chọn tối đa 1.200 ký tự hoặc sửa đoạn tiếng Trung tối đa 1.000 ký tự. |
| Sinh bài tập nháp | Task `content` yêu cầu ba câu theo chủ đề, nguồn tùy chọn, mục tiêu HSK và dạng trắc nghiệm/câu đục lỗ/kết hợp; schema chấp nhận tối đa ba câu. |
| Biên tập admin | Màn `/ai/editor`, kiểm quyền qua status. Server chặn task `content` trước khi gọi provider nếu tài khoản không thuộc **cả** `AI_DEV_USER_IDS` và `AI_ADMIN_USER_IDS`. Không lấy quyền từ client. |
| Đề luyện có kiểm duyệt | Sửa câu hỏi, lựa chọn, đáp án đúng, giải thích; kiểm tra cấu trúc/đáp án trùng/rỗng. Người biên tập tự đối chiếu từng câu rồi mới xuất JSON bản nháp. Mỗi sửa đổi bỏ dấu duyệt và JSON cũ. |

JSON ghi `format=4chinese.ai-content-draft.v1`, `status=human-reviewed-draft`, `officialExam=false`, nguồn/chủ đề/cấp/dạng bài của **lần sinh bản nháp đó** và thời điểm tự duyệt. Đổi form sinh không gán nguồn mới vào bài cũ. Chỉ xuất các trường quiz thực sự được hiển thị/biên tập; không lẫn nội dung AI ẩn. JSON giữ trong RAM; chia sẻ dùng bảng chia sẻ hệ thống do người dùng mở.

**Giới hạn:** chụp/OCR ở đây là nhận và tra chữ, chưa phân tích vật thể/bố cục ảnh bằng model Vision. Dấu tự duyệt không chứng minh chuyên gia đã thẩm định hoặc từng đáp án đúng. Editor chưa xuất bản/nhập kho, không tạo đề HSK chính thức hoặc ghi database. Camera/OCR và bảng chia sẻ cần kiểm trên APK thật.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| Unit/contract AI | **61/61 đạt**, thêm bảy test so với baseline 54. Bao gồm tách tiếng Anh, projection người học, giới hạn/consent transcript, admin bị chặn trước provider, validation và provenance bản xuất. |
| TypeScript | `npm run typecheck` đạt. |
| Lint | `npm run lint`: **0 errors**, tám warnings cũ ngoài AI. |
| Toàn bộ suite | **225 file, 1.267 test: 1.265 đạt, hai lỗi cũ trùng baseline**. `src/db/hsk30.test.ts:182` và `src/db/v5-sense-schema.test.ts:21` mong version 46, thực tế vẫn 47; không sửa schema/test này trong task AI. |
| Web export | Đạt, `entry-fdba10a14e3ad63b7d72dcbff6f4ca0c.js`. |
| Android Hermes export | Đạt, `entry-e0ef26dd0cbbcde2d8ffd53956ec23f2.hbc`. Đây là bundle, chưa phải APK hoặc kiểm thử native runtime. |
| Browser | Auth/AI mock trong context cô lập `4chinese-ai-phases-qa`, database QA mới, chặn mạng ngoài. Không dùng tài khoản hoặc tiến độ học thật. |

Browser đã kiểm tra luồng Coach khi chưa có dữ liệu, mục tiêu/thời gian và quiz riêng; hội thoại, đồng hồ thật, fallback STT, gửi transcript theo opt-in, tổng kết và tách tình huống; admin bị từ chối/được phép, sửa/duyệt/xuất, giữ nguồn cũ và hủy kết quả đến muộn; 429 có đếm ngược, không tự retry; sửa câu Anh, viết lại không tự gửi, thu hồi consent; Reader chọn nghĩa, câu quanh từ, đoạn đã chỉnh và giữ bản nháp 1.200 ký tự nhưng khóa gửi sửa câu. Có thử back, cuộn đến cuối, 390px sáng và 320px tối/reduced motion cho các màn mới. Không thấy runtime exception hoặc request ngoài dự tính trong các luồng này.

Không có live inference, đánh giá chất lượng/thiên kiến của model thật, Supabase đã deploy, kiểm Deno runtime, APK/native runtime, bàn phím/TalkBack native hoặc kiểm camera/micro thật trong vòng này. Test prompt/mock không chứng minh nghĩa, pinyin, ngữ pháp, cấp HSK và đáp án AI đều đúng.

## Bảo vệ dự án

Đối chiếu SHA-256 với **721 file trước lượt P0–P3**: 19 file cũ thay đổi có chủ đích, 702 file khác giữ nguyên, không mất file. Thêm năm file source: Coach, editor, công cụ hội thoại, projection learner và exporter nội dung. Mẫu `.env.example` bổ sung placeholder `AI_ADMIN_USER_IDS`; file ẩn này không nằm trong manifest gốc. Ba tài liệu AI cũ được cập nhật liên kết/phạm vi.

Database/schema/migrations/data/assets/native modules, review/SRS/memory engine, backup, dependency/lockfile và build config không thay đổi trong lượt này. `DATABASE_VERSION` vẫn **47**. Tiếng Anh chỉ đổi hai màn để đặt entry theo yêu cầu sửa câu Anh; dữ liệu, lịch ôn và các file English khác giữ nguyên. Không mở database/backup/điện thoại thật để QA; bài và đề AI nháp không ghi XP, kết quả học hoặc lịch ôn.

Artifact: `D:/ReactJS/4Chinese-Archive/ai-phases-2026-11-03/`, gồm baseline, `tests-final.json`, `browser-qa.json`, `final-source-sha256.json`, `safety-report.json`, bundle và ảnh các luồng Coach/hội thoại/editor/English/Reader. Manifest chỉ chứng minh các file source đã đối chiếu; không phải bản hash database người học.

## Cách thử tiếp khi backend đã sẵn sàng

1. Làm theo [hướng dẫn server](AI_V1_SERVER_SETUP.md), xác minh free plan/exact model và tài khoản QA. Không gửi key qua chat. Status chỉ đọc cấu hình, không đo sức khỏe model hoặc quota thật. Production vẫn cần durable limiter phù hợp; hiện chỉ có development allowlist/limiter RAM.
2. Chi tiết từ → Hỏi AI → chọn nghĩa → chọn gửi context → thử giải thích, ví dụ HSK và phân biệt từ. Ngữ pháp/Hán tự kiểm tra tương tự với dữ liệu local đang xem.
3. Trang tiếng Anh → AI sửa câu tiếng Anh → nhập câu và ý định. Kiểm tra giữ ý, loa tiếng Anh, không kèm HSK hoặc dữ liệu học tiếng Trung.
4. Củng cố trí nhớ/Sổ lỗi → Study Coach → mục tiêu/thời gian → tự chọn từ/lỗi → xem trước → bật gửi context → phân tích, quiz riêng và bài bổ trợ. Với tập rỗng, AI phải báo thiếu bằng chứng.
5. Luyện nói → nhà cung cấp AI đã chọn → chọn cảnh → nhập/nhận transcript → xem trước → gửi. Thử opt-in lịch sử, đổi cảnh và tổng kết. Trên APK QA kiểm quyền micro, model Trung ngoại tuyến, background, hủy, TTS rồi micro và đồng hồ 15 giây.
6. Reader → chụp/chọn ảnh trên APK hỗ trợ → kiểm tra OCR → tách/tra từ → chọn từ hoặc đoạn → hỏi/sửa/dịch. Thử từ chối quyền, ảnh không chữ, hủy và văn bản dài bằng dữ liệu QA.
7. Tutor → Công cụ AI khác → editor → kiểm quyền → tạo/sửa/duyệt/xuất nháp. Tài khoản thường phải bị server từ chối kể cả khi tự gửi task `content`; sửa form/bài phải bỏ dấu duyệt. Duyệt chuyên môn trước mọi lần sử dụng nội dung bên ngoài bản nháp.

Trước khi dùng rộng rãi cần đối chiếu phản hồi model thật với câu Trung/Anh đúng và sai, cách diễn đạt khác hợp lệ, từ đa nghĩa/đa âm, 不/没/了/过/把/被, cấp HSK 1/3/6/7–9, câu đục lỗ đúng duy nhất và prompt injection trong đoạn nguồn. Không bật production hoặc tuyên bố hoàn tất kiểm chứng nội dung chỉ từ kết quả mock.
