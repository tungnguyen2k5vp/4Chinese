import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  openDatabaseAsync: vi.fn(),
  deleteDatabaseAsync: vi.fn(),
  deserializeDatabaseAsync: vi.fn(),
  backupDatabaseAsync: vi.fn(),
}));
vi.mock("expo-sqlite", () => api);
function database(ready = false, broken = false) {
  return {
    getAllAsync: vi.fn(async () => [
      { name: "words" },
      { name: "definitions" },
      { name: "word_definitions" },
      { name: "pronunciations" },
    ]),
    getFirstAsync: vi.fn(async (sql: string) =>
      sql.includes("sqlite_master")
        ? ready
          ? { name: "words" }
          : null
        : sql.includes("quick_check")
          ? { quick_check: broken ? "bad" : "ok" }
          : { id: 1 },
    ),
    execAsync: vi.fn(async () => {}),
    closeAsync: vi.fn(async () => {}),
  };
}
async function runtime() {
  vi.resetModules();
  return (await import("./skypedia-runtime")).getSkypediaDictionary;
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("private offline dictionary cache", () => {
  it("opens validated existing cache without network", async () => {
    const db = database(true);
    api.openDatabaseAsync.mockResolvedValue(db);
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await (await runtime())()).toBe(db);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("downloads once, fixes WAL transport only, and backs up only dictionary cache", async () => {
    const cached = database(),
      source = database(true);
    api.openDatabaseAsync.mockResolvedValue(cached);
    api.deserializeDatabaseAsync.mockResolvedValue(source);
    api.backupDatabaseAsync.mockResolvedValue(undefined);
    const bytes = new Uint8Array(1000000);
    bytes.set(new TextEncoder().encode("SQLite format 3\u0000"));
    bytes[18] = 2;
    bytes[19] = 2;
    const fetcher = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => bytes.buffer,
    }));
    vi.stubGlobal("fetch", fetcher);
    const get = await runtime();
    expect(await get()).toBe(cached);
    expect(await get()).toBe(cached);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(api.deserializeDatabaseAsync.mock.calls[0]?.[0][18]).toBe(1);
    expect(bytes[18]).toBe(2);
    expect(api.backupDatabaseAsync).toHaveBeenCalledWith({
      sourceDatabase: source,
      destDatabase: cached,
    });
    expect(source.closeAsync).toHaveBeenCalled();
  });
  it("rejects a malformed download and permits retry without touching learner files", async () => {
    api.openDatabaseAsync.mockResolvedValue(database());
    const fetcher = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal("fetch", fetcher);
    const get = await runtime();
    await expect(get()).rejects.toThrow("Không tải");
    await expect(get()).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(api.deleteDatabaseAsync).not.toHaveBeenCalled();
  });
  it("replaces only a corrupt source cache, never learner or Chinese databases", async () => {
    const corrupt = database(true, true),
      fresh = database();
    api.openDatabaseAsync
      .mockResolvedValueOnce(corrupt)
      .mockResolvedValueOnce(fresh);
    api.deleteDatabaseAsync.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false })),
    );
    await expect((await runtime())()).rejects.toThrow("Không tải");
    expect(corrupt.closeAsync).toHaveBeenCalled();
    expect(api.deleteDatabaseAsync).toHaveBeenCalledExactlyOnceWith(
      "english-skypedia-388adc0.db",
    );
  });
});
