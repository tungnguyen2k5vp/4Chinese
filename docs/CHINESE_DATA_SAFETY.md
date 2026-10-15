# Bảo toàn dữ liệu tiếng Trung trong checkpoint V7

Schema/runtime vẫn là 45. V7 checkpoint này **chỉ bổ sung file mới**, không thêm English vào migration hoặc initialization tiếng Trung, không đổi scheduler, ID từ, HSK, user settings hay backup format.

Các thay đổi HSK/mistakes/context đang thấy trong `git diff` đã tồn tại từ đợt trước. Không reset hoặc hoàn nguyên các thay đổi đó. Không khẳng định toàn bộ worktree sạch.

Test mới mở Chinese legacy fixture bằng repository/migration thật, chụp toàn bộ bảng, rồi thao tác English SQLite độc lập và so sánh: không đổi Chinese rows/history/SRS/notes. Test bảo toàn các đợt trước cũng chạy trong toàn bộ suite. Snapshot 71 bảng fixture có sẵn ở baseline; không truy cập database thật trên điện thoại.

English importer chỉ ghi vào thư mục artifacts mới, không ghi đè output. Source read-only, checksum trước/sau giống nhau. Import thất bại rollback schema/content staging. Import lại vào target đã có schema bị từ chối và không đổi target; chạy lại CLI tạo pack mới có stable IDs, không append duplicate.

Chưa có migration learner EN, nên chưa thể khẳng định bilingual SRS/backup/restore đã được kiểm chứng. Checkpoint tiếp theo phải có dữ liệu SRS/XP/reader/context/mistakes thực sự trước/sau upgrade và failed restore. Không dùng snapshot fixture để nói đã sao lưu điện thoại.

Rollback checkpoint hiện tại: bỏ kích hoạt các file English chưa được wired (hiện không có activation), giữ artifacts/source review. Không cần rollback database người dùng vì V7 chưa ghi database đó. Không xóa artifacts một cách tự động; các output thất bại giữ lại để điều tra.
