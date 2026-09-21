import { create } from 'zustand';

import type { UserSettings, Vocabulary } from '@/types/models';

interface AppState {
  settings: UserSettings | null;
  learnQueue: Vocabulary[];
  reviewQueue: Vocabulary[];
  lastReviewedWord: Vocabulary | null;
  lastReviewedHanzi: string | null;
  setSettings: (settings: UserSettings) => void;
  setLearnQueue: (words: Vocabulary[]) => void;
  setReviewQueue: (words: Vocabulary[]) => void;
  setLastReviewedWord: (word: Vocabulary | null, hanzi?: string) => void;
  clearLastReviewedWord: () => void;
  clearSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: null, learnQueue: [], reviewQueue: [], lastReviewedWord: null, lastReviewedHanzi: null,
  setSettings: (settings) => set({ settings }),
  setLearnQueue: (learnQueue) => set({ learnQueue }),
  setReviewQueue: (reviewQueue) => set({ reviewQueue }),
  setLastReviewedWord: (lastReviewedWord, lastReviewedHanzi) => set({ lastReviewedWord, lastReviewedHanzi: lastReviewedHanzi ?? null }),
  clearLastReviewedWord: () => set({ lastReviewedWord: null, lastReviewedHanzi: null }),
  clearSession: () => set({ learnQueue: [], reviewQueue: [] }),
}));
