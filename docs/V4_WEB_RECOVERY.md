# Web startup / SQLite ownership — 2026-10-01

## Lỗi đã tái hiện

Hành trình Edge hard-navigation/reload liên tiếp dừng tại grammar/focus với
`NoModificationAllowedError` từ `createSyncAccessHandle`: OPFS pool vẫn đang có handle mở.
Trước sửa, root không có thông báo khôi phục và màn hình trắng.
Một lần smoke cũ đạt không đủ để loại trừ lỗi vòng đời này.

## Cách xử lý

1. DatabaseOwnershipGate.web lấy exclusive Web Lock theo origin trước khi mount SQLiteProvider.
2. Tab thứ hai không mở database; hiện hướng dẫn đóng tab đang học và tải lại, giữ dữ liệu.
3. Lease giữ suốt lifetime document, không nhả theo React unmount/pagehide khi worker vẫn còn tồn tại.
4. Worker preflight kiểm tra các file **đã tồn tại** trong pool `expo-sqlite` của SDK57.
   Chỉ acquire/close handle: không read/write/truncate/create/delete và luôn đóng phần đã acquire nếu lỗi.
5. Chỉ retry khi file thực sự còn bị khóa, tối đa 20 lần, cách nhau 200ms; timeout worker 8s.
   Permission/unsupported/other failure không bị retry vô hạn; UI có recovery.
6. Root có Suspense loading và sanitized ErrorBoundary, không đưa SQL/secret/path/stack lên UI.

Không sử dụng lock stealing, reset browser storage, database mới thay thế hoặc sửa node_modules.
Native dùng gate passthrough: giữ SQLiteProvider và đường dẫn database cũ.

## Kiểm tra / giới hạn

Unit: lease hold/busy/unsupported/failure; retry đúng loại và giới hạn; handle cleanup kể cả partial failure;
virgin-user không tạo file; safe error strings.
Browser script: same-origin hai tab, tab thứ hai hiện busy; đóng owner rồi reload, attempt từ dễ nhầm còn nguyên.
Kết quả cuối xem `V4_WEB_SMOKE.json`; ảnh QA dùng profile riêng, không đụng profile/dữ liệu browser người dùng.

Integration dựa trên tên pool của expo-sqlite **~57.0.3 đang cài**. Khi nâng SDK/VFS phải audit lại preflight.
Không tuyên bố mọi browser hỗ trợ. Browser thiếu Web Locks/OPFS hoặc non-secure context có trạng thái không hỗ trợ.
Browser dữ liệu tách với điện thoại. Giữ cùng localhost origin/port để truy cập lại dữ liệu web đó.
Nếu tab cũ từ phiên bản chưa có gate đang giữ file, đóng tab cũ trước; không xóa site data.

## Tài liệu đối chiếu

[Expo SDK57 SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) mô tả web alpha và HTTP isolation.
[Web Locks specification](https://w3c.github.io/web-locks/) mô tả lock theo storage bucket/document lifecycle.
Hành vi app được nghiệm thu bằng source và tests, không suy từ tài liệu thành bằng chứng device.
