import {
  assertQuestionBankReferencesValid,
  scorePractice,
  type ExamQuestionType,
  type ExamProfile,
  type ExamQuestion,
  type ExamSkill,
} from "./engine";

import type { HskLevel } from "@/services/hsk/alignment";

type Prompt = [string, [string, string, string], number, string];
/** Original authored exercises. Level labels are teaching estimates, not syllabus alignment. */
const content: { level: HskLevel; title: string; prompts: Prompt[] }[] = [
  {
    level: "1",
    title: "Gia đình và sinh hoạt",
    prompts: [
      [
        "小明是学生。他每天去学校。\n小明每天去哪儿？",
        ["学校", "医院", "商店"],
        0,
        "学校 là trường học. “他每天去学校” cho biết cậu ấy đi học mỗi ngày.",
      ],
      [
        "桌子上有三本书。\n桌子上有几本书？",
        ["两本", "三本", "五本"],
        1,
        "三 là ba; 本 là lượng từ dùng với sách. 几本书 hỏi số quyển sách.",
      ],
      [
        "我喜欢喝茶，不喜欢喝咖啡。\n我喜欢喝什么？",
        ["咖啡", "水", "茶"],
        2,
        "Người nói thích trà (茶), không thích cà phê (咖啡). 不 đứng trước 喜欢 để phủ định.",
      ],
      [
        "今天星期五，明天我去看朋友。\n我什么时候去看朋友？",
        ["今天", "明天", "昨天"],
        1,
        "明天 là ngày mai, 今天 là hôm nay, 昨天 là hôm qua. Không nhầm thời điểm kể với thời điểm hành động.",
      ],
    ],
  },
  {
    level: "2",
    title: "Mua sắm và sắp xếp thời gian",
    prompts: [
      [
        "这件衣服太贵了，那件便宜一些。\n哪件衣服更便宜？",
        ["这件", "两件一样", "那件"],
        2,
        "那件便宜一些: cái kia rẻ hơn một chút. 这件 là cái này; 那件 là cái kia.",
      ],
      [
        "我昨天没去游泳，明天再去。\n我打算什么时候去游泳？",
        ["昨天", "明天", "今天"],
        1,
        "再 diễn tả làm lại/làm sau ở tương lai; 又 thường nói việc đã lặp lại. Ở đây kế hoạch là ngày mai.",
      ],
      [
        "姐姐比我高，但是我比她跑得快。\n谁跑得快？",
        ["我", "姐姐", "一样快"],
        0,
        "我比她跑得快 nghĩa là tôi chạy nhanh hơn chị ấy. Cao hơn không đồng nghĩa chạy nhanh hơn.",
      ],
      [
        "请给我两杯水。\n为什么这里用“两”？",
        ["因为水很冷", "因为在量词“杯”前", "因为只有一个人"],
        1,
        "Trước lượng từ khi nói hai đơn vị thường dùng 两: 两杯水. 二 thường dùng khi đếm số hoặc trong số thứ tự.",
      ],
    ],
  },
  {
    level: "3",
    title: "Giao tiếp và giải quyết vấn đề",
    prompts: [
      [
        "如果明天下雨，我们就不去公园。\n什么情况下不去公园？",
        ["明天下雨", "今天很热", "公园很大"],
        0,
        "如果…就… nối điều kiện và kết quả: nếu mai mưa thì không đi công viên.",
      ],
      [
        "虽然这家店离家很远，但是东西很好吃。\n说话人对这家店的看法是什么？",
        ["很近但难吃", "很远但好吃", "很近而且便宜"],
        1,
        "虽然…但是… diễn tả nhượng bộ. Xa nhà là bất tiện, nhưng đồ ăn ngon.",
      ],
      [
        "我认识那位老师，也知道她的名字。\n哪句话最符合这段话？",
        ["我不知道她是谁", "我没见过她", "我认识她，也知道她叫什么"],
        2,
        "认识 dùng cho quen/nhận biết một người; 知道 dùng cho biết thông tin, như tên của người đó.",
      ],
      [
        "他已经把作业做完了，现在可以休息。\n他的作业怎么样了？",
        ["还没开始", "已经完成", "明天才做"],
        1,
        "做完 có bổ ngữ kết quả 完, diễn tả làm xong. 已经…了 xác nhận việc đã hoàn tất.",
      ],
    ],
  },
  {
    level: "4",
    title: "Công việc và lựa chọn",
    prompts: [
      [
        "由于航班取消，他只好改坐火车。\n他为什么坐火车？",
        ["他害怕飞机", "他想省钱", "原来的航班取消了"],
        2,
        "由于 nêu nguyên nhân; 只好 nói lựa chọn bất đắc dĩ. Văn bản không nói anh ấy sợ máy bay hay muốn tiết kiệm.",
      ],
      [
        "与其一直抱怨，不如先想办法解决问题。\n说话人建议做什么？",
        ["先寻找解决办法", "继续抱怨", "不要处理问题"],
        0,
        "与其…不如… so sánh hai lựa chọn và ưu tiên lựa chọn thứ hai: tìm cách giải quyết thay vì than phiền.",
      ],
      [
        "这份报告不仅内容清楚，而且数据可靠。\n报告的优点是什么？",
        ["内容短但数据错", "内容清楚、数据可靠", "只有格式好看"],
        1,
        "不仅…而且… bổ sung hai ưu điểm cùng hướng. 可靠 nghĩa là đáng tin cậy.",
      ],
      [
        "经理让我明天下午再联系客户。\n什么时候联系客户？",
        ["昨天下午", "现在马上", "明天下午"],
        2,
        "让 + người + động từ: yêu cầu/để ai làm gì. 再 ở đây chỉ việc sẽ làm sau, vào chiều mai.",
      ],
    ],
  },
  {
    level: "5",
    title: "Phân tích thông tin",
    prompts: [
      [
        "这项政策旨在减少浪费，而不是限制正常消费。\n政策的主要目的是什么？",
        ["减少浪费", "禁止消费", "提高商品价格"],
        0,
        "旨在 nghĩa là nhằm mục đích. 而不是 loại trừ cách hiểu “hạn chế tiêu dùng bình thường”.",
      ],
      [
        "尽管实验结果与预期不同，研究团队仍决定公布数据。\n团队采取了什么行动？",
        ["隐藏数据", "更改结果", "公布实际数据"],
        2,
        "尽管…仍…: dù có trở ngại vẫn thực hiện. Công bố dữ liệu không có nghĩa kết quả đã đúng với kỳ vọng.",
      ],
      [
        "她的建议并非毫无价值，只是目前缺少实施条件。\n作者对建议的态度是什么？",
        ["认为建议完全无用", "认可部分价值，但暂时难实施", "认为已经成功实施"],
        1,
        "并非毫无价值 là phủ định cách hiểu “hoàn toàn không có giá trị”. Vấn đề nằm ở điều kiện triển khai hiện tại.",
      ],
      [
        "除非获得书面许可，否则不得转载这篇文章。\n什么时候可以转载？",
        ["文章很短时", "注明作者就一定可以", "获得书面许可后"],
        2,
        "除非…否则… nêu điều kiện cần. Chỉ ghi tên tác giả không thay thế việc xin phép khi câu đã yêu cầu giấy phép.",
      ],
    ],
  },
  {
    level: "6",
    title: "Lập luận và suy luận",
    prompts: [
      [
        "调查显示相关性，但尚不足以证明因果关系。\n哪项结论最谨慎？",
        ["两者一定互为因果", "仍需进一步研究因果关系", "调查完全没有价值"],
        1,
        "相关性 là tương quan; 因果关系 là quan hệ nhân quả. Không đủ chứng minh không đồng nghĩa nghiên cứu vô giá trị.",
      ],
      [
        "短期收益固然重要，但不能以牺牲长期信誉为代价。\n作者更反对哪种做法？",
        ["损害信誉换取短期收益", "重视长期信誉", "分析短期收益"],
        0,
        "固然…但… thừa nhận một điểm rồi nhấn mạnh giới hạn. 以…为代价 nghĩa là đánh đổi bằng…",
      ],
      [
        "所谓透明，并不意味着公开所有个人隐私。\n作者要澄清什么？",
        ["个人隐私不重要", "透明要求公开全部隐私", "透明与保护隐私可以兼顾"],
        2,
        "并不意味着否定了“minh bạch tức công khai mọi thông tin riêng tư”. Cần phân biệt trách nhiệm giải trình với xâm phạm riêng tư.",
      ],
      [
        "结论应建立在可复核的证据上，而非仅凭直觉。\n什么是形成结论的依据？",
        ["个人直觉", "可复核的证据", "多数人的猜测"],
        1,
        "可复核 là có thể kiểm tra lại. 而非 phân biệt bằng chứng có thể kiểm chứng với trực giác đơn thuần.",
      ],
    ],
  },
  {
    level: "7-9",
    title: "Văn bản học thuật và chính sách",
    prompts: [
      [
        "若将效率作为唯一尺度，公共服务中的公平诉求便可能被忽视。\n作者指出哪种风险？",
        ["只重效率可能忽视公平", "公平必然降低效率", "公共服务无需评价"],
        0,
        "唯一尺度: thước đo duy nhất. 作者 nêu nguy cơ bỏ qua công bằng, không khẳng định công bằng luôn làm giảm hiệu quả.",
      ],
      [
        "该论证的局限不在于样本数量，而在于样本选择缺乏代表性。\n主要局限是什么？",
        ["样本太少", "选择的样本不具代表性", "没有进行任何研究"],
        1,
        "不在于…而在于… chuyển trọng tâm từ số lượng sang tính đại diện của cách chọn mẫu.",
      ],
      [
        "制度创新必须兼顾实施成本，否则理念再先进也难以落地。\n“落地”在这里是什么意思？",
        ["从高处掉下来", "停止讨论", "实际实施"],
        2,
        "落地 trong ngữ cảnh chính sách là được triển khai thực tế. Câu nhấn mạnh chi phí thực thi bên cạnh ý tưởng.",
      ],
      [
        "承认历史条件的制约，并不等于否认个体选择的作用。\n作者的立场是什么？",
        ["历史条件与个体选择都应考虑", "个体选择毫无作用", "历史条件不存在"],
        0,
        "并不等于 không cho phép suy từ “có ràng buộc lịch sử” sang “lựa chọn cá nhân vô nghĩa”. Hai mặt cần được xét đồng thời.",
      ],
    ],
  },
];
export const originalPracticeBank = content.map(({ level, title, prompts }) => {
  const profile: ExamProfile = {
    id: `original-reading-${level}-v1`,
    name: title,
    level,
    kind: "ORIGINAL_PRACTICE",
    verified: false,
    standardVersionId: null,
    sourceRef: null,
    durationSeconds: Number(level) <= 3 ? 300 : 600,
    sections: [
      {
        skill: "READING",
        durationSeconds: Number(level) <= 3 ? 300 : 600,
        questionCount: prompts.length,
      },
    ],
  };
  const questions: ExamQuestion[] = prompts.map(
    ([prompt, choices, correctIndex, explanationVi], index) => ({
      id: `${profile.id}-q${index + 1}`,
      profileId: profile.id,
      skill: "READING",
      prompt,
      choices,
      correctIndex,
      explanationVi,
      provenance: "CURATED",
    }),
  );
  assertQuestionBankReferencesValid(profile, questions);
  return { profile, questions };
});

export const practiceDurations = [5, 10, 15] as const;
export type PracticeDuration = (typeof practiceDurations)[number];
export type PracticeFocus = "ALL" | "READING" | "LANGUAGE";
export const practiceFocusLabels: Record<PracticeFocus, string> = {
  ALL: "Đọc + ngôn ngữ trong ngữ cảnh",
  READING: "Đọc hiểu",
  LANGUAGE: "Ngôn ngữ trong ngữ cảnh",
};
/** Reuses V4 items, not new reviewed content. Durations are time budgets, not full mocks. */
export function buildOriginalPractice(
  legacyProfileId: string,
  minutes: PracticeDuration,
  focus: PracticeFocus = "ALL",
  noBack = false,
) {
  if (!(practiceDurations as readonly number[]).includes(minutes))
    throw new Error("INVALID_PRACTICE_DURATION");
  if (
    !["ALL", "READING", "LANGUAGE"].includes(focus) ||
    typeof noBack !== "boolean"
  )
    throw new Error("INVALID_PRACTICE_FOCUS");
  const base = originalPracticeBank.find(
    (bank) => bank.profile.id === legacyProfileId,
  );
  if (!base) throw new Error("UNKNOWN_PRACTICE_PROFILE");
  const selected = base.questions.filter(
    (_, index) =>
      focus === "ALL" || (focus === "READING" ? index < 2 : index >= 2),
  );
  const types: ExamQuestionType[] =
    focus === "ALL"
      ? ["READING_COMPREHENSION", "LANGUAGE_IN_CONTEXT"]
      : focus === "READING"
        ? ["READING_COMPREHENSION"]
        : ["LANGUAGE_IN_CONTEXT"];
  const profile: ExamProfile = {
    ...base.profile,
    id: `${base.profile.id}-${focus.toLowerCase()}-${minutes}m${noBack ? "-no-back" : ""}`,
    name: `${base.profile.name} · ${practiceFocusLabels[focus]}`,
    durationSeconds: minutes * 60,
    backNavigation: noBack ? "NO_BACK" : "ALLOW",
    metadataVersion: 1,
    scoring: "PRACTICE_ACCURACY",
    questionTypes: types,
    references: { vocabularyIds: [], grammarIds: [], audioIds: [] },
    sections: [
      {
        skill: "READING",
        durationSeconds: minutes * 60,
        questionCount: selected.length,
      },
    ],
  };
  const questions: ExamQuestion[] = selected.map((question) => ({
    ...question,
    id: `${profile.id}-${question.id.split("-").at(-1)}`,
    profileId: profile.id,
    choices: [...question.choices],
    metadata: {
      contentVersion: 1,
      level: profile.level,
      difficulty: 1,
      questionType:
        base.questions.indexOf(question) < 2
          ? "READING_COMPREHENSION"
          : "LANGUAGE_IN_CONTEXT",
      section: "READING",
      skills: ["READING"],
      targetVocabularyIds: [],
      targetGrammarIds: [],
      sourceType: "ORIGINAL",
      reviewStatus: "LEGACY_CURATED",
    },
  }));
  assertQuestionBankReferencesValid(profile, questions);
  return { profile, questions };
}

/** Descriptive evidence only. Missing skills are not zero scores or a pass prediction. */
export function getPracticeEvidence(
  questions: readonly ExamQuestion[],
  answers: Readonly<Record<string, number>>,
) {
  const sections = (
    [
      "READING",
      "LISTENING",
      "WRITING",
      "SPEAKING",
      "TRANSLATION",
    ] as ExamSkill[]
  ).map((skill) => {
    const items = questions.filter((question) => question.skill === skill);
    const answered = items.filter((question) => {
      const answer = answers[question.id];
      return (
        typeof answer === "number" &&
        Number.isInteger(answer) &&
        answer >= 0 &&
        answer < question.choices.length
      );
    }).length;
    const scored = scorePractice(items, answers);
    return {
      skill,
      total: items.length,
      answered,
      unanswered: items.length - answered,
      correct: scored.correct,
      percent: items.length ? scored.percent : null,
      evidence: !items.length
        ? ("MISSING" as const)
        : ("LIMITED_PRACTICE" as const),
    };
  });
  const groups = [
    ...new Set(
      questions.map(
        (question) => question.metadata?.questionType ?? "LEGACY_CONTEXT",
      ),
    ),
  ].map((type) => {
    const items = questions.filter(
      (question) =>
        (question.metadata?.questionType ?? "LEGACY_CONTEXT") === type,
    );
    return { type, ...scorePractice(items, answers) };
  });
  const weakest = groups
    .filter((group) => group.wrongIds.length)
    .sort((a, b) => a.percent - b.percent)[0];
  const recommendedFocus: PracticeFocus = !weakest
    ? "ALL"
    : ["GRAMMAR_CLOZE", "VOCABULARY_CHOICE", "LANGUAGE_IN_CONTEXT"].includes(
          weakest.type,
        )
      ? "LANGUAGE"
      : weakest.type === "READING_COMPREHENSION"
        ? "READING"
        : "ALL";
  return {
    sections,
    recommendedFocus,
    weakestType: weakest?.type ?? null,
    missingSkills: sections
      .filter((section) => section.evidence === "MISSING")
      .map((section) => section.skill),
    confidence: "LIMITED_PRACTICE_ONLY" as const,
    limitationVi:
      "Chỉ phản ánh mẫu câu trong bài này; số câu ít, nội dung chưa kiểm chứng độc lập và có thể được làm lại. Không ước lượng điểm thi, độ tin cậy thống kê hay khả năng đỗ.",
  };
}
