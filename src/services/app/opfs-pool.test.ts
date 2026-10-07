import { expect, it, vi } from "vitest";

import { probeExistingSqlitePool, type ExistingPoolRoot } from "./opfs-pool";

it("does not create a directory or a file for a new user", async () => {
  const missing = Object.assign(new Error("absent"), { name: "NotFoundError" });
  const getDirectoryHandle = vi.fn(async () => {
    throw missing;
  });
  await probeExistingSqlitePool({ getDirectoryHandle });
  expect(getDirectoryHandle).toHaveBeenCalledWith("expo-sqlite");
});
it("closes every acquired handle even when another file is locked", async () => {
  const close = vi.fn();
  const busy = Object.assign(new Error("busy"), {
    name: "NoModificationAllowedError",
  });
  const root: ExistingPoolRoot = {
    getDirectoryHandle: async () => ({
      values: async function* () {
        yield { kind: "file", createSyncAccessHandle: async () => ({ close }) };
        yield {
          kind: "file",
          createSyncAccessHandle: async () => {
            throw busy;
          },
        };
      },
    }),
  };
  await expect(probeExistingSqlitePool(root)).rejects.toBe(busy);
  expect(close).toHaveBeenCalledTimes(1);
});
it("closes ready handles without reading, writing, truncating or deleting", async () => {
  const close = vi.fn();
  const handle = { close, write: vi.fn(), truncate: vi.fn(), read: vi.fn() };
  const root: ExistingPoolRoot = {
    getDirectoryHandle: async () => ({
      values: async function* () {
        for (let i = 0; i < 6; i++)
          yield { kind: "file", createSyncAccessHandle: async () => handle };
      },
    }),
  };
  await probeExistingSqlitePool(root);
  expect(close).toHaveBeenCalledTimes(6);
  expect(handle.write).not.toHaveBeenCalled();
  expect(handle.read).not.toHaveBeenCalled();
  expect(handle.truncate).not.toHaveBeenCalled();
});
