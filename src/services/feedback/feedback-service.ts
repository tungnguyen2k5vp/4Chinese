import * as Haptics from 'expo-haptics';

import { playUISound, type UISoundEvent } from '@/services/sound/ui-sound-service';

export type FeedbackSignal = 'tap' | 'success' | 'error' | 'complete' | 'achievement' | 'milestone';
type FeedbackOptions = { hapticEnabled?: boolean; soundEnabled?: boolean };

const soundFor: Record<FeedbackSignal, UISoundEvent> = { tap: 'tap', success: 'correct', error: 'incorrect', complete: 'lessonComplete', achievement: 'achievement', milestone: 'milestone' };

export async function playHaptic(signal: FeedbackSignal, enabled: boolean | undefined) {
  if (!enabled) return;
  try {
    if (signal === 'tap') { await Haptics.selectionAsync(); return; }
    await Haptics.notificationAsync(signal === 'error' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success);
  } catch { /* Haptic is optional and never blocks a learning action. */ }
}

/** One entrypoint for semantic feedback. Silent sound fallback keeps all learning flows offline-safe. */
export async function playFeedback(signal: FeedbackSignal, options: FeedbackOptions) {
  await Promise.all([playHaptic(signal, options.hapticEnabled), playUISound(soundFor[signal], options.soundEnabled)]);
}