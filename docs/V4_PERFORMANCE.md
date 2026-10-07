# V4 performance / verification

## Đã đo hoặc chạy

- Full suite:111 files / 377 tests; rerun 17,81 giây (Windows / Node 24, không phải device benchmark).
- Android export:2.153 modules; Metro khoảng41,24 giây trong lượt build này (chạy đồng thời web export, không benchmark so sánh).
- Android entry Hermes ≈ 21MB (toàn app/data, không phải kích thước APK).
- Web:1.682 modules; entry ≈ 23MB,SQLite worker ≈ 139KB,WASM ≈ 621KB, OPFS probe ≈ 11KB.
- Edge isolated profile: 11 hành trình đạt; viewport412×915 và 360×800; không pageerror quan sát được.
- Gradle APK thử 1m12s, ~204,36 MiB, debug-signed; chưa device benchmark.
- Không có số liệu FPS/peak RAM/cold start/p95 device; không được ghi “60FPS ổn định” từ bundle pass.

## Giới hạn / rủi ro còn lại

Bundle còn lớn do dữ liệu offline hiện có; chưa thay kiến trúc thành downloadable content packs.
Writing save debounce800ms, CAS và giới hạn12k ký tự; mini snapshot nhỏ, lưu mỗi thao tác.
Readiness dùng aggregate SQLite và tối đa 30 history; grammar-focus đọc tối đa 2k recent attempts.
Các giới hạn này không thay load/latency benchmark với database người dùng lâu năm.
OPFS preflight chỉ retry khi quan sát lock, bounded 20×200ms / worker timeout8s; không chờ cố định mỗi lần mở.
Pool directory coupling phải audit lại khi nâng Expo SDK; browser thiếu API có unsupported state.

Cần tiếp: benchmark cold/warm launch,large dataset/restore,low-memory/audio interruption,
render/list scroll,long document,p95 queries và APK release trên thiết bị thật.
Không chạy destructive cleanup/reset để “cải thiện” benchmark.
