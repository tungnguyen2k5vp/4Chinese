# Chat và cộng đồng — cập nhật 07/11/2026

Vào **Trang chính → Cộng đồng** hoặc **Cài đặt → Cộng đồng · bạn bè & tin nhắn**.

## Bảng tin, avatar và ảnh biểu cảm V3

- **60 avatar** chia nhóm Động vật / Biểu cảm / Sở thích, chọn trong hồ sơ tài khoản. Sáu chỉ số avatar cũ vẫn giữ nguyên ý nghĩa; APK cũ tiếp tục nhận giá trị hợp lệ.
- **72 mẫu ảnh biểu cảm** chia 6 bộ, mỗi bộ 12: Chào hỏi, Đi học, Cảm xúc, Cổ vũ, Hài hước, Nghỉ ngơi. Trong **Viết bài → Hình ảnh biểu cảm → Chọn ảnh vui**, chọn tối đa 4 mẫu; có thể đăng chỉ với ảnh biểu cảm. Bỏ bài nháp cũng bỏ các ảnh đã chọn. Đây là hình tĩnh kèm câu Trung/Việt, không phải GIF.
- **19 chủ đề** dùng cho cả đăng bài và lọc bảng tin, gồm các chủ đề học tập cũ cùng Dịch thuật, Du học, Du lịch, Tìm bạn học, Gia sư, Việc làm, Công nghệ, Kinh doanh, Đời sống, Giải trí, Kỹ thuật, Y tế, Khác.
- Bảng tin giới hạn tiêu đề 2 dòng, nội dung 3 dòng trên màn thấp hơn 750px / 5 dòng trên màn cao hơn. Chỉ xem trước tối đa 2 ảnh biểu cảm hoặc 1 tệp đính kèm; bấm vùng nội dung hay **Xem đầy đủ** mở toàn bộ bài, tất cả ảnh/tệp, tim và bình luận có phân trang.
- Gỡ nút like khỏi giao diện bài viết, giữ **tim / bình luận / mắt xem / lưu bài**. Like cũ vẫn được giữ ở backend để tương thích APK cũ, không đổi thành tim hay lượt xem.
- Mắt xem đếm **số tài khoản khác nhau đã mở chi tiết bài**, không đếm lướt feed, không đếm tác giả. Mỗi tài khoản chỉ tính một lần kể cả tải lại/đổi máy; không phải bộ đếm impression. Danh sách người xem không được cấp quyền cho client. Số hiển thị tải lại khi mở màn, làm mới hoặc đồng bộ định kỳ; chưa phát sự kiện realtime riêng cho lượt xem.
- Hình đóng gói offline từ [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji), giấy phép [MIT](https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE); tổng 74 PNG khoảng 2,93 MB, dùng chung cho avatar và các mẫu. Giữ bản giấy phép tại `assets/community/LICENSE.microsoft-fluent-emoji.txt`; nguồn snapshot, SHA-256 từng ảnh và toàn văn thông báo MIT trong `assets/community/SOURCES.json`. Toàn văn giấy phép được đóng gói trong bundle và có thể mở ngay trong kho ảnh. Câu Trung/Việt được biên soạn cho 4Chinese. Chưa đóng gói meme có khuôn mặt/người nổi tiếng hoặc nguồn không xác định giấy phép.
- `supabase/community-v3.sql` chỉ mở rộng `social_*`, thêm RPC `social_community_api` cho hồ sơ/bảng tin/đăng bài/lượt xem; API cũ vẫn hoạt động. Không sửa bảng học, tiến độ, SRS hoặc phiên đăng nhập.
- Web V3 đã xuất tại `dist-community`, phục vụ ở `http://localhost:8082/community`; APK V3 **0.1.57 (59)** đã cài đè trên Realme RMX3085 theo yêu cầu mới. Bằng chứng kiểm tra tại `artifacts/community-v3-2026-11-07/`.
- Kiểm tra V3: `npm run check` đạt **1.327 test / 235 file**, TypeScript, kiểm tra nội dung và xuất Android; lint 0 lỗi, 8 cảnh báo cũ. Sau bổ sung thông báo giấy phép, 7 test API/catalog, TypeScript và lint các file chỉnh sửa tiếp tục đạt. PostgreSQL QA qua V1/V2/media/V3 và chạy lại migration; sentinel học giữ nguyên. Backend thật và giao diện hai người dùng qua đầy đủ 16 nhóm kiểm tra trong `result.json`, không có lỗi JavaScript, dọn 3 tài khoản QA sau mỗi lượt.
- APK release ARM64 được build bằng JDK 17 hiện có, không đổi signing config. Chữ ký trùng bản đang cài; kiểm tra resource table thấy đủ 74 hình và thông báo MIT trong bundle. Cài bằng `adb install -r`, không gỡ app hay xóa dữ liệu. UID, thư mục dữ liệu, thời điểm cài lần đầu và ID cộng đồng giữ nguyên; hai lần khởi động nguội qua, không thấy fatal crash trong các tiến trình kiểm tra. Đã mở kho ảnh, vuốt danh sách hình và mở/vuốt avatar trên Android thật, không đăng bài hoặc lưu hồ sơ. Các luồng đăng bài/bình luận/chat hai người được kiểm thử bằng tài khoản web QA riêng; chưa kiểm thử đầy đủ các luồng ghi này trên Android.
- 139 file dữ liệu học và AI trong baseline vẫn giữ nguyên hash. Không mở database học trên điện thoại, không thực hiện bài học, ôn tập hoặc khôi phục Cloud trong lượt này. APK lưu tại `artifacts/community-v3-2026-11-07/4Chinese-0.1.57-build59-community.apk`.

## Ảnh, video, tài liệu và online

- Bài viết và chat có các nút **Ảnh / Video / Tài liệu**, tối đa 4 tệp; cho phép chỉ đăng/gửi tệp. Có xem trước, bỏ tệp, thử lại và dừng tải. Tệp phải tải thành công trước khi được đưa vào bài/tin.
- Native có **Quay video** bằng camera hệ thống (tối đa 60 giây khi quay). Web chọn video có sẵn và phát bằng trình phát của trình duyệt; chưa có trình quay/chỉnh sửa video trong web. Native mở video bằng trình duyệt hệ thống, tài liệu qua trình mở/chia sẻ của máy.
- Ảnh: JPEG/PNG/WebP/GIF, tối đa 8 MiB. Video: MP4/WebM/MOV, tối đa 25 MiB; codec phát được phụ thuộc thiết bị/trình duyệt. Tài liệu: PDF/TXT/Word/Excel/PowerPoint, tối đa 10 MiB. Không tự lấy ảnh, camera hoặc tài liệu trước thao tác người dùng.
- `social-media` là bucket **riêng tư**. Reservation của mỗi tệp lấy chủ sở hữu từ JWT; server xác minh metadata Storage, quyền kết bạn và việc tệp đã được gắn vào bài/tin khác hay chưa. Tệp chat chỉ được hai bên mở sau khi gửi; người nhận không mở được tệp nháp. Tệp trong bài cộng đồng mở theo quyền xem bài.
- Link tải có hạn 60 giây. Thu hồi/xóa/chặn ngăn cấp link mới; link đã cấp có thể còn dùng đến lúc hết hạn, bản đã tải về không thể bị thu hồi từ xa. Tệp trong tin chờ giữ metadata/nonce trong database outbox riêng; gửi lại không nhân đôi tin. Tệp chọn nhưng chưa tải xong chưa được bảo đảm giữ qua lần đóng app.
- Giới hạn để kiểm soát dung lượng: 200 MiB metadata tệp/tài khoản, 700 MiB tổng kho được đặt trước, 40 lượt chọn tải/giờ. Không tự nâng gói hay bật thanh toán. Tệp đã gắn vào bài/tin được giữ trên Storage khi nội dung bị ẩn; file nháp bị bỏ được dọn qua API. Chưa có tác vụ nền tự dọn file mồ côi khi app bị tắt giữa lúc tải; cần bổ sung khi vận hành kho lâu dài.
- Online hiển thị trong **Bạn bè / danh sách chat / hội thoại**, chỉ cho quan hệ đã chấp nhận và không chặn. Heartbeat dùng thời gian server, riêng từng phiên thiết bị; đóng một phiên không làm offline phiên khác. Không ghi vào dữ liệu học.
- Heartbeat mỗi 25 giây khi app ở foreground; danh sách trạng thái được đọc mỗi 15 giây khi màn hình đang mở. Mất kết nối/đóng đột ngột hết online sau 65 giây, có thể thêm một nhịp đọc 15 giây để giao diện phản ánh. Khi lỗi đọc không hiện online giả. Máy đang dùng APK cũ chưa gửi heartbeat; cần phiên bản mới để công bố online.
- `supabase/community-media.sql` đã áp dụng cùng các quyền Storage/RPC. Migration chỉ mở rộng social và Storage. Phân quyền SQL, TTL, nhiều thiết bị, byte upload/download thật, quyền người ngoài và link sau thu hồi đều có kiểm tra tự chạy.
- `npm run check` đạt **1.325 test/234 file**, lint 0 lỗi (8 cảnh báo cũ), TypeScript, kiểm tra nội dung và export Android. Log/ảnh ở `artifacts/community-media-2026-11-06/`. Kiểm thử native camera/phát video trên điện thoại cần lượt build/cài tiếp theo; chưa cài APK mới.
- Kiểm thử giao diện web với backend thật đã đạt **15 nhóm kiểm tra, không lỗi JavaScript**: gửi ảnh/video/PDF không cần văn bản, phát video, tải tài liệu đúng tên, mở ảnh lớn, đăng bài chỉ có video, online → nền → online, mất/kết nối lại mạng và chặn/bỏ chặn. Tài khoản/tệp QA đã được dọn; không dùng tài khoản Gmail thật hoặc thực hiện bài học.
- Đã sửa lỗi React khi đổi giảm chuyển động trên màn nhiều nút: toàn app dùng một nguồn trạng thái trợ năng chung. Kiểm tra bật/tắt liên tục, nền tối và bố cục 320px đều đạt. Đối chiếu lại 139 file trong `src/db` và `src/services/ai`: không thay đổi.

## Nâng cấp V2

- Bảng tin có tiêu đề, ba loại bài và sáu chủ đề: góc học tập, từ vựng, ngữ pháp, phát âm, HSK, văn hóa. Tìm kiếm/lọc/phân trang chạy ở server; lưu bài riêng tư để đọc lại. Bài có câu tiếng Trung có nút nghe bằng dịch vụ phát âm hiện có.
- Chat thêm trả lời kèm trích dẫn, sáu cảm xúc, thu hồi cho hai phía, emoji và câu chào tiếng Trung, menu từng tin, mốc ngày và tìm trong các tin **đã tải**. Native dùng chia sẻ văn bản, web có sao chép; không hiển thị nút chức năng chưa triển khai.
- Thu hồi ẩn nội dung gốc khỏi SELECT của client và thay cả trích dẫn bằng thông báo thu hồi. Menu/ô đang trả lời cũng được làm mới khi nhận cập nhật. Tín hiệu realtime riêng chỉ chứa ID và thời điểm, không chứa nội dung tin.
- Trình soạn bài có gợi ý theo loại bài. Sheet được giới hạn chiều rộng trên desktop; bảng tin, chat và tài khoản có chiều rộng riêng. Giữ safe area, chế độ tối và giảm chuyển động.

## Tài khoản và bảo toàn tiến độ

- **Cài đặt → thẻ tài khoản → Tài khoản 4Chinese** dùng chung hồ sơ, tên, avatar, ID kết bạn và email đã liên kết; không tạo thêm tài khoản khi chỉ mở Cài đặt.
- Đọc email từ phiên hiện có, không gán cố định địa chỉ Gmail và không thay UUID. Hai UUID khác nhau không được gộp tự động, kể cả khi trùng email.
- Cloud có nút **Tiếp tục với tài khoản này**: chỉ sau thao tác này Cloud mới dùng cùng Supabase client với hồ sơ cộng đồng. Không sao chép refresh token sang một phiên thứ hai; phiên AI vẫn riêng.
- **Ngắt Cloud · giữ tài khoản 4Chinese** chỉ bỏ lựa chọn dùng chung Cloud; không đăng xuất cộng đồng. Nếu có tài khoản Cloud cũ thì giữ nguyên phiên đó. Kết nối/ngắt kết nối không tự đồng bộ, khôi phục, nhập bộ từ hay đặt lại lịch ôn.
- `supabase/community-v2.sql` đã được áp dụng vào backend hiện có: chỉ mở rộng phần `social_*`, có thể chạy lại, giữ tương thích RPC cho APK cũ. Không chạy migration database học tập. Hàng đợi tin chỉ nâng cấp database riêng `4chinese-social-outbox.db`.

## Nguồn tham khảo và giới hạn

- [Hanzii Help](https://hanzii.net/other/help/?hl=vi): tham khảo mô hình câu hỏi cộng đồng, tiêu đề, chủ đề và bình luận từ nội dung chính thức được lập chỉ mục; trang trực tiếp trả HTTP 403. Không coi đây là kiểm thử mới trên app Hanzii.
- [HelloChinese](https://www.hellochinese.cc/): tham khảo cách hướng tương tác về việc luyện tiếng Trung. Trang chính thức không đủ bằng chứng để khẳng định HelloChinese có hệ thống chat như Messenger.
- [Google Messages Help](https://support.google.com/messages/answer/10456318?hl=en): tham khảo trả lời có trích dẫn và tìm tin. Không sao chép mã/tài nguyên độc quyền.
- Chưa có tin nhắn thoại hoặc gọi thoại/video. Tìm chat hiện chỉ bao phủ lịch sử đã tải. Không cam kết thông báo đẩy hay gửi tin nền khi app đóng. Ảnh/video/tài liệu đã bổ sung như mô tả ở đầu tài liệu.
- Bản V2 đã xuất web; APK 0.1.56 (58) bên dưới là bản trước V2. Chưa cài APK mới theo yêu cầu hiện tại; bàn phím/gesture V2 trên Android thật cần kiểm tra ở lượt build/cài tiếp theo.

## Chức năng

- Tự tạo tài khoản khách và ID dạng `FC-XXXXXXXXXX`; sửa tên, giới thiệu, chọn avatar và chia sẻ ID.
- Tìm bạn bằng ID; gửi/nhận/chấp nhận/từ chối/thu hồi lời mời; hủy kết bạn.
- Bấm avatar để xem hồ sơ, kết bạn, nhắn tin, báo cáo hoặc chặn. Nhắn tin mới yêu cầu hai bên đã kết bạn.
- Bảng tin, tạo bài hỏi đáp/chia sẻ/luyện tập; tim, lượt xem và bình luận; xóa nội dung của mình.
- Chat riêng, lịch sử phân trang, số tin chưa đọc, trạng thái chờ gửi/đã gửi/đã xem.
- Hàng đợi riêng giữ tin đã bấm gửi khi lỗi mạng. Thử lại dùng cùng mã; xác nhận từ server mới xóa hàng đợi.
- Liên kết email để giữ ID; đăng nhập tài khoản đã liên kết trên máy khác bằng mã hoặc link xác nhận. Chuyển tài khoản có xác nhận, hàng đợi của ID cũ được giữ riêng.

## Lưu trữ và vận hành

- Áp dụng thiết kế JWT principal, cặp hội thoại chuẩn hóa, nonce chống trùng, phân trang và kiểm tra chặn từ `D:/ReactJS/realtime-chat` vào Supabase Auth/Postgres/Realtime hiện có.
- Phiên lưu ở `4chinese.community.session`, riêng với AI; Cloud chỉ dùng chung sau thao tác kết nối nêu trên. Email nằm trong Supabase Auth, hồ sơ công khai không chứa email.
- Server dùng các bảng `social_*`, RLS và RPC `social_api`. Client chỉ có quyền SELECT phù hợp; ghi dữ liệu qua RPC lấy người thực hiện từ JWT. `social_reports` là hàng đợi báo cáo để chủ dự án xem trong Supabase.
- Tin chờ dùng `4chinese-social-outbox.db`, tối đa 100 tin/tài khoản. Gửi lại khi mở hội thoại, kết nối lại hoặc bấm thử lại; không cam kết gửi nền khi app đã đóng.
- Socket là tín hiệu tải lại dữ liệu. Chat đọc bù mọi trang sau cursor đã nhận; phản hồi gửi tin không làm nhảy cursor đọc. Đồng bộ bổ sung mỗi 30 giây khi màn đang hoạt động xử lý cả thay đổi bị RLS ẩn như chặn/xóa.
- Giới hạn server: bài viết 20/giờ, bình luận 100/giờ, tin nhắn 300/giờ và 20/phút. Khi quá giới hạn, nội dung chờ được giữ để thử lại.
- `supabase/community.sql` đã được cài vào dự án `xxuxvcqkojevqerrpsyo`. Đây là script cài lần đầu trong transaction; chỉ chạy một lần trên backend mới.

## Kiểm tra

```powershell
npm run check
powershell -NoProfile -File scripts/test-community.ps1
node scripts/test-community-live.mjs --run-live
# Thêm --guest để thử anonymous Auth (chịu giới hạn signup của Supabase).
# Thêm --ui, PLAYWRIGHT_MODULE và SOCIAL_QA_BASE_URL để thử hai trình duyệt QA riêng.
# Dùng --ui --ui-motion để kiểm tra riêng việc bật/tắt giảm chuyển động trên web.
```

- SQL chạy trên PostgreSQL 17 tạm với kiểm tra quyền, giả mạo actor, nonce, phản hồi đọc, chặn, báo cáo và sentinel dữ liệu học.
- Live QA đã xác minh anonymous identity, WebSocket giữa hai người, tài khoản ngoài cuộc không nhận/đọc DM, nhận bù sau reconnect, phản ứng và bình luận. Tài khoản và nội dung QA được xóa đúng theo ID/tag của lượt thử.
- `npm run check` của V2 đạt TypeScript, kiểm tra nội dung và 1.320 test/233 file; sau bổ sung ngắt Cloud, chạy lại toàn bộ test đạt **1.321 test/233 file** (nhóm tài khoản/cộng đồng: 27 test/5 file). Lint 0 lỗi, 8 cảnh báo có từ trước. Xuất bundle Android và Web thành công.
- UI dùng màn React Native Web thật và backend thật: bảng tin, sửa hồ sơ, tìm ID/menu avatar, hai người nhắn tin, tắt/bật mạng, hàng đợi gửi một lần, bình luận/phản ứng, tạo bài, màn rộng 320px, chặn/bỏ chặn và ẩn hội thoại sau khi chặn.
- SQL V2 còn kiểm tra quyền reply/reaction/thu hồi, trích dẫn được che sau thu hồi, danh sách lưu riêng tư, dọn tài khoản QA an toàn và chạy lại migration. Sentinel dữ liệu học giữ nguyên trong PostgreSQL tạm.
- UI V2 bổ sung trả lời có trích dẫn, cảm xúc/thu hồi cập nhật hai phía, đóng menu khi tin bị thu hồi, emoji/tìm tin, bộ lọc/lưu bài và sheet desktop; luồng Cài đặt → tài khoản → Cloud giữ nguyên ID sau tải lại và sau ngắt/kết nối Cloud. Dùng hoàn toàn tài khoản QA tạm, không bấm đồng bộ/khôi phục.
- Ảnh V1 ở `artifacts/community-2026-11-06/`; log, baseline hash và ảnh V2 ở `artifacts/community-v2-2026-11-06/` (git-ignored).
- Hash 139 file trong `src/db` và `src/services/ai` được đối chiếu với trước đợt V2: không thay đổi. Không mở database trên điện thoại, không gửi tin/sửa hồ sơ/thực hiện bài học bằng tài khoản người dùng trong QA.

Email thật chưa được gửi trong QA; cần xác minh giao thư/SMTP và giới hạn gửi của Supabase trước khi cho nhiều người dùng liên kết. Chưa đẩy các thay đổi này lên GitHub.

## APK trên điện thoại — 06/11/2026

- Đã build và cài đè APK release **0.1.56 (58)** trên Realme RMX3085, Android 13, arm64-v8a. Chữ ký APK trùng bản đang cài; UID, thư mục dữ liệu và thời điểm cài lần đầu giữ nguyên. Không gỡ app, xóa dữ liệu hoặc mở database học tập.
- Hai lần khởi động nguội tải được ID cộng đồng thật, giữ cùng ID và không có crash trong tiến trình được kiểm tra. Đã chuyển qua Bảng tin, Tin nhắn, Bạn bè, Hồ sơ và nút Quay lại; ảnh giao diện được kiểm tra trực quan. Để app ở Bảng tin cộng đồng.
- Chỉ kiểm tra mở app và điều hướng trên điện thoại; chưa kiểm thử chat hai người, bàn phím và mất/kết nối lại mạng trên Android. Không đăng bài, gửi tin nhắn thử, sửa hồ sơ hoặc thực hiện bài học trên tài khoản người dùng.
- APK: `artifacts/community-2026-11-06/4Chinese-0.1.56-build58-community.apk`. Bằng chứng: `phone-build58/phone-result.json`, metadata trước/sau và ảnh trong cùng thư mục artifacts.

## Web chạy cục bộ — 06/11/2026

- `dist-community` được xuất lại từ mã nguồn V2; server `scripts/serve-web.cjs` chạy tại `http://localhost:8082`. Web mới và APK build 58 dùng cùng backend `https://xxuxvcqkojevqerrpsyo.supabase.co`; giao diện V2 chưa nằm trong APK build 58.
- Kiểm tra trình duyệt thật với storage QA riêng: Chrome mở được onboarding, Học từ mới, Lộ trình, Ngữ pháp và Cloud; Cốc Cốc 154 mở được onboarding, không có lỗi JavaScript. Không sửa hoặc đặt lại database/tiến độ trong profile trình duyệt người dùng.
- Người dùng báo lỗi StartupRecovery trong profile đang dùng; chưa tái hiện trong profile sạch và chưa xác định nguyên nhân. Cần thông báo Console của tab bị lỗi; không coi các kiểm tra profile sạch là đã sửa lỗi này.
- Web và điện thoại dùng phiên khách cộng đồng riêng. Dùng chung hồ sơ/chat cần liên kết email và khôi phục cùng tài khoản; không tự gộp ID khách. Đồng bộ học tập hiện có là thủ công cho cài đặt và bộ từ; lịch sử SRS chưa tự đồng bộ. Sao lưu/khôi phục là luồng riêng có xác nhận.
