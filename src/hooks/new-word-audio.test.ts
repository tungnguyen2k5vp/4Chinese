import { afterEach, describe, expect, it, vi } from "vitest";

import { createNewWordAudio } from "./new-word-audio";

afterEach(() => vi.useRealTimers());
function fixture() {
  vi.useFakeTimers();
  const speak = vi.fn().mockResolvedValue(undefined);
  const stop = vi.fn().mockResolvedValue(undefined);
  return { speak, stop, player: createNewWordAudio({ speak, stop }) };
}
describe("new-word pronunciation once per turn", () => {
  it("does not replay a turn after rerender, settings change or refocus", async () => {
    const { player, speak } = fixture();
    const cancel = player.play("deck:0:travel", "旅行", 0.8);
    await vi.advanceTimersByTimeAsync(150);
    cancel();
    player.play("deck:0:travel", "旅行", 0.9);
    await vi.advanceTimersByTimeAsync(1000);
    expect(speak).toHaveBeenCalledExactlyOnceWith("旅行", 0.8);
  });
  it("plays each next turn, including a repeated word at a different turn", async () => {
    const { player, speak } = fixture();
    player.play("deck:0:a", "旅行", 0.8);
    await vi.advanceTimersByTimeAsync(150);
    player.play("deck:1:a", "旅行", 0.8);
    await vi.advanceTimersByTimeAsync(150);
    expect(speak).toHaveBeenCalledTimes(2);
  });
  it("cancels stale turns before playing and allows StrictMode focus retry", async () => {
    const { player, speak, stop } = fixture();
    player.play("a", "旧", 0.8)();
    await vi.advanceTimersByTimeAsync(200);
    expect(speak).not.toHaveBeenCalled();
    player.play("a", "旧", 0.8);
    await vi.advanceTimersByTimeAsync(150);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalled();
  });
  it("does not queue duplicate timers for a turn", async () => {
    const { player, speak } = fixture();
    player.play("a", "旅行", 0.8);
    player.play("a", "旅行", 0.8);
    await vi.advanceTimersByTimeAsync(150);
    expect(speak).toHaveBeenCalledTimes(1);
  });
  it("handles unavailable speech without an unhandled rejection or replay loop", async () => {
    const { player, speak } = fixture();
    speak.mockRejectedValue(new Error("voice unavailable"));
    player.play("a", "旅行", 0.8);
    await vi.advanceTimersByTimeAsync(150);
    player.play("a", "旅行", 0.8);
    await vi.advanceTimersByTimeAsync(150);
    expect(speak).toHaveBeenCalledTimes(1);
  });
});
