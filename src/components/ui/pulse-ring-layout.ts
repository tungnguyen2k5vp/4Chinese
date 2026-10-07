export const LEARNING_PATH_RAIL_WIDTH = 42;
export const LEARNING_PATH_MARKER_SIZE = 34;
export const MAX_PULSE_RING_SCALE = 1.18;

export function getPulseRingFrame(containerWidth: number, size: number) {
  return {
    top: 0,
    left: (containerWidth - size) / 2,
    width: size,
    height: size,
    borderRadius: size / 2,
  };
}

export function getPulseRingMaxScale(containerWidth: number, size: number) {
  if (!Number.isFinite(containerWidth) || !Number.isFinite(size) || containerWidth <= 0 || size <= 0) return 1;
  return Math.min(MAX_PULSE_RING_SCALE, containerWidth / size);
}
