import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export class BackupFileError extends Error {
  constructor(public readonly code: "SHARING_UNAVAILABLE" | "READ_FAILED", message: string) {
    super(message);
  }
}

export function writeBackupFile(contents: string): File {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = new File(Paths.cache, `4chinese-backup-${stamp}.json`);
  file.create({ intermediates: true, overwrite: true });
  file.write(contents, { encoding: "utf8" });
  return file;
}

function restorePointFile(): File {
  return new File(Paths.document, '4chinese-before-restore.json');
}

export function hasRestorePoint(): boolean {
  return restorePointFile().exists;
}

/** A durable, app-local copy of the current state, written before import starts. */
export async function writeRestorePointFile(contents: string): Promise<void> {
  const temporary = new File(Paths.document, `4chinese-before-restore-${Date.now()}.tmp`);
  temporary.create({ overwrite: false });
  temporary.write(contents, { encoding: 'utf8' });
  if ((await temporary.text()) !== contents) throw new BackupFileError('READ_FAILED', 'Không thể xác minh điểm khôi phục trước khi nhập.');
  await temporary.move(restorePointFile(), { overwrite: true });
}

export async function readRestorePointText(): Promise<string | null> {
  const file = restorePointFile();
  return file.exists ? file.text() : null;
}

export async function shareBackupFile(file: File): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new BackupFileError("SHARING_UNAVAILABLE", "Thiết bị này chưa hỗ trợ chia sẻ tệp sao lưu.");
  }
  await Sharing.shareAsync(file.uri, {
    dialogTitle: "Lưu bản sao lưu 4Chinese",
    mimeType: "application/json",
  });
}

export async function pickBackupText(): Promise<string | null> {
  try {
    const picked = await File.pickFileAsync({ mimeTypes: ["application/json", "text/json", "text/plain"] });
    if (picked.canceled) return null;
    return await picked.result.text();
  } catch {
    throw new BackupFileError("READ_FAILED", "Không thể đọc tệp sao lưu đã chọn.");
  }
}
