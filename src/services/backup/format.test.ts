import { describe, expect, it } from "vitest";

import { BackupValidationError, createLocalBackup, parseLocalBackup } from "./format";

const emptyData = {
  userSettings: [], personalDecks: [], customVocabulary: [], exampleSentences: [],
  vocabularyProgress: [], reviewLogs: [], dailyStats: [],
};

describe("local backup format", () => {
  it("round-trips a valid backup", () => {
    const backup = createLocalBackup(emptyData, "0.1.13");
    expect(parseLocalBackup(JSON.stringify(backup))).toMatchObject({ appVersion: "0.1.13", data: emptyData });
  });

  it('continues to read the previous JSON backup format', () => {
    const previous = { ...createLocalBackup(emptyData, '0.1.13'), backupVersion: 1,
      data: { ...emptyData } };
    expect(parseLocalBackup(JSON.stringify(previous)).data.baseVocabularyOverrides).toEqual([]);
  });

  it("rejects corrupt or incomplete files before import", () => {
    expect(() => parseLocalBackup("not json")).toThrow(BackupValidationError);
    expect(() => parseLocalBackup(JSON.stringify({ backupVersion: 1, data: {} }))).toThrow(BackupValidationError);
  });

  it("rejects a backup created by a newer schema", () => {
    const backup = createLocalBackup(emptyData, "0.1.13");
    backup.schemaVersion = 99;
    expect(() => parseLocalBackup(JSON.stringify(backup), 11)).toThrow("mới hơn");
  });

  it("only permits custom vocabulary in the custom vocabulary section", () => {
    const backup = createLocalBackup({ ...emptyData, customVocabulary: [{ id: "x", simplified: "你", traditional: "你", is_custom: 0 }] }, "0.1.13");
    expect(() => parseLocalBackup(JSON.stringify(backup))).toThrow("từ tùy chỉnh");
  });
});
