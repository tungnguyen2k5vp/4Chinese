/** Sanitized user-facing diagnostics: never surface SQL, paths, secrets or stack traces. */
export function startupErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (
    /createSyncAccessHandle|Access Handle|NoModificationAllowedError|Invalid VFS state/i.test(
      message,
    )
  ) {
    return "Dữ liệu web đang được một tab hoặc phiên trước sử dụng. Đóng các tab 4Chinese khác rồi tải lại trang này. Không cần xóa dữ liệu trình duyệt.";
  }
  if (/UNSUPPORTED_DATABASE_VERSION|UNSUPPORTED_BACKUP_SCHEMA/i.test(message)) {
    return "Dữ liệu được tạo bởi phiên bản mới hơn. Hãy mở bằng bản 4Chinese mới nhất; không hạ phiên bản hoặc xóa cơ sở dữ liệu.";
  }
  return "Chưa mở được dữ liệu học. Hãy thử mở lại ứng dụng. Nếu lỗi vẫn còn, giữ nguyên dữ liệu và gửi thông tin phiên bản để kiểm tra.";
}
