import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useAppStore } from '@/stores/app-store';

/** System accessibility preference always wins; app setting can further reduce motion. */
export function useReducedMotion() {
  const preference = useAppStore((state) => state.settings?.motionMode ?? 'full');
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setSystemReduced(enabled); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    return () => { active = false; subscription.remove(); };
  }, []);

  return systemReduced || preference === 'reduced' || preference === 'off';
}

export function useMotionDisabled() {
  return useAppStore((state) => state.settings?.motionMode === 'off');
}
