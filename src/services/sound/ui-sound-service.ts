export type UISoundEvent = 'tap' | 'correct' | 'incorrect' | 'xp' | 'lessonComplete' | 'achievement' | 'milestone';

/** Asset paths are intentionally null until licensed audio is supplied. */
export const uiSoundManifest: Record<UISoundEvent, string | null> = { tap: null, correct: null, incorrect: null, xp: null, lessonComplete: null, achievement: null, milestone: null };

export interface UISoundPlayer { play(asset: string): Promise<void>; }
let player: UISoundPlayer | null = null;
export function configureUISoundPlayer(next: UISoundPlayer | null) { player = next; }
export async function playUISound(event: UISoundEvent, enabled: boolean | undefined) {
  const asset = uiSoundManifest[event];
  if (!enabled || !asset || !player) return;
  try { await player.play(asset); } catch { /* Sound must never interrupt learning. */ }
}