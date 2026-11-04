import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const app = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8")).expo;
const parts = app.version.split(".").map(Number);
const nextVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
const hasGeneratedGradle = existsSync(resolve(root, "android/app/build.gradle"));
const run = (...args: string[]) =>
  spawnSync(process.execPath, [resolve(root, "scripts/prepare-android-version.cjs"), ...args], { encoding: "utf8" });

describe("release version patch generation", () => {
  it("emits a patch for all four version files, without changing source or signing", () => {
    const before = readFileSync(resolve(root, "app.json"), "utf8");
    const result = run(nextVersion, String(app.android.versionCode + 1));
    expect(result.status).toBe(0);
    expect(result.stdout.match(/\*\*\* Update File:/g)).toHaveLength(hasGeneratedGradle ? 4 : 3);
    expect(result.stdout).toContain(`"versionCode": ${app.android.versionCode + 1}`);
    if (hasGeneratedGradle) expect(result.stdout).toContain(`versionCode ${app.android.versionCode + 1}`);
    expect(result.stdout).not.toContain("signingConfig");
    expect(readFileSync(resolve(root, "app.json"), "utf8")).toBe(before);
  });
  it.each([
    [app.version, String(app.android.versionCode + 1)],
    [nextVersion, String(app.android.versionCode)],
    ["not-a-version", "999"],
    [nextVersion, "NaN"],
  ])("rejects non-monotonic or malformed input %s / %s before emitting any patch", (...args) => {
    const result = run(...args);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
  });
});
