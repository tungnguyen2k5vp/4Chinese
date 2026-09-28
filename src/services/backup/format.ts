import { DATABASE_VERSION } from "@/db/schema";

export const BACKUP_FORMAT_VERSION = 2;

export type BackupRecord = Record<string, unknown>;

export type LocalBackupData = {
  userSettings: BackupRecord[];
  personalDecks: BackupRecord[];
  customVocabulary: BackupRecord[];
  exampleSentences: BackupRecord[];
  vocabularyProgress: BackupRecord[];
  reviewLogs: BackupRecord[];
  dailyStats: BackupRecord[];
  /** Only learner-edited fields of bundled words; never replaces HSK IDs. */
  baseVocabularyOverrides?: BackupRecord[];
  imageAssets?: BackupRecord[];
  lessonProgress?: BackupRecord[];
  lessonActivityProgress?: BackupRecord[];
  grammarProgress?: BackupRecord[];
  readingDocuments?: BackupRecord[];
  readingProgress?: BackupRecord[];
  readingVocabulary?: BackupRecord[];
  storyProgress?: BackupRecord[];
  mistakes?: BackupRecord[];
  skillMastery?: BackupRecord[];
  speakingPractice?: BackupRecord[];
  xpEvents?: BackupRecord[];
  userAchievements?: BackupRecord[];
  learningGoals?: BackupRecord[];
  grammarAttempts?: BackupRecord[];
};

export type LocalBackup = {
  backupVersion: number;
  schemaVersion: number;
  createdAt: string;
  appVersion: string;
  data: LocalBackupData;
};

export class BackupValidationError extends Error {
  constructor(
    public readonly code: "INVALID_FILE" | "UNSUPPORTED_FORMAT" | "UNSUPPORTED_SCHEMA",
    message: string,
  ) {
    super(message);
  }
}

const dataKeys: (keyof LocalBackupData)[] = [
  "userSettings",
  "personalDecks",
  "customVocabulary",
  "exampleSentences",
  "vocabularyProgress",
  "reviewLogs",
  "dailyStats",
];

function isRecord(value: unknown): value is BackupRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new BackupValidationError("INVALID_FILE", message);
}

export function createLocalBackup(data: LocalBackupData, appVersion: string): LocalBackup {
  return {
    backupVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: DATABASE_VERSION,
    createdAt: new Date().toISOString(),
    appVersion,
    data: { ...data, baseVocabularyOverrides: data.baseVocabularyOverrides ?? [],
      imageAssets: data.imageAssets ?? [], lessonProgress: data.lessonProgress ?? [],
      lessonActivityProgress: data.lessonActivityProgress ?? [],
      grammarProgress: data.grammarProgress ?? [], readingDocuments: data.readingDocuments ?? [],
      readingProgress: data.readingProgress ?? [], readingVocabulary: data.readingVocabulary ?? [], storyProgress: data.storyProgress ?? [],
      mistakes: data.mistakes ?? [], skillMastery: data.skillMastery ?? [], speakingPractice: data.speakingPractice ?? [],
      xpEvents: data.xpEvents ?? [], userAchievements: data.userAchievements ?? [], learningGoals: data.learningGoals ?? [], grammarAttempts: data.grammarAttempts ?? [] },
  };
}

/** Validate before any database mutation. The importer can therefore be atomic. */
export function parseLocalBackup(text: string, supportedSchemaVersion = DATABASE_VERSION): LocalBackup {
  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    fail("Tệp sao lưu không phải JSON hợp lệ.");
  }
  if (!isRecord(candidate) || !isRecord(candidate.data)) fail("Tệp sao lưu thiếu dữ liệu.");
  if (candidate.backupVersion !== 1 && candidate.backupVersion !== BACKUP_FORMAT_VERSION) {
    throw new BackupValidationError("UNSUPPORTED_FORMAT", "Phiên bản tệp sao lưu không được hỗ trợ.");
  }
  if (!Number.isInteger(candidate.schemaVersion) || (candidate.schemaVersion as number) < 1) {
    fail("Tệp sao lưu có phiên bản cơ sở dữ liệu không hợp lệ.");
  }
  if ((candidate.schemaVersion as number) > supportedSchemaVersion) {
    throw new BackupValidationError(
      "UNSUPPORTED_SCHEMA",
      "Tệp được tạo bởi phiên bản ứng dụng mới hơn. Hãy cập nhật 4Chinese trước khi khôi phục.",
    );
  }
  if (typeof candidate.createdAt !== "string" || Number.isNaN(Date.parse(candidate.createdAt))) {
    fail("Tệp sao lưu thiếu thời điểm tạo hợp lệ.");
  }
  if (typeof candidate.appVersion !== "string") fail("Tệp sao lưu thiếu phiên bản ứng dụng.");

  const data = {} as LocalBackupData;
  for (const key of dataKeys) {
    const rows = candidate.data[key];
    if (!Array.isArray(rows) || !rows.every(isRecord)) fail(`Dữ liệu ${key} không hợp lệ.`);
    data[key] = rows;
  }
  for (const word of data.customVocabulary) {
    if (word.is_custom !== 1 || typeof word.id !== "string" || typeof word.simplified !== "string" || typeof word.traditional !== "string") {
      fail("Có từ tùy chỉnh không hợp lệ trong tệp sao lưu.");
    }
  }
  const overrides = candidate.data.baseVocabularyOverrides;
  if (candidate.backupVersion === 2 && (!Array.isArray(overrides) || !overrides.every(isRecord))) {
    fail('Các từ HSK đã sửa không hợp lệ.');
  }
  data.baseVocabularyOverrides = Array.isArray(overrides) ? overrides as BackupRecord[] : [];
  const assets = candidate.data.imageAssets;
  if (candidate.backupVersion === 2 && (!Array.isArray(assets) || !assets.every(isRecord))) {
    fail('Metadata ảnh không hợp lệ.');
  }
  data.imageAssets = Array.isArray(assets) ? assets as BackupRecord[] : [];
  const lessonProgress = candidate.data.lessonProgress;
  if (lessonProgress !== undefined && (!Array.isArray(lessonProgress) || !lessonProgress.every(isRecord))) {
    fail('Tiến độ lộ trình không hợp lệ.');
  }
  data.lessonProgress = Array.isArray(lessonProgress) ? lessonProgress as BackupRecord[] : [];
  const lessonActivityProgress = candidate.data.lessonActivityProgress;
  if (lessonActivityProgress !== undefined && (!Array.isArray(lessonActivityProgress) || !lessonActivityProgress.every(isRecord))) {
    fail('Tiến độ hoạt động trong lộ trình không hợp lệ.');
  }
  data.lessonActivityProgress = Array.isArray(lessonActivityProgress) ? lessonActivityProgress as BackupRecord[] : [];
  const grammarProgress = candidate.data.grammarProgress;
  if (grammarProgress !== undefined && (!Array.isArray(grammarProgress) || !grammarProgress.every(isRecord))) {
    fail('Tiến độ ngữ pháp không hợp lệ.');
  }
  data.grammarProgress = Array.isArray(grammarProgress) ? grammarProgress as BackupRecord[] : [];
  for (const key of ['readingDocuments', 'readingProgress', 'readingVocabulary', 'storyProgress', 'mistakes', 'skillMastery', 'speakingPractice', 'xpEvents', 'userAchievements', 'learningGoals', 'grammarAttempts'] as const) {
    const rows = candidate.data[key];
    if (rows !== undefined && (!Array.isArray(rows) || !rows.every(isRecord))) fail(`Dữ liệu ${key} không hợp lệ.`);
    data[key] = Array.isArray(rows) ? rows as BackupRecord[] : [];
  }
  for (const override of data.baseVocabularyOverrides) {
    if (typeof override.id !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(override.id) ||
      typeof override.pinyin !== 'string' || typeof override.meanings_vi !== 'string' ||
      typeof override.meanings_en !== 'string') fail('Một từ HSK đã sửa không hợp lệ.');
  }
  return {
    backupVersion: candidate.backupVersion,
    schemaVersion: candidate.schemaVersion as number,
    createdAt: candidate.createdAt,
    appVersion: candidate.appVersion,
    data,
  };
}
