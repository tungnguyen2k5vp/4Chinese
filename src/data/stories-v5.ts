import { z } from 'zod';

import { qualitySensitiveContentVisible } from '../services/content/review-workflow';

const text = z.string().trim().min(1).max(4000);
const id = z.string().regex(/^story-[a-z0-9-]{3,100}$/u);
const reviewSchema = z.object({
  id, revision: z.int().nonnegative(), state: z.enum(['DRAFT', 'PENDING_REVIEW', 'REVIEWED', 'VERIFIED', 'PUBLISHED', 'DEPRECATED']),
  origin: z.enum(['ORIGINAL', 'AI_ASSISTED', 'LICENSED']),
  evidence: z.object({ reviewer: text, reviewedAt: text, reviewNotes: text, sourceRef: text,
    licenseEvidence: text, verificationEvidence: text.optional() }).optional(),
});
export const storyDraftSchema = z.object({
  id, title: text, description: text, level: z.enum(['1', '2', '3', '4', '5', '6', '7-9']),
  levelBasis: z.literal('EDITORIAL_ESTIMATE_NOT_OFFICIAL'), minutes: z.int().min(1).max(60),
  characters: z.array(text).min(1).max(10), targetWords: z.array(text).min(2).max(30),
  grammarTargets: z.array(text).min(1).max(15), review: reviewSchema,
  sentences: z.array(z.object({ hanzi: text, pinyin: text, translationVi: text })).min(4).max(100),
  questions: z.array(z.object({ promptVi: text, choices: z.array(text).length(3),
    answer: z.int().min(0).max(2), evidenceSentence: z.int().nonnegative(), explanationVi: text })).length(3),
}).superRefine((story, ctx) => {
  if (story.review.id !== story.id) ctx.addIssue({ code: 'custom', message: 'STORY_REVIEW_ID_MISMATCH' });
  const chinese = story.sentences.map((s) => s.hanzi).join('');
  for (const word of story.targetWords) if (!chinese.includes(word)) {
    ctx.addIssue({ code: 'custom', message: `STORY_TARGET_NOT_IN_TEXT:${word}` });
  }
  for (const sentence of story.sentences) {
    if (!/\p{Script=Han}/u.test(sentence.hanzi) || !/[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/iu.test(sentence.pinyin)) {
      ctx.addIssue({ code: 'custom', message: 'STORY_SENTENCE_ALIGNMENT_REQUIRED' });
    }
  }
  for (const q of story.questions) if (q.evidenceSentence >= story.sentences.length || new Set(q.choices).size !== 3) {
    ctx.addIssue({ code: 'custom', message: 'STORY_QUESTION_INVALID' });
  }
});
export type StoryDraft = z.infer<typeof storyDraftSchema>;

/** Structural validation is not linguistic review, official leveling, or reviewer authentication. */
export function validateStoryPreview(input: unknown): StoryDraft { return storyDraftSchema.parse(input); }
export function validatePublishedStoryPack(input: unknown): StoryDraft[] {
  const stories = z.array(storyDraftSchema).min(1).max(100).parse(input);
  if (new Set(stories.map((s) => s.id)).size !== stories.length) throw new Error('DUPLICATE_STORY_ID');
  if (stories.some((s) => !qualitySensitiveContentVisible(s.review))) throw new Error('STORY_PUBLICATION_GATE_REQUIRED');
  return stories;
}

type Sentence = [hanzi: string, pinyin: string, translationVi: string];
type Question = [promptVi: string, choices: [string, string, string], answer: number, evidenceSentence: number, explanationVi: string];
function draft(key: string, level: StoryDraft['level'], title: string, description: string,
  targetWords: string[], grammarTargets: string[], lines: Sentence[], questions: Question[]): StoryDraft {
  const storyId = `story-v5-${key}`;
  return validateStoryPreview({ id: storyId, level, title, description, targetWords, grammarTargets,
    levelBasis: 'EDITORIAL_ESTIMATE_NOT_OFFICIAL', minutes: level === '7-9' ? 8 : Number(level) + 2,
    characters: ['小明', '小雨'], review: { id: storyId, revision: 0, state: 'DRAFT', origin: 'AI_ASSISTED' },
    sentences: lines.map(([hanzi, pinyin, translationVi]) => ({ hanzi, pinyin, translationVi })),
    questions: questions.map(([promptVi, choices, answer, evidenceSentence, explanationVi]) =>
      ({ promptVi, choices, answer, evidenceSentence, explanationVi })),
  });
}

/** Original recurring-character micro-stories. All 14 are AI-assisted, UNREVIEWED drafts; never seeded. */
export const storiesV5Drafts: readonly StoryDraft[] = [
  draft('tea', '1', 'Hai cốc trà', 'Tiểu Minh và Tiểu Vũ nghỉ sau giờ học.', ['喝', '茶', '水'], ['想 + động từ', '也 + động từ'], [
    ['小明和小雨是朋友。', 'Xiǎo Míng hé Xiǎo Yǔ shì péngyou.', 'Tiểu Minh và Tiểu Vũ là bạn.'],
    ['今天他们在小明家。', 'Jīntiān tāmen zài Xiǎo Míng jiā.', 'Hôm nay họ ở nhà Tiểu Minh.'],
    ['小雨想喝茶，小明也想喝茶。', 'Xiǎo Yǔ xiǎng hē chá, Xiǎo Míng yě xiǎng hē chá.', 'Tiểu Vũ muốn uống trà, Tiểu Minh cũng muốn uống trà.'],
    ['妈妈说：“水很热，等一下。”', 'Māma shuō: “Shuǐ hěn rè, děng yíxià.”', 'Mẹ nói: “Nước nóng lắm, đợi một chút.”'],
    ['他们喝茶，也吃苹果。', 'Tāmen hē chá, yě chī píngguǒ.', 'Họ uống trà và ăn táo.'],
  ], [
    ['Hai bạn đang ở đâu?', ['Nhà Tiểu Vũ', 'Nhà Tiểu Minh', 'Trường học'], 1, 1, 'Câu thứ hai nêu nhà Tiểu Minh.'],
    ['Tiểu Vũ muốn uống gì?', ['Trà', 'Sữa', 'Cà phê'], 0, 2, 'Tiểu Vũ nói muốn uống trà.'],
    ['Vì sao mẹ bảo đợi?', ['Táo chưa rửa', 'Tiểu Minh chưa về', 'Nước rất nóng'], 2, 3, 'Mẹ nói nước rất nóng.'],
  ]),
  draft('books', '1', 'Sách trên bàn', 'Hai người bạn chọn sách để đọc.', ['书', '桌子', '看'], ['địa điểm + 有', '这 / 那'], [
    ['小明的桌子上有两本书。', 'Xiǎo Míng de zhuōzi shàng yǒu liǎng běn shū.', 'Trên bàn Tiểu Minh có hai quyển sách.'],
    ['这本书是小明的，那本书是小雨的。', 'Zhè běn shū shì Xiǎo Míng de, nà běn shū shì Xiǎo Yǔ de.', 'Quyển này của Tiểu Minh, quyển kia của Tiểu Vũ.'],
    ['小雨说：“我们一起看书吧。”', 'Xiǎo Yǔ shuō: “Wǒmen yìqǐ kàn shū ba.”', 'Tiểu Vũ nói: “Chúng mình cùng đọc sách nhé.”'],
    ['小明说：“好，我喜欢这本书。”', 'Xiǎo Míng shuō: “Hǎo, wǒ xǐhuan zhè běn shū.”', 'Tiểu Minh nói: “Được, mình thích quyển này.”'],
  ], [
    ['Trên bàn có mấy quyển sách?', ['Một', 'Ba', 'Hai'], 2, 0, '两本书 nghĩa là hai quyển sách.'],
    ['Quyển kia thuộc về ai?', ['Tiểu Vũ', 'Mẹ', 'Thầy giáo'], 0, 1, '那本书是小雨的 nêu chủ sở hữu.'],
    ['Tiểu Vũ đề nghị làm gì?', ['Mua bàn', 'Cùng đọc sách', 'Uống trà'], 1, 2, '一起看书 là cùng đọc sách.'],
  ]),
  draft('bus', '2', 'Đợi ở cửa đông', 'Hai bạn đổi cách đi công viên khi trời mưa.', ['公园', '下雨', '公共汽车'], ['因为…所以…', '先…再…'], [
    ['星期六，小明和小雨想去公园。', 'Xīngqīliù, Xiǎo Míng hé Xiǎo Yǔ xiǎng qù gōngyuán.', 'Thứ bảy, Tiểu Minh và Tiểu Vũ muốn đi công viên.'],
    ['因为早上下雨，所以他们不骑自行车。', 'Yīnwèi zǎoshang xià yǔ, suǒyǐ tāmen bù qí zìxíngchē.', 'Vì buổi sáng mưa nên họ không đi xe đạp.'],
    ['他们先坐公共汽车，再走到公园东门。', 'Tāmen xiān zuò gōnggòng qìchē, zài zǒu dào gōngyuán dōngmén.', 'Họ đi xe buýt trước, rồi đi bộ đến cửa đông công viên.'],
    ['小明买了两瓶水，小雨在门口等他。', 'Xiǎo Míng mǎi le liǎng píng shuǐ, Xiǎo Yǔ zài ménkǒu děng tā.', 'Tiểu Minh mua hai chai nước, Tiểu Vũ đợi ở cửa.'],
    ['十点的时候，雨停了，他们一起进去。', 'Shí diǎn de shíhou, yǔ tíng le, tāmen yìqǐ jìnqù.', 'Lúc mười giờ, mưa tạnh và họ cùng đi vào.'],
  ], [
    ['Vì sao họ không đi xe đạp?', ['Trời mưa', 'Xe bị mất', 'Công viên đóng cửa'], 0, 1, 'Câu hai nêu nguyên nhân là mưa.'],
    ['Họ đến cửa nào?', ['Cửa nam', 'Cửa đông', 'Cửa tây'], 1, 2, '东门 là cửa đông.'],
    ['Mưa tạnh lúc nào?', ['Chín giờ', 'Mười hai giờ', 'Mười giờ'], 2, 4, '十点 là mười giờ.'],
  ]),
  draft('noodles', '2', 'Bát mì không cay', 'Tiểu Minh gọi món cho hai người bạn.', ['面条', '辣', '服务员'], ['比 + so sánh', '不要 + tân ngữ'], [
    ['中午，小明和小雨在学校旁边吃饭。', 'Zhōngwǔ, Xiǎo Míng hé Xiǎo Yǔ zài xuéxiào pángbiān chī fàn.', 'Buổi trưa, hai bạn ăn cạnh trường.'],
    ['小雨想吃面条，但是她不能吃辣的。', 'Xiǎo Yǔ xiǎng chī miàntiáo, dànshì tā bù néng chī là de.', 'Tiểu Vũ muốn ăn mì nhưng không ăn được đồ cay.'],
    ['小明对服务员说：“两碗面条，一碗不要辣椒。”', 'Xiǎo Míng duì fúwùyuán shuō: “Liǎng wǎn miàntiáo, yì wǎn bú yào làjiāo.”', 'Tiểu Minh nói với phục vụ: “Hai bát mì, một bát không cho ớt.”'],
    ['小雨的面条比小明的少一点儿。', 'Xiǎo Yǔ de miàntiáo bǐ Xiǎo Míng de shǎo yìdiǎnr.', 'Mì của Tiểu Vũ ít hơn của Tiểu Minh một chút.'],
    ['吃完以后，他们一起回学校。', 'Chī wán yǐhòu, tāmen yìqǐ huí xuéxiào.', 'Ăn xong, họ cùng về trường.'],
  ], [
    ['Tiểu Vũ không ăn được gì?', ['Mì', 'Đồ cay', 'Rau'], 1, 1, '她不能吃辣的 nói cô không ăn được đồ cay.'],
    ['Tiểu Minh gọi bao nhiêu bát mì?', ['Ba bát', 'Một bát', 'Hai bát'], 2, 2, '两碗 là hai bát.'],
    ['Ăn xong họ đi đâu?', ['Về trường', 'Đến công viên', 'Đến nhà ga'], 0, 4, '回学校 là về trường.'],
  ]),
  draft('umbrella', '3', 'Chiếc ô có tên', 'Một dấu hiệu nhỏ giúp tìm lại người mất ô.', ['雨伞', '名字', '发现'], ['把 + tân ngữ + động từ', '一边…一边…'], [
    ['下课后，小明发现教室里还放着一把雨伞。', 'Xià kè hòu, Xiǎo Míng fāxiàn jiàoshì lǐ hái fàng zhe yì bǎ yǔsǎn.', 'Tan học, Tiểu Minh thấy trong lớp còn một chiếc ô.'],
    ['小雨把雨伞拿起来，看见上面写着小明的名字。', 'Xiǎo Yǔ bǎ yǔsǎn ná qǐlái, kànjiàn shàngmian xiě zhe Xiǎo Míng de míngzi.', 'Tiểu Vũ nhấc ô lên, thấy bên trên ghi tên Tiểu Minh.'],
    ['小明笑了，原来是自己昨天忘在这里的。', 'Xiǎo Míng xiào le, yuánlái shì zìjǐ zuótiān wàng zài zhèlǐ de.', 'Tiểu Minh bật cười: hóa ra chính mình đã bỏ quên ở đây hôm qua.'],
    ['外面又下雨了，两个人一边走一边聊。', 'Wàimian yòu xià yǔ le, liǎng ge rén yìbiān zǒu yìbiān liáo.', 'Ngoài trời lại mưa, hai người vừa đi vừa trò chuyện.'],
    ['这次，小明到家后马上把伞放进书包。', 'Zhè cì, Xiǎo Míng dào jiā hòu mǎshàng bǎ sǎn fàng jìn shūbāo.', 'Lần này về nhà, Tiểu Minh cất ngay ô vào cặp.'],
  ], [
    ['Ai sở hữu chiếc ô?', ['Tiểu Vũ', 'Thầy giáo', 'Tiểu Minh'], 2, 1, 'Trên ô ghi tên Tiểu Minh.'],
    ['Chiếc ô bị quên khi nào?', ['Hôm qua', 'Tuần trước', 'Sáng nay'], 0, 2, '昨天 nghĩa là hôm qua.'],
    ['Về nhà, Tiểu Minh cất ô ở đâu?', ['Dưới bàn', 'Trong cặp', 'Ngoài cửa'], 1, 4, '放进书包 là cất vào cặp.'],
  ]),
  draft('recording', '3', 'Bản ghi âm thứ hai', 'Hai bạn sửa một thông báo cho dễ nghe.', ['录音', '清楚', '通知'], ['虽然…但是…', 'động từ + 得 + bổ ngữ'], [
    ['老师请小明和小雨为读书活动录一段通知。', 'Lǎoshī qǐng Xiǎo Míng hé Xiǎo Yǔ wèi dúshū huódòng lù yí duàn tōngzhī.', 'Thầy nhờ hai bạn thu một thông báo cho hoạt động đọc sách.'],
    ['第一次录音时，小明说得太快，时间和地点都听不清楚。', 'Dì yī cì lùyīn shí, Xiǎo Míng shuō de tài kuài, shíjiān hé dìdiǎn dōu tīng bù qīngchu.', 'Ở lần thu đầu, Tiểu Minh nói quá nhanh nên không nghe rõ giờ và địa điểm.'],
    ['小雨建议先写下来，再慢慢读。', 'Xiǎo Yǔ jiànyì xiān xiě xiàlái, zài mànmàn dú.', 'Tiểu Vũ đề nghị viết ra trước rồi đọc chậm.'],
    ['虽然第二次录了很久，但是每一句都清楚多了。', 'Suīrán dì èr cì lù le hěn jiǔ, dànshì měi yí jù dōu qīngchu duō le.', 'Tuy lần thứ hai thu khá lâu nhưng từng câu rõ hơn nhiều.'],
    ['老师听完后，让他们把这段录音发给同学。', 'Lǎoshī tīng wán hòu, ràng tāmen bǎ zhè duàn lùyīn fā gěi tóngxué.', 'Nghe xong, thầy bảo họ gửi bản ghi cho các bạn.'],
  ], [
    ['Vấn đề của bản thu đầu là gì?', ['Nói quá nhanh', 'Không có micro', 'Sai ngôn ngữ'], 0, 1, 'Câu hai nêu nói quá nhanh khiến giờ và nơi không rõ.'],
    ['Tiểu Vũ đề nghị gì?', ['Bỏ thông báo', 'Viết trước rồi đọc chậm', 'Chỉ gửi ảnh'], 1, 2, '先写下来，再慢慢读 là viết trước rồi đọc chậm.'],
    ['Thầy muốn gửi bản thu cho ai?', ['Phụ huynh', 'Nhân viên thư viện', 'Các bạn học'], 2, 4, '发给同学 là gửi cho các bạn học.'],
  ]),
  draft('repair', '4', 'Sửa hay mua mới?', 'Hai bạn cân nhắc sửa chiếc đèn của góc đọc sách.', ['台灯', '修理', '预算'], ['与其…不如…', '不仅…还…'], [
    ['社区的阅读角刚开放，台灯却突然坏了。', 'Shèqū de yuèdú jiǎo gāng kāifàng, táidēng què tūrán huài le.', 'Góc đọc của khu dân cư vừa mở thì đèn bàn bất ngờ hỏng.'],
    ['小明想买新的，小雨却提醒他，活动预算只剩一百元。', 'Xiǎo Míng xiǎng mǎi xīn de, Xiǎo Yǔ què tíxǐng tā, huódòng yùsuàn zhǐ shèng yì bǎi yuán.', 'Tiểu Minh muốn mua mới, nhưng Tiểu Vũ nhắc ngân sách chỉ còn một trăm tệ.'],
    ['他们请修理师傅检查，原来只是开关接触不好。', 'Tāmen qǐng xiūlǐ shīfu jiǎnchá, yuánlái zhǐ shì kāiguān jiēchù bù hǎo.', 'Họ nhờ thợ kiểm tra, hóa ra chỉ là công tắc tiếp xúc kém.'],
    ['小雨说，与其花钱换灯，不如先花二十元修好。', 'Xiǎo Yǔ shuō, yǔqí huā qián huàn dēng, bùrú xiān huā èrshí yuán xiū hǎo.', 'Tiểu Vũ nói: thay vì bỏ tiền đổi đèn, nên sửa với hai mươi tệ trước.'],
    ['这次修理不仅省了钱，还让小明学会先查原因。', 'Zhè cì xiūlǐ bùjǐn shěng le qián, hái ràng Xiǎo Míng xuéhuì xiān chá yuányīn.', 'Lần sửa này vừa tiết kiệm tiền vừa giúp Tiểu Minh học cách tìm nguyên nhân trước.'],
  ], [
    ['Ngân sách còn bao nhiêu?', ['Hai mươi tệ', 'Một trăm tệ', 'Hai trăm tệ'], 1, 1, '预算只剩一百元 nêu số tiền còn lại.'],
    ['Bộ phận nào gặp vấn đề?', ['Bóng đèn cháy', 'Chân đèn gãy', 'Công tắc tiếp xúc kém'], 2, 2, '开关接触不好 là công tắc tiếp xúc không tốt.'],
    ['Tiểu Minh học được gì?', ['Tìm nguyên nhân trước', 'Luôn mua mới', 'Không dùng đèn nữa'], 0, 4, 'Câu cuối nêu bài học kiểm tra nguyên nhân.'],
  ]),
  draft('schedule', '4', 'Đổi giờ đọc sách', 'Lắng nghe người đi làm giúp hai bạn chỉnh kế hoạch.', ['安排', '参加', '意见'], ['即使…也…', '根据 + danh từ'], [
    ['小明把社区读书会安排在星期五下午三点。', 'Xiǎo Míng bǎ shèqū dúshūhuì ānpái zài xīngqīwǔ xiàwǔ sān diǎn.', 'Tiểu Minh xếp buổi đọc sách cộng đồng lúc ba giờ chiều thứ sáu.'],
    ['小雨发现，报名的居民大多还在上班，无法准时参加。', 'Xiǎo Yǔ fāxiàn, bàomíng de jūmín dàduō hái zài shàng bān, wúfǎ zhǔnshí cānjiā.', 'Tiểu Vũ thấy phần lớn cư dân đăng ký còn đang đi làm nên không thể dự đúng giờ.'],
    ['即使海报已经印好，他们也决定先听听大家的意见。', 'Jíshǐ hǎibào yǐjīng yìn hǎo, tāmen yě juédìng xiān tīngting dàjiā de yìjiàn.', 'Dù áp phích đã in xong, họ vẫn quyết định nghe ý kiến mọi người trước.'],
    ['根据问卷结果，他们把时间改为星期六上午十点。', 'Gēnjù wènjuàn jiéguǒ, tāmen bǎ shíjiān gǎi wéi xīngqīliù shàngwǔ shí diǎn.', 'Dựa vào kết quả bảng hỏi, họ đổi sang mười giờ sáng thứ bảy.'],
    ['小明在旧海报旁贴上说明，小雨给报名的人逐一发消息。', 'Xiǎo Míng zài jiù hǎibào páng tiē shàng shuōmíng, Xiǎo Yǔ gěi bàomíng de rén zhúyī fā xiāoxi.', 'Tiểu Minh dán thông báo cạnh áp phích cũ, Tiểu Vũ nhắn từng người đăng ký.'],
  ], [
    ['Vì sao giờ cũ bất tiện?', ['Phần lớn người đăng ký đang đi làm', 'Thư viện bị đóng', 'Hai bạn đi du lịch'], 0, 1, 'Cư dân còn đang làm việc nên không đến đúng giờ.'],
    ['Giờ mới là khi nào?', ['Chiều chủ nhật', 'Sáng thứ bảy lúc mười giờ', 'Chiều thứ sáu lúc ba giờ'], 1, 3, '星期六上午十点 là mười giờ sáng thứ bảy.'],
    ['Tiểu Vũ báo thay đổi bằng cách nào?', ['Chỉ sửa áp phích', 'Không thông báo', 'Nhắn từng người đăng ký'], 2, 4, '逐一发消息 là gửi tin từng người.'],
  ]),
  draft('survey', '5', 'Những người chưa trả lời', 'Hai bạn nhận ra bảng hỏi trực tuyến bỏ sót một nhóm cư dân.', ['问卷', '样本', '结论'], ['并非…', '只有…才…'], [
    ['小明根据网上问卷宣布，居民普遍支持把旧书屋改成咖啡馆。', 'Xiǎo Míng gēnjù wǎngshàng wènjuàn xuānbù, jūmín pǔbiàn zhīchí bǎ jiù shūwū gǎi chéng kāfēiguǎn.', 'Dựa vào bảng hỏi trực tuyến, Tiểu Minh tuyên bố cư dân nhìn chung ủng hộ đổi phòng sách cũ thành quán cà phê.'],
    ['小雨查看样本后发现，回答者几乎都是年轻人，附近的老人很少上网。', 'Xiǎo Yǔ chákàn yàngběn hòu fāxiàn, huídá zhě jīhū dōu shì niánqīng rén, fùjìn de lǎorén hěn shǎo shàng wǎng.', 'Kiểm tra mẫu, Tiểu Vũ thấy người trả lời gần như toàn người trẻ; người cao tuổi quanh đó ít lên mạng.'],
    ['她提醒小明，没有回答并非没有意见，现有结论可能忽略了这群人的需要。', 'Tā tíxǐng Xiǎo Míng, méiyǒu huídá bìngfēi méiyǒu yìjiàn, xiànyǒu jiélùn kěnéng hūlüè le zhè qún rén de xūyào.', 'Cô nhắc Tiểu Minh rằng không trả lời không có nghĩa là không có ý kiến; kết luận có thể bỏ qua nhu cầu của nhóm này.'],
    ['两人于是带着纸质问卷逐户访问，并保留了不同的意见。', 'Liǎng rén yúshì dài zhe zhǐzhì wènjuàn zhú hù fǎngwèn, bìng bǎoliú le bùtóng de yìjiàn.', 'Thế là hai người mang bảng hỏi giấy đến từng nhà và giữ lại các ý kiến khác nhau.'],
    ['只有了解谁没有被听见，才可能提出更公平的方案。', 'Zhǐyǒu liǎojiě shéi méiyǒu bèi tīngjiàn, cái kěnéng tíchū gèng gōngpíng de fāng’àn.', 'Chỉ khi hiểu tiếng nói của ai chưa được lắng nghe mới có thể đề xuất phương án công bằng hơn.'],
  ], [
    ['Mẫu trực tuyến chủ yếu gồm ai?', ['Người cao tuổi', 'Người trẻ', 'Khách du lịch'], 1, 1, '回答者几乎都是年轻人 nêu người trả lời gần như toàn người trẻ.'],
    ['Theo Tiểu Vũ, không trả lời có nghĩa là gì?', ['Chắc chắn đồng ý', 'Chắc chắn phản đối', 'Không thể suy ra họ không có ý kiến'], 2, 2, '没有回答并非没有意见 bác bỏ việc đồng nhất im lặng với không có ý kiến.'],
    ['Hai người bổ sung khảo sát bằng cách nào?', ['Mang bảng hỏi giấy đến từng nhà', 'Chỉ đăng thêm quảng cáo', 'Xóa ý kiến trái chiều'], 0, 3, 'Câu bốn nêu khảo sát giấy từng hộ và giữ ý kiến khác nhau.'],
  ]),
  draft('credit', '5', 'Tên trên tấm áp phích', 'Hai bạn sửa cách ghi nhận người đóng góp cho triển lãm.', ['贡献', '署名', '承担'], ['既…又…', '不仅仅是…'], [
    ['旧书屋举办照片展，小明负责海报，小雨负责联系居民。', 'Jiù shūwū jǔbàn zhàopiàn zhǎn, Xiǎo Míng fùzé hǎibào, Xiǎo Yǔ fùzé liánxì jūmín.', 'Phòng sách cũ tổ chức triển lãm ảnh; Tiểu Minh lo áp phích, Tiểu Vũ liên hệ cư dân.'],
    ['海报完成后，只有两人的名字，提供照片的居民却没有署名。', 'Hǎibào wánchéng hòu, zhǐyǒu liǎng rén de míngzi, tígōng zhàopiàn de jūmín què méiyǒu shǔmíng.', 'Áp phích hoàn thành chỉ có tên hai bạn, còn cư dân cung cấp ảnh lại không được ghi tên.'],
    ['小明认为居民只是帮忙，小雨却说，贡献不仅仅是设计和组织。', 'Xiǎo Míng rènwéi jūmín zhǐ shì bāngmáng, Xiǎo Yǔ què shuō, gòngxiàn bùjǐn jǐn shì shèjì hé zǔzhī.', 'Tiểu Minh nghĩ cư dân chỉ giúp một tay, nhưng Tiểu Vũ nói đóng góp không chỉ là thiết kế và tổ chức.'],
    ['他们逐一确认居民愿意公开的姓名，也让不愿署名的人保持匿名。', 'Tāmen zhúyī quèrèn jūmín yuànyì gōngkāi de xìngmíng, yě ràng bù yuàn shǔmíng de rén bǎochí nìmíng.', 'Họ xác nhận từng tên cư dân muốn công khai và để người không muốn ghi tên được ẩn danh.'],
    ['新海报既感谢了提供者，又说明了两人承担的具体工作。', 'Xīn hǎibào jì gǎnxiè le tígōng zhě, yòu shuōmíng le liǎng rén chéngdān de jùtǐ gōngzuò.', 'Áp phích mới vừa cảm ơn người cung cấp vừa nêu công việc cụ thể hai bạn đảm nhận.'],
  ], [
    ['Áp phích đầu bỏ sót ai?', ['Người cung cấp ảnh', 'Nhà thiết kế', 'Hai bạn'], 0, 1, 'Cư dân cung cấp ảnh chưa được ghi tên.'],
    ['Họ xử lý người không muốn ghi tên thế nào?', ['Buộc công khai tên', 'Giữ ẩn danh', 'Loại ảnh của họ'], 1, 3, '保持匿名 là giữ ẩn danh.'],
    ['Áp phích mới bổ sung thông tin gì về hai bạn?', ['Thu nhập', 'Điểm học tập', 'Công việc cụ thể đảm nhận'], 2, 4, '承担的具体工作 là công việc cụ thể đã đảm nhận.'],
  ]),
  draft('memory', '6', 'Hai ký ức về một bức ảnh', 'Hai lời kể khác nhau được giữ lại thay vì ép thành một bản.', ['叙述', '矛盾', '核实'], ['未必…', '与其…不如…'], [
    ['为整理社区档案，小明和小雨采访了两位曾在旧书屋工作的老人。', 'Wèi zhěnglǐ shèqū dàng’àn, Xiǎo Míng hé Xiǎo Yǔ cǎifǎng le liǎng wèi céng zài jiù shūwū gōngzuò de lǎorén.', 'Để sắp xếp hồ sơ cộng đồng, hai bạn phỏng vấn hai người cao tuổi từng làm việc ở phòng sách cũ.'],
    ['面对同一张照片，一位说那天是开馆仪式，另一位却坚称是周年纪念。', 'Miànduì tóng yì zhāng zhàopiàn, yí wèi shuō nà tiān shì kāiguǎn yíshì, lìng yí wèi què jiānchēng shì zhōunián jìniàn.', 'Với cùng một ảnh, một người nói đó là lễ mở cửa, người kia khẳng định là lễ kỷ niệm năm.'],
    ['小明想删去相互矛盾的叙述，小雨认为记忆的差异未必意味着有人故意说谎。', 'Xiǎo Míng xiǎng shān qù xiānghù máodùn de xùshù, Xiǎo Yǔ rènwéi jìyì de chāyì wèibì yìwèi zhe yǒu rén gùyì shuō huǎng.', 'Tiểu Minh muốn xóa lời kể mâu thuẫn; Tiểu Vũ cho rằng ký ức khác nhau chưa chắc có nghĩa ai đó cố tình nói dối.'],
    ['与其急着判断谁对谁错，不如查找当年的报纸，核实照片的日期。', 'Yǔqí jí zhe pànduàn shéi duì shéi cuò, bùrú cházhǎo dāngnián de bàozhǐ, héshí zhàopiàn de rìqī.', 'Thay vì vội phân đúng sai, nên tìm báo thời đó để xác minh ngày chụp.'],
    ['在找到证据之前，他们并列保留两种说法，并明确标注尚待核实。', 'Zài zhǎodào zhèngjù zhīqián, tāmen bìngliè bǎoliú liǎng zhǒng shuōfǎ, bìng míngquè biāozhù shàng dài héshí.', 'Trước khi tìm được chứng cứ, họ giữ song song hai lời kể và ghi rõ còn chờ xác minh.'],
  ], [
    ['Hai lời kể khác nhau ở điểm nào?', ['Địa chỉ phòng sách', 'Ảnh chụp lễ mở cửa hay lễ kỷ niệm', 'Tên người chụp'], 1, 1, 'Hai người xác định hai sự kiện khác nhau cho cùng bức ảnh.'],
    ['Tiểu Vũ phản đối suy luận nào?', ['Ký ức khác nhau chứng tỏ có người cố ý nói dối', 'Cần tìm thêm chứng cứ', 'Nên kiểm tra ngày ảnh'], 0, 2, '未必 phủ nhận tính chắc chắn của suy luận về nói dối.'],
    ['Khi chưa có chứng cứ, họ làm gì?', ['Chọn lời kể đầu', 'Xóa cả hai', 'Giữ cả hai và ghi chờ xác minh'], 2, 4, 'Câu cuối nêu giữ song song và đánh dấu chưa xác minh.'],
  ]),
  draft('access', '6', 'Lối vào chưa dành cho tất cả', 'Hai bạn xem lại ý nghĩa của một không gian mở.', ['无障碍', '障碍', '参与'], ['看似…却…', '不是…而是…'], [
    ['书屋改造后被称为“向所有人开放的空间”，小明对此颇为自豪。', 'Shūwū gǎizào hòu bèi chēng wéi “xiàng suǒyǒu rén kāifàng de kōngjiān”, Xiǎo Míng duì cǐ pō wéi zìháo.', 'Sau cải tạo, phòng sách được gọi là “không gian mở cho mọi người”, khiến Tiểu Minh khá tự hào.'],
    ['小雨陪一位使用轮椅的居民来访，才发现门口的台阶仍是无法跨越的障碍。', 'Xiǎo Yǔ péi yí wèi shǐyòng lúnyǐ de jūmín láifǎng, cái fāxiàn ménkǒu de táijiē réng shì wúfǎ kuàyuè de zhàng’ài.', 'Tiểu Vũ đi cùng một cư dân dùng xe lăn, lúc đó mới thấy bậc cửa vẫn là trở ngại không thể vượt qua.'],
    ['看似平等的邀请，却把能否进入的责任留给了来访者。', 'Kàn sì píngděng de yāoqǐng, què bǎ néng fǒu jìnrù de zérèn liú gěi le láifǎng zhě.', 'Lời mời tưởng bình đẳng lại để trách nhiệm có vào được hay không cho người đến.'],
    ['他们请居民参与无障碍改造讨论，而不是替对方决定需要什么。', 'Tāmen qǐng jūmín cānyù wú zhàng’ài gǎizào tǎolùn, ér bú shì tì duìfāng juédìng xūyào shénme.', 'Họ mời cư dân tham gia thảo luận cải tạo tiếp cận, thay vì quyết định hộ nhu cầu của người ấy.'],
    ['小明终于明白，开放不是一句口号，而是需要持续检验的实践。', 'Xiǎo Míng zhōngyú míngbai, kāifàng bú shì yí jù kǒuhào, ér shì xūyào chíxù jiǎnyàn de shíjiàn.', 'Tiểu Minh cuối cùng hiểu rằng mở cửa không phải khẩu hiệu mà là thực hành cần kiểm tra liên tục.'],
  ], [
    ['Trở ngại cụ thể ở lối vào là gì?', ['Cửa khóa', 'Thiếu biển hiệu', 'Bậc cửa'], 2, 1, '门口的台阶 là bậc ở cửa.'],
    ['Họ mời cư dân làm gì?', ['Tham gia thảo luận cải tạo tiếp cận', 'Tự sửa bậc cửa', 'Không đến nữa'], 0, 3, 'Cư dân được mời tham gia thảo luận, không bị quyết định hộ.'],
    ['Tiểu Minh hiểu “mở cửa” là gì?', ['Chỉ một lời mời', 'Thực hành cần kiểm tra liên tục', 'Không cần thay đổi vật chất'], 1, 4, '持续检验的实践 là thực hành cần kiểm nghiệm liên tục.'],
  ]),
  draft('metrics', '7-9', 'Con số và khoảng trống', 'Hai bạn chất vấn cách dùng lượt tham gia để đánh giá phòng sách.', ['指标', '衡量', '量化'], ['倘若…便…', '固然…却…'], [
    ['资助方要求书屋用每月到访人次证明项目成效，小明便把增加客流列为首要目标。', 'Zīzhù fāng yāoqiú shūwū yòng měi yuè dàofǎng réncì zhèngmíng xiàngmù chéngxiào, Xiǎo Míng biàn bǎ zēngjiā kèliú liè wéi shǒuyào mùbiāo.', 'Bên tài trợ yêu cầu dùng lượt ghé thăm hằng tháng chứng minh hiệu quả; Tiểu Minh bèn đặt tăng lượt khách lên hàng đầu.'],
    ['小雨注意到，热闹的讲座挤占了安静阅读的时段，几位长期读者反而不再来了。', 'Xiǎo Yǔ zhùyì dào, rènào de jiǎngzuò jǐzhàn le ānjìng yuèdú de shíduàn, jǐ wèi chángqī dúzhě fǎn’ér bú zài lái le.', 'Tiểu Vũ nhận thấy các buổi nói chuyện náo nhiệt lấn giờ đọc yên tĩnh; vài độc giả lâu năm lại không đến nữa.'],
    ['到访人次固然便于量化，却无法单独衡量一个人是否获得了持续而有意义的支持。', 'Dàofǎng réncì gùrán biànyú liànghuà, què wúfǎ dāndú héngliáng yí ge rén shìfǒu huòdé le chíxù ér yǒu yìyì de zhīchí.', 'Lượt ghé thăm tuy dễ định lượng nhưng không thể tự nó đo xem một người có được hỗ trợ liên tục và có ý nghĩa hay không.'],
    ['倘若指标取代了原本的目的，项目便可能在数字上成功，在实际体验上失败。', 'Tǎngruò zhǐbiāo qǔdài le yuánběn de mùdì, xiàngmù biàn kěnéng zài shùzì shàng chénggōng, zài shíjì tǐyàn shàng shībài.', 'Nếu chỉ số thay thế mục đích ban đầu, dự án có thể thành công trên số liệu nhưng thất bại về trải nghiệm thực.'],
    ['两人保留客流统计，同时补充读者访谈，并在报告中交代两类证据各自的局限。', 'Liǎng rén bǎoliú kèliú tǒngjì, tóngshí bǔchōng dúzhě fǎngtán, bìng zài bàogào zhōng jiāodài liǎng lèi zhèngjù gèzì de júxiàn.', 'Hai người giữ thống kê khách, bổ sung phỏng vấn độc giả và trình bày giới hạn của từng loại chứng cứ trong báo cáo.'],
  ], [
    ['Các buổi nói chuyện gây tác dụng phụ nào?', ['Tăng giờ đọc yên tĩnh', 'Lấn giờ đọc yên tĩnh, khiến vài độc giả lâu năm rời đi', 'Làm mất toàn bộ sách'], 1, 1, 'Câu hai nêu việc lấn giờ đọc và độc giả lâu năm không đến.'],
    ['Tác giả chất vấn điều gì về chỉ số?', ['Mọi số liệu đều vô ích', 'Phỏng vấn luôn chính xác', 'Chỉ số có thể thay thế mục tiêu thực'], 2, 3, 'Điều kiện 倘若 nêu nguy cơ chỉ số thay thế mục đích.'],
    ['Báo cáo cuối sử dụng chứng cứ nào?', ['Thống kê và phỏng vấn, kèm giới hạn', 'Chỉ thống kê khách', 'Chỉ lời khen'], 0, 4, 'Câu cuối kết hợp hai nguồn và công khai giới hạn.'],
  ]),
  draft('consent', '7-9', 'Quyền rút lại lời kể', 'Một người cung cấp tư liệu đổi ý trước khi triển lãm khai mạc.', ['授权', '撤回', '协商'], ['即便…也…', '并不等于…'], [
    ['照片展开幕前，一位居民要求撤回自己曾经授权公开的家庭故事，理由是亲属担心隐私受到侵扰。', 'Zhàopiàn zhǎn kāimù qián, yí wèi jūmín yāoqiú chèhuí zìjǐ céngjīng shòuquán gōngkāi de jiātíng gùshi, lǐyóu shì qīnshǔ dānxīn yǐnsī shòu dào qīnrǎo.', 'Trước khai mạc triển lãm, một cư dân muốn rút lời kể gia đình từng cho phép công khai vì người thân lo bị xâm phạm riêng tư.'],
    ['小明觉得展板已经印好，临时修改会打乱安排；小雨则提醒他，一次授权并不等于永久放弃表达边界。', 'Xiǎo Míng juéde zhǎnbǎn yǐjīng yìn hǎo, línshí xiūgǎi huì dǎluàn ānpái; Xiǎo Yǔ zé tíxǐng tā, yí cì shòuquán bìng bù děngyú yǒngjiǔ fàngqì biǎodá biānjiè.', 'Tiểu Minh thấy bảng trưng bày đã in, sửa gấp sẽ xáo trộn kế hoạch; Tiểu Vũ nhắc một lần cho phép không đồng nghĩa mãi mãi từ bỏ ranh giới biểu đạt.'],
    ['即便这段叙述具有公共价值，也不能把提供者的顾虑简单归结为不配合。', 'Jíbiàn zhè duàn xùshù jùyǒu gōnggòng jiàzhí, yě bù néng bǎ tígōng zhě de gùlǜ jiǎndān guījié wéi bù pèihé.', 'Dù lời kể có giá trị cộng đồng, cũng không thể đơn giản coi lo ngại của người cung cấp là thiếu hợp tác.'],
    ['经过协商，居民同意保留不涉及家庭细节的照片，文字部分暂不展示。', 'Jīngguò xiéshāng, jūmín tóngyì bǎoliú bù shèjí jiātíng xìjié de zhàopiàn, wénzì bùfen zàn bù zhǎnshì.', 'Sau trao đổi, cư dân đồng ý giữ ảnh không liên quan chi tiết gia đình, phần chữ tạm thời không trưng bày.'],
    ['两人把这次调整记入策展记录，承认尊重边界会增加成本，却也是建立信任的一部分。', 'Liǎng rén bǎ zhè cì tiáozhěng jì rù cèzhǎn jìlù, chéngrèn zūnzhòng biānjiè huì zēngjiā chéngběn, què yě shì jiànlì xìnrèn de yí bùfen.', 'Hai người ghi thay đổi vào hồ sơ tổ chức, thừa nhận tôn trọng ranh giới làm tăng chi phí nhưng cũng là một phần xây dựng lòng tin.'],
  ], [
    ['Vì sao cư dân muốn rút lời kể?', ['Người thân lo về riêng tư', 'Ảnh bị mờ', 'Không thích địa điểm'], 0, 0, 'Câu đầu nêu lo ngại riêng tư của người thân.'],
    ['Sau trao đổi, phần nào tạm không trưng bày?', ['Toàn bộ triển lãm', 'Phần chữ', 'Mọi bức ảnh'], 1, 3, '文字部分暂不展示 là tạm không trưng bày phần chữ.'],
    ['Thay đổi được ghi ở đâu?', ['Trong quảng cáo bán vé', 'Chỉ trong trí nhớ', 'Trong hồ sơ tổ chức triển lãm'], 2, 4, '记入策展记录 là ghi vào hồ sơ tổ chức triển lãm.'],
  ]),
];

export function getStoryDraftPreview(storyId: string): StoryDraft | null {
  const found = storiesV5Drafts.find((story) => story.id === storyId);
  return found ? validateStoryPreview(found) : null;
}
