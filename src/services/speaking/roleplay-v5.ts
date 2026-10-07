import { parseGeminiConversationReply, type ConversationHistoryItem, type ConversationScene,
  type GeminiConversationReply } from './gemini-conversation-contract';

export const ROLEPLAY_MAX_INPUT = 300; // UTF-16 units, reserving room in the existing 500-unit provider message.
export const ROLEPLAY_MAX_HISTORY = 6;
export const ROLEPLAY_TURN_LIMITS = [4, 8, 12] as const;
export const ROLEPLAY_TIMEOUT_MS = 30_000;
export const ROLEPLAY_VOICE_LIMIT_MS = 20_000;
export const ROLEPLAY_CONSENT_COPY = 'AI là tùy chọn. Khi bấm Gửi AI, chỉ câu chữ bạn đã kiểm tra, tình huống/cấp HSK, mục tiêu hiện tại, vài từ/cấu trúc gợi ý và tối đa 6 lượt chữ AI gần nhất được gửi qua máy chủ đến Gemini. Không gửi tệp ghi âm, lịch sử offline hay cơ sở dữ liệu học. Dịch vụ có thể xử lý/lưu dữ liệu theo chính sách nhà cung cấp; tránh tên thật và thông tin riêng tư. Chat chỉ giữ trong màn hình này, không tự lưu vào DB/backup. Có thể rút đồng ý và dùng kịch bản offline.';

export type RoleplayMode = 'OFFLINE' | 'AI';
export type RoleplaySceneId = ConversationScene | 'shopping' | 'hotel' | 'transport' | 'airport' | 'doctor' | 'school' | 'work' | 'travel' | 'phone' | 'friends';
export type RoleplayGoal = {
  id: string; label: string; learnerChinese: string; partnerChinese: string; pinyin: string; translationVi: string;
};
export type RoleplayScene = {
  id: RoleplaySceneId; label: string; setting: string; targetWords: string[]; targetGrammar: string[]; goals: RoleplayGoal[];
  recommendedLevel?: number; successCriteria?: string[];
};

/** Original internal practice scripts, not official exam/verified teaching material. */
export const ROLEPLAY_SCENES: RoleplayScene[] = [
  { id: 'daily', label: 'Đời thường', setting: 'Làm quen với một bạn học tiếng Trung.',
    targetWords: ['你好', '名字', '学生', '喜欢', '学习'], targetGrammar: ['我叫…', '我是…', '喜欢 + động từ'], goals: [
      { id: 'greet', label: 'Chào và giới thiệu tên (có thể dùng tên giả)', learnerChinese: '你好，我叫小明。',
        partnerChinese: '你好！我叫小林。你是学生吗？', pinyin: 'Nǐ hǎo! Wǒ jiào Xiǎolín. Nǐ shì xuésheng ma?', translationVi: 'Chào bạn! Mình là Tiểu Lâm. Bạn là học sinh/sinh viên à?' },
      { id: 'introduce', label: 'Nói mình làm gì', learnerChinese: '我是学生，我学习中文。',
        partnerChinese: '我也学习中文。你喜欢做什么？', pinyin: 'Wǒ yě xuéxí Zhōngwén. Nǐ xǐhuan zuò shénme?', translationVi: 'Mình cũng học tiếng Trung. Bạn thích làm gì?' },
      { id: 'interest', label: 'Nêu một sở thích và hỏi lại bạn', learnerChinese: '我喜欢看书。你呢？',
        partnerChinese: '我喜欢听音乐。很高兴认识你！', pinyin: 'Wǒ xǐhuan tīng yīnyuè. Hěn gāoxìng rènshi nǐ!', translationVi: 'Mình thích nghe nhạc. Rất vui được làm quen với bạn!' },
    ] },
  { id: 'restaurant', label: 'Nhà hàng', setting: 'Bạn gọi món và thanh toán ở nhà hàng.',
    targetWords: ['菜单', '米饭', '面条', '多少钱', '买单'], targetGrammar: ['我想要…', '请给我…', '…多少钱？'], goals: [
      { id: 'greet', label: 'Chào nhân viên', learnerChinese: '你好！', partnerChinese: '欢迎光临！请坐。',
        pinyin: 'Huānyíng guānglín! Qǐng zuò.', translationVi: 'Chào mừng quý khách! Mời ngồi.' },
      { id: 'menu', label: 'Xin xem thực đơn', learnerChinese: '请给我菜单。', partnerChinese: '这是菜单。您想吃什么？',
        pinyin: 'Zhè shì càidān. Nín xiǎng chī shénme?', translationVi: 'Đây là thực đơn. Quý khách muốn ăn gì?' },
      { id: 'order', label: 'Gọi hai món', learnerChinese: '我想要米饭和面条。', partnerChinese: '好的。一份米饭和一碗面条。',
        pinyin: 'Hǎo de. Yí fèn mǐfàn hé yì wǎn miàntiáo.', translationVi: 'Vâng. Một phần cơm và một bát mì.' },
      { id: 'price', label: 'Hỏi giá', learnerChinese: '一共多少钱？', partnerChinese: '一共三十元。',
        pinyin: 'Yígòng sānshí yuán.', translationVi: 'Tổng cộng ba mươi tệ.' },
      { id: 'bill', label: 'Yêu cầu thanh toán', learnerChinese: '请买单。谢谢！', partnerChinese: '好的。谢谢，欢迎下次再来！',
        pinyin: 'Hǎo de. Xièxie, huānyíng xià cì zài lái!', translationVi: 'Vâng. Cảm ơn, hẹn quý khách lần sau!' },
    ] },
  { id: 'directions', label: 'Hỏi đường', setting: 'Hỏi một người đi đường cách đến thư viện.',
    targetWords: ['请问', '图书馆', '左', '右', '远'], targetGrammar: ['…在哪儿？', '怎么去…？', '先…再…'], goals: [
      { id: 'ask', label: 'Mở lời lịch sự và hỏi nơi cần đến', learnerChinese: '请问，图书馆在哪儿？',
        partnerChinese: '图书馆在学校旁边。', pinyin: 'Túshūguǎn zài xuéxiào pángbiān.', translationVi: 'Thư viện ở bên cạnh trường học.' },
      { id: 'route', label: 'Hỏi cách đi', learnerChinese: '怎么去图书馆？', partnerChinese: '先一直走，再向左转。',
        pinyin: 'Xiān yìzhí zǒu, zài xiàng zuǒ zhuǎn.', translationVi: 'Đi thẳng trước, rồi rẽ trái.' },
      { id: 'distance', label: 'Hỏi khoảng cách', learnerChinese: '图书馆离这里远吗？', partnerChinese: '不远，走路大约五分钟。',
        pinyin: 'Bù yuǎn, zǒulù dàyuē wǔ fēnzhōng.', translationVi: 'Không xa, đi bộ khoảng năm phút.' },
      { id: 'confirm', label: 'Nhắc lại đường đi và cảm ơn', learnerChinese: '先一直走，再向左转，对吗？谢谢！',
        partnerChinese: '对。不客气！', pinyin: 'Duì. Bú kèqi!', translationVi: 'Đúng rồi. Không có gì!' },
    ] },
];

function stagedScene(id: RoleplaySceneId, label: string, setting: string, recommendedLevel: number,
  targetWords: string[], targetGrammar: string[], stages: [string, string, string, string, string][]): RoleplayScene {
  return { id, label, setting, recommendedLevel, targetWords, targetGrammar,
    successCriteria: stages.map(([criterion]) => criterion),
    goals: stages.map(([label, learnerChinese, partnerChinese, pinyin, translationVi], index) =>
      ({ id: `${id}-${index + 1}`, label, learnerChinese, partnerChinese, pinyin, translationVi })) };
}

ROLEPLAY_SCENES.push(
  stagedScene('shopping', 'Mua sắm', 'Mua áo tại cửa hàng.', 2, ['衣服', '试', '大', '元'], ['可以…吗？', '太…了'], [
    ['Hỏi giá áo', '这件衣服多少钱？', '这件衣服八十元。', 'Zhè jiàn yīfu bāshí yuán.', 'Chiếc áo này tám mươi tệ.'],
    ['Xin thử áo', '我可以试一下吗？', '可以。你要多大的？', 'Kěyǐ. Nǐ yào duō dà de?', 'Được. Bạn cần cỡ nào?'],
    ['Chọn cỡ nhỏ hơn', '这件太大了。请给我小一点的。', '好的，请试这件。', 'Hǎo de, qǐng shì zhè jiàn.', 'Được, mời thử chiếc này.'],
  ]),
  stagedScene('hotel', 'Khách sạn', 'Đặt phòng và hỏi giờ trả phòng; dùng thông tin giả.', 3, ['房间', '晚上', '退房'], ['有没有…？', '几点…？'], [
    ['Hỏi phòng còn trống', '请问，有房间吗？', '有。你住几个晚上？', 'Yǒu. Nǐ zhù jǐ ge wǎnshang?', 'Có. Bạn ở mấy đêm?'],
    ['Nói số đêm', '我住两个晚上。', '好的。这是你的房卡。', 'Hǎo de. Zhè shì nǐ de fángkǎ.', 'Được. Đây là thẻ phòng của bạn.'],
    ['Hỏi giờ trả phòng', '请问，几点退房？', '中午十二点以前退房。', 'Zhōngwǔ shí’èr diǎn yǐqián tuìfáng.', 'Trả phòng trước mười hai giờ trưa.'],
  ]),
  stagedScene('transport', 'Đi lại', 'Mua vé tàu đến Bắc Kinh.', 2, ['票', '北京', '出发'], ['一张…', '什么时候…？'], [
    ['Mua vé', '我要一张去北京的票。', '你想什么时候出发？', 'Nǐ xiǎng shénme shíhou chūfā?', 'Bạn muốn khởi hành lúc nào?'],
    ['Chọn chuyến', '我想明天上午出发。', '上午九点有一班车。', 'Shàngwǔ jiǔ diǎn yǒu yì bān chē.', 'Có một chuyến lúc chín giờ sáng.'],
    ['Xác nhận giờ', '九点出发，对吗？', '对，请提前到车站。', 'Duì, qǐng tíqián dào chēzhàn.', 'Đúng, hãy đến ga sớm.'],
  ]),
  stagedScene('airport', 'Sân bay', 'Hỏi nhân viên về chuyến bay; không dùng mã vé thật.', 3, ['航班', '行李', '登机口'], ['在哪儿？', '需要…吗？'], [
    ['Hỏi quầy làm thủ tục', '请问，在哪里办理登机？', '请到三号柜台。', 'Qǐng dào sān hào guìtái.', 'Mời đến quầy số ba.'],
    ['Hỏi gửi hành lý', '这个行李需要托运吗？', '需要，请放在这里。', 'Xūyào, qǐng fàng zài zhèlǐ.', 'Có, hãy đặt ở đây.'],
    ['Hỏi cửa lên máy bay', '登机口在哪儿？', '在前面，请看指示牌。', 'Zài qiánmiàn, qǐng kàn zhǐshìpái.', 'Ở phía trước, hãy xem biển chỉ dẫn.'],
  ]),
  stagedScene('doctor', 'Khám bệnh (giả lập)', 'Luyện nói triệu chứng giả, không tư vấn y tế.', 3, ['头', '疼', '昨天'], ['从…开始', '…了'], [
    ['Nói triệu chứng giả', '我头疼。', '从什么时候开始的？', 'Cóng shénme shíhou kāishǐ de?', 'Bắt đầu từ khi nào?'],
    ['Nói thời điểm', '从昨天开始的。', '你还有别的不舒服吗？', 'Nǐ hái yǒu bié de bù shūfu ma?', 'Bạn còn khó chịu ở đâu khác không?'],
    ['Xin nhắc lại câu hỏi', '请再说一遍。', '好的，我们慢慢说。', 'Hǎo de, wǒmen mànmàn shuō.', 'Được, chúng ta nói chậm thôi.'],
  ]),
  stagedScene('school', 'Trường học', 'Hỏi bạn học về lớp tiếng Trung.', 2, ['课', '老师', '教室'], ['几点…？', '在…'], [
    ['Hỏi giờ học', '中文课几点开始？', '上午八点开始。', 'Shàngwǔ bā diǎn kāishǐ.', 'Bắt đầu lúc tám giờ sáng.'],
    ['Hỏi phòng học', '教室在哪儿？', '教室在二楼。', 'Jiàoshì zài èr lóu.', 'Phòng học ở tầng hai.'],
    ['Nhờ giúp bài', '你可以帮我学习吗？', '可以，我们一起练习。', 'Kěyǐ, wǒmen yìqǐ liànxí.', 'Được, chúng ta cùng luyện tập.'],
  ]),
  stagedScene('work', 'Công việc', 'Trao đổi lịch họp giả với đồng nghiệp.', 4, ['会议', '时间', '准备'], ['能不能…？', '先…再…'], [
    ['Hỏi lịch họp', '明天的会议几点开始？', '下午两点开始。', 'Xiàwǔ liǎng diǎn kāishǐ.', 'Bắt đầu lúc hai giờ chiều.'],
    ['Đề nghị đổi giờ', '能不能改到三点？', '可以，我问一下其他同事。', 'Kěyǐ, wǒ wèn yíxià qítā tóngshì.', 'Được, tôi hỏi các đồng nghiệp khác nhé.'],
    ['Xác nhận chuẩn bị', '我先准备材料，再参加会议。', '好的，谢谢你的准备。', 'Hǎo de, xièxie nǐ de zhǔnbèi.', 'Được, cảm ơn bạn đã chuẩn bị.'],
  ]),
  stagedScene('travel', 'Du lịch', 'Lập kế hoạch thăm bảo tàng với bạn.', 3, ['博物馆', '周末', '门票'], ['打算…', '一起…吧'], [
    ['Đề xuất điểm đến', '周末一起去博物馆吧。', '好啊！我们怎么去？', 'Hǎo a! Wǒmen zěnme qù?', 'Được đấy! Chúng ta đi thế nào?'],
    ['Chọn phương tiện', '我们坐地铁去。', '好。门票多少钱？', 'Hǎo. Ménpiào duōshao qián?', 'Được. Vé vào cửa bao nhiêu tiền?'],
    ['Hẹn giờ gặp', '我们九点见吧。', '好的，九点见！', 'Hǎo de, jiǔ diǎn jiàn!', 'Được, hẹn gặp lúc chín giờ!'],
  ]),
  stagedScene('phone', 'Điện thoại', 'Gọi hẹn gặp bằng tên giả.', 3, ['喂', '方便', '明天'], ['现在…吗？', '可以…'], [
    ['Mở lời và hỏi có tiện không', '喂，你现在方便说话吗？', '方便，请说。', 'Fāngbiàn, qǐng shuō.', 'Tiện, bạn nói đi.'],
    ['Hẹn ngày gặp', '我们明天可以见面吗？', '可以。你几点有空？', 'Kěyǐ. Nǐ jǐ diǎn yǒu kòng?', 'Được. Mấy giờ bạn rảnh?'],
    ['Xác nhận giờ', '下午三点，好吗？', '好，明天下午三点见。', 'Hǎo, míngtiān xiàwǔ sān diǎn jiàn.', 'Được, hẹn ba giờ chiều mai.'],
  ]),
  stagedScene('friends', 'Bạn bè', 'Mời bạn đi chơi và thống nhất kế hoạch.', 2, ['电影', '周六', '见面'], ['想不想…？', '…吧'], [
    ['Mời xem phim', '你想不想看电影？', '想。我们什么时候去？', 'Xiǎng. Wǒmen shénme shíhou qù?', 'Có. Khi nào chúng ta đi?'],
    ['Hẹn ngày', '我们周六去吧。', '好。在哪里见面？', 'Hǎo. Zài nǎlǐ jiànmiàn?', 'Được. Gặp ở đâu?'],
    ['Chọn điểm gặp', '在电影院门口见。', '好的，周六见！', 'Hǎo de, zhōuliù jiàn!', 'Được, hẹn thứ bảy!'],
  ]),
);
for (const scene of ROLEPLAY_SCENES) {
  scene.recommendedLevel ??= scene.id === 'daily' ? 1 : 2;
  scene.successCriteria ??= scene.goals.map((goal) => goal.label);
}

/** Keep the existing server allowlist untouched; detailed setting travels in the bounded prompt. */
export function roleplayApiScene(scene: RoleplaySceneId): ConversationScene {
  roleplayScene(scene);
  return scene === 'restaurant' || scene === 'directions' ? scene : 'daily';
}

export type RoleplayExchange = { id: number; text: string; reply: GeminiConversationReply; origin: RoleplayMode };
export type RoleplaySession = {
  scene: RoleplaySceneId; level: number; mode: RoleplayMode; consent: boolean;
  turnLimit: number; attemptsUsed: number; sequence: number; exchanges: RoleplayExchange[];
  checkedGoals: string[]; pending: { id: number; text: string; goalId: string; mode: RoleplayMode } | null;
};
export class RoleplayStateError extends Error {
  constructor(message: string, readonly code: string) { super(message); }
}

export function roleplayScene(scene: RoleplaySceneId): RoleplayScene {
  const result = ROLEPLAY_SCENES.find((item) => item.id === scene);
  if (!result) throw new RoleplayStateError('Tình huống chưa hỗ trợ.', 'invalid-input');
  return result;
}

export function createRoleplaySession(scene: RoleplaySceneId = 'daily', level = 1, turnLimit = 8): RoleplaySession {
  roleplayScene(scene);
  if (!Number.isInteger(level) || level < 1 || level > 6 || !ROLEPLAY_TURN_LIMITS.some((limit) => limit === turnLimit)) {
    throw new RoleplayStateError('Trình độ hoặc giới hạn phiên không hợp lệ.', 'invalid-input');
  }
  return { scene, level, turnLimit, mode: 'OFFLINE', consent: false, attemptsUsed: 0, sequence: 0,
    exchanges: [], checkedGoals: [], pending: null };
}

export function resetRoleplaySession(state: RoleplaySession, scene = state.scene, level = state.level, turnLimit = state.turnLimit): RoleplaySession {
  return { ...createRoleplaySession(scene, level, turnLimit), sequence: state.sequence + 1 };
}

export function setRoleplayConsent(state: RoleplaySession, consent: boolean): RoleplaySession {
  return { ...state, consent, mode: consent ? state.mode : 'OFFLINE', pending: consent ? state.pending : null };
}

export function setRoleplayMode(state: RoleplaySession, mode: RoleplayMode): RoleplaySession {
  if (mode === 'AI' && !state.consent) throw new RoleplayStateError('Hãy đọc và đồng ý gửi chữ trước khi bật AI.', 'consent-required');
  return { ...state, mode, pending: null };
}

export function toggleRoleplayGoal(state: RoleplaySession, goalId: string): RoleplaySession {
  if (!roleplayScene(state.scene).goals.some((goal) => goal.id === goalId)) throw new RoleplayStateError('Mục tiêu không hợp lệ.', 'invalid-input');
  return { ...state, checkedGoals: state.checkedGoals.includes(goalId) ? state.checkedGoals.filter((id) => id !== goalId) : [...state.checkedGoals, goalId] };
}

export function currentRoleplayGoal(state: RoleplaySession): RoleplayGoal {
  const goals = roleplayScene(state.scene).goals;
  return goals.find((goal) => !state.checkedGoals.includes(goal.id)) ?? goals[goals.length - 1]!;
}

export function beginRoleplayTurn(state: RoleplaySession, rawText: string): RoleplaySession {
  const text = rawText.trim();
  if (!text || text.length > ROLEPLAY_MAX_INPUT) throw new RoleplayStateError('Mỗi lượt cần 1–300 ký tự; hãy chia câu dài.', 'invalid-input');
  if (state.pending) throw new RoleplayStateError('Hãy đợi hoặc hủy lượt đang chạy.', 'busy');
  if (state.attemptsUsed >= state.turnLimit) throw new RoleplayStateError('Đã hết lượt trong phiên. Hãy tự xem lại mục tiêu hoặc làm mới phiên.', 'session-limit');
  if (state.mode === 'AI' && !state.consent) throw new RoleplayStateError('Chưa đồng ý gửi chữ lên AI.', 'consent-required');
  const id = state.sequence + 1;
  return { ...state, attemptsUsed: state.attemptsUsed + 1, sequence: id,
    pending: { id, text, goalId: currentRoleplayGoal(state).id, mode: state.mode } };
}

export function finishRoleplayTurn(state: RoleplaySession, id: number, reply: GeminiConversationReply): RoleplaySession {
  if (state.pending?.id !== id) return state;
  const exchange = { id, text: state.pending.text, reply: parseGeminiConversationReply(reply), origin: state.pending.mode };
  // Completion never checks goals or invents any score, including STT/pronunciation scores.
  return { ...state, pending: null, exchanges: [...state.exchanges, exchange].slice(-state.turnLimit) };
}

export function cancelRoleplayTurn(state: RoleplaySession, id = state.pending?.id): RoleplaySession {
  return state.pending?.id === id ? { ...state, pending: null } : state;
}

export function buildRoleplayRequest(state: RoleplaySession): {
  message: string; history: ConversationHistoryItem[]; level: number; scene: ConversationScene;
} {
  if (!state.pending || state.pending.mode !== 'AI' || !state.consent) throw new RoleplayStateError('Chưa có lượt AI được đồng ý.', 'consent-required');
  const scene = roleplayScene(state.scene);
  const goal = scene.goals.find((item) => item.id === state.pending!.goalId)!;
  const message = `[Vai: ${scene.setting} Mục tiêu: ${goal.label} Từ: ${scene.targetWords.slice(0, 5).join(',')} Cấu trúc: ${scene.targetGrammar.join(',')}. Chỉ góp ý chữ, không chấm âm.]\n${state.pending.text}`;
  if (message.length > 500) throw new RoleplayStateError('Câu và mục tiêu quá dài. Hãy rút ngắn câu.', 'invalid-input');
  const history: ConversationHistoryItem[] = state.exchanges.filter((item) => item.origin === 'AI')
    .flatMap((item): ConversationHistoryItem[] => [{ role: 'user', text: item.text }, { role: 'model', text: item.reply.replyChinese }]).slice(-ROLEPLAY_MAX_HISTORY);
  return { message, history, level: state.level, scene: roleplayApiScene(state.scene) };
}

export type RoleplayTransport = (request: ReturnType<typeof buildRoleplayRequest> & { signal: AbortSignal }) => Promise<GeminiConversationReply>;

/** No auth/network in OFFLINE mode, and no provider invocation before explicit consent. */
export async function requestRoleplayReply(state: RoleplaySession, signal: AbortSignal, transport: RoleplayTransport): Promise<GeminiConversationReply> {
  if (signal.aborted) throw new RoleplayStateError('Đã hủy lượt.', 'cancelled');
  if (!state.pending) throw new RoleplayStateError('Chưa có lượt luyện.', 'invalid-input');
  if (state.pending.mode === 'OFFLINE') {
    const goal = roleplayScene(state.scene).goals.find((item) => item.id === state.pending!.goalId)!;
    return { replyChinese: goal.partnerChinese, pinyin: goal.pinyin, translationVi: goal.translationVi,
      correctionVi: 'Kịch bản cố định, không phân tích câu của bạn. Hãy tự đối chiếu câu mẫu và tự đánh dấu mục tiêu; không có điểm phát âm.',
      suggestedChinese: goal.learnerChinese };
  }
  const request = buildRoleplayRequest(state);
  const controller = new AbortController();
  let abort: () => void = () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const reply = await Promise.race([
      new Promise<never>((_, reject) => {
        abort = () => { controller.abort(); reject(new RoleplayStateError('Đã hủy lượt.', 'cancelled')); };
        signal.addEventListener('abort', abort, { once: true });
        timer = setTimeout(() => { controller.abort(); reject(new RoleplayStateError('AI phản hồi quá lâu. Có thể dùng kịch bản offline.', 'timeout')); }, ROLEPLAY_TIMEOUT_MS);
        if (signal.aborted) abort();
      }),
      Promise.resolve().then(() => {
        if (signal.aborted || controller.signal.aborted) throw new RoleplayStateError('Đã hủy lượt.', 'cancelled');
        return transport({ ...request, signal: controller.signal });
      }),
    ]);
    if (signal.aborted) throw new RoleplayStateError('Đã hủy lượt.', 'cancelled');
    return parseGeminiConversationReply(reply);
  } finally {
    if (timer) clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

export function roleplayFailureHint(code: string): string {
  if (code === 'daily-limit') return 'Đã hết lượt AI hôm nay (UTC). Kịch bản offline vẫn dùng được; không tự gửi lại.';
  if (code === 'quota-unavailable') return 'Chưa kiểm tra được giới hạn AI tại máy. Không gửi AI; hãy dùng kịch bản offline.';
  if (code === 'login-required' || code === 'unauthorized') return 'Chưa đăng nhập hoặc phiên Cloud hết hạn. Không cần tài khoản để dùng kịch bản offline.';
  if (code === 'rate-limited') return 'Dịch vụ đang giới hạn lượt/quota. Không tự gửi lại; bạn có thể tiếp tục bằng kịch bản offline.';
  if (code === 'timeout' || code === 'network') return 'Mạng/AI chưa phản hồi. Câu của bạn được giữ để sửa; kịch bản offline vẫn dùng được.';
  if (code === 'session-limit') return 'Đã hết lượt của phiên. Tự xem lại mục tiêu và câu mẫu, hoặc làm mới phiên.';
  if (code === 'consent-required') return 'AI chỉ được bật sau khi bạn đồng ý gửi chữ. Có thể dùng offline không cần đồng ý AI.';
  if (code === 'cancelled') return 'Đã hủy lượt; không thêm phản hồi muộn. Lượt đã bắt đầu vẫn tính vào giới hạn phiên.';
  return 'AI chưa sẵn sàng hoặc phản hồi không hợp lệ. Không tự gửi lại; chọn kịch bản offline để tiếp tục.';
}

export function roleplaySummary(state: RoleplaySession): { completedGoals: number; totalGoals: number; usedWords: string[] } {
  const scene = roleplayScene(state.scene);
  const text = state.exchanges.map((item) => item.text).join('\n');
  return { completedGoals: scene.goals.filter((goal) => state.checkedGoals.includes(goal.id)).length,
    totalGoals: scene.goals.length, usedWords: scene.targetWords.filter((word) => text.includes(word)) };
}
