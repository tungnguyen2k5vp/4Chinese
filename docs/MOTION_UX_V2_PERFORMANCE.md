# Motion UX V2 — hiệu năng

## Thay đổi có kiểm soát

Không thêm asset/runtime/dependency, không đổi corpus hay cấu hình release. V2 thêm một ref trigger và một prop optional cho rig; các wrapper mới dùng `StudyTransition`/`MotionPressable` hiện có. Animation mới chỉ dùng opacity/transform, native driver, `isInteraction: false`; không thêm polling, idle loop hoặc animation từng hàng danh sách lớn.

Một timeline cho nhân vật; chạm mới dừng/retarget timeline cũ. Hint 180 ms và feedback 200 ms không khóa submit. Audio pulse hiện có vẫn gắn với TTS state. Progress vẫn có phần width chạy JS như baseline, không được quảng cáo là toàn bộ animation đều native-driven.

## Bằng chứng và giới hạn

- Unit suite: 212 file, 1.165/1.165 test PASS. Typecheck PASS. Lint 0 lỗi / 9 cảnh báo có sẵn. Log nằm trong [artifact V2](../../4Chinese-Archive/motion-ux-v2-2026-10-26/).
- Build debug x86_64 lần đầu thất bại tại CMake do Windows báo `Insufficient system resources`. Retry `--max-workers=1`, `--no-daemon`, heap 1.536 MB và `CMAKE_BUILD_PARALLEL_LEVEL=1` thành công trong 2 phút 57 giây; không sửa source/config để né lỗi.
- Runtime là APK development client thật trên Android API 36, emulator WHPX + SwiftShader, dùng Metro 8093. Video `native-video/` được quay bằng Android `screenrecord`; `native-frame-manifest.json` ghi nguồn/timestamp trích frame. Đây là bằng chứng animation thực thi native, không phải thước đo 60 FPS.
- `metrics/` chứa dumpsys meminfo/gfxinfo phục vụ chẩn đoán phiên test. Debug overhead, capture video, CPU host và software GPU làm số liệu không đại diện điện thoại phổ thông. Không suy ra mức tiết kiệm RAM/pin hoặc cải thiện FPS so với V1 từ số liệu này.
- Cửa sổ gfxinfo ghi 1.721 frames, 323 janky (18,77%), median 29 ms, p90 53 ms, p95 101 ms. Meminfo ghi total PSS 839.077 KB (có swap PSS 408.102 KB), RSS 513.764 KB. Đây là số liệu thô debug/SwiftShader của cả phiên, không cô lập chi phí V2 và **không đạt cơ sở tuyên bố 60 FPS hay performance PASS**.
- Không có before/after native performance benchmark tương đương; baseline trước sửa là RN-web fixture. APK debug cần Metro, chưa phải APK release standalone. Chưa đo điện thoại vật lý, iOS hoặc kiểm tra rò bộ nhớ bằng soak/profiler.
- Ca mở lại dev client cuối phiên bị splash trắng và timeout trước TalkBack. Không xác định nguyên nhân từ evidence hiện có; không đổi navigation/config hoặc DB để né ca lỗi. [Native QA](MOTION_UX_V2_NATIVE_QA.md) ghi bước tái hiện và bằng chứng, không tuyên bố mọi cold start đều PASS.

Trước phát hành: dùng build release riêng trên thiết bị yếu, đo frame pacing khi rapid tap/flip/progress, thử audio interruption và background dài; không chạy bài test làm thay tiến độ người học. V2 không thay cấu hình timeout/unit test để đạt kết quả.
