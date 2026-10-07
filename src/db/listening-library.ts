import type { SQLiteDatabase } from "expo-sqlite";

import { starterVocabulary } from "@/data/starter-vocabulary";
import { systemTtsSource, type AudioSource } from "@/services/audio/source";

export type ListeningKind =
  | "WORD"
  | "SENTENCE"
  | "DIALOGUE"
  | "ANNOUNCEMENT"
  | "STORY"
  | "CONVERSATION"
  | "LECTURE";
export type ListeningItem = {
  id: string;
  level: string;
  type: ListeningKind;
  audioSource: AudioSource;
  transcript: string;
  pinyin: string;
  translation: string;
  targetVocabulary: string[];
  targetGrammar: string[];
  reviewStatus: "REVIEWED";
  source: string;
};
type SentenceRow = {
  id: string;
  hanzi: string;
  pinyin: string;
  translation_vi: string;
  hsk_level: string;
  review_status: "REVIEWED";
  source: string;
};

/** Initial library reuses shared sentence IDs/provenance. It does not manufacture audio assets or editorial approval. */
export async function listListeningItems(
  db: SQLiteDatabase,
  {
    level,
    offset = 0,
    limit = 20,
  }: { level?: string; offset?: number; limit?: number } = {},
) {
  if (level && !["1", "2", "3", "4", "5", "6", "7-9"].includes(level))
    throw new Error("INVALID_LISTENING_LEVEL");
  const size = Number.isFinite(limit)
    ? Math.max(1, Math.min(40, Math.floor(limit)))
    : 20;
  const start = Number.isFinite(offset)
    ? Math.max(0, Math.min(100000, Math.floor(offset)))
    : 0;
  const rows = await db.getAllAsync<SentenceRow>(
    `SELECT id,hanzi,pinyin,translation_vi,hsk_level,review_status,source
    FROM sentences WHERE is_active=1 AND review_status='REVIEWED' AND length(trim(hanzi))>0
    AND length(trim(translation_vi))>0 ${level ? "AND hsk_level=?" : ""}
    ORDER BY hsk_level,id LIMIT ? OFFSET ?`,
    ...(level ? [level] : []),
    size,
    start,
  );
  return rows.map(
    (row) =>
      ({
        id: row.id,
        level: row.hsk_level,
        type: "SENTENCE" as const,
        audioSource: systemTtsSource(row.hanzi),
        transcript: row.hanzi,
        pinyin: row.pinyin,
        translation: row.translation_vi,
        targetVocabulary: [],
        targetGrammar: [],
        reviewStatus: row.review_status,
        source: row.source,
      }) satisfies ListeningItem,
  );
}

export async function getListeningTargets(
  db: SQLiteDatabase,
  sentenceId: string,
) {
  const [words, grammar] = await Promise.all([
    db.getAllAsync<{ vocabulary_id: string }>(
      "SELECT DISTINCT vocabulary_id FROM sentence_vocabulary WHERE sentence_id=? LIMIT 30",
      sentenceId,
    ),
    db.getAllAsync<{ grammar_id: string }>(
      "SELECT grammar_id FROM sentence_grammar WHERE sentence_id=? LIMIT 10",
      sentenceId,
    ),
  ]);
  return {
    targetVocabulary: words.map((row) => row.vocabulary_id),
    targetGrammar: grammar.map((row) => row.grammar_id),
  };
}

export type ListeningComprehension = {
  id: string;
  sentenceId: string;
  promptVi: string;
  choices: string[];
  correctIndex: number;
  explanationVi: string;
  provenance: "AI_AUTHORED_SELF_PRACTICE";
  reviewStatus: "DRAFT";
  sourceRef: "src/data/starter-vocabulary.ts";
  sentenceSource: string;
};
/** Companion questions authored only against these exact existing starter examples. */
const companions: [string, string, [string, string, string], number, string][] =
  [
    [
      "我每天学习汉语。",
      "Người nói học tiếng Trung khi nào?",
      ["Mỗi ngày", "Chỉ hôm qua", "Chỉ cuối tuần"],
      0,
      "每天 là mỗi ngày; câu không giới hạn ở hôm qua hay cuối tuần.",
    ],
    [
      "我住在中国。",
      "Người nói sống ở đâu?",
      ["Việt Nam", "Trung Quốc", "Nhật Bản"],
      1,
      "住在中国 là sống ở Trung Quốc; Việt Nam và Nhật Bản không được nhắc.",
    ],
    [
      "他是我的朋友。",
      "Người được nhắc đến có quan hệ gì với người nói?",
      ["Giáo viên", "Anh trai", "Bạn"],
      2,
      "我的朋友 là bạn của tôi; không nêu giáo viên hoặc anh trai.",
    ],
    [
      "我喜欢喝茶。",
      "Người nói thích uống gì?",
      ["Trà", "Cà phê", "Sữa"],
      0,
      "喜欢喝茶 là thích uống trà; không có thông tin về cà phê hay sữa.",
    ],
    [
      "王老师教汉语。",
      "Thầy Vương dạy môn gì?",
      ["Toán", "Tiếng Trung", "Tiếng Anh"],
      1,
      "教汉语 là dạy tiếng Trung; các môn kia không được nêu.",
    ],
    [
      "我没有时间。",
      "Người nói đang thiếu điều gì?",
      ["Tiền", "Sách", "Thời gian"],
      2,
      "没有时间 là không có thời gian; không nói thiếu tiền hay sách.",
    ],
    [
      "我准备去上课。",
      "Người nói chuẩn bị làm gì?",
      ["Đi học", "Đi bơi", "Mua thức ăn"],
      0,
      "准备去上课 là chuẩn bị đi học; không nhắc bơi hay mua thức ăn.",
    ],
    [
      "这里的环境很安静。",
      "Môi trường ở đây được mô tả thế nào?",
      ["Ồn ào", "Yên tĩnh", "Nguy hiểm"],
      1,
      "很安静 mô tả rất yên tĩnh; không khẳng định ồn ào hay nguy hiểm.",
    ],
    [
      "我们用汉语交流。",
      "Nhóm người dùng ngôn ngữ nào để giao tiếp?",
      ["Tiếng Anh", "Tiếng Việt", "Tiếng Trung"],
      2,
      "用汉语交流 là giao tiếp bằng tiếng Trung; không dùng hai ngôn ngữ kia trong câu.",
    ],
    [
      "睡眠影响记忆。",
      "Giấc ngủ ảnh hưởng đến điều gì trong câu?",
      ["Trí nhớ", "Giá vé", "Thời tiết"],
      0,
      "记忆 là trí nhớ; giá vé và thời tiết không được đề cập.",
    ],
    [
      "我想掌握汉语。",
      "Người nói muốn đạt được điều gì?",
      ["Mua sách", "Nắm vững tiếng Trung", "Đổi việc"],
      1,
      "想掌握汉语 là muốn nắm vững tiếng Trung; không nói mua sách hay đổi việc.",
    ],
    [
      "我们需要新的策略。",
      "Nhóm người cần điều gì?",
      ["Nhà mới", "Bạn mới", "Chiến lược mới"],
      2,
      "新的策略 là chiến lược mới; không phải nhà hoặc bạn mới.",
    ],
  ];
const starterSentences = new Set(
  starterVocabulary.flatMap((word) =>
    word.examples.map((example) => example.chinese),
  ),
);
for (const [transcript, prompt, choices, correct, explanation] of companions) {
  if (
    !starterSentences.has(transcript) ||
    !prompt.trim() ||
    !explanation.trim() ||
    choices.some((choice) => !choice.trim()) ||
    new Set(choices).size !== choices.length ||
    !Number.isInteger(correct) ||
    correct < 0 ||
    correct >= choices.length
  )
    throw new Error("INVALID_LISTENING_COMPANION");
}
/** No fuzzy matching or question generation for arbitrary imported sentences. No persistence or exam score. */
export function getListeningComprehension(
  item: ListeningItem,
): ListeningComprehension | null {
  if (item.reviewStatus !== "REVIEWED" || !item.source.trim()) return null;
  const companion = companions.find(
    ([transcript]) => transcript === item.transcript,
  );
  if (!companion) return null;
  const [, promptVi, choices, correctIndex, explanationVi] = companion;
  return {
    id: `${item.id}-self-comprehension-v5`,
    sentenceId: item.id,
    promptVi,
    choices: [...choices],
    correctIndex,
    explanationVi,
    provenance: "AI_AUTHORED_SELF_PRACTICE",
    reviewStatus: "DRAFT",
    sourceRef: "src/data/starter-vocabulary.ts",
    sentenceSource: item.source,
  };
}
