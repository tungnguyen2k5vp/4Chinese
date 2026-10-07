import { z } from 'zod';

import type { GrammarSeed } from '@/db/grammar';

export type GrammarV5Draft = GrammarSeed & {
  sourceType: 'AI_ASSISTED';
  provenance: '4Chinese original Vietnamese-first V5 draft';
  reviewStatus: 'PENDING';
  publicationRequiresReview: true;
  contentVersion: 1;
  levelMapping: 'INTERNAL_ESTIMATE';
  commonMistake: { wrong: string; correct: string; why: string };
  vietnameseContrast: string;
};

type Example = GrammarSeed['examples'][number];
const nonempty = z.string().trim().min(1).max(4000);
const chinese = nonempty.refine((value) => /\p{Script=Han}/u.test(value), 'CHINESE_TEXT_REQUIRED');
const normalized = (value: string) => value.replace(/[\s。！？!?.,，；;：:]/gu, '');
export const grammarV5DraftSchema = z.object({
  id: z.string().regex(/^v5-[a-z0-9-]+$/u), hsk: z.enum(['1', '2', '3', '4', '5', '6']),
  title: nonempty, pattern: nonempty, explanation: nonempty, quiz: chinese,
  answer: chinese, options: z.array(chinese).min(3).max(5),
  examples: z.array(z.object({ hanzi: chinese, pinyin: nonempty, vi: nonempty, en: nonempty,
    words: z.array(chinese).min(2).max(50) })).length(2),
  sourceType: z.literal('AI_ASSISTED'), provenance: z.literal('4Chinese original Vietnamese-first V5 draft'),
  reviewStatus: z.literal('PENDING'), publicationRequiresReview: z.literal(true),
  contentVersion: z.literal(1), levelMapping: z.literal('INTERNAL_ESTIMATE'),
  commonMistake: z.object({ wrong: chinese, correct: chinese, why: nonempty }), vietnameseContrast: nonempty,
}).superRefine((point, ctx) => {
  if (!point.quiz.includes('___') || point.quiz.split('___').length !== 2 ||
    point.options.filter((option) => option === point.answer).length !== 1 || new Set(point.options).size !== point.options.length) {
    ctx.addIssue({ code: 'custom', message: 'INVALID_GRAMMAR_DRAFT_OPTIONS' });
  }
  if (normalized(point.commonMistake.wrong) === normalized(point.commonMistake.correct)) {
    ctx.addIssue({ code: 'custom', message: 'GRAMMAR_CORRECTION_REQUIRED' });
  }
  if (new Set(point.examples.map((example) => normalized(example.hanzi))).size !== 2) {
    ctx.addIssue({ code: 'custom', message: 'DISTINCT_GRAMMAR_EXAMPLES_REQUIRED' });
  }
  for (const example of point.examples) {
    if (normalized(example.words.join('')) !== normalized(example.hanzi) || !/[a-zü]/iu.test(example.pinyin)) {
      ctx.addIssue({ code: 'custom', message: 'GRAMMAR_EXAMPLE_ALIGNMENT_REQUIRED' });
    }
  }
});

/** Validates structure, not linguistic correctness, official leveling or independent review. */
export function validateGrammarV5Draft(input: unknown): GrammarV5Draft { return grammarV5DraftSchema.parse(input); }
export function validateGrammarV5DraftPack(input: unknown): GrammarV5Draft[] {
  const points = z.array(grammarV5DraftSchema).length(24).parse(input);
  if (new Set(points.map((point) => point.id)).size !== points.length) throw new Error('DUPLICATE_GRAMMAR_DRAFT_ID');
  for (const band of ['1', '2', '3', '4', '5', '6']) {
    if (points.filter((point) => point.hsk === band).length !== 4) throw new Error('GRAMMAR_DRAFT_BAND_COVERAGE');
  }
  return points;
}
const example = (hanzi: string, pinyin: string, vi: string, en: string, words: string[]): Example =>
  ({ hanzi, pinyin, vi, en, words });
function draft(id: string, hsk: string, title: string, pattern: string, explanation: string,
  quiz: string, answer: string, options: string[], examples: Example[],
  wrong: string, correct: string, why: string, vietnameseContrast: string): GrammarV5Draft {
  return { id: `v5-${id}`, hsk, title, pattern,
    explanation: `${explanation}\nĐối chiếu Việt–Trung: ${vietnameseContrast}\nCâu sai trong ngữ cảnh này: ${wrong}\nSửa: ${correct}\n${why}\nTự biên soạn có AI hỗ trợ · PENDING · cấp độ nội bộ ước lượng, chưa kiểm duyệt độc lập.`,
    quiz, answer, options, examples, commonMistake: { wrong, correct, why }, vietnameseContrast,
    sourceType: 'AI_ASSISTED', provenance: '4Chinese original Vietnamese-first V5 draft',
    reviewStatus: 'PENDING', publicationRequiresReview: true, contentVersion: 1, levelMapping: 'INTERNAL_ESTIMATE' };
}

/** Original drafts, not an official required-point list. Never auto-publish from test scores. */
export const grammarV5Expansion: readonly GrammarV5Draft[] = [
  draft('adjective-predicate', '1', 'Tính từ làm vị ngữ', 'Chủ ngữ + 很 + tính từ',
    'Trong câu miêu tả trung tính, 很 thường nối chủ ngữ với tính từ, không nhất thiết nhấn “rất”. Không thêm 是 trước tính từ đơn thuần.',
    '她___忙。', '很', ['很', '是', '有'], [
      example('她很忙。', 'Tā hěn máng.', 'Cô ấy bận.', 'She is busy.', ['她', '很', '忙']),
      example('这杯茶很热。', 'Zhè bēi chá hěn rè.', 'Cốc trà này nóng.', 'This cup of tea is hot.', ['这', '杯', '茶', '很', '热']),
    ], '她是忙。', '她很忙。', '忙 là tính từ miêu tả, không phải danh từ sau 是.', 'Tiếng Việt có thể nói “cô ấy bận” mà không cần từ nối.'),
  draft('question-word', '1', 'Từ hỏi giữ vị trí cần hỏi', 'Chủ ngữ + động từ + 什么/谁/哪儿',
    'Từ hỏi thay đúng thành phần chưa biết; không kéo lên đầu câu như một số ngôn ngữ. Câu có từ hỏi này không thêm 吗 để hỏi cùng thông tin.',
    '你想吃___？', '什么', ['什么', '吗', '的'], [
      example('你想吃什么？', 'Nǐ xiǎng chī shénme?', 'Bạn muốn ăn gì?', 'What would you like to eat?', ['你', '想', '吃', '什么']),
      example('你住在哪儿？', 'Nǐ zhù zài nǎr?', 'Bạn sống ở đâu?', 'Where do you live?', ['你', '住', '在', '哪儿']),
    ], '你想吃什么吗？', '你想吃什么？', 'Đang hỏi món ăn nào, không hỏi có/không.', '“Gì/đâu” cũng thường ở vị trí thông tin trong tiếng Việt; không thêm “không” máy móc.'),
  draft('dou-scope', '1', 'Phạm vi của 都', 'Nhóm chủ ngữ + 都 + vị ngữ',
    '都 nói tất cả thành viên trong nhóm đã nêu đều có đặc điểm/hành động. Nhóm thường đứng trước 都.',
    '我们三个人___是学生。', '都', ['都', '的', '吗'], [
      example('我们都喜欢喝茶。', 'Wǒmen dōu xǐhuan hē chá.', 'Chúng tôi đều thích uống trà.', 'We all like drinking tea.', ['我们', '都', '喜欢', '喝', '茶']),
      example('这些书都很有意思。', 'Zhèxiē shū dōu hěn yǒu yìsi.', 'Những quyển sách này đều thú vị.', 'These books are all interesting.', ['这些', '书', '都', '很', '有意思']),
    ], '我们喜欢都喝茶。', '我们都喜欢喝茶。', '都 bao quát 我们, đặt trước vị ngữ 喜欢喝茶.', 'Dịch “đều” theo phạm vi nhóm, không theo vị trí từng chữ.'),
  draft('yes-no-repeat', '1', 'Hỏi khẳng định–phủ định', 'Động từ + 不 + động từ',
    'Lặp dạng khẳng định và phủ định để hỏi có/không: 去不去. Không thêm 吗 trong câu hỏi trung tính cùng chức năng.',
    '你去___去学校？', '不', ['不', '的', '吗'], [
      example('你去不去学校？', 'Nǐ qù bu qù xuéxiào?', 'Bạn có đi đến trường không?', 'Are you going to school?', ['你', '去', '不', '去', '学校']),
      example('你喜欢不喜欢喝茶？', 'Nǐ xǐhuan bu xǐhuan hē chá?', 'Bạn có thích uống trà không?', 'Do you like drinking tea?', ['你', '喜欢', '不', '喜欢', '喝', '茶']),
    ], '你去不去学校吗？', '你去不去学校？', 'Chọn một khung hỏi: 去不去 hoặc 去…吗.', 'Tiếng Việt “có…không” không tương ứng với việc thêm cả hai khung Trung.'),
  draft('kuai-le', '2', 'Sắp xảy ra', '快要/快 + động từ + 了',
    'Dự báo sự việc sắp xảy ra. 了 cuối câu báo tình thế sắp thay đổi, không phải một dấu quá khứ.',
    '快___下雨了。', '要', ['要', '的', '过'], [
      example('快要下雨了。', 'Kuài yào xiàyǔ le.', 'Trời sắp mưa rồi.', 'It is about to rain.', ['快', '要', '下雨', '了']),
      example('我们快要到家了。', 'Wǒmen kuài yào dào jiā le.', 'Chúng tôi sắp về đến nhà.', 'We are almost home.', ['我们', '快', '要', '到', '家', '了']),
    ], '快要下雨过。', '快要下雨了。', '过 chỉ trải nghiệm không đóng khung sắp xảy ra này.', 'Không đọc 了 thành “đã” khi cả câu hướng đến tương lai.'),
  draft('mei-completed', '2', 'Chưa làm một việc', '没(有) + động từ',
    '没 phủ định việc xảy ra/hoàn thành. Trong câu đơn đang phủ định hành động quá khứ, bỏ 了 chỉ hoàn thành sau động từ.',
    '我昨天___去学校。', '没', ['没', '别', '的'], [
      example('我昨天没去学校。', 'Wǒ zuótiān méi qù xuéxiào.', 'Hôm qua tôi không đến trường.', 'I did not go to school yesterday.', ['我', '昨天', '没', '去', '学校']),
      example('她还没吃早饭。', 'Tā hái méi chī zǎofàn.', 'Cô ấy vẫn chưa ăn sáng.', 'She has not had breakfast yet.', ['她', '还', '没', '吃', '早饭']),
    ], '我昨天没去了学校。', '我昨天没去学校。', 'Không giữ 了 hoàn thành trong câu phủ định sự việc này.', '“Không/chưa” cần xét sự việc thực tế; không chỉ chọn 不 vì bản dịch có “không”.'),
  draft('bie-command', '2', 'Khuyên đừng làm', '别 + động từ + (了)',
    '别 dùng để ngăn/khuyên người nghe không làm. 了 cuối câu có thể nhấn dừng hành vi hiện tại.',
    '请___说话。', '别', ['别', '没', '的'], [
      example('请别说话。', 'Qǐng bié shuōhuà.', 'Xin đừng nói chuyện.', 'Please do not talk.', ['请', '别', '说话']),
      example('别看手机了。', 'Bié kàn shǒujī le.', 'Đừng xem điện thoại nữa.', 'Stop looking at your phone.', ['别', '看', '手机', '了']),
    ], '请没说话。', '请别说话。', 'Đây là yêu cầu, không phải kể việc chưa xảy ra.', '“Đừng” là lời ngăn, khác với “chưa” kể sự việc.'),
  draft('distance-li', '2', 'Khoảng cách với 离', 'A + 离 + B + xa/gần/khoảng cách',
    '离 đánh dấu mốc dùng để đo khoảng cách; không phải động từ di chuyển đến mốc đó.',
    '我家___学校很近。', '离', ['离', '把', '被'], [
      example('我家离学校很近。', 'Wǒ jiā lí xuéxiào hěn jìn.', 'Nhà tôi rất gần trường.', 'My home is very close to school.', ['我', '家', '离', '学校', '很', '近']),
      example('车站离这里有两公里。', 'Chēzhàn lí zhèlǐ yǒu liǎng gōnglǐ.', 'Ga cách đây hai kilômét.', 'The station is two kilometres from here.', ['车站', '离', '这里', '有', '两', '公里']),
    ], '我家到学校很近。', '我家离学校很近。', 'Trong câu miêu tả khoảng cách tĩnh này dùng 离; 从…到… là khung phạm vi khác.', '“Cách/gần” cần mốc so sánh, không dịch thành động từ “đến”.'),
  draft('potential', '3', 'Khả năng đạt kết quả', 'Động từ + 得/不 + bổ ngữ kết quả',
    '看得懂 nói có thể đọc hiểu; 看不懂 nói không đọc hiểu được. Không đồng nhất với 看懂了 là đã hiểu.',
    '这个字太小，我看___清楚。', '不', ['不', '的', '地'], [
      example('这个字太小，我看不清楚。', 'Zhège zì tài xiǎo, wǒ kàn bu qīngchu.', 'Chữ này nhỏ quá, tôi không nhìn rõ được.', 'This character is too small for me to see clearly.', ['这个', '字', '太', '小', '我', '看', '不', '清楚']),
      example('这篇文章我看得懂。', 'Zhè piān wénzhāng wǒ kàn de dǒng.', 'Bài viết này tôi có thể đọc hiểu.', 'I can understand this article.', ['这', '篇', '文章', '我', '看', '得', '懂']),
    ], '这篇文章我看懂得。', '这篇文章我看得懂。', '得 nằm giữa động từ 看 và kết quả 懂.', '“Được” trong “đọc hiểu được” không đặt cuối khung Trung.'),
  draft('zhe-state', '3', 'Trạng thái duy trì với 着', 'Động từ + 着',
    '着 miêu tả trạng thái đang duy trì do hành động, như cửa đang mở. Không tự khẳng định hành động đã hoàn tất.',
    '门开___呢。', '着', ['着', '过', '的'], [
      example('门开着呢。', 'Mén kāi zhe ne.', 'Cửa đang mở đấy.', 'The door is open.', ['门', '开', '着', '呢']),
      example('她穿着一件红色的外套。', 'Tā chuān zhe yí jiàn hóngsè de wàitào.', 'Cô ấy đang mặc một chiếc áo khoác đỏ.', 'She is wearing a red coat.', ['她', '穿', '着', '一', '件', '红色', '的', '外套']),
    ], '门着开呢。', '门开着呢。', '着 theo sau động từ chỉ trạng thái, không đứng trước 开.', '“Đang mở” có thể chỉ trạng thái, khác “đang mở cửa” là thao tác.'),
  draft('yue-yue', '3', 'Hai mức độ cùng biến đổi', '越 + A，越 + B',
    'Mức độ A tăng thì mức độ B cũng thay đổi. Khác 越来越 miêu tả một xu hướng theo thời gian.',
    '这本书越看___有意思。', '越', ['越', '的', '过'], [
      example('这本书越看越有意思。', 'Zhè běn shū yuè kàn yuè yǒu yìsi.', 'Quyển sách này càng đọc càng thấy thú vị.', 'This book gets more interesting the more you read it.', ['这', '本', '书', '越', '看', '越', '有意思']),
      example('你越练习，说得越流利。', 'Nǐ yuè liànxí, shuō de yuè liúlì.', 'Bạn càng luyện tập thì nói càng lưu loát.', 'The more you practise, the more fluently you speak.', ['你', '越', '练习', '说', '得', '越', '流利']),
    ], '这本书越看有意思越。', '这本书越看越有意思。', 'Mỗi 越 đứng trước phần có mức độ thay đổi.', '“Càng…càng…” cần hai vị trí, không gom hết vào 越来越.'),
  draft('you-you', '3', 'Hai đặc điểm cùng có', '又 + tính từ A + 又 + tính từ B',
    '又…又… ghép hai đặc điểm đồng thời, không nói lần lặp lại trong thời gian.',
    '这个苹果又大___甜。', '又', ['又', '再', '过'], [
      example('这个苹果又大又甜。', 'Zhège píngguǒ yòu dà yòu tián.', 'Quả táo này vừa to vừa ngọt.', 'This apple is both big and sweet.', ['这个', '苹果', '又', '大', '又', '甜']),
      example('这条路又长又窄。', 'Zhè tiáo lù yòu cháng yòu zhǎi.', 'Con đường này vừa dài vừa hẹp.', 'This road is both long and narrow.', ['这', '条', '路', '又', '长', '又', '窄']),
    ], '这个苹果又大再甜。', '这个苹果又大又甜。', 'Khung phối hợp tính từ dùng 又 ở cả hai vị trí.', '“Vừa…vừa…” chỉ đặc điểm ở đây, không phải hai thao tác song song 一边…一边….'),
  draft('zhiyao', '4', 'Điều kiện đủ với 只要', '只要 + điều kiện， 就 + kết quả',
    'Nói chỉ cần điều kiện đó là đủ theo nhận định người nói; không khẳng định đó là điều kiện duy nhất cần thiết.',
    '___带上护照，就可以办理入住。', '只要', ['只要', '虽然', '因为'], [
      example('只要带上护照，就可以办理入住。', 'Zhǐyào dài shàng hùzhào, jiù kěyǐ bànlǐ rùzhù.', 'Chỉ cần mang hộ chiếu là có thể làm thủ tục nhận phòng.', 'You can check in as long as you bring your passport.', ['只要', '带', '上', '护照', '就', '可以', '办理', '入住']),
      example('只要你愿意，我就陪你去。', 'Zhǐyào nǐ yuànyì, wǒ jiù péi nǐ qù.', 'Chỉ cần bạn muốn, tôi sẽ đi cùng bạn.', 'If you want, I will go with you.', ['只要', '你', '愿意', '我', '就', '陪', '你', '去']),
    ], '只要你愿意，我才陪你去。', '只要你愿意，我就陪你去。', 'Với ý “chỉ cần” đang luyện, kết quả được dẫn bằng 就; 才 nhấn hạn chế khác.', 'Phân biệt “chỉ cần” với “chỉ khi”; không đồng nhất 只要 và 只有.'),
  draft('zhiyou', '4', 'Điều kiện cần với 只有', '只有 + điều kiện，才 + kết quả',
    'Nhấn phải có điều kiện mới có kết quả; không bảo đảm chỉ có điều kiện đó là đủ.',
    '只有预约以后，___能进去。', '才', ['才', '的', '过'], [
      example('只有预约以后，才能进去。', 'Zhǐyǒu yùyuē yǐhòu, cái néng jìnqù.', 'Chỉ sau khi đặt trước mới có thể vào.', 'You can enter only after making a reservation.', ['只有', '预约', '以后', '才', '能', '进去']),
      example('只有认真检查，才能发现这些错误。', 'Zhǐyǒu rènzhēn jiǎnchá, cái néng fāxiàn zhèxiē cuòwù.', 'Chỉ khi kiểm tra kỹ mới phát hiện được những lỗi này.', 'Only by checking carefully can you find these errors.', ['只有', '认真', '检查', '才', '能', '发现', '这些', '错误']),
    ], '只要预约以后，才能进去。', '只有预约以后，才能进去。', 'Ý bài là điều kiện cần, dùng cặp 只有…才….', '“Chỉ khi…mới…” hạn chế khả năng, không phải “chỉ cần…là…”.'),
  draft('chule-hai', '4', 'Bổ sung ngoài một mục', '除了 + A + 以外，还 + B',
    'Với 还/也, 除了 nêu mục đã có rồi bổ sung mục khác. Với 都, nó có thể mang ý ngoại trừ; xem vế sau.',
    '除了中文以外，她___会说越南语。', '还', ['还', '却', '才'], [
      example('除了中文以外，她还会说越南语。', 'Chúle Zhōngwén yǐwài, tā hái huì shuō Yuènányǔ.', 'Ngoài tiếng Trung, cô ấy còn nói được tiếng Việt.', 'Besides Chinese, she also speaks Vietnamese.', ['除了', '中文', '以外', '她', '还', '会', '说', '越南语']),
      example('除了买书以外，我还买了一支笔。', 'Chúle mǎi shū yǐwài, wǒ hái mǎi le yì zhī bǐ.', 'Ngoài mua sách, tôi còn mua một cây bút.', 'Besides buying books, I also bought a pen.', ['除了', '买', '书', '以外', '我', '还', '买', '了', '一', '支', '笔']),
    ], '除了中文，她还越南语会说。', '除了中文，她还会说越南语。', '会 đứng trước động từ 说; tân ngữ ngôn ngữ sau 说.', '“Ngoài” có thể bổ sung hoặc loại trừ; không dịch một nghĩa cố định.'),
  draft('lian-ye', '4', 'Ngay cả trường hợp cực đoan', '连 + đối tượng + 都/也 + vị ngữ',
    'Đưa trường hợp người nói cho là bất ngờ/cực đoan lên làm tiêu điểm. 连 không chỉ đơn giản liệt kê thêm một mục.',
    '___小孩子都知道这件事。', '连', ['连', '把', '被'], [
      example('连小孩子都知道这件事。', 'Lián xiǎoháizi dōu zhīdao zhè jiàn shì.', 'Ngay cả trẻ nhỏ cũng biết chuyện này.', 'Even small children know about this.', ['连', '小孩子', '都', '知道', '这', '件', '事']),
      example('他连一杯水也没喝。', 'Tā lián yì bēi shuǐ yě méi hē.', 'Anh ấy đến một cốc nước cũng chưa uống.', 'He has not even had a glass of water.', ['他', '连', '一', '杯', '水', '也', '没', '喝']),
    ], '小孩子连都知道这件事。', '连小孩子都知道这件事。', '连 đứng trước phần được nhấn 小孩子.', '“Ngay cả” đi cùng tiêu điểm; “cũng” nằm trước vị ngữ, không đặt tùy ý.'),
  draft('ningke', '5', 'Ưu tiên dù chịu thiệt', '宁可 + A，也不 + B',
    'Chọn A dù tốn công/không lý tưởng, nhất quyết không chọn B. Không chỉ là so sánh chất lượng khách quan.',
    '我___走路，也不坐这辆车。', '宁可', ['宁可', '不但', '由于'], [
      example('我宁可走路，也不坐这辆车。', 'Wǒ nìngkě zǒulù, yě bù zuò zhè liàng chē.', 'Tôi thà đi bộ chứ không đi chiếc xe này.', 'I would rather walk than take this vehicle.', ['我', '宁可', '走路', '也', '不', '坐', '这', '辆', '车']),
      example('她宁可少睡一会儿，也不愿错过日出。', 'Tā nìngkě shǎo shuì yíhuìr, yě bú yuàn cuòguò rìchū.', 'Cô ấy thà ngủ ít một chút chứ không muốn bỏ lỡ bình minh.', 'She would rather sleep less than miss the sunrise.', ['她', '宁可', '少', '睡', '一会儿', '也', '不', '愿', '错过', '日出']),
    ], '我宁可走路，也坐这辆车。', '我宁可走路，也不坐这辆车。', 'Thiếu 不 làm mất ý từ chối B trong ngữ cảnh “thà đi bộ”.', 'Giữ ý “thà A chứ không B”, không dùng 与其…不如… với thứ tự lựa chọn đảo ngược.'),
  draft('yi-jiu', '5', 'Ngay khi… thì…', '一 + hành động A，就 + hành động B',
    'Hai việc nối sát nhau hoặc B thường xảy ra mỗi khi A xảy ra. 一 ở đây không phải số lượng “một”.',
    '他___到家就给我打电话。', '一', ['一', '的', '过'], [
      example('他一到家就给我打电话。', 'Tā yí dào jiā jiù gěi wǒ dǎ diànhuà.', 'Anh ấy vừa về đến nhà là gọi cho tôi.', 'He calls me as soon as he gets home.', ['他', '一', '到', '家', '就', '给', '我', '打', '电话']),
      example('我一听到这首歌就想起了家乡。', 'Wǒ yì tīng dào zhè shǒu gē jiù xiǎng qǐ le jiāxiāng.', 'Vừa nghe bài hát này, tôi liền nhớ quê nhà.', 'As soon as I heard this song, I thought of my hometown.', ['我', '一', '听', '到', '这', '首', '歌', '就', '想', '起', '了', '家乡']),
    ], '他一到家给我就打电话。', '他一到家就给我打电话。', '就 dẫn toàn bộ vế kết quả 给我打电话.', '“Vừa…là…” chỉ quan hệ sát nhau, không phải 一边…一边… đồng thời.'),
  draft('budebu', '5', 'Buộc phải làm', 'Chủ ngữ + 不得不 + động từ',
    'Hoàn cảnh khiến không có lựa chọn khác. Hai chữ 不 tạo ý bắt buộc, không phải phủ định việc làm.',
    '因为末班车已经开走了，我们___走回家。', '不得不', ['不得不', '不必', '未必'], [
      example('因为末班车已经开走了，我们不得不走回家。', 'Yīnwèi mòbānchē yǐjīng kāi zǒu le, wǒmen bùdébù zǒu huí jiā.', 'Vì chuyến xe cuối đã đi, chúng tôi đành đi bộ về nhà.', 'The last bus had left, so we had to walk home.', ['因为', '末班车', '已经', '开', '走', '了', '我们', '不得不', '走', '回', '家']),
      example('由于身体不舒服，她不得不取消旅行。', 'Yóuyú shēntǐ bù shūfu, tā bùdébù qǔxiāo lǚxíng.', 'Vì không khỏe, cô ấy buộc phải hủy chuyến đi.', 'She had to cancel the trip because she felt unwell.', ['由于', '身体', '不', '舒服', '她', '不得不', '取消', '旅行']),
    ], '我们不得不不走回家。', '我们不得不走回家。', 'Thêm 不 trước 走 đảo ý thành buộc phải không đi.', 'Dịch cả cụm thành “đành/phải”, không dịch từng 不 thành “không”.'),
  draft('chufei', '5', 'Ngoại lệ với 除非', '除非 + ngoại lệ，否则 + kết quả',
    'Kết quả vế sau sẽ xảy ra nếu ngoại lệ không được đáp ứng. Cần kiểm tra cực tính cả hai vế.',
    '除非你现在出发，___会迟到。', '否则', ['否则', '而且', '因此'], [
      example('除非你现在出发，否则会迟到。', 'Chúfēi nǐ xiànzài chūfā, fǒuzé huì chídào.', 'Trừ khi bạn đi ngay, nếu không sẽ muộn.', 'Unless you leave now, you will be late.', ['除非', '你', '现在', '出发', '否则', '会', '迟到']),
      example('除非下大雨，否则我们明天照常上课。', 'Chúfēi xià dàyǔ, fǒuzé wǒmen míngtiān zhàocháng shàngkè.', 'Trừ khi mưa to, nếu không ngày mai chúng tôi vẫn học như thường.', 'Unless it rains heavily, we will have class as usual tomorrow.', ['除非', '下', '大雨', '否则', '我们', '明天', '照常', '上课']),
    ], '除非你现在出发，否则不会迟到。', '除非你现在出发，否则会迟到。', 'Trong tình huống phải đi ngay để kịp giờ, 不会 làm đảo kết quả mong muốn.', '“Trừ khi” nêu ngoại lệ, không đồng nghĩa trực tiếp với “nếu”.'),
  draft('shangqie', '6', 'Lập luận tăng cấp', 'A + 尚且 + kết quả，B + 更/何况…',
    '尚且 nêu trường hợp đã khó hoặc đáng chú ý, từ đó suy ra trường hợp khác còn hơn. Phải có quan hệ tăng cấp hợp lý.',
    '大人___觉得难，孩子就更不用说了。', '尚且', ['尚且', '的', '把'], [
      example('大人尚且觉得难，孩子就更不用说了。', 'Dàrén shàngqiě juéde nán, háizi jiù gèng bú yòng shuō le.', 'Người lớn còn thấy khó, trẻ em thì càng không cần nói.', 'Even adults find it difficult, let alone children.', ['大人', '尚且', '觉得', '难', '孩子', '就', '更', '不用', '说', '了']),
      example('他尚且不懂，我就更不懂了。', 'Tā shàngqiě bù dǒng, wǒ jiù gèng bù dǒng le.', 'Ngay anh ấy còn không hiểu, tôi thì càng không hiểu.', 'Even he does not understand; I understand even less.', ['他', '尚且', '不', '懂', '我', '就', '更', '不', '懂', '了']),
    ], '大人尚且觉得难，孩子就更容易了。', '大人尚且觉得难，孩子就更不用说了。', 'Nếu đang lập luận trẻ có ít kinh nghiệm hơn, kết luận “dễ hơn” trái chiều suy luận.', 'Đây là lập luận “đến…còn…, huống chi…”, không chỉ nối hai sự thật.'),
  draft('yimian', '6', 'Tránh kết quả không mong muốn', 'Hành động phòng ngừa，以免 + hậu quả',
    '以免 dẫn hậu quả cần tránh. Vế trước thường là lời khuyên hoặc biện pháp phòng ngừa.',
    '请提前出发，___迟到。', '以免', ['以免', '从而', '而且'], [
      example('请提前出发，以免迟到。', 'Qǐng tíqián chūfā, yǐmiǎn chídào.', 'Hãy đi sớm để tránh đến muộn.', 'Please leave early to avoid being late.', ['请', '提前', '出发', '以免', '迟到']),
      example('请保存文件，以免丢失数据。', 'Qǐng bǎocún wénjiàn, yǐmiǎn diūshī shùjù.', 'Hãy lưu tệp để tránh mất dữ liệu.', 'Please save the file to avoid losing data.', ['请', '保存', '文件', '以免', '丢失', '数据']),
    ], '请提前出发，以免不迟到。', '请提前出发，以免迟到。', 'Hậu quả cần tránh là 迟到; thêm 不 đổi thành tránh việc không muộn.', '“Để khỏi” đã có nghĩa tránh; không thêm phủ định máy móc vào vế Trung.'),
  draft('conger', '6', 'Kết quả kéo theo', 'Biện pháp/quá trình，从而 + kết quả',
    '从而 nêu kết quả được tạo ra bởi việc/quá trình trước đó, thường dùng trong giải thích văn viết.',
    '我们改进了流程，___节省了时间。', '从而', ['从而', '以免', '尽管'], [
      example('我们改进了流程，从而节省了时间。', 'Wǒmen gǎijìn le liúchéng, cóng ér jiéshěng le shíjiān.', 'Chúng tôi cải tiến quy trình, nhờ đó tiết kiệm thời gian.', 'We improved the process and thereby saved time.', ['我们', '改进', '了', '流程', '从而', '节省', '了', '时间']),
      example('他每天练习，从而逐渐提高了口语水平。', 'Tā měi tiān liànxí, cóng ér zhújiàn tígāo le kǒuyǔ shuǐpíng.', 'Anh ấy luyện mỗi ngày, nhờ đó dần nâng trình độ nói.', 'He practised every day and thereby gradually improved his speaking.', ['他', '每天', '练习', '从而', '逐渐', '提高', '了', '口语', '水平']),
    ], '从而节省了时间，我们改进了流程。', '我们改进了流程，从而节省了时间。', 'Biện pháp đi trước; 从而 mở kết quả, không mở nguyên nhân.', '“Nhờ đó” nối kết quả với quá trình trước, không phải cứ “và” là dùng 从而.'),
  draft('yidan', '6', 'Một khi điều kiện được kích hoạt', '一旦 + điều kiện，就 + kết quả',
    '一旦 đặt một thời điểm/điều kiện quan trọng: khi điều đó xảy ra, hệ quả theo sau. Không tự khẳng định nó đã xảy ra.',
    '___发现问题，就请立即联系我。', '一旦', ['一旦', '尽管', '不但'], [
      example('一旦发现问题，就请立即联系我。', 'Yídàn fāxiàn wèntí, jiù qǐng lìjí liánxì wǒ.', 'Một khi phát hiện vấn đề, hãy liên hệ tôi ngay.', 'If you find a problem, please contact me immediately.', ['一旦', '发现', '问题', '就', '请', '立即', '联系', '我']),
      example('一旦错过末班车，就只能走回家了。', 'Yídàn cuòguò mòbānchē, jiù zhǐ néng zǒu huí jiā le.', 'Một khi lỡ chuyến xe cuối, chỉ còn cách đi bộ về nhà.', 'Once you miss the last bus, you can only walk home.', ['一旦', '错过', '末班车', '就', '只', '能', '走', '回', '家', '了']),
    ], '一旦发现问题，请就立即联系我。', '一旦发现问题，就请立即联系我。', 'Trong mẫu này 就 mở toàn bộ vế yêu cầu 请立即联系我.', '“Một khi” đặt ngưỡng điều kiện; không có nghĩa là số lần “một lần”.'),
];

/** Read-only editorial queue: returning a draft does not authorize learner publication. */
export function listGrammarV5ReviewQueue(band?: string): readonly GrammarV5Draft[] {
  return validateGrammarV5DraftPack(grammarV5Expansion).filter((point) => !band || point.hsk === band);
}

export const advancedGrammarV5Plan = {
  band: '7-9', reviewStatus: 'PENDING', requiredPoints: null, verifiedPoints: [],
  prerequisites: ['Licensed versioned reference', 'Independent Chinese-language reviewer',
    'Vietnamese pedagogy review', 'Rights and provenance evidence', 'Explicit publication approval'],
} as const;
