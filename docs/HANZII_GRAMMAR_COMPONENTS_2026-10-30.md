# Hướng dẫn ngữ pháp và cấu tạo chữ — 30/10/2026

Phạm vi: bổ sung cho **4Chinese**. Từ “4English” cuối yêu cầu được hiểu theo ngữ cảnh là 4Chinese; không sửa luồng tiếng Anh.

## Đối chiếu Hanzii

Bằng chứng nằm ngoài source tại `../4Chinese-Archive/hanzii-grammar-components-2026-10-30/`.

| Đã quan sát trên Hanzii 6.24.0 Premium | Bằng chứng | Áp dụng |
|---|---|---|
| Tra ngữ pháp theo chữ/cách dùng và cấp độ; một chữ có nhiều chức năng | `007–010`, `014–015` XML/PNG | Tìm cả phần giải thích và ghi chú cách dùng; hỗ trợ tiếng Việt không dấu |
| Chi tiết 比 có công thức, biến thể, ví dụ/pinyin/nghĩa/loa và lưu ý | `011–013`, đã cuộn phần chi tiết đến cuối | Tab Hướng dẫn/Luyện tập; công thức, tình huống dùng, ghi nhớ và chuyển cách nói |
| Trang chữ 庆 có hình thái, bộ tra, tập viết, mẹo nhớ, từ ghép, thành phần và ví dụ | `016–017`, `020–021`, đã cuộn trang đến cuối | Tách từ thành chữ; chọn thành phần xem nét; bộ tra tách khỏi thành phần hình thể |
| Cây phân tích nhiều tầng | `018`, mở từ mục Bộ thành phần | Cây chữ nhiều tầng trên dữ liệu sẵn có, có giới hạn độ sâu/chống vòng lặp |

Đây là bằng chứng giao diện, không phải mã nguồn đã phục hồi. XAPK của đợt trước có lớp bảo vệ; không suy ra thuật toán nội bộ từ tên resource. Không nhận đã khảo sát mọi màn Hanzii trong lượt này. Không đưa bài viết, mẹo cộng đồng, đồ họa hay tài nguyên độc quyền Hanzii vào dự án.

## Thay đổi trong 4Chinese

- **Ngữ pháp:** 28 ghi chú hướng dẫn tự biên soạn, bổ sung cho nội dung hiện có. Trong đó 9 cấu trúc có 21 câu minh họa để chuyển cách nói: khẳng định/phủ định/câu hỏi, sở hữu/tồn tại, so sánh… Chuyển mẫu có reveal 180ms, nghe câu và tự che pinyin/nghĩa. 12 nhóm lỗi Việt–Trung hiện có tiếp tục được giữ.
- **Tách hướng dẫn khỏi bài luyện:** hai tab ngay đầu chi tiết; kết quả đang làm được giữ trong bộ nhớ khi chuyển tab. Các quy tắc chấm/lưu bài luyện và điều kiện hoàn thành bài học giữ nguyên.
- **Cấu tạo:** màn chuyên biệt từ 10 lên **63 chữ**, dùng cùng nguồn với phân tích trong chi tiết từ. Đây là mở rộng ghi chú cấu tạo, không phải thêm/sửa từ vựng trong DB.
- **Nhớ chữ:** chọn chữ trong từ, chọn từng thành phần xem nét, che/mở cấu tạo, mở cây sâu hơn, duyệt chữ cùng bộ hoặc chung thành phần. Những thao tác này không lưu đáp án hay điều chỉnh SRS.
- **Sửa nhầm lẫn:** bộ thủ không lấy tự động từ thành phần đầu (ví dụ 学→子, 看→目, 拿→手, 想→心); không gán nghĩa cả từ/bộ của từ cho mọi chữ; bỏ dấu câu/Latin, hỗ trợ chữ Han ngoài BMP và loại chữ lặp.
- **Giữ gọn:** ví dụ mở rộng, cây và nhóm chữ liên quan nằm trong mục thu gọn; phần từ có nhãn “Nghĩa cả từ”, phần chữ có nghĩa ngắn/cách đọc riêng.

Không có migration, dependency mới hay thay đổi cấu hình build. Nút lưu mẹo nhớ và luồng luyện viết vốn có vẫn hoạt động khi người dùng chủ động chọn; lượt QA không bấm lưu/hoàn thành các luồng này.

## Nội dung và độ tin cậy

- Hình học chữ hiện đại và ghi chú tiếng Việt được biên soạn riêng; không phải chứng minh từ nguyên. Không tự phân rã chữ ngoài kho đã biên soạn.
- Chỉ gắn vai trò gợi nghĩa/gợi âm cho **妈、清、请、情、晴**, có đối chiếu từng mục [汉典 妈](https://www.zdic.net/hans/妈), [清](https://www.zdic.net/hans/清), [请](https://www.zdic.net/hans/请), [情](https://www.zdic.net/hans/情), [晴](https://www.zdic.net/hans/晴). Cùng phần gợi âm không đồng nghĩa với cùng âm/thanh điệu.
- Các trường hợp bộ tra dễ nhầm được kiểm tra thêm ở [学](https://www.zdic.net/hans/学), [字](https://www.zdic.net/hans/字), [看](https://www.zdic.net/hans/看), [拿](https://www.zdic.net/hans/拿), [想](https://www.zdic.net/hans/想), [热](https://www.zdic.net/hans/热), [相](https://www.zdic.net/hans/相). Không sao chép nguyên đoạn giải nghĩa.
- Mẹo liên tưởng luôn tách khỏi thông tin bộ tra/cấu tạo. Nghĩa ngắn của một chữ không thay thế nghĩa của từ ghép hoặc mọi nghĩa/cách đọc trong từ điển.
- 28 hướng dẫn là nội dung học tự biên soạn, chưa có giáo viên duyệt độc lập. Phần đề cương **593 mục / 2.059 câu mẫu** giữ nguyên; chưa có bản dịch Việt nên không gắn bản dịch suy đoán. Không tuyên bố đã có giáo trình giảng dạy hoàn chỉnh HSK 1–9.
- Một số thành phần biến dạng/hiếm chưa có dữ liệu nét riêng; StrokeWriter giữ thông báo/fallback hiện có, không tạo nét giả.

## Kiểm thử và bảo vệ dữ liệu

| Kiểm tra | Kết quả |
|---|---|
| Test toàn dự án | **1.204/1.204 pass**, 222 file; `tests-full.log` |
| TypeScript / lint các file thay đổi | Pass; lint lưu tại `lint-final.log` |
| Ngữ pháp native APK release | 比: đổi 3 cách nói, bấm nhanh 5 lần, che/mở pinyin/nghĩa, gọi loa, mở ví dụ, cuộn xuống cuối, chuyển Hướng dẫn/Luyện tập và nút Quay lại — pass |
| Cấu tạo native | 清: chọn 青, che/mở cấu tạo, mở họ bộ 氵, chuyển sang 海/quay lại, mở nhóm chung 青 và chuyển 请 — pass |
| Từ → chữ / cây / dữ liệu thiếu | 学习→学 có bộ 子; 想→相+心→木+目; 龘 báo thiếu cấu tạo — pass |
| Chi tiết từ | 这样, tab Cách viết: chọn 样 hiển thị bộ 木; tab Ghi chú dùng cùng phân rã và liên tưởng — pass, không lưu ghi chú |
| Tìm kiếm | Gõ `trai nghiem` tìm được mục 过 — pass |
| Màn hẹp/chữ lớn | 320dp, font 150%, OS animation scale 0: các nút xuống dòng, đổi cách nói, che nghĩa, cuộn đến cuối, nhóm cùng bộ và quay lại — pass |
| Log native | Không có lỗi AndroidRuntime/ReactNativeJS trong log lọc của lượt kiểm tra; `native-errors.log` |
| File bảo vệ | **290/290 hash không đổi**: DB/schema/SRS/logic bài luyện, nội dung HSK, cấu hình và các file tiếng Anh; `source-integrity-final.json` |
| DB trên máy ảo | So sánh **77 bảng / 3 DB**, schema và `user_version` không đổi. 76 bảng giữ nguyên toàn bộ hash; chỉ `hanzi30.db.daily_stats` thêm ngày QA với **176 giây**, 0 từ mới, 0 lượt ôn, 0 câu đúng do bộ đếm thời gian học vốn có. Tiến độ/SRS/ghi chú không đổi; `database-integrity-final.json` |
| Điện thoại thật | Chỉ khảo sát Hanzii; không cài/mở 4Chinese, không đọc/sửa DB 4Chinese |

Máy ảo riêng `FourChineseMotionV2QA`, API 36/x86_64; APK release chạy trực tiếp, không cần Expo Go/Metro. Sau QA, cài fixture debug cùng package/chữ ký chỉ trên máy ảo để đọc snapshot, không chạy fixture, không clear-data/uninstall. Máy ảo đã tắt. Hanzii được trả về mục Từ vựng; đã xóa JAR/XML tạm do lượt nghiên cứu tạo.

Một assert cây chữ ban đầu kiểm tra khi cây đã bị cuộn ra ngoài viewport; đã sửa cách cuộn trong harness và chạy lại pass. Không sửa app để vượt assert. Lần so sánh `user_version` đầu dùng so sánh object tham chiếu nên báo khác giả; `verify-integrity.cjs` dùng so sánh giá trị, assert schema/hash và kiểm tra riêng từng cột của `daily_stats`.

Các trường hợp native là mẫu đại diện cụ thể ở trên, không phải đã thử toàn bộ 28 hướng dẫn/63 chữ/593 mục trên thiết bị. Loa đã được kích hoạt qua UI; chưa xác minh chất lượng âm thanh nghe được, TalkBack, iOS hoặc UI trên điện thoại thật. Không lấy hiệu năng máy ảo làm kết luận hiệu năng điện thoại.

Ảnh xem nhanh:

- [Hướng dẫn ngữ pháp](../../4Chinese-Archive/hanzii-grammar-components-2026-10-30/native-shots/grammar-guide.png).
- [Che gợi ý sau khi đổi cách nói](../../4Chinese-Archive/hanzii-grammar-components-2026-10-30/native-shots/grammar-variant-hidden.png).
- [Các chữ chung bộ/thành phần](../../4Chinese-Archive/hanzii-grammar-components-2026-10-30/native-shots/structure-qing-family.png).
- [Cây cấu tạo chữ 想](../../4Chinese-Archive/hanzii-grammar-components-2026-10-30/native-shots/structure-tree.png).
- [Màn hẹp, chữ lớn](../../4Chinese-Archive/hanzii-grammar-components-2026-10-30/native-shots/structure-compact-top.png).

## APK bàn giao

- [APK ARM64](../../4Chinese-Archive/hanzii-grammar-components-2026-10-30/4Chinese-grammar-components-arm64-v8a.apk), 97.158.874 byte; SHA-256 `e12d0b3634f5e84b17ae955c5c5cf7abf2bf30e3c82eed0cdbb5cbdaff3d73a6`.
- APK x86_64 dùng kiểm thử: 101.175.646 byte; SHA-256 `899963a4779bf34c638706934c3a12134b0836453360d4489d431ca0e67c0a65`.
- Cả hai có cùng bundle hash `048cc1fb5f2ef16d58c70e4a29fe7284f4ee91987a29ed526d28c84fb6926455`; kiểm tra ZIP/ABI và chữ ký ARM64 thành công. Giữ version 0.1.52/code 54 và chữ ký nội bộ hiện có. Chưa cài APK mới lên điện thoại.

### Cập nhật cài đặt theo yêu cầu tiếp theo

Ngày 30/10/2026 lúc 12:51, đã cài APK ARM64 nêu trên lên RMX3085 bằng `adb install -r`, kết quả `Success`. Giữ dữ liệu ứng dụng bằng chế độ cập nhật. Mở `MainActivity` thành công (`Status: ok`), xác nhận version 0.1.52/code 54 và thời điểm cập nhật mới. Không làm bài hoặc thao tác thay đổi tiến độ để kiểm thử trên điện thoại.
