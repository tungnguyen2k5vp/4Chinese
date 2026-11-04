# 4Chinese — minh họa 2D và phát âm sau đáp án đúng

Ngày: 25/10/2026. Phong cách người dùng chọn: **nhân vật 2D hiện đại, mềm mại**.

## Thay đổi đã thực hiện

- Ôn tập **Hán tự → nghĩa**: chọn đúng thì hiện pinyin và một nút loa ngay dưới chữ Hán. Bấm để nghe/dừng, kể cả khi âm thanh chung đang tắt; không tự phát, không đổi cài đặt và không tự chấm/lưu lượt ôn. Không lặp lại nút loa ở thẻ phản hồi bên dưới trong trạng thái này. Từ thiếu pinyin vẫn có loa; không tạo nhãn pinyin rỗng. Màu pinyin theo theme khi tắt màu thanh điệu.
- Thay nhân vật vector cũ bằng ba cảnh cùng nguồn unDraw: học, đọc sách, ăn mừng. SVG nằm trong `src/components/visual/guide-artwork.json`, dùng `SvgXml` của thư viện đã cài; hoạt động offline, không thêm dependency hay cấu hình Metro.
- Bỏ nhân vật khỏi câu hỏi và phản hồi từng đáp án ở màn học/ôn. Phản hồi đúng/sai dùng icon có nghĩa, nội dung và chuyển động phản hồi hiện có.

## Nguồn tham khảo và giấy phép

Đã đối chiếu trực quan **8 mẫu SVG**: 4 từ Humaaans và 4 từ unDraw. Chọn 3 mẫu unDraw để giữ nét vẽ thống nhất. ManyPixels được khảo sát như một nguồn khác, không đưa tài nguyên vào app.

| Nguồn | Nội dung đã tham khảo | Quyết định |
| --- | --- | --- |
| [HelloChinese](https://www.hellochinese.cc/vi), [SuperChinese](https://www.superchinese.com/vi/), [Busuu](https://www.busuu.com/en-US) | Trang giới thiệu sản phẩm công khai và bối cảnh học ngôn ngữ | Tham khảo cách dùng minh họa theo ngữ cảnh; không sao chép đồ họa thương hiệu |
| [unDraw](https://undraw.co/illustrations), tìm [learning](https://undraw.co/search/learning) / [success](https://undraw.co/search/success) | Đã xem Learning, Reading, Celebration, Welcome | Chọn ba cảnh đầu |
| [Humaaans](https://www.humaaans.com/) | Bốn nhân vật 2D, nét hữu cơ; trang công bố CC0, Pablo Stanley | Không dùng trong bản này |
| [ManyPixels](https://www.manypixels.co/gallery) | Thư viện và điều khoản sử dụng trên trang | Không dùng trong bản này |

Các trang giới thiệu sản phẩm không chứng minh chuyển động bên trong APK. Không có video hoặc phiên chạy HelloChinese mới trong đợt này. Trang thiết kế Duolingo được thử truy cập nhưng bài nhân vật cụ thể không đọc được; không dùng làm bằng chứng cho chi tiết animation.

Tác giả bộ unDraw: **Katerina Limpitsouni**. [Giấy phép chính thức](https://undraw.co/license), truy cập và lưu bản ngày 25/10/2026, cho phép tải, sao chép, sửa và dùng trong dự án cá nhân/thương mại, không bắt buộc ghi công. Giấy phép loại trừ việc phân phối gói tài nguyên/tạo dịch vụ tương tự và việc dùng tài nguyên để phát triển, huấn luyện hoặc kiểm thử AI/ML. Ở đây ba hình chỉ trang trí giao diện học ngôn ngữ; không tạo kho tải hình hoặc dữ liệu AI.

| Khóa trong app | File nguồn chính xác |
| --- | --- |
| `learning` | https://cdn.undraw.co/illustration/learning_qt7d.svg |
| `reading` | https://cdn.undraw.co/illustration/reading_6jjr.svg |
| `celebration` | https://cdn.undraw.co/illustrations/celebration_wtm8.svg |

SVG nguồn được giữ đầy đủ. Khi hiển thị, tím `#6c63ff` đổi sang màu chủ đạo, các nét tối `#090814` / `#2f2e41` đổi theo theme để dễ nhìn trên nền tối. Không nhận các hình này là tác phẩm tự vẽ. Ba SVG tổng cộng 26.727 byte; JSON đóng gói 27.408 byte. Kiểm tra XML hợp lệ, không script, `foreignObject` hoặc liên kết tài nguyên ngoài.

## Quy tắc đặt hình và chuyển động thực tế

| Vị trí | Hình / kích thước | Hành vi |
| --- | --- | --- |
| Khối chào Trang chủ | Learning / 128 | Xuất hiện nhẹ; chạm chào hiện “你好! Cùng học nhé.” và chạy lại phản hồi |
| Onboarding | Learning / 120 | Đặt cạnh lời chào trong bố cục thường, không chồng lên cảnh nền; không có nút chào |
| Luyện tập | Learning / 104 | Minh họa tĩnh, không có thao tác chào |
| Thư viện | Reading / 104 | Minh họa tĩnh; căn giữa khi xuống hàng ở màn hình nhỏ |
| Kết quả học/ôn | Celebration / 196 | Ăn mừng khi vào màn kết quả; chạm để chạy lại, hiện “Bạn làm tốt lắm!” |
| Banner hoàn thành bộ từ / bài lộ trình | Celebration / 92 hoặc 172 | Dùng điều kiện hoàn thành sẵn có, không tạo sự kiện hoặc tiến độ giả |
| Câu hỏi / phản hồi từng đáp án học và ôn | Không có nhân vật | Ưu tiên chữ, đáp án, loa và phản hồi đúng/sai |

- Timeline cảnh học/đọc có animation: **520 ms**. Cả hình dịch xuống `8 → 3 → 0`, opacity `0,82 → 1`; hình về vị trí cuối ở khoảng 30% timeline rồi đứng yên. Hub đặt `active=false` nên không chạy animation này.
- Ăn mừng: **1.600 ms**; cả hình dịch `8 → -3 → 0`, về vị trí ở khoảng 480 ms; 20 mảnh pháo giấy tỏa ra hai phía rồi rơi/mờ về opacity 0 ở cuối timeline.
- Chạm có phản hồi nhấn scale `0,97`; dòng lời chào chuyển nhẹ trong **220 ms**. Chạm liên tiếp hủy timeline cũ và chạy lại một timeline, không xếp hàng. Chạm chào không chuyển sang pháo giấy.
- Mất focus, vào nền hoặc unmount: dừng và đưa hình về trạng thái cuối, tắt pháo giấy. Quay lại từ nền không tự phát lại; có thể chạm chủ động để chạy lại. Tôn trọng Reduced Motion của hệ điều hành và chế độ `reduced`/`off` của app.
- Đây là chuyển động **toàn cảnh SVG**, không phải rig tay/mắt. Đã bỏ các lớp vẫy tay, chớp mắt, tim và chu kỳ idle của nhân vật cũ; không có loop nền vô hạn. Hình trang trí được ẩn khỏi trình đọc màn hình, nút tương tác có nhãn.

## Kiểm tra và phạm vi bảo toàn

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run typecheck` | Qua |
| `npm run lint -- --no-cache` | 0 lỗi, 9 cảnh báo có sẵn ở các file ngoài phạm vi |
| `node scripts/qa-playful-ui.cjs` | Qua: SVG thật, phản hồi chạm, pháo giấy chỉ ở hoàn thành, chạm liên tục, reduced/off/OS, focus/nền/cleanup, bố cục và không ghi dữ liệu |
| `node scripts/qa-motion-p4.cjs` | Qua: loa cạnh pinyin phát/dừng khi âm chung tắt, không autoplay/lưu/đổi setting, thiếu pinyin, không nhân vật trong câu hỏi; giữ luồng 3 lượt, chống gửi lặp và thử lại sau lỗi lưu bằng fixture |
| Kiểm tra ảnh | 320/390/430 px, sáng/tối, mô phỏng chữ 150%; đã xem và sửa màu pinyin trên nền tối, căn hình Thư viện |
| `npm test` | **1.160 qua, 5 lỗi / 1.165**; đúng danh sách lỗi đã có trong log P4 trước đợt sửa này |
| `npx expo export --platform android --output-dir ...` | Qua, tạo bundle Android/Hermes; không phải build hoặc xác minh APK trên thiết bị |
| Đối chiếu snapshot | 1.055 file ban đầu: 1.047 không đổi, 8 đổi; không xóa file. 24 hàm xử lý và 18 effect/memo ở học/ôn/Trang chủ/onboarding không đổi |

Năm lỗi unit test có sẵn: `src/db/home-review-scope.test.ts`, `src/db/review-pagination-and-size.test.ts`, `src/db/unified-search.test.ts`, `src/services/learning/session-pinyin-ui.test.ts`, `src/services/reader/word-context.test.ts`. Không sửa các lỗi này trong phạm vi giao diện.

Hash của 123 file `src/db`, 285 file `src/services`, 38 file `src/data`, phần tiếng Anh, assets cũ, 42 file Android trong snapshot và các cấu hình/dependency đã chụp đều giữ nguyên. Không mở database người học, không dùng ADB, không làm bài hoặc đổi tiến độ trên điện thoại. Các hành động lưu học/ôn vốn có vẫn hoạt động theo logic cũ khi người dùng chủ động thực hiện.

Chỉ sửa 6 file giao diện và 2 script QA; thêm JSON minh họa và báo cáo này. Đối chiếu với **worktree đã có thay đổi trước task**, không so với Git HEAD.

## Bằng chứng và kiểm tra Android còn lại

Thư mục ngoài dự án: `D:/ReactJS/4Chinese-Illustrations-2026-10-25/`.

- `preview.png`: Trang chủ, đáp án đúng có loa, hoàn thành; ảnh RN-web với dữ liệu mẫu.
- `references/comparison.png`, SVG nguồn và `undraw-license.html` / `.txt`: mẫu đã so sánh và giấy phép đã lưu.
- `qa-playful/`, `qa-p4/` và hai log: ảnh đầy đủ, cả nền tối/chữ lớn, cùng kết quả kiểm tra.
- `files-before.json`, `originals/`, `preservation.json`, `illustrations-only.diff`: snapshot và phạm vi thay đổi.
- `typecheck-final.log`, `lint-final.log`, `test-final.log`, `export-android.log`: kết quả cuối. Log mốc lỗi cũ: `D:/ReactJS/4Chinese-P4-2026-10-24/test-final.log`.

QA dùng component/màn hình RN-web thật; database, nhận dạng và TTS được giả lập, icon được thay thế trong harness. Cỡ chữ 150% là mô phỏng CSS. Chưa kiểm chứng tiếng TTS thật, TalkBack, tốc độ khung hình, safe area và font-scale trên Android.

Khi người dùng yêu cầu cài APK, cần xác minh các mục đó trên thiết bị: loa phát/dừng đúng từ; chạm liên tục; đưa app vào nền/quay lại; giảm chuyển động; chữ lớn/nền tối. Việc chạy bài ôn trên dữ liệu thật cần giữ riêng khỏi kiểm tra trình bày. **Đợt này chưa cài APK.**
