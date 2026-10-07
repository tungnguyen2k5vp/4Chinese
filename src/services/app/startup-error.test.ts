import { describe, expect, it } from "vitest";

import { startupErrorMessage } from "./startup-error";

describe("safe startup recovery messages", () => {
  it("explains OPFS contention without suggesting a reset", () => {
    expect(
      startupErrorMessage(
        new Error("NoModificationAllowedError: createSyncAccessHandle"),
      ),
    ).toContain("Đóng các tab");
    expect(startupErrorMessage(new Error("Invalid VFS state"))).toContain(
      "Không cần xóa",
    );
  });
  it("protects newer databases and does not disclose internal diagnostics", () => {
    expect(
      startupErrorMessage(new Error("UNSUPPORTED_DATABASE_VERSION:36")),
    ).toContain("bản 4Chinese mới nhất");
    expect(
      startupErrorMessage(new Error("SQL secret-key path-to-database")),
    ).not.toContain("secret-key");
  });
});
