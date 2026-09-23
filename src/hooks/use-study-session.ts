import type { SQLiteDatabase } from "expo-sqlite";
import { useEffect } from "react";
import { AppState } from "react-native";

import { recordStudyTime } from "@/db/repository";

const FLUSH_INTERVAL_MS = 15_000;

/**
 * Records foreground time spent in a learning/review session.
 * Time is paused while the app is in the background and flushed periodically
 * so a killed app does not lose the whole session.
 */
export function useStudySession(db: SQLiteDatabase): void {
  useEffect(() => {
    let activeSince: number | null = Date.now();
    let pendingSeconds = 0;
    let flushing = false;
    let disposed = false;

    const collectElapsed = () => {
      if (activeSince === null) return;
      const elapsedSeconds = Math.floor((Date.now() - activeSince) / 1000);
      if (elapsedSeconds <= 0) return;
      pendingSeconds += elapsedSeconds;
      activeSince += elapsedSeconds * 1000;
    };

    const flush = async () => {
      collectElapsed();
      if (flushing || pendingSeconds <= 0) return;
      flushing = true;
      const seconds = pendingSeconds;
      pendingSeconds = 0;
      try {
        await recordStudyTime(db, seconds);
      } catch {
        pendingSeconds += seconds;
      } finally {
        flushing = false;
        if (!disposed && pendingSeconds > 0) void flush();
      }
    };

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (activeSince === null) activeSince = Date.now();
      } else if (activeSince !== null) {
        collectElapsed();
        activeSince = null;
        void flush();
      }
    });
    const timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);

    return () => {
      disposed = true;
      clearInterval(timer);
      collectElapsed();
      activeSince = null;
      void flush();
      subscription.remove();
    };
  }, [db]);
}
