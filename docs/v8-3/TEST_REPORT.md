# V8.3 — kiểm thử

Ngày 2026-10-15. Dữ liệu Android chỉ là fixture giả lập trong AVD mới FourChineseV83QA, Android36,x86_64. Không sử dụng DB thật.

## Lệnh và kết quả

| Gate | Kết quả |
| --- | --- |
| Baseline `npm test` | 207file /1134test đạt trước triển khai |
| Checkpoint memory + handwriting | Phát hiện thiếu dữ liệu 巳; bổ sung đúng nguồn rồi chạy lại đạt |
| Checkpoint SQL/context/SRS | 7file /42test đạt |
| Memory sau thêm edge cases | 3file /15test đạt |
| Full `npm test -- --reporter=json --outputFile=artifacts/v8-3-hanzi-memory/tests-final.json` | 210file /1149test đạt,0lỗi; không xóa test cũ |
| `npm run typecheck` | Đạt |
| `npm run lint` | 0error,8warning hiện hữu ngoài phần V8.3; không sửa English để che warning |
| eslint tập file V8.3 | Đạt,0warning |
| Android Gradle assembleDebug x86_64 | Đạt với JDK19; JDK25 ban đầu không tương thích CMake/native access |
| Android assembleRelease x86_64 (QA offline, ký debug sẵn có) | Đạt; build cuối1phút32giây, không upload/distribute |
| `node scripts/v8-3-safety.cjs verify` | Không file bảo vệ nào thay đổi |
| `node scripts/v8-3-evidence.cjs` | safe:true;0vi phạm DB; notes chỉ đổi theo hành động lưu chủ động |

Dev-client nạp bundle ban đầu gặp lỗi multipart/OkHttp và chỉ bind IPv6. Đã bỏ workaround proxy thử nghiệm, dùng APK QA có bundle/assets để kiểm thử độc lập Metro. Không coi lỗi môi trường phát triển này là bằng chứng UI hoạt động; các ảnh01–43 lấy từ app chạy standalone thật trong AVD.

## Hai mươi tình huống bắt buộc

| # | Tình huống | Bằng chứng và giới hạn |
| --- | --- | --- |
| 1 | Nhớ không hint | Unit outcome + native chọn pinyin đúng không hint; viết người2nét, giữ hình để tự đối chiếu. Native nhận diện đúng mặt chữ chưa xác nhận được khi model thiếu. |
| 2 | Nhớ có hint | Native hint pinyin, đáp án đúng có nhãn sau hint; hint nét rồi viết. Unit phân biệt3outcomes. |
| 3 | Sai nét | Unit thiếu/thừa số nét, top candidate khác; native viết nét ngang sai vẫn báo chưa xác minh, không tự chấm đúng. **Chưa có chấm hình/thứ tự nét chính xác.** |
| 4 | Thiếu stroke | 龘 hiện chữ từ font và thông báo thiếu; không dựng nét giả. 巳 trong nhóm yêu cầu có3paths thật. |
| 5 | Similar groups | Unit đủ5nhóm/13chữ, highlight index nằm trong paths; native quiz đúng 请, sai 巳 so với 己, bảng 己已巳. |
| 6 | Tone | Unit toàn bộ13pinyin; native bảng qǐng/qíng/qīng/qíng và jǐ/yǐ/sì. |
| 7 | Không lộ đáp án | Unit che mọi Hanzi mục tiêu trong câu; native giấy trắng không Hanzi/Pinyin, audio label chung; context masked. Choices cố ý chứa đáp án như quiz thông thường. |
| 8 | Weak detection | Real SQLite đọc đúng từ studied, bỏ suspended/deleted; lỗi ít mẫu là UNKNOWN; native fixture3từ có lịch sử quên. |
| 9 | Rescue | Reuse clusterV2/micro-lesson, native evidence12lượt/6lỗi cho2mục trong fixture; pinyin được chọn theo bằng chứng. |
| 10 | SRS không đổi | Hash Android và deep equality isolated SQL; xem DATA_SAFETY.md. |
| 11 | Review chính | Integration gọi reviewWord gốc và full scheduler suite; native mở màn ôn chính. |
| 12 | Reader | Isolated SQL ngữ cảnh user-confirmed, native chạm 学校 → sheet → recall; direct context route che 请 trong câu ví dụ. Không tự lưu câu Reader chưa được xác nhận. |
| 13 | Offline | Native wifi+data tắt: hub, contrast, dữ liệu local vẫn mở. Lần đầu tải model Digital Ink và nguồn web cần mạng; âm máy phụ thuộc voice đã cài. |
| 14 | Restart | Native nhập My memory QA, lưu, force-stop/mở lại vẫn còn. File-SQLite test bảo toàn note cũ + evidence + context khi reopen. Session tự chấm viết chỉ trong RAM, có chủ đích. |
| 15 | English | Hash source/DB learner không đổi trong khoảng snapshot; native guard English. Không test trên hồ sơ English thật. |
| 16 | Chinese progress | Schema45,11877word,12progressfixture không đổi sau supplemental; notes kiểm riêng đúng1lần lưu. |
| 17 | Responsive | Native1080×1920 và720×1280; pad giới hạn theo viewport, nội dung cuộn. |
| 18 | Large font | Native font_scale1.5 trên viewport720×1280; card và text cuộn được. Không tuyên bố mọi thiết bị/font scale đã được kiểm. |
| 19 | Dark | Native system dark, semantic tokens đúng, giấy viết giữ tương phản sáng/mực đậm. |
| 20 | Reduced motion | Native animator_duration_scale0: bấm replay vẫn hiện10/10, step thủ công hoạt động; hook hiện có bao gồm app reduced/off và system preference. Route memory không animation. |

Batch5đã chạy đến tổng kết, bấm “Luyện5từ tiếp theo” sang nhóm còn lại. Số từ5/10/15/20 có lựa chọn trong hub; không ép cả7hướng cho một thẻ trong phiên. Khi chuyển câu, ScrollView được remount để về đầu câu hỏi.

## Ảnh và tính tái lập

`scripts/v8-3-native-qa.cjs` guard cả qemu và tên AVD; tất cả lệnh target riêngserial127.0.0.1:5567, ADBserver5045. Snapshot cần debuggable APK: đổi debug/standalone có cùng signing bằng install-r để truy cập run-as, không clear-data. Fixture chỉ được seed ở AVD mới này.

Mỗi PNG có sidecar JSON UI tree, thời điểm, serial/AVD, font,size,night,SHA256. Ảnh00lỗi nạp ban đầu nằm riêngdiagnostics, không trong gallery nghiệm thu. Ảnh before là ảnh V8.2đã lưu ngày14/10, khác fixture; chỉ đối chiếu luồng, không pixel-match cùng trạng thái.

## Chưa thể khẳng định

Độ chính xác chấm nét/thứ tự nét, chất lượng nghe qua loa máy thật, thành tích tự viết được đánh giá độc lập, tác động nhớ sau7/30ngày và tỷ lệ cải thiện trí nhớ chưa được đo. Không hợp thức hóa các mục này bằng XP hoặc số câu đã hoàn thành.
