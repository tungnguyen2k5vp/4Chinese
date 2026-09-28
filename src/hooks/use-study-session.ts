import { useFocusEffect } from 'expo-router';
import type { SQLiteDatabase } from "expo-sqlite";
import { useCallback } from "react";
import { AppState } from "react-native";

import { recordStudyTime } from "@/db/repository";
import { StudyTimeTracker } from '@/services/stats/study-time';

const FLUSH_INTERVAL_MS = 15_000;

/**
 * Records foreground time spent in a learning/review session.
 * Time is paused while the app is in the background and flushed periodically
 * so a killed app does not lose the whole session.
 */
export function useStudySession(db: SQLiteDatabase): void {
  useFocusEffect(useCallback(() => {
    const tracker = new StudyTimeTracker(() => Date.now(), (date, seconds) => recordStudyTime(db, seconds, date));
    tracker.setActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener("change", (state) => {
      tracker.setActive(state === 'active');
      void tracker.flush();
    });
    const timer = setInterval(() => void tracker.flush(), FLUSH_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      tracker.setActive(false);
      void tracker.flush();
      subscription.remove();
    };
  }, [db]));
}
