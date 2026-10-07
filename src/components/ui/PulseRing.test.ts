import { describe, expect, it } from 'vitest';

import {
  LEARNING_PATH_MARKER_SIZE,
  LEARNING_PATH_RAIL_WIDTH,
  MAX_PULSE_RING_SCALE,
  getPulseRingFrame,
  getPulseRingMaxScale,
} from './pulse-ring-layout';

describe('learning-path pulse ring geometry', () => {
  it.each([
    [LEARNING_PATH_RAIL_WIDTH, LEARNING_PATH_MARKER_SIZE],
    [48, 34],
    [54, 40],
  ])('centers a %i dp rail marker around a %i dp ring', (containerWidth, size) => {
    const frame = getPulseRingFrame(containerWidth, size);

    expect(frame.left + frame.width / 2).toBe(containerWidth / 2);
    expect(frame.top + frame.height / 2).toBe(size / 2);
    expect(frame.borderRadius).toBe(size / 2);
    expect(frame.left).toBeGreaterThanOrEqual(0);
    expect(frame.left + frame.width).toBeLessThanOrEqual(containerWidth);
  });

  it.each([
    [LEARNING_PATH_RAIL_WIDTH, LEARNING_PATH_MARKER_SIZE],
    [48, 34],
    [54, 40],
  ])('keeps the expanding halo inside a %i dp rail', (containerWidth, size) => {
    const frame = getPulseRingFrame(containerWidth, size);
    const scale = getPulseRingMaxScale(containerWidth, size);
    const center = frame.left + frame.width / 2;
    const halfExtent = frame.width * scale / 2;

    expect(scale).toBeLessThanOrEqual(MAX_PULSE_RING_SCALE);
    expect(center - halfExtent).toBeGreaterThanOrEqual(0);
    expect(center + halfExtent).toBeLessThanOrEqual(containerWidth);
  });
});
