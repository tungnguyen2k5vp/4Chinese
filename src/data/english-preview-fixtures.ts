/**
 * Visual QA In-Memory Preview Fixtures (V7.1 English Redesign)
 *
 * CRITICAL SAFETY NOTE:
 * These fixtures are strictly in-memory mocks for UI visual preview and snapshot validation.
 * They are NEVER written to SQLite, never migrated, and never overwrite user learner progress.
 * All preview items are labeled with [DEMO / PREVIEW DATA].
 */

import type { EnglishCard } from "@/db/english/learner";

export const DEMO_PREVIEW_MARKER = "DEMO / PREVIEW DATA";

export interface EnglishDemoPlan {
  due: number;
  newCards: number;
  reviewedToday: number;
  correctToday: number;
  responseMsToday: number;
  suggestedNew: number;
  historicalMistakes: number;
}

export interface EnglishDemoStats {
  total: number;
  studied: number;
  due: number;
  reviewed: number;
  correct: number;
  xp: number;
  studyMs: number;
}

export const englishDemoPlan: EnglishDemoPlan = {
  due: 18,
  newCards: 25,
  reviewedToday: 14,
  correctToday: 12,
  responseMsToday: 48000, // 48 seconds active answering
  suggestedNew: 10,
  historicalMistakes: 5,
};

export const englishDemoStats: EnglishDemoStats = {
  total: 120,
  studied: 96,
  due: 18,
  reviewed: 245,
  correct: 218,
  xp: 450,
  studyMs: 642000, // ~10.7 minutes
};

export const englishDemoDecks = [
  { id: "demo-deck-1", name: "Oxford 3000 Essential Core", wordCount: 45, dueCount: 8 },
  { id: "demo-deck-2", name: "IELTS Academic Vocabulary", wordCount: 38, dueCount: 6 },
  { id: "demo-deck-3", name: "Business English Idioms", wordCount: 22, dueCount: 4 },
  { id: "demo-deck-4", name: "Daily Conversations & Phrasal Verbs", wordCount: 15, dueCount: 0 },
];

export const englishDemoCards: EnglishCard[] = [
  {
    id: "demo-card-1",
    deck_id: "demo-deck-1",
    headword: "perseverance",
    meaning_vi: "tính kiên trì, sự bền chí khi đối mặt khó khăn",
    pos: "noun",
    ipa: "/ˌpɜːsɪˈvɪərəns/",
    sense_id: null,
    source_id: "USER",
    revision: 1,
    status: "LEARNING",
    suspended: 0,
    progress_json: "{}",
    next_review_at: new Date(Date.now() - 3600000).toISOString(),
    notes: "Ví dụ: Through perseverance, she mastered fluent pronunciation.",
  },
  {
    id: "demo-card-2",
    deck_id: "demo-deck-1",
    headword: "resilience",
    meaning_vi: "khả năng phục hồi nhanh sau thất bại hoặc nghịch cảnh",
    pos: "noun",
    ipa: "/rɪˈzɪliəns/",
    sense_id: null,
    source_id: "USER",
    revision: 1,
    status: "LEARNING",
    suspended: 0,
    progress_json: "{}",
    next_review_at: new Date(Date.now() - 7200000).toISOString(),
    notes: "Ví dụ: Building mental resilience is key to learning any language.",
  },
  {
    id: "demo-card-3",
    deck_id: "demo-deck-2",
    headword: "eloquent",
    meaning_vi: "hùng hồn, lưu loát, có khả năng diễn đạt truyền cảm",
    pos: "adjective",
    ipa: "/ˈeləkwənt/",
    sense_id: null,
    source_id: "USER",
    revision: 1,
    status: "LEARNING",
    suspended: 0,
    progress_json: "{}",
    next_review_at: new Date(Date.now() - 1800000).toISOString(),
    notes: "Ví dụ: An eloquent presentation on global cultural exchange.",
  },
];

export const englishDemoMistakes = [
  {
    id: "demo-mistake-1",
    headword: "meticulous",
    meaning_vi: "tỉ mỉ, cẩn thận từng chi tiết nhỏ",
    deck_name: "Oxford 3000 Essential Core",
    wrong_count: 2,
    latest_correct: false,
    last_wrong_at: new Date(Date.now() - 14400000).toISOString(),
    suspended: 0,
    next_review_at: new Date(Date.now() + 14400000).toISOString(),
  },
  {
    id: "demo-mistake-2",
    headword: "ubiquitous",
    meaning_vi: "phổ biến ở khắp mọi nơi cùng một lúc",
    deck_name: "IELTS Academic Vocabulary",
    wrong_count: 1,
    latest_correct: true,
    last_wrong_at: new Date(Date.now() - 86400000).toISOString(),
    suspended: 0,
    next_review_at: new Date(Date.now() + 86400000).toISOString(),
  },
];

export const englishDemoReader = {
  title: "The Wonder of Lifelong Language Learning",
  text: `Learning a new language is not simply about acquiring grammar rules or memorizing vocabulary lists. It is a transformative journey that alters the architecture of your thought processes. When you encounter unfamiliar idioms, you uncover novel perspectives on everyday human experiences.\n\nEvery dedicated minute spent reading authentic texts sharpens your linguistic intuition. Whether exploring literature, following global news, or listening to conversational dialogues, consistent exposure fosters genuine fluency and confidence.`,
  position: 0,
  revision: 1,
};
