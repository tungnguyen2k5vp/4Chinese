# V7 checkpoint — chỉnh sửa thẻ và phân trang, 10/10/2026

**Checkpoint đã triển khai/kiểm thử; toàn bộ V7 vẫn PARTIAL. Không cài điện thoại.**

## Người dùng nhận được gì

- Trong bộ từ, nút “Chỉnh sửa” mở thẻ riêng. Thẻ cá nhân sửa từ/cụm, một nghĩa Việt, từ loại, IPA tự nhập và ghi chú. Không tự sinh nghĩa, IPA hay nhãn CEFR.
- Với thẻ từ nguồn từ điển, repository và UI chỉ cho sửa ghi chú cá nhân. Không thay nội dung, sense hoặc provenance. Corpus hiện vẫn chưa bật; quy tắc này được kiểm bằng fixture, không phải dictionary runtime đã hoàn tất.
- Tự lưu bản nháp chỉnh sửa theo ID thẻ, khôi phục sau mở lại app. Lưu thẻ và xóa đúng bản nháp trong cùng transaction.
- Nếu thẻ đã được ôn/sửa/tạm ngưng trong lúc chỉnh sửa, revision cũ bị từ chối; không tự ghi đè. Có nút bỏ bản nháp với xác nhận riêng, không xóa thẻ hay SRS.
- Đổi ngôn ngữ bị bảo vệ khi đang chỉnh sửa/chờ lưu. Android back giữ bản nháp để mở lại. Không tuyên bố mọi form Chinese đã có guard.
- 25 thẻ/trang, tiến/lùi bằng keyset theo ID. Không còn giới hạn truy cập ở 100 thẻ đầu. Truy vấn dùng index `en_cards_deck`; không preload toàn bộ thẻ.

## An toàn dữ liệu

English learner schema vẫn **1**; Chinese schema vẫn **45**. Không migration/reset/drop dữ liệu. Chỉ cập nhật trường nội dung được phép và tăng revision; không đổi ID, deck, source/sense, trạng thái, suspension, progress JSON, next-review hoặc review logs. Revision tăng làm phiên ôn đã lấy prompt cũ bị từ chối để tránh chấm theo nội dung cũ.

Chinese `src/data/hsk-vocabulary.json` SHA256 vẫn `D12E9F23C4C50AF154C2A56C5D63DE230C1E69E44AC0FD1C4E644C05E2622D11`; validator đọc 11.828 raw/11.877 effective. Đây là source/fixture regression, không phải snapshot SQLite riêng trên điện thoại.

Skills offline-data và UI-UX được áp dụng để giữ transaction/draft, kiểm soát ghi đè, loading/error/retry, semantics và bàn phím. Skills device-QA/release được áp dụng để tách bằng chứng Web/native, tăng version tự động, xác minh artifact và không cài máy thật khi V7 chưa đủ.

## Kết quả kiểm thử

| Lớp kiểm thử | Kết quả và giới hạn |
|---|---|
| Repository | 7 test mới: giữ lịch/ID/history và sentinel Chinese; prompt revision cũ bị từ chối; stale/trash/invalid edit; sourced notes-only; rollback khi xóa draft lỗi; concurrent edit; 151 thẻ/index/pagination; discard đúng draft |
| Toàn bộ tests | 172 file / **956 tests PASS**, 0 fail; JSON `artifacts/v7-2026-10-10/card-editor-tests.json` |
| Kiểm tra source | Typecheck PASS, lint 0 lỗi/5 cảnh báo cũ; content validator PASS phạm vi cấu trúc, không xác nhận học thuật |
| Web E2E | 4 nhóm assertions PASS, 0 page errors, 4 ảnh viewport. Khôi phục draft, reject nghĩa rỗng, lưu khi mạng bị tắt sau load, commit xóa draft, lịch ôn không đổi, compact320/dark, 151 thẻ/7 trang không thiếu/trùng và quay trang trước |
| Android release | Gradle PASS 2m23s, native build40, không cần Expo Go/Metro |
| Máy ảo native | Nâng cấp39→40 bằng `install -r` giữ1thẻ/1lượt đúng/10XP; keyboard/back; cold reopen draft khi không có default network; lưu chỉnh sửa và ghi chú; ngày ôn trước/sau đúng `23:50:28 11/10/2026`; mở lại ghi chú, draft đã xóa |
| Chưa kiểm | Native151thẻ/pagination, editor200%/TalkBack/rotation, sourced dictionary UI thật, iOS, toàn bộ V7 và phone ARM64 runtime |

Lượt Web đầu có selector nút xác nhận sai; lượt sau đọc Next khi SQLite còn loading nên báo fail giả. Đã sửa runner chờ nút thẻ có thể tương tác và chạy lại đầy đủ PASS, không bỏ assertion151thẻ/7trang. Không dùng ảnh Web thay ảnh native. Native log filter ReactNativeJS/AndroidRuntime không thấy lỗi trong cửa sổ quan sát; không coi đây là crash-free SLA.

## Artifact và ảnh

- APK: `artifacts/v7-2026-10-10/native/4Chinese-0.1.38-build40-arm64-x86_64-release.apk`, **143.214.912 bytes**, ARM64+x86_64.
- APK SHA256: `2B81A277BDCFD68FA840D90136BC1325AD23C643FA50FAA30F16B329E01AB891`.
- Signer giữ nguyên `CN=Android Debug`, certSHA256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Đây là release variant ký để cài riêng/QA, **không phải production signing để lên store**.
- Máy ảo: AVD QA riêng `V7_QA_Build38`, emulator-5562, Android16/API36/x86_64, 1080×1920, font1/light trong lượt native này. Tên AVD không phải phiên bản app.
- [8 ảnh native build40](../artifacts/v7-2026-10-10/native/build40-emulator/) và [manifest](../artifacts/v7-2026-10-10/native/build40-emulator/capture-manifest.csv), PNG+XML/hash; không phải bộ ảnh toàn app.
- [4 ảnh Web](../artifacts/v7-2026-10-10/learner-ui-card-editor/) có nhãn `WEB_HEADLESS_NOT_ANDROID`, SHA trong result.json.
- Tái chạy: serve `dist-v7-card-editor-web` trên8098, chạy `scripts/smoke-english-card-editor.cjs` với Playwright QA trong artifacts; native capture helper nhận `V7_QA_BUILD=40`, từ chối serial điện thoại. `scripts/summarize-native-card-editor.cjs` kiểm actualXML và tạo manifest.

## Quyết định cài và phần tiếp nối

Người dùng đã chọn **chờ hoàn tất toàn bộ V7 rồi mới cài**. Điện thoại Realme RMX3085 vẫn0.1.35/code37, đã đọc lại version cuối lượt; không install/uninstall/clear data. APK40 chỉ cài máy ảo riêng, không phát hành/GitHub push.

Còn dictionary runtime/sense-picker/content-pack được phép phân phối; Quick Session/timer; CEFR/grammar/path reviewed; listening/speaking/IPA; Reader/context/stories/writing/placement; bilingual restore atomic và guard/native QA toàn diện. Những việc kỹ thuật độc lập tiếp tục được làm, không quy tất cả cho giấy phép. Các checkpoint39 và số tests cũ trong báo cáo là lịch sử, không thay trạng thái mới này.
