import type { EnglishCard } from "@/db/english/learner";

/** In-memory-only fixtures used to exercise every review batch size in development QA. */
const entries = [
  ["sweater", "áo len chui đầu; áo len dài tay", "noun", "/ˈswetər/", "She wore jeans and a sweater."],
  ["trainers", "giày thể thao", "noun", "/ˈtreɪnərz/", "These trainers are good for running."],
  ["shorts", "quần đùi, quần soóc", "noun", "/ʃɔːrts/", "He packed a pair of shorts."],
  ["garden", "khu vườn", "noun", "/ˈɡɑːrdən/", "We planted flowers in the garden."],
  ["window", "cửa sổ", "noun", "/ˈwɪndoʊ/", "Please open the window."],
  ["careful", "cẩn thận", "adjective", "/ˈkerfəl/", "Be careful when crossing the street."],
  ["journey", "hành trình, chuyến đi", "noun", "/ˈdʒɜːrni/", "The journey took two hours."],
  ["discover", "khám phá, phát hiện", "verb", "/dɪˈskʌvər/", "We hope to discover a better way."],
  ["prepare", "chuẩn bị", "verb", "/prɪˈper/", "She needs time to prepare for the exam."],
  ["improve", "cải thiện, nâng cao", "verb", "/ɪmˈpruːv/", "Reading can improve your vocabulary."],
  ["borrow", "mượn", "verb", "/ˈbɑːroʊ/", "Can I borrow your umbrella?"],
  ["comfortable", "thoải mái, dễ chịu", "adjective", "/ˈkʌmftərbəl/", "This chair is comfortable."],
  ["patient", "kiên nhẫn", "adjective", "/ˈpeɪʃənt/", "Please be patient with yourself."],
  ["achievement", "thành tựu", "noun", "/əˈtʃiːvmənt/", "Passing the test was a great achievement."],
  ["decision", "quyết định", "noun", "/dɪˈsɪʒən/", "It was a difficult decision."],
  ["purpose", "mục đích", "noun", "/ˈpɜːrpəs/", "The purpose of this lesson is clear."],
  ["however", "tuy nhiên", "adverb", "/haʊˈevər/", "The task was hard; however, we finished it."],
  ["therefore", "do đó, vì vậy", "adverb", "/ˈðerfɔːr/", "It was raining; therefore, we stayed inside."],
  ["environment", "môi trường", "noun", "/ɪnˈvaɪrənmənt/", "We should protect the environment."],
  ["opportunity", "cơ hội", "noun", "/ˌɑːpərˈtuːnəti/", "This course is a great opportunity."],
] as const;

export const englishReviewDemoCards: EnglishCard[] = entries.map(
  ([headword, meaning_vi, pos, ipa, example], index) => ({
    id: `demo-review-card-${String(index + 1).padStart(2, "0")}`,
    deck_id: "demo-review-deck",
    headword,
    meaning_vi,
    pos,
    ipa,
    sense_id: null,
    source_id: "USER",
    revision: 1,
    status: "LEARNING",
    suspended: 0,
    progress_json: "{}",
    next_review_at: "2026-10-12T00:00:00.000Z",
    notes: `Ví dụ: ${example}`,
  }),
);
