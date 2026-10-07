import {
  assertExamProfileValid,
  assertExamQuestionValid,
  type ExamProfile,
  type ExamQuestion,
  type ExamQuestionType,
} from "./engine";
import {
  originalQuestionsV5,
  type OriginalCandidate,
} from "./original-questions-v5";

type Candidate = OriginalCandidate;
/** AI-assisted original candidates. NOT published, reviewed, or official HSK-aligned. */
const candidates: { level: "1" | "2" | "3"; items: Candidate[] }[] = [
  {
    level: "1",
    items: [
      [
        "VOCABULARY_CHOICE",
        "“医院” thường chỉ nơi nào?",
        ["Bệnh viện", "Nhà ga", "Trường học"],
        0,
        "医院 chỉ bệnh viện; không phải 学校 (trường học).",
      ],
      [
        "VOCABULARY_CHOICE",
        "“昨天” chỉ thời điểm nào?",
        ["Ngày mai", "Hôm qua", "Hôm nay"],
        1,
        "昨天 là hôm qua; 今天 là hôm nay, 明天 là ngày mai.",
      ],
      [
        "GRAMMAR_CLOZE",
        "我___学生。",
        ["在", "有", "是"],
        2,
        "是 nối chủ ngữ với danh từ chỉ thân phận: tôi là học sinh.",
      ],
      [
        "GRAMMAR_CLOZE",
        "妈妈买了两___书。",
        ["本", "杯", "件"],
        0,
        "本 là lượng từ thường dùng với sách; 杯 dùng với cốc, 件 với một số đồ vật/quần áo.",
      ],
      [
        "READING_COMPREHENSION",
        "小林上午上课，下午在家看书。\n小林下午在哪里？",
        ["在学校", "在家", "在商店"],
        1,
        "下午在家看书 nêu rõ buổi chiều Tiểu Lâm ở nhà đọc sách.",
      ],
      [
        "READING_COMPREHENSION",
        "今天很热，我想喝水，不想喝热茶。\n我现在想喝什么？",
        ["热茶", "咖啡", "水"],
        2,
        "Người nói muốn uống nước (水), không muốn uống trà nóng; đoạn văn không nhắc cà phê.",
      ],
    ],
  },
  {
    level: "2",
    items: [
      [
        "VOCABULARY_CHOICE",
        "“便宜” trong “这件衣服很便宜” nghĩa là gì?",
        ["Rẻ", "Đắt", "Xa"],
        0,
        "便宜 mô tả giá rẻ; 贵 là đắt. Đây là nghĩa trong ngữ cảnh giá quần áo.",
      ],
      [
        "VOCABULARY_CHOICE",
        "“正在” trong “他正在吃饭” nhấn mạnh điều gì?",
        ["Đã ăn xong", "Đang ăn", "Chưa từng ăn"],
        1,
        "正在 đặt trước động từ để nhấn mạnh hành động đang diễn ra.",
      ],
      [
        "GRAMMAR_CLOZE",
        "我昨天___去学校，因为生病了。",
        ["别", "很", "没"],
        2,
        "没 phủ định hành động đã không xảy ra trong quá khứ; 别 dùng để khuyên/cấm làm gì.",
      ],
      [
        "GRAMMAR_CLOZE",
        "姐姐___我高。",
        ["比", "从", "给"],
        0,
        "A 比 B + tính từ so sánh A với B: chị cao hơn tôi.",
      ],
      [
        "READING_COMPREHENSION",
        "电影七点开始。我们六点半在门口见。\n我们几点见面？",
        ["七点半", "六点半", "七点"],
        1,
        "Giờ gặp là 六点半 (6 giờ rưỡi), khác với giờ bắt đầu phim 七点.",
      ],
      [
        "READING_COMPREHENSION",
        "我买了苹果，没有买香蕉。商店里的香蕉太贵了。\n我为什么没买香蕉？",
        ["我已经有香蕉", "商店没有香蕉", "香蕉太贵了"],
        2,
        "Văn bản nêu nguyên nhân là chuối quá đắt; không nói hết hàng hay đã có chuối.",
      ],
    ],
  },
  {
    level: "3",
    items: [
      [
        "VOCABULARY_CHOICE",
        "“终于” trong “他终于找到了钥匙” gợi ý điều gì?",
        [
          "Sau một quá trình mới tìm thấy",
          "Chưa bắt đầu tìm",
          "Chắc chắn sẽ không tìm",
        ],
        0,
        "终于 nhấn mạnh kết quả cuối cùng sau chờ đợi hoặc nỗ lực; không cho biết chính xác mất bao lâu.",
      ],
      [
        "VOCABULARY_CHOICE",
        "“决定” trong “她决定坐火车” nghĩa là gì?",
        ["Quên", "Quyết định", "Hỏi đường"],
        1,
        "决定 ở đây là quyết định lựa chọn đi tàu, không phải quên hay hỏi đường.",
      ],
      [
        "GRAMMAR_CLOZE",
        "如果明天不下雨，我们___去公园。",
        ["虽然", "但是", "就"],
        2,
        "如果…就… biểu thị điều kiện và kết quả: nếu mai không mưa thì đi công viên.",
      ],
      [
        "GRAMMAR_CLOZE",
        "___这家店很小，但是东西很好吃。",
        ["虽然", "因为", "所以"],
        0,
        "虽然…但是… nối ý nhượng bộ: quán nhỏ nhưng đồ ăn ngon.",
      ],
      [
        "READING_COMPREHENSION",
        "小王把手机忘在办公室了，所以回去拿手机。\n小王为什么回办公室？",
        ["要开会", "要拿手机", "要买手机"],
        1,
        "小王回去拿手机: quay lại lấy điện thoại đã để quên, không phải mua điện thoại mới.",
      ],
      [
        "READING_COMPREHENSION",
        "原来我们想坐公共汽车，可是等了很久也没来，最后坐了出租车。\n我们最后怎么走的？",
        ["坐公共汽车", "走路", "坐出租车"],
        2,
        "最后坐了出租车 cho biết lựa chọn cuối cùng là taxi, khác với dự định ban đầu.",
      ],
    ],
  },
];

const expandedCandidates = originalQuestionsV5.map(({ level, items }) => ({
  level,
  items: [
    ...(candidates.find((group) => group.level === level)?.items ?? []),
    ...items,
  ],
}));
export const draftPracticeBank = expandedCandidates.map(({ level, items }) => {
  const profile: ExamProfile = {
    id: `original-candidates-${level}-v5`,
    name: `Ứng viên nội dung mức ${level}`,
    level,
    kind: "ORIGINAL_PRACTICE",
    verified: false,
    standardVersionId: null,
    sourceRef: null,
    durationSeconds: 900,
    metadataVersion: 1,
    scoring: "PRACTICE_ACCURACY",
    questionTypes: [
      "VOCABULARY_CHOICE",
      "GRAMMAR_CLOZE",
      "READING_COMPREHENSION",
      "LISTENING_CHOICE",
    ],
    references: { vocabularyIds: [], grammarIds: [], audioIds: [] },
    sections: [
      { skill: "READING", durationSeconds: 600, questionCount: 10 },
      { skill: "LISTENING", durationSeconds: 300, questionCount: 4 },
    ],
  };
  const questions: ExamQuestion[] = items.map(
    (
      [questionType, prompt, choices, correctIndex, explanationVi, transcript],
      index,
    ) => ({
      id: `${profile.id}-q${index + 1}`,
      profileId: profile.id,
      skill: questionType === "LISTENING_CHOICE" ? "LISTENING" : "READING",
      prompt,
      choices,
      correctIndex,
      explanationVi,
      provenance: "AI_DRAFT",
      metadata: {
        contentVersion: 5,
        level,
        difficulty: 1,
        questionType,
        section: questionType === "LISTENING_CHOICE" ? "LISTENING" : "READING",
        skills: [questionType === "LISTENING_CHOICE" ? "LISTENING" : "READING"],
        targetVocabularyIds: [],
        targetGrammarIds: [],
        sourceType: "ORIGINAL",
        reviewStatus: "DRAFT",
        ...(transcript
          ? { audio: { source: "SYSTEM_TTS" as const, transcript } }
          : {}),
      },
    }),
  );
  assertExamProfileValid(profile);
  questions.forEach((question) =>
    assertExamQuestionValid(profile, question, true),
  );
  return { profile, questions };
});

export type DraftBankEntry = {
  profile: ExamProfile;
  questions: ExamQuestion[];
};
export type DraftReferenceInventory = {
  vocabularyIds: readonly string[];
  grammarIds: readonly string[];
  audioIds: readonly string[];
};
const normalized = (value: string) =>
  value.trim().normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ");
/** Strict read-only editorial gate. Passing means structurally valid DRAFT, never reviewed/playable. */
export function validateDraftBank(
  entries: readonly DraftBankEntry[],
  inventory: DraftReferenceInventory = {
    vocabularyIds: [],
    grammarIds: [],
    audioIds: [],
  },
): void {
  if (!Array.isArray(entries) || !entries.length || entries.length > 20)
    throw new Error("INVALID_DRAFT_BANK");
  const ids = new Set<string>();
  const prompts = new Set<string>();
  for (const { profile, questions } of entries) {
    assertExamProfileValid(profile);
    if (
      profile.kind !== "ORIGINAL_PRACTICE" ||
      profile.verified ||
      profile.sourceRef !== null ||
      profile.standardVersionId !== null ||
      profile.metadataVersion !== 1 ||
      !profile.references
    )
      throw new Error("DRAFT_PROMOTION_FORBIDDEN");
    if (ids.has(profile.id)) throw new Error("DUPLICATE_DRAFT_ID");
    ids.add(profile.id);
    for (const field of ["vocabularyIds", "grammarIds", "audioIds"] as const)
      if (
        profile.references[field].some(
          (id: string) => !inventory[field].includes(id),
        )
      )
        throw new Error("UNKNOWN_DRAFT_REFERENCE");
    if (
      !Array.isArray(questions) ||
      !questions.length ||
      questions.length > 200
    )
      throw new Error("INVALID_DRAFT_BANK");
    for (const question of questions) {
      assertExamQuestionValid(profile, question, true);
      const meta = question.metadata;
      if (
        question.provenance !== "AI_DRAFT" ||
        meta?.reviewStatus !== "DRAFT" ||
        meta.sourceType !== "ORIGINAL" ||
        meta.review
      )
        throw new Error("DRAFT_PROMOTION_FORBIDDEN");
      if (ids.has(question.id)) throw new Error("DUPLICATE_DRAFT_ID");
      ids.add(question.id);
      const fingerprint =
        normalized(question.prompt) +
        "|" +
        normalized(meta.audio?.transcript ?? "");
      if (prompts.has(fingerprint)) throw new Error("DUPLICATE_DRAFT_PROMPT");
      prompts.add(fingerprint);
      if (
        meta.audio &&
        (meta.audio.source !== "SYSTEM_TTS" || meta.audio.assetId)
      )
        throw new Error("DRAFT_AUDIO_REQUIRES_SEPARATE_REVIEW");
    }
    for (const section of profile.sections)
      if (
        questions.filter((question) => question.skill === section.skill)
          .length !== section.questionCount
      )
        throw new Error("QUESTION_COUNT_MISMATCH");
    if (
      profile.questionTypes?.some(
        (type: ExamQuestionType) =>
          !questions.some(
            (question) => question.metadata?.questionType === type,
          ),
      )
    )
      throw new Error("MISSING_QUESTION_TYPE");
    if (profile.navigation === "SECTION_TIMED") {
      let offset = 0;
      for (const section of profile.sections) {
        if (
          questions
            .slice(offset, offset + section.questionCount)
            .some((question) => question.skill !== section.skill)
        )
          throw new Error("INVALID_SECTION_ORDER");
        offset += section.questionCount;
      }
    }
  }
}

/** Parses into isolated memory only: no database import, attempt creation or status promotion. */
export function previewDraftBankImport(
  json: string,
  inventory?: DraftReferenceInventory,
) {
  if (typeof json !== "string" || json.length > 2_000_000)
    throw new Error("INVALID_DRAFT_IMPORT");
  const entries: unknown = JSON.parse(json);
  validateDraftBank(entries as DraftBankEntry[], inventory);
  return entries as DraftBankEntry[];
}

validateDraftBank(draftPracticeBank);
