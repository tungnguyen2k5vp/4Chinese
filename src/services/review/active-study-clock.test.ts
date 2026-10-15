import { describe, expect, it } from "vitest";

import { ActiveStudyClock } from "./active-study-clock";

describe("foreground study clock", () => {
  it("counts only when focused, foreground and running simultaneously", () => {
    let time = 0;
    const clock = new ActiveStudyClock(() => time);
    time = 1000;
    clock.setFocused(true);
    time = 2000;
    clock.setForeground(true);
    time = 3000;
    clock.setRunning(true);
    time = 4500;
    expect(clock.snapshot()).toEqual({ activeMs: 1500, cardMs: 1500 });
    clock.setForeground(false);
    time = 60000;
    clock.setForeground(true);
    time = 61000;
    expect(clock.snapshot()).toEqual({ activeMs: 2500, cardMs: 2500 });
    clock.setFocused(false);
    time = 100000;
    expect(clock.snapshot()).toEqual({ activeMs: 2500, cardMs: 2500 });
  });
  it("excludes save waits, resets per-card duration without resetting session total", () => {
    let time = 0;
    const clock = new ActiveStudyClock(() => time);
    clock.setFocused(true);
    clock.setForeground(true);
    clock.setRunning(true);
    time = 1200;
    clock.setRunning(false);
    time = 99999;
    clock.nextCard();
    clock.setRunning(true);
    time = 100999;
    expect(clock.snapshot()).toEqual({ activeMs: 2200, cardMs: 1000 });
  });
  it("duplicate events do not double count; backward clock never creates negative time", () => {
    let time = 0;
    const clock = new ActiveStudyClock(() => time);
    clock.setFocused(true);
    clock.setForeground(true);
    clock.setRunning(true);
    time = 100;
    clock.setForeground(true);
    clock.setFocused(true);
    expect(clock.snapshot().activeMs).toBe(100);
    time = 10;
    expect(clock.snapshot().activeMs).toBe(100);
    time = 150;
    expect(clock.snapshot().activeMs).toBe(150);
  });
  it("refuses invalid clock samples", () => {
    expect(() => new ActiveStudyClock(() => NaN)).toThrow(
      "INVALID_STUDY_CLOCK",
    );
  });
});
