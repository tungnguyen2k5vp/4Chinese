# Release checklist — BIG UPDATE candidate

Candidate: 0.1.15 (Android versionCode 17), schema 19. Đã cài đè lên RMX3085 qua USB ngày 27/09/2026. Đây chưa phải bản BIG UPDATE hoàn chỉnh.

- [x] Lint sạch, typecheck, toàn bộ tests: 63 file / 249 test, không bỏ test cũ.
- [x] Build APK arm64 từ source mới, xác minh version/package/chữ ký; artifact 0.1.15 (17), cùng certificate với APK lấy trực tiếp từ điện thoại. SHA-256 `1b46f76ff437ddbb6f1b44b69d0bdf45077a525dc2c07d5e0ff3e6719c704ebb`, 90.317.954 byte.
- [x] Xuất JSON từ app 0.1.13 trước cài và sao lưu APK đang cài. Không có ảnh local trong bản xuất. Kiểm tra dữ liệu xuất trên SQLite schema 19 đạt; không lấy được raw SQLite của app non-debuggable.
- [x] `adb install -r` thành công, không uninstall/reset/downgrade. Điện thoại xác nhận versionName 0.1.15/versionCode 17; màn hình chính và ôn tập mở được.
- [ ] Update từ APK cũ, giữ số từ/ID/custom/decks/notes/favorites/SRS/stats/settings.
- [ ] Launch offline; cloud/AI lỗi không chặn học offline.
- [ ] Tone: đọc pinyin/nghe mẫu/đúng/sai/retry/thanh nhẹ/cặp thanh/biến điệu.
- [ ] Shadowing: quyền micro từ chối/cho phép, ghi 30 giây, phát lại, loop, auto next, đổi câu, background/back, Bluetooth/interruption; không upload bản ghi.
- [ ] TXT: UTF-8/UTF-16, sai mã hóa, tệp lớn, hủy picker, provider cloud chậm, preview không tự lưu. Android/iOS picker có thể copy file vào cache trước khi app kiểm tra size; không coi đó là giới hạn I/O toàn hệ thống.
- [ ] OCR thử ảnh thật; missing stroke data có fallback.
- [ ] Backup/restore/undo trên thiết bị; hết bộ nhớ và gián đoạn ghi file.
- [ ] Supabase RLS hai tài khoản và conflict/sync trước khi bật cloud tự động.

Đối chiếu ZIP sau nâng cấp chưa hoàn tất: điện thoại chuyển sang phiên ôn trong lúc QA. Không bấm Back/force-stop để tránh hủy lượt người dùng. Việc install/launch thành công không được dùng thay cho bằng chứng tất cả dữ liệu SRS còn nguyên; cần xuất ZIP sau cập nhật trong khoảng thời gian người dùng không thao tác rồi đối chiếu.

Lỗi build đầu tiên do manifest của masked-view trong node_modules bị toàn byte rỗng. Đã tải đúng gói 0.3.2 đã khóa, đối chiếu manifest và phục hồi duy nhất file đó; không thay package-lock hoặc nâng dependency để chữa lỗi. Build bằng JDK 22 thành công sau phục hồi, 869 task / 59 giây.

Không tự cài bản có migration mới lên DB production khi chưa có backup và smoke test. Không đổi package/chữ ký cũ để tránh mất đường nâng cấp. Signing hiện dùng debug keystore cũ của project: tương thích sideload cũ, **không đủ để tuyên bố sẵn sàng Play production**. Không reset DB, uninstall app hoặc downgrade APK để chữa migration.

Môi trường Windows không build iOS. Web chỉ hỗ trợ nghe mẫu/tra từ/TXT, không có ghi âm đối chiếu hoặc Android ML Kit OCR.
