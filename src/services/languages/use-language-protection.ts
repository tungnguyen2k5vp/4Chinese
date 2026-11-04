import { useEffect } from "react";

import { useLearningLanguage } from "./LanguageProvider";
import type { SwitchBlocker } from "./controller";

/** Ownership lasts until the draft is committed or the session component is released. */
export function useLanguageProtection(reason: SwitchBlocker, active = true) {
  const { controller } = useLearningLanguage();
  useEffect(() => {
    if (active) return controller.protect(reason);
  }, [controller, reason, active]);
}
