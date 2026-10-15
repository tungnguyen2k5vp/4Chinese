export type ModalAnimationType = 'slide' | 'fade' | 'none';

export function resolveModalAnimationType(mode: 'full' | 'reduced' | 'off', systemReducedMotion: boolean): ModalAnimationType {
  if (mode === 'off') return 'none';
  if (mode === 'reduced' || systemReducedMotion) return 'fade';
  return 'slide';
}
