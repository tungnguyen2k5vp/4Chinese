import { expect, it, vi } from "vitest";

import { waitForOpfsReadiness } from "./opfs-readiness";

const locked = () =>
  Object.assign(new Error("busy"), { name: "NoModificationAllowedError" });
it("waits for observed old-worker handle release, then proceeds", async () => {
  const probe = vi
    .fn()
    .mockRejectedValueOnce(locked())
    .mockResolvedValue(undefined);
  const wait = vi.fn(async () => undefined);
  await waitForOpfsReadiness(probe, wait);
  expect(probe).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledTimes(1);
});
it("bounds retries and never retries permission or unrelated errors", async () => {
  const wait = vi.fn(async () => undefined);
  const probe = vi.fn(async () => {
    throw locked();
  });
  await expect(waitForOpfsReadiness(probe, wait, 3)).rejects.toThrow("busy");
  expect(probe).toHaveBeenCalledTimes(3);
  expect(wait).toHaveBeenCalledTimes(2);
  const denied = new Error("permission");
  await expect(
    waitForOpfsReadiness(async () => {
      throw denied;
    }, wait),
  ).rejects.toBe(denied);
  expect(wait).toHaveBeenCalledTimes(2);
});
