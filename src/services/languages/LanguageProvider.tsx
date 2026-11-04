import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { LanguageController } from "./controller";

const LanguageContext = createContext<LanguageController | null>(null);

/** Controller is hydrated before mounting. Switching never remounts children. */
export function LanguageProvider({
  controller,
  children,
}: {
  controller: LanguageController;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider value={controller}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLearningLanguage() {
  const controller = useContext(LanguageContext);
  if (!controller) throw new Error("LANGUAGE_PROVIDER_MISSING");
  const preferences = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  return { preferences, controller };
}
