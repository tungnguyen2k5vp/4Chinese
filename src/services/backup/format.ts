import { validateConfusableAttempt } from '@/data/confusable-words';
import { ROLEPLAY_HISTORY_LIMIT, validateRoleplayAiLimits, validateRoleplayHistoryRecord } from '@/db/roleplay-history';
import { DATABASE_VERSION } from "@/db/schema";
import { validateSpeakingAttemptBackupRecord } from '@/db/speaking-attempts';
import { validateContextRecord } from '@/db/vocabulary-context';
import { validateWordContextRecord } from '@/db/word-contexts';
import { validateExamBackupRecord } from '@/services/exam/session';
import { validateWrittenBackupRecord } from '@/services/exam/written-practice';

export const BACKUP_FORMAT_VERSION = 3;

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
  readingDocumentChunks?: BackupRecord[];
  storyProgress?: BackupRecord[];
  mistakes?: BackupRecord[];
  skillMastery?: BackupRecord[];
  speakingPractice?: BackupRecord[];
  xpEvents?: BackupRecord[];
  userAchievements?: BackupRecord[];
  learningGoals?: BackupRecord[];
  grammarAttempts?: BackupRecord[];
  examAttempts?: BackupRecord[];
  writtenPractice?: BackupRecord[];
  confusableAttempts?: BackupRecord[];
  personalVocabularyContexts?: BackupRecord[];
  wordContexts?: BackupRecord[];
  timedSpeakingAttempts?: BackupRecord[];
  /** Minimized metadata only; no transcript notes, audio, provider feedback or quota usage. */
  roleplayHistory?: BackupRecord[];
  roleplayAiLimits?: BackupRecord[];
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

/** Shared pre-write/parser guard. Absent fields preserve existing roleplay data in old restores. */
export function validateRoleplayBackupData(data: Record<string, unknown>): void {
  if (Object.hasOwn(data, 'roleplayAiUsage') || Object.hasOwn(data, 'roleplay_ai_usage')) fail('Quota sử dụng AI không được khôi phục từ sao lưu.');
  if (data.roleplayHistory !== undefined) {
    const rows = data.roleplayHistory;
    if (!Array.isArray(rows) || rows.length > ROLEPLAY_HISTORY_LIMIT || !rows.every(isRecord)) fail('Lịch sử luyện vai không hợp lệ.');
    try { rows.forEach(validateRoleplayHistoryRecord); } catch { fail('Metadata luyện vai không hợp lệ.'); }
    if (new Set(rows.map((row) => row.id)).size !== rows.length ||
      rows.some((row) => row.transcript_opt_in !== 0 || row.transcript_summary !== null)) fail('Sao lưu luyện vai chỉ cho phép metadata, không chứa transcript.');
  }
  if (data.roleplayAiLimits !== undefined) {
    const rows = data.roleplayAiLimits;
    if (!Array.isArray(rows) || rows.length !== 1 || !rows.every(isRecord)) fail('Giới hạn AI luyện vai không hợp lệ.');
    const row = rows[0]!;
    if (Object.keys(row).length !== 3 || !['id', 'daily_limit', 'session_limit'].every((key) => Object.hasOwn(row, key)) || row.id !== 1 ||
      typeof row.daily_limit !== 'number' || typeof row.session_limit !== 'number') fail('Giới hạn AI luyện vai không hợp lệ.');
    try { validateRoleplayAiLimits({ daily_limit: row.daily_limit, session_limit: row.session_limit }); }
    catch { fail('Giới hạn AI luyện vai không hợp lệ.'); }
  }
}

function minimizeRoleplayBackupHistory(rows: BackupRecord[] | undefined): BackupRecord[] | undefined {
  return rows?.map((row) => {
    validateRoleplayHistoryRecord(row);
    return { ...row, transcript_opt_in: 0, transcript_summary: null };
  });
}

export function createLocalBackup(data: LocalBackupData, appVersion: string): LocalBackup {
  const roleplayHistory = minimizeRoleplayBackupHistory(data.roleplayHistory);
  validateRoleplayBackupData({ ...data, roleplayHistory });
  return {
    backupVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: DATABASE_VERSION,
    createdAt: new Date().toISOString(),
    appVersion,
    data: { ...data, roleplayHistory, timedSpeakingAttempts: data.timedSpeakingAttempts ?? [], baseVocabularyOverrides: data.baseVocabularyOverrides ?? [],
      imageAssets: data.imageAssets ?? [], lessonProgress: data.lessonProgress ?? [],
      lessonActivityProgress: data.lessonActivityProgress ?? [],
      grammarProgress: data.grammarProgress ?? [], readingDocuments: data.readingDocuments ?? [],
      readingProgress: data.readingProgress ?? [], readingVocabulary: data.readingVocabulary ?? [],
      readingDocumentChunks: data.readingDocumentChunks ?? [], storyProgress: data.storyProgress ?? [],
      mistakes: data.mistakes ?? [], skillMastery: data.skillMastery ?? [], speakingPractice: data.speakingPractice ?? [],
      xpEvents: data.xpEvents ?? [], userAchievements: data.userAchievements ?? [], learningGoals: data.learningGoals ?? [], grammarAttempts: data.grammarAttempts ?? [], examAttempts: data.examAttempts ?? [], writtenPractice: data.writtenPractice ?? [], confusableAttempts: data.confusableAttempts ?? [], personalVocabularyContexts: data.personalVocabularyContexts ?? [], wordContexts: data.wordContexts ?? [] },
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
  if (candidate.backupVersion !== 1 && candidate.backupVersion !== 2 && candidate.backupVersion !== BACKUP_FORMAT_VERSION) {
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
  validateRoleplayBackupData(candidate.data);

  const data = {} as LocalBackupData;
  if (candidate.data.roleplayHistory !== undefined) data.roleplayHistory = candidate.data.roleplayHistory as BackupRecord[];
  if (candidate.data.roleplayAiLimits !== undefined) data.roleplayAiLimits = candidate.data.roleplayAiLimits as BackupRecord[];
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
  for (const key of ['readingDocuments', 'readingProgress', 'readingVocabulary', 'readingDocumentChunks', 'storyProgress', 'mistakes', 'skillMastery', 'speakingPractice', 'xpEvents', 'userAchievements', 'learningGoals', 'grammarAttempts'] as const) {
    const rows = candidate.data[key];
    if (rows !== undefined && (!Array.isArray(rows) || !rows.every(isRecord))) fail(`Dữ liệu ${key} không hợp lệ.`);
    data[key] = Array.isArray(rows) ? rows as BackupRecord[] : [];
  }
  if (candidate.data.examAttempts !== undefined) {
    const attempts = candidate.data.examAttempts;
    if (!Array.isArray(attempts) || !attempts.every(isRecord)) fail('Lịch sử bài luyện không hợp lệ.');
    try { attempts.forEach(validateExamBackupRecord); } catch { fail('Bài luyện trong tệp sao lưu không hợp lệ.'); }
    data.examAttempts = attempts;
  }
  if (candidate.data.writtenPractice !== undefined) {
    const attempts = candidate.data.writtenPractice;
    if (!Array.isArray(attempts) || !attempts.every(isRecord)) fail('Bài viết trong tệp sao lưu không hợp lệ.');
    try { attempts.forEach(validateWrittenBackupRecord); } catch { fail('Bản nháp trong tệp sao lưu không hợp lệ.'); }
    data.writtenPractice = attempts;
  }
  if (candidate.data.confusableAttempts !== undefined) {
    const attempts = candidate.data.confusableAttempts;
    if (!Array.isArray(attempts) || !attempts.every(isRecord)) fail('Lượt phân biệt từ không hợp lệ.');
    try { attempts.forEach(validateConfusableAttempt); } catch { fail('Lượt phân biệt từ trong tệp sao lưu không hợp lệ.'); }
    data.confusableAttempts = attempts;
  }
  for (const override of data.baseVocabularyOverrides) {
    if (typeof override.id !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(override.id) ||
      typeof override.pinyin !== 'string' || typeof override.meanings_vi !== 'string' ||
      typeof override.meanings_en !== 'string') fail('Một từ HSK đã sửa không hợp lệ.');
  }
  if (candidate.data.personalVocabularyContexts !== undefined) {
    const contexts = candidate.data.personalVocabularyContexts;
    if (!Array.isArray(contexts) || !contexts.every(isRecord)) fail('Ngữ cảnh cá nhân không hợp lệ.');
    try { contexts.forEach(validateContextRecord); } catch { fail('Ngữ cảnh cá nhân trong tệp sao lưu không hợp lệ.'); }
    data.personalVocabularyContexts = contexts;
  }
  if (candidate.data.wordContexts !== undefined) {
    const contexts = candidate.data.wordContexts;
    if (!Array.isArray(contexts) || !contexts.every(isRecord)) fail('Ngữ cảnh chuẩn hóa không hợp lệ.');
    try { contexts.forEach(validateWordContextRecord); } catch { fail('Ngữ cảnh chuẩn hóa trong tệp sao lưu không hợp lệ.'); }
    data.wordContexts = contexts;
  }
  if (candidate.data.timedSpeakingAttempts !== undefined) {
    const attempts = candidate.data.timedSpeakingAttempts;
    if (!Array.isArray(attempts) || !attempts.every(isRecord)) fail('Lịch sử luyện nói không hợp lệ.');
    try { attempts.forEach(validateSpeakingAttemptBackupRecord); } catch { fail('Bản ghi luyện nói trong tệp sao lưu không hợp lệ.'); }
    data.timedSpeakingAttempts = attempts;
  }
  return {
    backupVersion: candidate.backupVersion,
    schemaVersion: candidate.schemaVersion as number,
    createdAt: candidate.createdAt,
    appVersion: candidate.appVersion,
    data,
  };
}
