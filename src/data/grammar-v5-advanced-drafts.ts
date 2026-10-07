import { z } from 'zod';

import { advancedGrammarSeed } from './grammar-hsk-advanced';
import { grammarV5DraftSchema, grammarV5Expansion } from './grammar-v5-expansion';

const sourceSchema = z.object({
  path: z.enum(['src/data/grammar-v5-expansion.ts', 'src/data/grammar-hsk-advanced.ts']),
  pointId: z.string().min(1), kind: z.literal('LOCAL_PATTERN_NOT_OFFICIAL_REFERENCE'),
});
const advancedSchema = z.object({
  ...grammarV5DraftSchema.shape,
  id: z.string().regex(/^v5-advanced-[a-z0-9-]+$/u), hsk: z.literal('7-9'),
  draftState: z.literal('DRAFT'), verificationStatus: z.literal('UNVERIFIED'), learnerVisible: z.literal(false),
  editorialScope: z.literal('EXTENDED_LOCAL_PATTERNS_NOT_OFFICIAL_SYLLABUS'),
  sourceRefs: z.array(sourceSchema).min(1).max(5),
}).superRefine((point, ctx) => {
  // Reuse the original structural refinements with an accepted validation-only band.
  // The returned record retains 7-9; this is not a level mapping or review promotion.
  const structural = grammarV5DraftSchema.safeParse({ ...point, hsk: '6' });
  if (!structural.success) for (const issue of structural.error.issues) {
    ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
  }
  for (const ref of point.sourceRefs) {
    const bank = ref.path === 'src/data/grammar-v5-expansion.ts' ? grammarV5Expansion : advancedGrammarSeed;
    if (!bank.some((seed) => seed.id === ref.pointId)) ctx.addIssue({ code: 'custom', message: 'UNKNOWN_LOCAL_GRAMMAR_SOURCE' });
  }
});
export type AdvancedGrammarV5Draft = z.infer<typeof advancedSchema>;
export function validateAdvancedGrammarV5Draft(input: unknown): AdvancedGrammarV5Draft { return advancedSchema.parse(input); }
export function validateAdvancedGrammarV5Pack(input: unknown): AdvancedGrammarV5Draft[] {
  const points = z.array(advancedSchema).min(1).max(100).parse(input);
  if (new Set(points.map((point) => point.id)).size !== points.length) throw new Error('DUPLICATE_ADVANCED_GRAMMAR_DRAFT_ID');
  return points;
}

type DraftBody = Pick<AdvancedGrammarV5Draft, 'id' | 'title' | 'pattern' | 'quiz' | 'answer' | 'options' |
  'examples' | 'commonMistake' | 'vietnameseContrast'> & { explanation: string; sourceRefs: AdvancedGrammarV5Draft['sourceRefs'] };
function draft(body: DraftBody): AdvancedGrammarV5Draft {
  return validateAdvancedGrammarV5Draft({ ...body, hsk: '7-9', sourceType: 'AI_ASSISTED',
    provenance: '4Chinese original Vietnamese-first V5 draft', reviewStatus: 'PENDING',
    publicationRequiresReview: true, contentVersion: 1, levelMapping: 'INTERNAL_ESTIMATE',
    draftState: 'DRAFT', verificationStatus: 'UNVERIFIED', learnerVisible: false,
    editorialScope: 'EXTENDED_LOCAL_PATTERNS_NOT_OFFICIAL_SYLLABUS',
    explanation: `${body.explanation}\nĐối chiếu Việt–Trung: ${body.vietnameseContrast}\nCâu sai trong ngữ cảnh này: ${body.commonMistake.wrong}\nSửa: ${body.commonMistake.correct}\n${body.commonMistake.why}\nAI hỗ trợ · DRAFT / UNVERIFIED · chưa thẩm định độc lập. Nhãn 7–9 chỉ là ước tính nội bộ cho bài vận dụng, không phải phân loại hay độ phủ HSK chính thức.`,
  });
}
const local = (pointId: string): AdvancedGrammarV5Draft['sourceRefs'] => [{
  path: 'src/data/grammar-v5-expansion.ts', pointId, kind: 'LOCAL_PATTERN_NOT_OFFICIAL_REFERENCE',
}];

/** Source-only editorial material. Never appended to grammarSeed or the SQLite draft stage pack.
 * Local references justify reusable patterns, not official advanced-level attribution or review.
 */
export const advancedGrammarV5Drafts: readonly AdvancedGrammarV5Draft[] = [
  draft({ id: 'v5-advanced-exception-policy', title: 'Ngoại lệ và nghĩa vụ trong lập luận',
    pattern: '除非 + ngoại lệ，否则 + quy tắc/kết quả', sourceRefs: local('v5-chufei'),
    explanation: 'Vận dụng 除非…否则… trong quy tắc có ngoại lệ: xác định quy tắc mặc định và điều kiện miễn trừ. Không đổi cực tính vì thấy hai liên từ.',
    quiz: '除非委员会批准延期，___所有申请都必须在月底前提交。', answer: '否则', options: ['而且', '否则', '尽管'],
    examples: [
      { hanzi: '除非委员会批准延期，否则所有申请都必须在月底前提交。',
        pinyin: 'Chúfēi wěiyuánhuì pīzhǔn yánqī, fǒuzé suǒyǒu shēnqǐng dōu bìxū zài yuèdǐ qián tíjiāo.',
        vi: 'Trừ khi ủy ban chấp thuận gia hạn, nếu không mọi đơn đều phải nộp trước cuối tháng.',
        en: 'Unless the committee approves an extension, all applications must be submitted before the end of the month.',
        words: ['除非', '委员会', '批准', '延期', '否则', '所有', '申请', '都', '必须', '在', '月底', '前', '提交'] },
      { hanzi: '除非能够提供新的证据，否则我们不会改变原来的判断。',
        pinyin: 'Chúfēi nénggòu tígōng xīn de zhèngjù, fǒuzé wǒmen bú huì gǎibiàn yuánlái de pànduàn.',
        vi: 'Trừ khi có thể cung cấp chứng cứ mới, nếu không chúng tôi sẽ không thay đổi nhận định ban đầu.',
        en: 'Unless new evidence can be provided, we will not change our original judgment.',
        words: ['除非', '能够', '提供', '新', '的', '证据', '否则', '我们', '不', '会', '改变', '原来', '的', '判断'] },
    ], commonMistake: { wrong: '除非委员会批准延期，否则所有申请都不必在月底前提交。',
      correct: '除非委员会批准延期，否则所有申请都必须在月底前提交。',
      why: 'Khi quy tắc mặc định là phải nộp đúng hạn, 不必 đảo ngược nghĩa vụ. Đây là lỗi nghĩa trong quy tắc đã nêu, không phải câu luôn sai ngữ pháp.' },
    vietnameseContrast: '“Trừ khi” nêu ngoại lệ cho quy tắc, không tự phủ định vế kết quả; phân biệt “phải” với “không cần”.',
  }),
  draft({ id: 'v5-advanced-inference-limits', title: 'Tăng cấp có căn cứ',
    pattern: 'A + 尚且 + khó khăn，B + 更 + khó khăn', sourceRefs: local('v5-shangqie'),
    explanation: 'Dùng 尚且…更… để suy luận từ trường hợp có lợi thế sang trường hợp ít lợi thế hơn. Cần nêu căn cứ so sánh; không coi tăng cấp là chứng minh khách quan.',
    quiz: '连经验丰富的译者___难以准确理解，新手就更不用说了。', answer: '尚且', options: ['以免', '从而', '尚且'],
    examples: [
      { hanzi: '连经验丰富的译者尚且难以准确理解，新手就更不用说了。',
        pinyin: 'Lián jīngyàn fēngfù de yìzhě shàngqiě nányǐ zhǔnquè lǐjiě, xīnshǒu jiù gèng bú yòng shuō le.',
        vi: 'Ngay cả dịch giả nhiều kinh nghiệm còn khó hiểu chính xác, người mới thì càng không cần nói.',
        en: 'Even experienced translators struggle to understand accurately, let alone beginners.',
        words: ['连', '经验', '丰富', '的', '译者', '尚且', '难以', '准确', '理解', '新手', '就', '更', '不用', '说', '了'] },
      { hanzi: '资源充足的团队尚且需要半年，人员不足的小组就更难按时完成了。',
        pinyin: 'Zīyuán chōngzú de tuánduì shàngqiě xūyào bàn nián, rényuán bùzú de xiǎozǔ jiù gèng nán ànshí wánchéng le.',
        vi: 'Nhóm đủ nguồn lực còn cần nửa năm, tổ thiếu nhân sự thì càng khó hoàn thành đúng hạn.',
        en: 'Even a well-resourced team needs half a year; an understaffed group will find it even harder to finish on time.',
        words: ['资源', '充足', '的', '团队', '尚且', '需要', '半', '年', '人员', '不足', '的', '小组', '就', '更', '难', '按时', '完成', '了'] },
    ], commonMistake: { wrong: '资源充足的团队尚且需要半年，人员不足的小组就更容易按时完成了。',
      correct: '资源充足的团队尚且需要半年，人员不足的小组就更难按时完成了。',
      why: 'Trong so sánh cùng nhiệm vụ và ít nhân lực hơn, 更容易 trái hướng suy luận đang luyện. Kết luận này phụ thuộc giả định hai nhóm không có lợi thế khác.' },
    vietnameseContrast: '“Đến…còn…, huống chi…” cần hướng so sánh nhất quán; liên từ không tự bảo đảm giả định nền là đúng.',
  }),
  draft({ id: 'v5-advanced-causal-mechanism', title: 'Chuỗi biện pháp và hệ quả',
    pattern: 'Biện pháp + cơ chế trung gian，从而 + kết quả', sourceRefs: local('v5-conger'),
    explanation: 'Mở rộng 从而 từ một quan hệ đơn sang chuỗi tác động có bước trung gian. Phân biệt kết quả được suy ra với mục đích hay nguyên nhân đi trước.',
    quiz: '新的流程减少了重复审核，___缩短了申请人的等待时间。', answer: '从而', options: ['从而', '以免', '尽管'],
    examples: [
      { hanzi: '新的流程减少了重复审核，从而缩短了申请人的等待时间。',
        pinyin: 'Xīn de liúchéng jiǎnshǎo le chóngfù shěnhé, cóng ér suōduǎn le shēnqǐng rén de děngdài shíjiān.',
        vi: 'Quy trình mới giảm việc xét duyệt lặp lại, nhờ đó rút ngắn thời gian chờ của người nộp đơn.',
        en: 'The new process reduced repeated reviews and thereby shortened applicants’ waiting time.',
        words: ['新', '的', '流程', '减少', '了', '重复', '审核', '从而', '缩短', '了', '申请人', '的', '等待', '时间'] },
      { hanzi: '公开评审标准有助于减少误解，从而提高讨论的效率。',
        pinyin: 'Gōngkāi píngshěn biāozhǔn yǒuzhùyú jiǎnshǎo wùjiě, cóng ér tígāo tǎolùn de xiàolǜ.',
        vi: 'Công khai tiêu chí đánh giá giúp giảm hiểu lầm, nhờ đó nâng hiệu quả thảo luận.',
        en: 'Making evaluation criteria public helps reduce misunderstandings and thereby improves discussion efficiency.',
        words: ['公开', '评审', '标准', '有助于', '减少', '误解', '从而', '提高', '讨论', '的', '效率'] },
    ], commonMistake: { wrong: '从而缩短了等待时间，新的流程减少了重复审核。',
      correct: '新的流程减少了重复审核，从而缩短了等待时间。',
      why: '从而 dẫn hệ quả của mệnh đề trước; không đặt nó đầu câu khi chưa có quá trình làm căn cứ trong ngữ cảnh độc lập này.' },
    vietnameseContrast: '“Nhờ đó” cần một quá trình trước làm căn cứ. “Để” nêu mục đích không đồng nghĩa với kết quả đã xảy ra.',
  }),
  draft({ id: 'v5-advanced-decision-criteria', title: 'Ưu tiên phương án bằng lập luận',
    pattern: '与其 + phương án A，不如 + phương án B + căn cứ',
    sourceRefs: [{ path: 'src/data/grammar-hsk-advanced.ts', pointId: 'gram-yuqi-buru', kind: 'LOCAL_PATTERN_NOT_OFFICIAL_REFERENCE' }],
    explanation: 'Vận dụng 与其…不如… để đề xuất B thay A, rồi giải thích tiêu chí lựa chọn. Phân biệt lời khuyên ưu tiên với so sánh sự kiện đã diễn ra.',
    quiz: '与其在证据不足时仓促下结论，___先明确哪些信息还需要核实。', answer: '不如', options: ['尽管', '不如', '从而'],
    examples: [
      { hanzi: '与其在证据不足时仓促下结论，不如先明确哪些信息还需要核实。',
        pinyin: 'Yǔqí zài zhèngjù bùzú shí cāngcù xià jiélùn, bùrú xiān míngquè nǎxiē xìnxī hái xūyào héshí.',
        vi: 'Thay vì vội kết luận khi chưa đủ chứng cứ, nên xác định trước thông tin nào còn cần kiểm tra.',
        en: 'Rather than rush to a conclusion with insufficient evidence, first identify which information still needs verification.',
        words: ['与其', '在', '证据', '不足', '时', '仓促', '下', '结论', '不如', '先', '明确', '哪些', '信息', '还', '需要', '核实'] },
      { hanzi: '与其反复争论谁应该负责，不如先建立能够追踪问题的记录制度。',
        pinyin: 'Yǔqí fǎnfù zhēnglùn shéi yīnggāi fùzé, bùrú xiān jiànlì nénggòu zhuīzōng wèntí de jìlù zhìdù.',
        vi: 'Thay vì tranh cãi mãi ai phải chịu trách nhiệm, nên lập trước một cơ chế ghi chép có thể theo dõi vấn đề.',
        en: 'Rather than repeatedly argue about responsibility, first establish a record-keeping system that can track problems.',
        words: ['与其', '反复', '争论', '谁', '应该', '负责', '不如', '先', '建立', '能够', '追踪', '问题', '的', '记录', '制度'] },
    ], commonMistake: { wrong: '与其先明确需要核实的信息，不如在证据不足时仓促下结论。',
      correct: '与其在证据不足时仓促下结论，不如先明确需要核实的信息。',
      why: 'Khi mục tiêu là tránh kết luận vội, đặt việc kiểm tra ở A sẽ khiến lời khuyên ưu tiên kết luận vội B. Lỗi là đảo lựa chọn trong ý định đã nêu, không phải cấu trúc luôn sai.' },
    vietnameseContrast: '“Thà B còn hơn A” thường đổi thứ tự hai phương án so với “与其 A，不如 B”; phải theo ý ưu tiên chứ không theo từng chữ.',
  }),
];

export function listAdvancedGrammarV5ReviewQueue(): AdvancedGrammarV5Draft[] {
  return validateAdvancedGrammarV5Pack(advancedGrammarV5Drafts);
}
