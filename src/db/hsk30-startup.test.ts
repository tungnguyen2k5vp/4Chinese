import type { SQLiteDatabase } from "expo-sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initializeWithHsk30Backup } from "./hsk30-startup";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  backup: vi.fn(),
  initialize: vi.fn(),
}));
vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: mocks.open,
  backupDatabaseAsync: mocks.backup,
}));
vi.mock("./database", () => ({ initializeDatabase: mocks.initialize }));

const destination = { getFirstAsync: vi.fn(), closeAsync: vi.fn() };
const source = (version: number) =>
  ({
    getFirstAsync: vi.fn().mockResolvedValue({ user_version: version }),
    runAsync: vi.fn().mockResolvedValue({ changes: 1 }),
  }) as unknown as SQLiteDatabase;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.open.mockResolvedValue(destination);
  mocks.backup.mockResolvedValue(undefined);
  mocks.initialize.mockResolvedValue(undefined);
  destination.getFirstAsync.mockImplementation(async (sql: string) =>
    sql.includes("sqlite_master") ? { count: 0 } : { quick_check: "ok" },
  );
  destination.closeAsync.mockResolvedValue(undefined);
});
describe("HSK30 startup backup gate", () => {
  it("backs up an old install before startup and records the unique backup name", async () => {
    const db = source(44);
    await initializeWithHsk30Backup(db);
    expect(mocks.open.mock.calls[0]![0]).toMatch(/^hanzi30-pre-hsk30-.+\.db$/u);
    expect(mocks.backup).toHaveBeenCalledWith({
      sourceDatabase: db,
      sourceDatabaseName: "main",
      destDatabase: destination,
      destDatabaseName: "main",
    });
    expect(mocks.backup.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.initialize.mock.invocationCallOrder[0]!,
    );
    expect(destination.closeAsync).toHaveBeenCalledOnce();
    expect(db.runAsync).toHaveBeenCalled();
  });
  it("does not overwrite an occupied backup destination", async () => {
    destination.getFirstAsync.mockResolvedValue({ count: 2 });
    await expect(initializeWithHsk30Backup(source(44))).rejects.toThrow(
      "HSK_BACKUP_DESTINATION_NOT_EMPTY",
    );
    expect(mocks.backup).not.toHaveBeenCalled();
    expect(mocks.initialize).not.toHaveBeenCalled();
    expect(destination.closeAsync).toHaveBeenCalledOnce();
  });
  it("blocks the import if backup or backup integrity fails", async () => {
    mocks.backup.mockRejectedValueOnce(new Error("disk full"));
    await expect(initializeWithHsk30Backup(source(44))).rejects.toThrow(
      "disk full",
    );
    expect(mocks.initialize).not.toHaveBeenCalled();
    destination.getFirstAsync.mockImplementation(async (sql: string) =>
      sql.includes("sqlite_master") ? { count: 0 } : { quick_check: "corrupt" },
    );
    await expect(initializeWithHsk30Backup(source(44))).rejects.toThrow(
      "HSK_BACKUP_INTEGRITY_FAILED",
    );
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
  it.each([0, 45])(
    "does not copy a fresh or already upgraded database version %s",
    async (version) => {
      await initializeWithHsk30Backup(source(version));
      expect(mocks.open).not.toHaveBeenCalled();
      expect(mocks.initialize).toHaveBeenCalledOnce();
    },
  );
});
