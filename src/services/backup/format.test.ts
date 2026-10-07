import { describe, expect, it } from "vitest";

import { BackupValidationError, createLocalBackup, parseLocalBackup } from "./format";

import { minimizeRoleplayHistory } from '@/db/roleplay-history';
import { createRoleplaySession } from '@/services/speaking/roleplay-v5';

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
  it('strips opted-in roleplay notes even when constructing a backup directly, without changing local rows', () => {
    const row = minimizeRoleplayHistory('rp-1', createRoleplaySession(), true, 'PRIVATE_NOTE');
    const backup = createLocalBackup({ ...emptyData, roleplayHistory: [row], roleplayAiLimits: [{ id: 1, daily_limit: 20, session_limit: 8 }] }, 'test');
    expect(row.transcript_summary).toBe('PRIVATE_NOTE');
    expect(backup.data.roleplayHistory![0]).toMatchObject({ transcript_opt_in: 0, transcript_summary: null });
    expect(JSON.stringify(backup)).not.toContain('PRIVATE_NOTE');
    expect(parseLocalBackup(JSON.stringify(backup)).data.roleplayAiLimits).toEqual([{ id: 1, daily_limit: 20, session_limit: 8 }]);
  });
  it('strictly rejects invalid roleplay rows, duplicated/oversized history, transcript and quota payloads', () => {
    const row = minimizeRoleplayHistory('rp-1', createRoleplaySession());
    const mutations = [
      { roleplayHistory: null }, { roleplayHistory: [null] }, { roleplayHistory: [row, row] },
      { roleplayHistory: Array.from({ length: 101 }, (_, index) => ({ ...row, id: `rp-${index}` })) },
      { roleplayHistory: [{ ...row, completed_goals: 999 }] },
      { roleplayHistory: [{ ...row, transcript_opt_in: 1, transcript_summary: 'PRIVATE' }] },
      { roleplayHistory: [{ ...row, pronunciationScore: 100 }] },
      { roleplayHistory: [{ ...row, used_words_json: '["UNKNOWN"]' }] },
      { roleplayAiLimits: [] }, { roleplayAiLimits: [{ id: 2, daily_limit: 20, session_limit: 8 }] },
      { roleplayAiLimits: [{ id: 1, daily_limit: '20', session_limit: 8 }] },
      { roleplayAiLimits: [{ id: 1, daily_limit: 101, session_limit: 8 }] },
      { roleplayAiLimits: [{ id: 1, daily_limit: 20, session_limit: 5 }] },
      { roleplayAiLimits: [{ id: 1, daily_limit: 20, session_limit: 8, attempts: 0 }] },
      { roleplayAiUsage: [] }, { roleplay_ai_usage: [] },
    ];
    const valid = createLocalBackup(emptyData, 'test');
    for (const fields of mutations) expect(() => parseLocalBackup(JSON.stringify({ ...valid, data: { ...valid.data, ...fields } }))).toThrow(BackupValidationError);
  });
});
