import { createContext, createElement, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { resolveModalAnimationType, type ModalAnimationType } from '@/services/ui/modal-animation';
import { useAppStore } from '@/stores/app-store';

export type { ModalAnimationType } from '@/services/ui/modal-animation';

const SystemReducedMotion = createContext<boolean | null>(null);

/** One OS subscription for the whole app; one update also reaches every animated control. */
export function SystemReducedMotionProvider({ children }: PropsWithChildren) {
  const [systemReduced, setSystemReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true, changed = false;
    const update = (enabled: boolean) => { changed = true; if (active) setSystemReduced(enabled); };
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const listener = () => update(media.matches);
      media.addEventListener('change', listener);
      update(media.matches);
      return () => { active = false; media.removeEventListener('change', listener); };
    }
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active && !changed) setSystemReduced(enabled); }).catch(() => { if (active && !changed) setSystemReduced(true); });
    return () => { active = false; subscription.remove(); };
  }, []);
  return createElement(SystemReducedMotion.Provider, { value: systemReduced }, children);
}

export function useSystemReducedMotion() { return useContext(SystemReducedMotion); }

export function useModalAnimationType(): ModalAnimationType {
  const mode = useAppStore((state) => state.settings?.motionMode ?? 'full');
  const systemReduced = useSystemReducedMotion();
  return resolveModalAnimationType(mode, systemReduced ?? true);
}

/** System accessibility preference always wins; app setting can further reduce motion. */
export function useReducedMotion() {
  const preference = useAppStore((state) => state.settings?.motionMode ?? 'full');
  const systemReduced = useSystemReducedMotion();
  return systemReduced !== false || preference === 'reduced' || preference === 'off';
}

export function useMotionDisabled() {
  return useAppStore((state) => state.settings?.motionMode === 'off');
}
