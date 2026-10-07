import { describe, expect, it } from "vitest";

import {
  acquireDocumentDatabaseLease,
  type DocumentLockManager,
} from "./database-lease";

describe("document-scoped database ownership", () => {
  it("holds the exclusive lease after reporting readiness", async () => {
    let settled = false;
    const locks: DocumentLockManager = {
      request: async (name, options, callback) => {
        expect(name).toBe("4chinese-sqlite-document-v1");
        expect(options).toEqual({ ifAvailable: true });
        await callback({ name });
        settled = true;
      },
    };
    expect(await acquireDocumentDatabaseLease(locks)).toBe("ready");
    expect(settled).toBe(false);
  });
  it("does not wait indefinitely behind another tab", async () => {
    const locks: DocumentLockManager = {
      request: async (_, __, callback) => callback(null),
    };
    expect(await acquireDocumentDatabaseLease(locks)).toBe("busy");
  });
  it("returns visible fallback states without disclosing error details", async () => {
    expect(await acquireDocumentDatabaseLease()).toBe("unsupported");
    expect(
      await acquireDocumentDatabaseLease({
        request: () => {
          throw new Error("private");
        },
      }),
    ).toBe("failed");
    expect(
      await acquireDocumentDatabaseLease({
        request: async () => {
          throw new Error("private");
        },
      }),
    ).toBe("failed");
  });
});
