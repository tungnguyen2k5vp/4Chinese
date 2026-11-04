# V8.3 — nguồn và giấy phép

Kiểm tra ngày 2026-10-15. Không cài thư viện runtime mới, không thay scheduler.

## Dữ liệu được thêm

`src/services/handwriting/supplemental-strokes.json` chỉ trích nguyên ba path của **巳** từ `hanzi-writer-data@2.0.1` đã có trong devDependencies. Thay đổi là tách subset/định dạng JSON, ngày 2026-10-15; không sửa đường nét. Dữ liệu phát sinh từ phông Arphic qua Make Me a Hanzi; không bảo hành. Giữ đầy đủ [ARPHIC PUBLIC LICENSE](ARPHICPL.TXT). Phần subset và mã trích dẫn có sẵn trong source dự án; không áp giấy phép này lên mã ứng dụng độc lập. Chưa phát hành binary trong vòng này.

Nguồn: [hanzi-writer-data README](https://github.com/chanind/hanzi-writer-data), [ARPHICPL.TXT upstream](https://github.com/chanind/hanzi-writer-data/blob/master/ARPHICPL.TXT). Không đưa toàn bộ corpus 32 MB vào bundle mới.

## Đối chiếu sáu repository

Số liệu API/npm ghi tại `artifacts/v8-3-hanzi-memory/repository-metadata.json`. Kích thước repository gồm lịch sử, không phải dung lượng APK. Unpacked là kích thước npm chưa nén, không phải benchmark RAM.

| Repo | License / dung lượng tại thời điểm kiểm tra | Tương thích, offline, hiệu năng và quyết định |
| --- | --- | --- |
| [hanzi-writer](https://github.com/chanind/hanzi-writer) | MIT code; npm 3.7.3, 863,431 B; repo 56,466 KiB | Engine JS thiên về DOM/SVG; RN cần adaptation. Offline khi tự cung cấp dữ liệu; không mặc định dựa CDN. Không thêm vì đã có StrokeWriter SVG và Digital Ink; tránh hai engine chồng nhau. Chưa benchmark tích hợp engine này. |
| [react-native-hanzi-writer](https://github.com/jamsch/react-native-hanzi-writer) | MIT; npm @jamsch/react-native-hanzi-writer 2.0.2, 282,502 B; repo 830 KiB | Peers SVG≥15, Worklets≥0.5, Reanimated≥4, GestureHandler≥2.28 phù hợp range đang có; đây chỉ là khả năng theo manifest, không phải xác nhận chạy RN0.86/Expo57. Engine native SVG/gesture có thể dùng data local; chưa tích hợp/benchmark. Không thay engine đang có trong vòng bảo toàn dữ liệu. |
| [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) | Arphic Public License, không phải MIT; npm2.0.1,32,284,941 B; repo30,001 KiB | SVG path JSON dùng được với SVG hiện tại và offline. Reuse các shard lazy hiện có; bổ sung đúng chữ 巳 thiếu. Không import dictionary hoặc thay IDs. |
| [makemeahanzi](https://github.com/skishore/makemeahanzi) | Repo379,920 KiB. Graphics Arphic; dictionary có nguồn/điều khoản riêng từ Unihan/CJKlib; không gán một MIT chung | JSON lớn, xử lý offline được nhưng import thẳng làm phình bundle; dữ liệu cấu tạo cần chuẩn hóa và kiểm tra semantic. Không bundle corpus này. Chỉ tham khảo upstream của stroke subset qua hanzi-writer-data. |
| [cjkvi-ids](https://github.com/cjkvi/cjkvi-ids) | Repo11,763 KiB. README phân biệt dữ liệu CHISE và các tệp GPLv2; không có một license permissive chung cho tất cả | IDS mô tả hình học, không tự chứng minh vai trò gợi âm/gợi nghĩa; cần font, cycle/depth guard, normalization. Không import. Mười mô tả ngắn được biên soạn độc lập kèm liên kết từ điển, không copy IDS corpus. |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | MIT; npm5.4.2,706,415 B; repo6,312 KiB | TS chạy local/offline nhưng thay scheduler là ngoài phạm vi. Không thêm dependency, không thay parameter hay lịch SRS hiện có. |

Nguồn chính: LICENSE/README và package manifest của từng repository, không dùng license API `null` như bằng chứng public domain. [CJKVI license notes](https://github.com/cjkvi/cjkvi-ids#license), [Make Me a Hanzi license notes](https://github.com/skishore/makemeahanzi#license).

## Tham khảo tổ chức học, không sao chép tài sản

- [Skritter features](https://skritter.com/features): tham khảo việc viết trước, phản hồi và xem mẫu. Ứng dụng này **không có** độ chính xác nét tương đương Skritter; Digital Ink chỉ trả candidate chữ.
- [Anki manual](https://docs.ankiweb.net/studying.html): tham khảo tách trả lời khỏi mở đáp án và tự đánh giá. Tự đánh giá viết không được đổi thành điểm chấm máy.
- [Pleco flashcards](https://android.pleco.com/manual/310/flash.html): tham khảo các hướng truy hồi và liên kết từ điển/ngữ cảnh; không sao chép content.
- [Hack Chinese](https://www.hackchinese.com/): trang chủ truy cập được nhưng nội dung JS không cung cấp đủ chi tiết cho audit tự động. Không xác nhận thuật toán hay luồng riêng của sản phẩm này, không mượn số liệu hiệu quả.

Pinyin/meaning của 13 chữ được đối chiếu trang [Zdic](https://www.zdic.net/); mỗi mục trong `character-content.ts` giữ URL riêng. Ghi chú tương phản và mô tả hình học là câu ngắn do dự án biên soạn. Vai trò gợi âm/gợi nghĩa chưa có nguồn kiểm duyệt đủ thì không hiển thị. Không đưa ảnh, âm thanh hay font độc quyền của bốn sản phẩm vào app.
